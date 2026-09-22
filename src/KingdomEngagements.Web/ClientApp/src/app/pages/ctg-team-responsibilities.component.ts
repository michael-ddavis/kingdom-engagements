import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import {
  EngagementResponsibilitySnapshot,
  ResponsibilityLaneDefinition,
  StandingResponsibilityAssignment,
} from '../core/models';

interface OwnerDraft {
  laneKey: string;
  displayName: string;
  email: string;
  userSubject: string;
}

@Component({
  selector: 'app-ctg-team-responsibilities',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="team-page">
      <header class="team-heading">
        <div>
          <p class="eyebrow">CTG · Engagement Operations</p>
          <h1>Team Responsibilities</h1>
          <p>Assign standing owners once. Their responsibility follows them across every active engagement unless Courtney creates a one-engagement override.</p>
        </div>
        <a routerLink="/organization/ctg/command-center">← Command Center</a>
      </header>

      @if (loading()) {
        <div class="state">Loading team responsibilities…</div>
      } @else if (error()) {
        <div class="state error">{{ error() }}</div>
      } @else {
        <section class="team-summary">
          <article><small>Responsibility lanes</small><strong>{{ catalog().length }}</strong><span>Core + optional</span></article>
          <article><small>Standing owners</small><strong>{{ assignments().length }}</strong><span>Organization-wide defaults</span></article>
          <article><small>Unassigned defaults</small><strong>{{ unassignedDefaults() }}</strong><span>Need a standing owner</span></article>
          <article><small>Active overrides</small><strong>{{ overrideCount() }}</strong><span>Engagement-specific ownership</span></article>
        </section>

        <section class="team-card">
          <header>
            <div><p class="eyebrow">Standing responsibility model</p><h2>Who owns what across CTG engagements</h2></div>
            <span>Changes apply to active engagement tasks unless that engagement has an override.</span>
          </header>

          <div class="lane-groups">
            @for (group of groupedCatalog(); track group.name) {
              <section>
                <header class="group-heading">
                  <h3>{{ group.name }}</h3>
                  <span>{{ group.lanes.length }} lane{{ group.lanes.length === 1 ? '' : 's' }}</span>
                </header>
                <div class="lane-list">
                  @for (lane of group.lanes; track lane.key) {
                    <article class="lane-row" [class.optional]="!lane.defaultApplicable">
                      <div class="lane-copy">
                        <div>
                          <strong>{{ lane.label }}</strong>
                          @if (!lane.defaultApplicable) { <span class="optional-chip">Optional</span> }
                        </div>
                        <p>{{ lane.description }}</p>
                      </div>

                      @if (assignmentFor(lane.key); as owner) {
                        <div class="owner-card">
                          <span class="avatar">{{ initials(owner.displayName) }}</span>
                          <span>
                            <strong>{{ owner.displayName }}</strong>
                            <small>{{ owner.email || owner.userSubject }}</small>
                          </span>
                        </div>
                      } @else {
                        <div class="owner-card owner-card--empty">
                          <span class="avatar">?</span>
                          <span><strong>Unassigned</strong><small>No standing owner</small></span>
                        </div>
                      }

                      <div class="lane-health">
                        <span><strong>{{ laneUsage(lane.key).active }}</strong><small>active</small></span>
                        <span><strong>{{ laneUsage(lane.key).complete }}</strong><small>complete</small></span>
                        <span [class.danger]="laneUsage(lane.key).overdue > 0"><strong>{{ laneUsage(lane.key).overdue }}</strong><small>overdue</small></span>
                      </div>

                      <button type="button" (click)="editLane(lane)">
                        {{ assignmentFor(lane.key) ? 'Change owner' : 'Assign owner' }}
                      </button>
                    </article>
                  }
                </div>
              </section>
            }
          </div>
        </section>

        @if (draft(); as form) {
          <div class="editor-backdrop" (click)="closeEditor()"></div>
          <aside class="owner-editor" aria-label="Standing responsibility owner editor">
            <header>
              <div><small>Standing responsibility</small><h2>{{ laneLabel(form.laneKey) }}</h2></div>
              <button type="button" (click)="closeEditor()" aria-label="Close">×</button>
            </header>
            <p>Assign the person who normally owns this responsibility for every CTG engagement. Courtney can still override the owner on a specific engagement.</p>

            <label>
              <span>Team member name</span>
              <input
                [value]="form.displayName"
                (input)="updateDraft('displayName', $any($event.target).value)"
                placeholder="e.g. Marcus Johnson" />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                [value]="form.email"
                (input)="updateDraft('email', $any($event.target).value)"
                placeholder="name@example.org" />
            </label>
            <label>
              <span>ApostolOS account ID</span>
              <input
                [value]="form.userSubject"
                (input)="updateDraft('userSubject', $any($event.target).value)"
                placeholder="Account subject / identity key" />
              <small>This must match the person's authenticated ApostolOS account subject so lane permissions follow them when they sign in.</small>
            </label>

            @if (editorError()) {
              <div class="editor-error">{{ editorError() }}</div>
            }
            @if (editorMessage()) {
              <div class="editor-message">{{ editorMessage() }}</div>
            }

            <footer>
              @if (assignmentFor(form.laneKey)) {
                <button class="danger-button" type="button" [disabled]="saving()" (click)="clearOwner(form.laneKey)">Clear owner</button>
              }
              <span></span>
              <button class="secondary-button" type="button" (click)="closeEditor()">Cancel</button>
              <button class="primary-button" type="button" [disabled]="saving()" (click)="saveOwner()">
                {{ saving() ? 'Saving…' : 'Save standing owner' }}
              </button>
            </footer>
          </aside>
        }

        <section class="team-card team-accountability">
          <header>
            <div><p class="eyebrow">Across active engagements</p><h2>Accountability by team member</h2></div>
            <a routerLink="/organization/ctg/stand-up">Open stand-up →</a>
          </header>

          @if (members().length === 0) {
            <div class="state">No responsibility owners have active work yet.</div>
          } @else {
            <div class="member-grid">
              @for (member of members(); track member.subject) {
                <article>
                  <header>
                    <span class="avatar">{{ initials(member.name) }}</span>
                    <div><strong>{{ member.name }}</strong><small>{{ member.lanes.join(' · ') }}</small></div>
                  </header>
                  <dl>
                    <div><dt>Active pieces</dt><dd>{{ member.active }}</dd></div>
                    <div><dt>Complete</dt><dd>{{ member.complete }}</dd></div>
                    <div><dt>In progress</dt><dd>{{ member.inProgress }}</dd></div>
                    <div><dt>Waiting host</dt><dd>{{ member.waiting }}</dd></div>
                    <div><dt>Overdue</dt><dd [class.danger]="member.overdue > 0">{{ member.overdue }}</dd></div>
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
    :host{display:block}.team-page{width:min(1260px,calc(100% - 38px));margin:0 auto;padding:28px 0 60px;color:#17202b}
    .team-heading{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:18px}.team-heading h1,.team-card h2,.owner-editor h2{margin:4px 0 7px;font:500 clamp(1.7rem,3vw,2.6rem)/1.1 Georgia,'Times New Roman',serif;color:#17243a}.team-heading p{max-width:760px;margin:0;color:#6f7773;line-height:1.55}.team-heading>a,.team-card header>a{color:#315faf;font-size:.72rem;font-weight:850;text-decoration:none}
    .eyebrow{margin:0!important;color:#876f33!important;font:850 .65rem/1.2 system-ui,sans-serif!important;letter-spacing:.1em;text-transform:uppercase}
    .team-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.team-summary article{padding:16px 18px;border:1px solid #dfe3e0;border-radius:12px;background:#fffdfa}.team-summary small{display:block;color:#77807a;font-size:.64rem;font-weight:850;text-transform:uppercase}.team-summary strong{display:block;margin:6px 0 2px;font-size:1.5rem}.team-summary span{font-size:.66rem;color:#858b87}
    .team-card{margin-top:14px;border:1px solid #dfe3e0;border-radius:16px;background:#fffdfa;box-shadow:0 10px 28px rgba(18,26,44,.04);overflow:hidden}.team-card>header{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:18px 20px;border-bottom:1px solid #e5e7e5}.team-card>header h2{font-size:1.25rem}.team-card>header>span{max-width:480px;color:#7b827e;font-size:.68rem;text-align:right}
    .lane-groups>section+section{border-top:1px solid #e5e7e5}.group-heading{display:flex;justify-content:space-between;align-items:center;padding:12px 18px;background:#f5f3ed}.group-heading h3{margin:0;font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:#59635e}.group-heading span{font-size:.63rem;color:#868c88}
    .lane-row{display:grid;grid-template-columns:minmax(260px,1.4fr) minmax(220px,1fr) 220px auto;align-items:center;gap:16px;padding:14px 18px;border-top:1px solid #eceeec}.lane-row:first-child{border-top:0}.lane-row.optional{background:#fcfbf7}.lane-copy>div{display:flex;gap:8px;align-items:center}.lane-copy strong{font-size:.8rem}.lane-copy p{margin:4px 0 0;color:#767e79;font-size:.67rem;line-height:1.45}.optional-chip{padding:3px 6px;border-radius:999px;background:#f4ecd9;color:#8c6724;font-size:.55rem;font-weight:850;text-transform:uppercase}
    .owner-card{display:flex;align-items:center;gap:9px}.owner-card>span:last-child{min-width:0}.owner-card strong,.owner-card small{display:block}.owner-card strong{font-size:.75rem}.owner-card small{max-width:190px;overflow:hidden;text-overflow:ellipsis;color:#7a817d;font-size:.62rem;white-space:nowrap}.owner-card--empty{color:#808681}.avatar{display:grid;flex:0 0 auto;width:34px;height:34px;place-items:center;border-radius:50%;background:#172a46;color:#fff;font-size:.67rem;font-weight:900}
    .lane-health{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.lane-health span{padding:7px;border-radius:7px;background:#f6f5f1;text-align:center}.lane-health strong,.lane-health small{display:block}.lane-health strong{font-size:.78rem}.lane-health small{font-size:.55rem;color:#838985;text-transform:uppercase}.lane-health .danger strong{color:#a84642}
    .lane-row>button{border:1px solid #d8ddda;border-radius:8px;background:#fff;padding:9px 11px;color:#172a46;font-size:.67rem;font-weight:850;cursor:pointer}
    .team-accountability .member-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px}.member-grid article{padding:15px;border:1px solid #e1e4e1;border-radius:11px;background:#f9f8f4}.member-grid header{display:flex;gap:9px;align-items:center}.member-grid header strong,.member-grid header small{display:block}.member-grid header strong{font-size:.78rem}.member-grid header small{margin-top:2px;color:#79817c;font-size:.6rem}.member-grid dl{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin:13px 0 0}.member-grid dl div{padding:7px 4px;border-radius:6px;background:#fff;text-align:center}.member-grid dt{font-size:.51rem;color:#858b87;text-transform:uppercase}.member-grid dd{margin:3px 0 0;font-size:.82rem;font-weight:900}.danger{color:#a84642!important}
    .editor-backdrop{position:fixed;inset:0;z-index:80;background:rgba(13,20,28,.38)}.owner-editor{position:fixed;z-index:81;top:0;right:0;width:min(480px,94vw);height:100vh;padding:22px;overflow:auto;background:#fffdfa;box-shadow:-20px 0 55px rgba(18,26,44,.18)}.owner-editor>header{display:flex;justify-content:space-between;gap:16px}.owner-editor>header h2{font-size:1.65rem}.owner-editor>header small{color:#8a7337;font-size:.62rem;font-weight:850;text-transform:uppercase}.owner-editor>header button{width:36px;height:36px;border:0;border-radius:50%;background:#f0eee8;font-size:1.2rem;cursor:pointer}.owner-editor>p{color:#69716d;font-size:.73rem;line-height:1.55}.owner-editor label{display:block;margin-top:16px}.owner-editor label>span{display:block;margin-bottom:6px;font-size:.67rem;font-weight:850}.owner-editor input{box-sizing:border-box;width:100%;padding:11px;border:1px solid #d4d9d6;border-radius:8px;background:#fff;font:inherit}.owner-editor label small{display:block;margin-top:5px;color:#828985;font-size:.61rem;line-height:1.4}.owner-editor footer{display:grid;grid-template-columns:auto 1fr auto auto;gap:7px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e5e2}.owner-editor footer button{padding:10px 12px;border-radius:8px;font-size:.67rem;font-weight:850;cursor:pointer}.primary-button{border:1px solid #172a46;background:#172a46;color:#fff}.secondary-button{border:1px solid #d4d9d6;background:#fff;color:#172a46}.danger-button{border:1px solid #e0c2bf;background:#fff5f4;color:#a84642}.editor-error,.editor-message{margin-top:14px;padding:10px;border-radius:8px;font-size:.69rem}.editor-error{background:#fbefed;color:#a84642}.editor-message{background:#eef6f1;color:#2d6d52}
    .state{padding:30px;text-align:center;color:#747c78}.state.error{color:#a84642}
    @media(max-width:1000px){.lane-row{grid-template-columns:1fr 1fr}.lane-health{order:3}.lane-row>button{order:4}.team-accountability .member-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:700px){.team-page{width:min(100% - 24px,1260px)}.team-heading{flex-direction:column}.team-summary{grid-template-columns:1fr 1fr}.lane-row{grid-template-columns:1fr}.team-accountability .member-grid{grid-template-columns:1fr}.member-grid dl{grid-template-columns:repeat(3,1fr)}}
  `],
})
export class CtgTeamResponsibilitiesComponent implements OnInit {
  readonly catalog = signal<readonly ResponsibilityLaneDefinition[]>([]);
  readonly assignments = signal<readonly StandingResponsibilityAssignment[]>([]);
  readonly commandCenter = signal<readonly EngagementResponsibilitySnapshot[]>([]);
  readonly draft = signal<OwnerDraft | null>(null);
  readonly saving = signal(false);
  readonly editorError = signal<string | null>(null);
  readonly editorMessage = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly groupedCatalog = computed(() => {
    const groups = new Map<string, ResponsibilityLaneDefinition[]>();
    for (const lane of this.catalog()) {
      const list = groups.get(lane.group) ?? [];
      list.push(lane);
      groups.set(lane.group, list);
    }
    const preferred = ['Coordination', 'Logistics', 'Preparation', 'Administration', 'Follow-up', 'Optional'];
    return [...groups.entries()]
      .map(([name, lanes]) => ({ name, lanes }))
      .sort((a, b) => preferred.indexOf(a.name) - preferred.indexOf(b.name));
  });

  readonly unassignedDefaults = computed(() =>
    this.catalog().filter(lane => lane.defaultApplicable && !this.assignmentFor(lane.key)).length,
  );

  readonly overrideCount = computed(() => {
    let count = 0;
    for (const snapshot of this.commandCenter()) {
      count += snapshot.lanes.filter(lane => lane.owner?.source === 'engagement').length;
    }
    return count;
  });

  readonly members = computed(() => {
    const members = new Map<string, {
      subject: string;
      name: string;
      lanes: Set<string>;
      active: number;
      complete: number;
      inProgress: number;
      waiting: number;
      overdue: number;
    }>();

    for (const snapshot of this.commandCenter()) {
      for (const lane of snapshot.lanes) {
        if (!lane.isApplicable || !lane.owner) continue;
        const member = members.get(lane.owner.userSubject) ?? {
          subject: lane.owner.userSubject,
          name: lane.owner.displayName,
          lanes: new Set<string>(),
          active: 0,
          complete: 0,
          inProgress: 0,
          waiting: 0,
          overdue: 0,
        };
        member.lanes.add(lane.label);
        member.active += 1;
        if (lane.status === 'complete') member.complete += 1;
        if (lane.status === 'in-progress' || lane.status === 'ready-for-review') member.inProgress += 1;
        if (lane.status === 'waiting-on-host') member.waiting += 1;
        if (lane.isOverdue || lane.status === 'overdue') member.overdue += 1;
        members.set(member.subject, member);
      }
    }

    return [...members.values()]
      .map(member => ({ ...member, lanes: [...member.lanes] }))
      .sort((a, b) => b.overdue - a.overdue || a.name.localeCompare(b.name));
  });

  constructor(private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    forkJoin({
      catalog: this.api.getResponsibilityLanes(),
      assignments: this.api.getStandingResponsibilities(),
      commandCenter: this.api.getCommandCenter(),
    }).subscribe({
      next: result => {
        this.catalog.set(result.catalog);
        this.assignments.set(result.assignments);
        this.commandCenter.set(result.commandCenter);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Team responsibilities could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  assignmentFor(laneKey: string): StandingResponsibilityAssignment | null {
    return this.assignments().find(item => item.laneKey === laneKey) ?? null;
  }

  laneUsage(laneKey: string): { active: number; complete: number; overdue: number } {
    const lanes = this.commandCenter().flatMap(snapshot => snapshot.lanes.filter(lane => lane.key === laneKey && lane.isApplicable));
    return {
      active: lanes.length,
      complete: lanes.filter(lane => lane.status === 'complete').length,
      overdue: lanes.filter(lane => lane.isOverdue || lane.status === 'overdue').length,
    };
  }

  editLane(lane: ResponsibilityLaneDefinition): void {
    const current = this.assignmentFor(lane.key);
    this.editorError.set(null);
    this.editorMessage.set(null);
    this.draft.set({
      laneKey: lane.key,
      displayName: current?.displayName ?? '',
      email: current?.email ?? '',
      userSubject: current?.userSubject ?? '',
    });
  }

  updateDraft(field: keyof Omit<OwnerDraft, 'laneKey'>, value: string): void {
    this.draft.update(current => current ? { ...current, [field]: value } : current);
  }

  saveOwner(): void {
    const form = this.draft();
    if (!form) return;
    if (!form.displayName.trim() || !form.userSubject.trim()) {
      this.editorError.set('Team member name and ApostolOS account ID are required.');
      return;
    }

    this.saving.set(true);
    this.editorError.set(null);
    this.editorMessage.set(null);
    this.api.setStandingResponsibility(
      form.laneKey,
      form.userSubject.trim(),
      form.displayName.trim(),
      form.email.trim() || null,
    ).subscribe({
      next: saved => {
        this.assignments.update(items => {
          const remaining = items.filter(item => item.laneKey !== saved.laneKey);
          return [...remaining, saved].sort((a, b) => a.laneKey.localeCompare(b.laneKey));
        });
        this.saving.set(false);
        this.editorMessage.set('Standing owner saved.');
      },
      error: () => {
        this.saving.set(false);
        this.editorError.set('The standing owner could not be saved.');
      },
    });
  }

  clearOwner(laneKey: string): void {
    this.saving.set(true);
    this.editorError.set(null);
    this.api.clearStandingResponsibility(laneKey).subscribe({
      next: () => {
        this.assignments.update(items => items.filter(item => item.laneKey !== laneKey));
        this.saving.set(false);
        this.closeEditor();
      },
      error: () => {
        this.saving.set(false);
        this.editorError.set('The standing owner could not be cleared.');
      },
    });
  }

  closeEditor(): void {
    if (this.saving()) return;
    this.draft.set(null);
    this.editorError.set(null);
    this.editorMessage.set(null);
  }

  laneLabel(laneKey: string): string {
    return this.catalog().find(item => item.key === laneKey)?.label ?? laneKey;
  }

  initials(value: string): string {
    return value.split(/\s+/).filter(Boolean).slice(0, 2).map(item => item[0]?.toUpperCase()).join('') || '?';
  }
}
