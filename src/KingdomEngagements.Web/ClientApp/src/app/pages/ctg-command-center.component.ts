import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import {
  EngagementResponsibilitySnapshot,
  EngagementSummary,
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
        <h1>Command Center</h1>
        <div class="director-heading-actions">
          <a class="secondary-action" routerLink="/organization/ctg/team">Team</a>
          <a class="primary-action" routerLink="/organization/ctg/stand-up">Stand-up →</a>
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

        @if (responsibilityDataUnavailable()) {
          <div class="director-state director-state--warning">
            <strong>Responsibility details are temporarily unavailable.</strong>
            <span>The engagement list is still shown below. Rebuild the Engagements Docker container after pulling the latest code.</span>
          </div>
        }

        <section class="command-board">
          <header>
            <h2>{{ attentionOnly() ? 'Needs attention' : 'Upcoming engagements' }}</h2>
            <span>{{ boardSnapshots().length }}</span>
          </header>

          @if (boardSnapshots().length === 0) {
            <div class="director-empty">Nothing in this view needs attention.</div>
          } @else {
            <div class="board-scroll">
              <div class="board-list">
                @for (snapshot of boardSnapshots(); track snapshot.assignment.id) {
                  <article class="board-row">
                    <a class="board-engagement" [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]">
                      <strong>{{ snapshot.assignment.title }}</strong>
                      <span>{{ snapshot.assignment.hostOrganization }}</span>
                      <small>{{ dateLabel(snapshot.assignment.startsAtUtc) }} · {{ snapshot.assignment.location || 'Location pending' }}</small>
                    </a>

                    <div class="board-lanes">
                      @for (column of laneColumns; track column.key) {
                        @if (lane(snapshot, column.key); as laneItem) {
                          <a
                            class="board-lane"
                            [class.complete]="laneItem.status === 'complete'"
                            [class.waiting]="laneItem.status === 'waiting-on-host'"
                            [class.danger]="laneItem.isOverdue || laneItem.status === 'blocked'"
                            [class.unassigned]="!laneItem.owner"
                            [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]"
                            [queryParams]="{ lane: column.key }"
                            [title]="column.shortLabel + ' · ' + laneStatusLabel(laneItem)">
                            <span class="board-lane-label">{{ column.shortLabel }}</span>
                            <strong>{{ laneStatusLabel(laneItem) }}</strong>
                            @if (laneItem.owner) {
                              <small>{{ laneItem.owner.displayName }}</small>
                            } @else {
                              <small class="needs-owner">Needs owner</small>
                            }
                            @if (laneItem.dueAtUtc) {
                              <em>{{ dateLabel(laneItem.dueAtUtc) }}</em>
                            }
                          </a>
                        } @else {
                          <span class="board-lane board-lane--na">
                            <span class="board-lane-label">{{ column.shortLabel }}</span>
                            <strong>—</strong>
                          </span>
                        }
                      }
                    </div>

                    <a class="board-overall" [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]">
                      <strong>{{ snapshot.responsibilityReadinessPercent }}%</strong>
                      <span>ready</span>
                      @if (snapshot.overdueLaneCount > 0) {
                        <small class="danger-text">{{ snapshot.overdueLaneCount }} overdue</small>
                      } @else if (snapshot.unassignedLaneCount > 0) {
                        <small class="warning-text">{{ snapshot.unassignedLaneCount }} unassigned</small>
                      } @else {
                        <small>On track</small>
                      }
                    </a>
                  </article>
                }
              </div>
            </div>
          }
        </section>

        <section class="director-lower-grid">
          <article class="director-panel">
            <header>
              <div><h2>Needs Attention</h2></div>
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
              <div><h2>Host Activity</h2></div>
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
            <div><h2>Team Workload</h2></div>
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
    .director-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px;padding:4px 0 14px;border-bottom:1px solid #dde1df}
    .director-heading h1,.command-board h2,.director-panel h2{margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:500;color:#17243a}
    .director-heading h1{font-size:clamp(1.8rem,2.6vw,2.5rem)}
    .director-eyebrow{margin:0!important;color:#7c6b38!important;font:800 .67rem/1.2 system-ui,sans-serif!important;letter-spacing:.11em;text-transform:uppercase}
    .director-heading-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .primary-action,.secondary-action{display:inline-flex;min-height:38px;align-items:center;padding:0 13px;border-radius:8px;font-size:.72rem;font-weight:850;text-decoration:none}
    .primary-action{color:#fff;background:#172a46}.secondary-action{color:#172a46;border:1px solid #d6dbe0;background:#fff}
    .director-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:14px}
    .director-summary article,.director-summary button{appearance:none;text-align:left;padding:15px 16px;border:1px solid #dde1df;border-radius:11px;background:#fffdfa;color:inherit;font:inherit;cursor:default}
    .director-summary button{cursor:pointer}.director-summary button.selected{border-color:#9d7438;box-shadow:0 0 0 2px rgba(157,116,56,.12)}
    .director-summary small{display:block;color:#737b78;font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .director-summary strong{display:block;margin:5px 0 2px;font-size:1.45rem;color:#17243a}.director-summary span{font-size:.66rem;color:#7b817e}
    .director-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0}
    .window-switcher{display:flex;gap:4px;padding:4px;border:1px solid #dde1df;border-radius:9px;background:#fff}
    .window-switcher button,.clear-filter{border:0;border-radius:6px;padding:7px 10px;background:transparent;color:#68716d;font-weight:800;font-size:.68rem;cursor:pointer}
    .window-switcher button.selected{color:#fff;background:#172a46}.clear-filter{border:1px solid #dde1df;background:#fff}
    .command-board,.director-panel{border:1px solid #dde1df;border-radius:14px;background:#fffdfa;box-shadow:0 8px 24px rgba(18,26,44,.03)}
    .command-board>header,.director-panel>header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 18px;border-bottom:1px solid #e4e6e4}
    .command-board h2,.director-panel h2{font-size:1.12rem}.command-board>header>span{display:grid;min-width:28px;height:28px;place-items:center;border-radius:999px;background:#f0f2f0;color:#5f6763;font-size:.68rem;font-weight:900}.director-panel header>a{color:#315faf;font-size:.7rem;font-weight:800;text-decoration:none}
    .board-scroll{overflow:auto}.board-list{min-width:1180px}.board-row{display:grid;grid-template-columns:250px minmax(760px,1fr) 82px;gap:12px;align-items:center;padding:12px 14px;border-bottom:1px solid #eceeeb}.board-row:last-child{border-bottom:0}
    .board-engagement{display:flex;min-width:0;flex-direction:column;gap:2px;color:inherit;text-decoration:none}.board-engagement strong{overflow:hidden;text-overflow:ellipsis;font-size:.79rem;white-space:nowrap}.board-engagement span,.board-engagement small{overflow:hidden;text-overflow:ellipsis;color:#747c78;font-size:.62rem;white-space:nowrap}
    .board-lanes{display:grid;grid-template-columns:repeat(8,minmax(84px,1fr));gap:5px}.board-lane{position:relative;display:flex;min-height:58px;flex-direction:column;gap:2px;padding:7px 8px;border:1px solid #e5e7e5;border-radius:8px;background:#f8f7f3;color:#555e59;text-decoration:none;overflow:hidden}.board-lane::before{content:'';position:absolute;inset:0 auto 0 0;width:3px;background:#d5d9d5}.board-lane.complete{background:#eef6f1;border-color:#dcebe1}.board-lane.complete::before{background:#4d8a69}.board-lane.waiting{background:#fbf5e8;border-color:#eee3c8}.board-lane.waiting::before{background:#b58a35}.board-lane.danger{background:#fbefed;border-color:#ecd6d3}.board-lane.danger::before{background:#b95b54}.board-lane.unassigned:not(.danger)::before{background:#c99a48}.board-lane--na{opacity:.48}
    .board-lane-label{color:#7d847f;font-size:.52rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase}.board-lane strong{overflow:hidden;text-overflow:ellipsis;font-size:.62rem;white-space:nowrap}.board-lane small{overflow:hidden;text-overflow:ellipsis;color:#6d7571;font-size:.56rem;white-space:nowrap}.board-lane .needs-owner{color:#986e27;font-weight:800}.board-lane em{color:#8b918d;font-size:.53rem;font-style:normal}
    .board-overall{display:flex;flex-direction:column;align-items:flex-end;gap:1px;color:inherit;text-decoration:none}.board-overall strong{font-size:1.08rem;color:#17243a}.board-overall span,.board-overall small{font-size:.56rem;color:#737b78}
    .director-lower-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px;margin-top:14px}.director-panel{overflow:hidden}.director-panel>header strong{font-size:1.2rem}
    .attention-list,.host-preview-list{display:flex;flex-direction:column}.attention-list>a,.host-preview-list>a{display:grid;gap:10px;padding:13px 18px;border-bottom:1px solid #eceeeb;color:inherit;text-decoration:none}.attention-list>a{grid-template-columns:auto 1fr auto;align-items:center}
    .attention-list>a:last-child,.host-preview-list>a:last-child{border-bottom:0}.attention-status{display:grid;width:25px;height:25px;place-items:center;border-radius:50%;background:#fbf5e8;color:#8a641e;font-weight:900}.attention-status.danger{background:#fbefed;color:#9a433f}
    .attention-list strong,.host-preview-list strong{font-size:.76rem}.attention-list small,.host-preview-list small{display:block;margin-top:2px;color:#7a817e;font-size:.65rem}.attention-list b{font-size:.66rem;color:#5e6863}
    .host-preview-list>a{grid-template-columns:1fr auto}.host-preview-list p{grid-column:1/-1;margin:0;color:#535e58;font-size:.73rem;line-height:1.45}.host-preview-list>a>span{font-size:.65rem;color:#7c827f}
    .team-accountability{margin-top:14px}.team-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:14px}.team-grid article{padding:15px;border:1px solid #e2e5e2;border-radius:11px;background:#f9f8f4}.team-grid article>strong{display:block}.team-grid article>span{display:block;margin:3px 0 12px;color:#757c78;font-size:.65rem}.team-grid dl{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:0}.team-grid dl div{padding:7px;border-radius:7px;background:#fff}.team-grid dt{font-size:.57rem;color:#858b87;text-transform:uppercase}.team-grid dd{margin:2px 0 0;font-weight:850}
    .panel-empty,.director-empty,.director-state{padding:28px;color:#747c78;text-align:center}.director-state{margin:40px auto;border:1px solid #dde1df;border-radius:14px;background:#fff}.director-state--error{color:#9a433f}.danger-text{color:#a84642!important}.warning-text{color:#956d25!important}
    @media(max-width:1050px){.director-summary{grid-template-columns:repeat(3,1fr)}.director-lower-grid{grid-template-columns:1fr}.team-grid{grid-template-columns:repeat(2,1fr)}.board-list{min-width:1060px}.board-row{grid-template-columns:220px minmax(700px,1fr) 72px}}
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
  readonly responsibilityDataUnavailable = signal(false);

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
      error: () => this.loadAssignmentFallback(),
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

  private loadAssignmentFallback(): void {
    this.responsibilityDataUnavailable.set(true);
    this.api.getAssignments().subscribe({
      next: assignments => {
        const snapshots = assignments
          .filter(assignment => !['complete', 'completed', 'archived', 'cancelled'].includes(assignment.status))
          .map(assignment => this.fallbackSnapshot(assignment));
        this.snapshots.set(snapshots);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The Command Center could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  private fallbackSnapshot(assignment: EngagementSummary): EngagementResponsibilitySnapshot {
    return {
      assignment,
      lanes: [],
      responsibilityReadinessPercent: assignment.readinessPercent,
      hostCoordinationPercent: assignment.hostStatus === 'confirmed' ? 100 : 0,
      completedLaneCount: 0,
      applicableLaneCount: 0,
      overdueLaneCount: 0,
      unassignedLaneCount: 0,
    };
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
