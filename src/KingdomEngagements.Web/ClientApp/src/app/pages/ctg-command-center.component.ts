import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import {
  EngagementResponsibilitySnapshot,
  HostCoordinationMessage,
  ResponsibilityLaneState,
} from '../core/models';

type CommandWindow = 7 | 30 | 60 | 0;

interface HostActivityPreview {
  assignmentId: string;
  assignmentTitle: string;
  hostOrganization: string;
  message: HostCoordinationMessage;
}

@Component({
  selector: 'app-ctg-command-center',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="director-page">
      <header class="director-heading">
        <div>
          <p class="director-eyebrow">Cynthia Thompson Global · Engagement Director</p>
          <h1>Engagement Command Center</h1>
          <p>Everything Prophet Courtney needs to keep upcoming engagements moving: ownership, readiness, blockers, host progress, and accountability.</p>
        </div>
        <div class="director-heading-actions">
          <a class="secondary-action" routerLink="/organization/ctg/team">Team responsibilities</a>
          <a class="primary-action" routerLink="/organization/ctg/stand-up">Start stand-up →</a>
        </div>
      </header>

      @if (loading()) {
        <div class="director-state">Loading the engagement operation…</div>
      } @else if (error()) {
        <div class="director-state director-state--error">{{ error() }}</div>
      } @else {
        <section class="director-summary" aria-label="Operational summary">
          <button type="button" (click)="attentionOnly.set(false)">
            <small>Active engagements</small>
            <strong>{{ visibleSnapshots().length }}</strong>
            <span>{{ windowLabel() }}</span>
          </button>
          <button type="button" [class.selected]="attentionOnly()" (click)="attentionOnly.set(true)">
            <small>Need attention</small>
            <strong>{{ needsAttention().length }}</strong>
            <span>Blocked, overdue or unassigned</span>
          </button>
          <article>
            <small>Overdue responsibilities</small>
            <strong>{{ overdueCount() }}</strong>
            <span>Across visible engagements</span>
          </article>
          <article>
            <small>Unassigned lanes</small>
            <strong>{{ unassignedCount() }}</strong>
            <span>Need an owner</span>
          </article>
          <article>
            <small>Waiting on host</small>
            <strong>{{ waitingOnHostCount() }}</strong>
            <span>External dependencies</span>
          </article>
        </section>

        <div class="director-toolbar">
          <div class="window-switcher" aria-label="Command Center time window">
            @for (option of windows; track option.value) {
              <button
                type="button"
                [class.selected]="window() === option.value"
                (click)="setWindow(option.value)">
                {{ option.label }}
              </button>
            }
          </div>
          @if (attentionOnly()) {
            <button class="clear-filter" type="button" (click)="attentionOnly.set(false)">Show all engagements</button>
          }
        </div>

        <section class="command-board">
          <header>
            <div>
              <p class="director-eyebrow">Operational board</p>
              <h2>{{ attentionOnly() ? 'Engagements needing attention' : 'Upcoming engagements' }}</h2>
            </div>
            <span>{{ boardSnapshots().length }} engagement{{ boardSnapshots().length === 1 ? '' : 's' }}</span>
          </header>

          @if (boardSnapshots().length === 0) {
            <div class="director-empty">Nothing in this view needs attention.</div>
          } @else {
            <div class="command-table-wrap">
              <table class="command-table">
                <thead>
                  <tr>
                    <th>Engagement</th>
                    @for (column of laneColumns; track column.key) {
                      <th>{{ column.shortLabel }}</th>
                    }
                    <th>Overall</th>
                  </tr>
                </thead>
                <tbody>
                  @for (snapshot of boardSnapshots(); track snapshot.assignment.id) {
                    <tr>
                      <td class="engagement-cell">
                        <a [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]">
                          <strong>{{ snapshot.assignment.title }}</strong>
                          <span>{{ snapshot.assignment.hostOrganization }}</span>
                          <small>{{ dateLabel(snapshot.assignment.startsAtUtc) }} · {{ snapshot.assignment.location || 'Location pending' }}</small>
                        </a>
                      </td>
                      @for (column of laneColumns; track column.key) {
                        @if (lane(snapshot, column.key); as laneItem) {
                          <td>
                            <a
                              class="lane-cell"
                              [class.lane-cell--danger]="laneItem.isOverdue || laneItem.status === 'blocked'"
                              [class.lane-cell--waiting]="laneItem.status === 'waiting-on-host'"
                              [class.lane-cell--complete]="laneItem.status === 'complete'"
                              [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]"
                              [queryParams]="{ lane: column.key }">
                              <strong>{{ laneStatusLabel(laneItem) }}</strong>
                              <span>{{ laneItem.owner?.displayName || 'Unassigned' }}</span>
                              <small>{{ laneDetail(laneItem) }}</small>
                            </a>
                          </td>
                        } @else {
                          <td><span class="lane-na">—</span></td>
                        }
                      }
                      <td>
                        <a class="overall-cell" [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]">
                          <strong>{{ snapshot.responsibilityReadinessPercent }}%</strong>
                          <span>{{ snapshot.completedLaneCount }}/{{ snapshot.applicableLaneCount }} complete</span>
                          @if (snapshot.overdueLaneCount > 0) {
                            <small class="danger-text">{{ snapshot.overdueLaneCount }} overdue</small>
                          } @else if (snapshot.unassignedLaneCount > 0) {
                            <small class="warning-text">{{ snapshot.unassignedLaneCount }} unassigned</small>
                          } @else {
                            <small>On track</small>
                          }
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <section class="director-lower-grid">
          <article class="director-panel">
            <header>
              <div><p class="director-eyebrow">Needs my attention</p><h2>Operational exceptions</h2></div>
              <strong>{{ attentionItems().length }}</strong>
            </header>
            @if (attentionItems().length === 0) {
              <div class="panel-empty">No blockers, overdue work, or unassigned responsibilities in this window.</div>
            } @else {
              <div class="attention-list">
                @for (item of attentionItems().slice(0, 10); track item.assignmentId + item.lane.key) {
                  <a [routerLink]="['/organization/ctg/engagements', item.assignmentId]" [queryParams]="{ lane: item.lane.key }">
                    <span class="attention-status" [class.danger]="item.lane.isOverdue || item.lane.status === 'blocked'">!</span>
                    <span>
                      <strong>{{ item.assignmentTitle }} · {{ item.lane.label }}</strong>
                      <small>{{ attentionReason(item.lane) }}</small>
                    </span>
                    <b>{{ item.lane.owner?.displayName || 'Unassigned' }}</b>
                  </a>
                }
              </div>
            }
          </article>

          <article class="director-panel">
            <header>
              <div><p class="director-eyebrow">Host coordination</p><h2>Recent host activity</h2></div>
              <a routerLink="/organization/ctg/hosts">Open host activity →</a>
            </header>
            @if (hostActivity().length === 0) {
              <div class="panel-empty">No recent host messages are available yet.</div>
            } @else {
              <div class="host-preview-list">
                @for (item of hostActivity().slice(0, 6); track item.message.id) {
                  <a [routerLink]="['/organization/ctg/engagements', item.assignmentId]" [queryParams]="{ lane: 'host-coordination' }">
                    <div>
                      <strong>{{ item.hostOrganization }}</strong>
                      <small>{{ item.assignmentTitle }} · {{ relativeDate(item.message.createdAtUtc) }}</small>
                    </div>
                    <p>“{{ truncate(item.message.message, 118) }}”</p>
                    <span>{{ item.message.senderName }}</span>
                  </a>
                }
              </div>
            }
          </article>
        </section>

        <section class="director-panel team-accountability">
          <header>
            <div><p class="director-eyebrow">Team accountability</p><h2>Workload by owner</h2></div>
            <a routerLink="/organization/ctg/team">Manage standing responsibilities →</a>
          </header>
          @if (teamAccountability().length === 0) {
            <div class="panel-empty">Assign standing responsibility owners to begin team accountability tracking.</div>
          } @else {
            <div class="team-grid">
              @for (member of teamAccountability(); track member.subject) {
                <article>
                  <strong>{{ member.name }}</strong>
                  <span>{{ member.lanes.join(', ') }}</span>
                  <dl>
                    <div><dt>Active</dt><dd>{{ member.active }}</dd></div>
                    <div><dt>Complete</dt><dd>{{ member.complete }}</dd></div>
                    <div><dt>Waiting</dt><dd>{{ member.waiting }}</dd></div>
                    <div><dt>Overdue</dt><dd [class.danger-text]="member.overdue > 0">{{ member.overdue }}</dd></div>
                  </dl>
                </article>
              }
            </div>
          }
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}
    .director-page{width:min(1500px,calc(100% - 42px));margin:0 auto;padding:28px 0 60px;color:#17202b}
    .director-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:28px;margin-bottom:22px;padding:24px 26px;border:1px solid #dde1df;border-radius:18px;background:#fffdfa;box-shadow:0 12px 32px rgba(18,26,44,.05)}
    .director-heading h1,.command-board h2,.director-panel h2{margin:4px 0 7px;font-family:Georgia,'Times New Roman',serif;font-weight:500;color:#17243a}
    .director-heading h1{font-size:clamp(2rem,3vw,3rem)}
    .director-heading p{max-width:790px;margin:0;color:#69716d;line-height:1.65}
    .director-eyebrow{margin:0!important;color:#7c6b38!important;font:800 .67rem/1.2 system-ui,sans-serif!important;letter-spacing:.11em;text-transform:uppercase}
    .director-heading-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .primary-action,.secondary-action{display:inline-flex;min-height:40px;align-items:center;padding:0 14px;border-radius:9px;font-size:.73rem;font-weight:850;text-decoration:none}
    .primary-action{color:#fff;background:#172a46}.secondary-action{color:#172a46;border:1px solid #d6dbe0;background:#fff}
    .director-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .director-summary article,.director-summary button{appearance:none;text-align:left;padding:17px 18px;border:1px solid #dde1df;border-radius:13px;background:#fffdfa;color:inherit;font:inherit;cursor:default}
    .director-summary button{cursor:pointer}.director-summary button.selected{border-color:#9d7438;box-shadow:0 0 0 2px rgba(157,116,56,.12)}
    .director-summary small{display:block;color:#737b78;font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
    .director-summary strong{display:block;margin:7px 0 3px;font-size:1.65rem;color:#17243a}.director-summary span{font-size:.72rem;color:#7b817e}
    .director-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:16px 0}
    .window-switcher{display:flex;gap:4px;padding:4px;border:1px solid #dde1df;border-radius:10px;background:#fff}
    .window-switcher button,.clear-filter{border:0;border-radius:7px;padding:8px 11px;background:transparent;color:#68716d;font-weight:800;font-size:.7rem;cursor:pointer}
    .window-switcher button.selected{color:#fff;background:#172a46}.clear-filter{border:1px solid #dde1df;background:#fff}
    .command-board,.director-panel{border:1px solid #dde1df;border-radius:16px;background:#fffdfa;box-shadow:0 8px 24px rgba(18,26,44,.035)}
    .command-board>header,.director-panel>header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #e4e6e4}
    .command-board h2,.director-panel h2{font-size:1.25rem}.command-board>header>span{font-size:.72rem;color:#7a817d}.director-panel header>a{color:#315faf;font-size:.72rem;font-weight:800;text-decoration:none}
    .command-table-wrap{overflow:auto}.command-table{width:100%;min-width:1250px;border-collapse:collapse}
    .command-table th{padding:10px 9px;border-bottom:1px solid #e4e6e4;background:#f5f3ed;color:#69716d;font-size:.63rem;letter-spacing:.05em;text-transform:uppercase;text-align:left}
    .command-table td{padding:8px;border-bottom:1px solid #eceeeb;vertical-align:top}.command-table tr:last-child td{border-bottom:0}
    .engagement-cell{min-width:230px}.engagement-cell a,.lane-cell,.overall-cell{display:flex;flex-direction:column;gap:3px;padding:8px;border-radius:8px;color:inherit;text-decoration:none}
    .engagement-cell strong{font-size:.82rem}.engagement-cell span,.engagement-cell small{color:#747c78;font-size:.68rem}
    .lane-cell{min-width:118px;border:1px solid transparent;background:#f7f6f2}.lane-cell strong{font-size:.68rem}.lane-cell span{font-size:.66rem;font-weight:700;color:#4f5954}.lane-cell small{font-size:.61rem;color:#808681}
    .lane-cell--complete{background:#eef6f1;color:#276d52}.lane-cell--waiting{background:#fbf5e8;color:#8a641e}.lane-cell--danger{background:#fbefed;color:#9a433f;border-color:#efd4d1}
    .lane-na{display:block;padding:12px;color:#a5aaa7;text-align:center}.overall-cell strong{font-size:1rem}.overall-cell span,.overall-cell small{font-size:.64rem;color:#737b78}
    .director-lower-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px;margin-top:14px}.director-panel{overflow:hidden}.director-panel>header strong{font-size:1.2rem}
    .attention-list,.host-preview-list{display:flex;flex-direction:column}.attention-list>a,.host-preview-list>a{display:grid;gap:10px;padding:13px 18px;border-bottom:1px solid #eceeeb;color:inherit;text-decoration:none}.attention-list>a{grid-template-columns:auto 1fr auto;align-items:center}
    .attention-list>a:last-child,.host-preview-list>a:last-child{border-bottom:0}.attention-status{display:grid;width:25px;height:25px;place-items:center;border-radius:50%;background:#fbf5e8;color:#8a641e;font-weight:900}.attention-status.danger{background:#fbefed;color:#9a433f}
    .attention-list strong,.host-preview-list strong{font-size:.76rem}.attention-list small,.host-preview-list small{display:block;margin-top:2px;color:#7a817e;font-size:.65rem}.attention-list b{font-size:.66rem;color:#5e6863}
    .host-preview-list>a{grid-template-columns:1fr auto}.host-preview-list p{grid-column:1/-1;margin:0;color:#535e58;font-size:.73rem;line-height:1.45}.host-preview-list>a>span{font-size:.65rem;color:#7c827f}
    .team-accountability{margin-top:14px}.team-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:14px}.team-grid article{padding:15px;border:1px solid #e2e5e2;border-radius:11px;background:#f9f8f4}.team-grid article>strong{display:block}.team-grid article>span{display:block;margin:3px 0 12px;color:#757c78;font-size:.65rem}.team-grid dl{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:0}.team-grid dl div{padding:7px;border-radius:7px;background:#fff}.team-grid dt{font-size:.57rem;color:#858b87;text-transform:uppercase}.team-grid dd{margin:2px 0 0;font-weight:850}
    .panel-empty,.director-empty,.director-state{padding:28px;color:#747c78;text-align:center}.director-state{margin:40px auto;border:1px solid #dde1df;border-radius:14px;background:#fff}.director-state--error{color:#9a433f}.danger-text{color:#a84642!important}.warning-text{color:#956d25!important}
    @media(max-width:1050px){.director-summary{grid-template-columns:repeat(3,1fr)}.director-lower-grid{grid-template-columns:1fr}.team-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:720px){.director-page{width:min(100% - 24px,1500px)}.director-heading{flex-direction:column}.director-summary{grid-template-columns:1fr 1fr}.team-grid{grid-template-columns:1fr}.director-toolbar{align-items:flex-start;flex-direction:column}}
  `],
})
export class CtgCommandCenterComponent implements OnInit {
  readonly windows = [
    { value: 7 as CommandWindow, label: '7 Days' },
    { value: 30 as CommandWindow, label: '30 Days' },
    { value: 60 as CommandWindow, label: '60 Days' },
    { value: 0 as CommandWindow, label: 'All Active' },
  ];
  readonly laneColumns = [
    { key: 'host-coordination', shortLabel: 'Host' },
    { key: 'travel', shortLabel: 'Travel' },
    { key: 'lodging', shortLabel: 'Stay' },
    { key: 'transportation', shortLabel: 'Transport' },
    { key: 'media', shortLabel: 'Media' },
    { key: 'program', shortLabel: 'Program' },
    { key: 'documents', shortLabel: 'Docs' },
    { key: 'finance', shortLabel: 'Finance' },
  ];

  readonly snapshots = signal<readonly EngagementResponsibilitySnapshot[]>([]);
  readonly hostActivity = signal<readonly HostActivityPreview[]>([]);
  readonly window = signal<CommandWindow>(30);
  readonly attentionOnly = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly visibleSnapshots = computed(() => {
    const days = this.window();
    const items = [...this.snapshots()].sort((a, b) => this.dateValue(a.assignment.startsAtUtc) - this.dateValue(b.assignment.startsAtUtc));
    if (days === 0) return items;
    const now = Date.now();
    const upper = now + days * 86_400_000;
    return items.filter(item => {
      if (!item.assignment.startsAtUtc) return true;
      const value = new Date(item.assignment.startsAtUtc).getTime();
      return value >= now - 86_400_000 && value <= upper;
    });
  });

  readonly needsAttention = computed(() =>
    this.visibleSnapshots().filter(item =>
      item.overdueLaneCount > 0 ||
      item.unassignedLaneCount > 0 ||
      item.lanes.some(lane => lane.isApplicable && ['blocked', 'overdue'].includes(lane.status)),
    ),
  );

  readonly boardSnapshots = computed(() =>
    this.attentionOnly() ? this.needsAttention() : this.visibleSnapshots(),
  );

  readonly overdueCount = computed(() =>
    this.visibleSnapshots().reduce((sum, item) => sum + item.overdueLaneCount, 0),
  );
  readonly unassignedCount = computed(() =>
    this.visibleSnapshots().reduce((sum, item) => sum + item.unassignedLaneCount, 0),
  );
  readonly waitingOnHostCount = computed(() =>
    this.visibleSnapshots().reduce(
      (sum, item) => sum + item.lanes.filter(lane => lane.isApplicable && lane.status === 'waiting-on-host').length,
      0,
    ),
  );

  readonly attentionItems = computed(() =>
    this.visibleSnapshots()
      .flatMap(snapshot => snapshot.lanes
        .filter(lane =>
          lane.isApplicable &&
          (lane.isOverdue || lane.owner === null || ['blocked', 'overdue'].includes(lane.status)),
        )
        .map(lane => ({
          assignmentId: snapshot.assignment.id,
          assignmentTitle: snapshot.assignment.title,
          lane,
        })))
      .sort((a, b) => Number(b.lane.isOverdue) - Number(a.lane.isOverdue)),
  );

  readonly teamAccountability = computed(() => {
    const members = new Map<string, {
      subject: string;
      name: string;
      lanes: Set<string>;
      active: number;
      complete: number;
      waiting: number;
      overdue: number;
    }>();

    for (const snapshot of this.visibleSnapshots()) {
      for (const lane of snapshot.lanes) {
        if (!lane.isApplicable || !lane.owner) continue;
        const key = lane.owner.userSubject;
        const member = members.get(key) ?? {
          subject: key,
          name: lane.owner.displayName,
          lanes: new Set<string>(),
          active: 0,
          complete: 0,
          waiting: 0,
          overdue: 0,
        };
        member.lanes.add(lane.label);
        member.active += 1;
        if (lane.status === 'complete') member.complete += 1;
        if (lane.status === 'waiting-on-host') member.waiting += 1;
        if (lane.isOverdue || lane.status === 'overdue') member.overdue += 1;
        members.set(key, member);
      }
    }

    return [...members.values()]
      .map(member => ({ ...member, lanes: [...member.lanes] }))
      .sort((a, b) => b.overdue - a.overdue || b.active - a.active || a.name.localeCompare(b.name));
  });

  constructor(private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    this.api.getCommandCenter().subscribe({
      next: snapshots => {
        this.snapshots.set(snapshots);
        this.loading.set(false);
        this.loadHostActivity(snapshots);
      },
      error: () => {
        this.error.set('The Command Center could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  setWindow(value: CommandWindow): void {
    this.window.set(value);
    this.attentionOnly.set(false);
  }

  lane(snapshot: EngagementResponsibilitySnapshot, key: string): ResponsibilityLaneState | null {
    return snapshot.lanes.find(item => item.key === key && item.isApplicable) ?? null;
  }

  laneStatusLabel(lane: ResponsibilityLaneState): string {
    if (lane.isOverdue) return 'Overdue';
    return this.statusLabel(lane.status);
  }

  laneDetail(lane: ResponsibilityLaneState): string {
    if (lane.dueAtUtc) return `Due ${this.dateLabel(lane.dueAtUtc)}`;
    if (lane.updatedAtUtc) return `Updated ${this.relativeDate(lane.updatedAtUtc)}`;
    return lane.detail || 'No due date';
  }

  attentionReason(lane: ResponsibilityLaneState): string {
    if (lane.owner === null) return 'No owner assigned.';
    if (lane.isOverdue || lane.status === 'overdue') return `Overdue${lane.dueAtUtc ? ` · due ${this.dateLabel(lane.dueAtUtc)}` : ''}.`;
    if (lane.status === 'blocked') return lane.detail || 'Work is blocked.';
    return lane.detail || this.statusLabel(lane.status);
  }

  windowLabel(): string {
    return this.window() === 0 ? 'All active ministry work' : `Next ${this.window()} days`;
  }

  dateLabel(value: string | null): string {
    if (!value) return 'Date pending';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  relativeDate(value: string): string {
    const difference = Date.now() - new Date(value).getTime();
    const hours = Math.max(0, Math.floor(difference / 3_600_000));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }

  truncate(value: string, length: number): string {
    return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
  }

  private loadHostActivity(snapshots: readonly EngagementResponsibilitySnapshot[]): void {
    if (snapshots.length === 0) return;
    const requests = snapshots.slice(0, 20).map(snapshot =>
      this.api.getHostCoordinationMessages(snapshot.assignment.id).pipe(
        catchError(() => of({ isClosed: false, messages: [] as const })),
      ),
    );

    forkJoin(requests).subscribe(threads => {
      const activity: HostActivityPreview[] = [];
      threads.forEach((thread, index) => {
        const snapshot = snapshots[index];
        for (const message of thread.messages) {
          activity.push({
            assignmentId: snapshot.assignment.id,
            assignmentTitle: snapshot.assignment.title,
            hostOrganization: snapshot.assignment.hostOrganization,
            message,
          });
        }
      });
      activity.sort((a, b) => new Date(b.message.createdAtUtc).getTime() - new Date(a.message.createdAtUtc).getTime());
      this.hostActivity.set(activity);
    });
  }

  private statusLabel(value: string): string {
    return value.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  private dateValue(value: string | null): number {
    return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
  }
}
