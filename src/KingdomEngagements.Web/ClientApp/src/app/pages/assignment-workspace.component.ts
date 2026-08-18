import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import {
  AssignmentWorkspaceDetails,
  EngagementCompletion,
  EngagementDetails,
} from '../core/models';
import { CareNetworkTabComponent } from './tabs/care-network-tab.component';
import { ChecklistTabComponent } from './tabs/checklist-tab.component';
import { CloseoutTabComponent } from './tabs/closeout-tab.component';
import { ContactsTabComponent } from './tabs/contacts-tab.component';
import { DocumentsTabComponent } from './tabs/documents-tab.component';
import { TravelTabComponent } from './tabs/travel-tab.component';

type WorkspaceTab = 'overview' | 'checklist' | 'travel' | 'contacts' | 'care' | 'documents' | 'closeout';

@Component({
  selector: 'app-assignment-workspace',
  standalone: true,
  imports: [
    RouterLink,
    ChecklistTabComponent,
    TravelTabComponent,
    ContactsTabComponent,
    CareNetworkTabComponent,
    DocumentsTabComponent,
    CloseoutTabComponent,
  ],
  template: `
    <section class="eng-page workspace-page">
      <a class="back-link" routerLink="/">← Assignments</a>

      @if (loading()) {
        <div class="loading-state">Loading assignment workspace…</div>
      } @else if (error()) {
        <div class="loading-state loading-state--error">{{ error() }}</div>
      } @else if (assignment(); as item) {
        <header class="workspace-header">
          <div>
            <p class="eng-eyebrow">{{ item.summary.externalAssignmentId }}</p>
            <h1>{{ item.summary.title }}</h1>
            <p>{{ item.summary.hostOrganization }} · {{ item.summary.location || 'Location pending' }}</p>
          </div>
          <div class="workspace-header__status">
            <strong>{{ workspace()?.readiness?.overallPercent ?? item.summary.readinessPercent }}%</strong>
            <span>readiness</span>
            <small>{{ item.summary.openTasks }} open tasks</small>
          </div>
        </header>

        <nav class="assignment-tabs" aria-label="Assignment workspace">
          <section class="tab-group">
            <span>Preparation</span>
            <div>
              <button [class.active]="tab() === 'overview'" (click)="tab.set('overview')"><strong>Overview</strong><small>Assignment brief</small></button>
              <button [class.active]="tab() === 'checklist'" (click)="tab.set('checklist')"><strong>Checklist</strong><small>Readiness work</small></button>
              <button [class.active]="tab() === 'travel'" (click)="tab.set('travel')"><strong>Travel</strong><small>Flights and lodging</small></button>
              <button [class.active]="tab() === 'contacts'" (click)="tab.set('contacts')"><strong>Contacts</strong><small>People and hosts</small></button>
            </div>
          </section>
          <section class="tab-group tab-group--ministry">
            <span>Ministry</span>
            <div>
              <button [class.active]="tab() === 'care'" (click)="tab.set('care')">
                <strong>Care Network</strong>
                <small>Responses, referrals and handoffs</small>
              </button>
            </div>
          </section>
          <section class="tab-group">
            <span>Record</span>
            <div>
              <button [class.active]="tab() === 'documents'" (click)="tab.set('documents')"><strong>Documents</strong><small>Files and resources</small></button>
              <button [class.active]="tab() === 'closeout'" (click)="tab.set('closeout')"><strong>Closeout</strong><small>Outcome and completion</small></button>
            </div>
          </section>
        </nav>

        @switch (tab()) {
          @case ('overview') {
            @if (workspace(); as workspaceRecord) {
              <section class="overview-grid">
                <article class="overview-card assignment-brief">
                  <p class="eng-eyebrow">Assignment brief</p>
                  <h2>{{ item.summary.title }}</h2>
                  <dl>
                    <div><dt>Speaker</dt><dd>{{ item.summary.speakerName }}</dd></div>
                    <div><dt>Host</dt><dd>{{ item.summary.hostOrganization }}</dd></div>
                    <div><dt>Date</dt><dd>{{ dateLabel(item.summary.startsAtUtc) }}</dd></div>
                    <div><dt>Location</dt><dd>{{ item.summary.location || 'Pending' }}</dd></div>
                    <div><dt>Terms</dt><dd>{{ workspaceRecord.preparation.termsStatus }}</dd></div>
                    <div><dt>Host coordination</dt><dd>{{ workspaceRecord.preparation.coordinationStatus.replace('-', ' ') }}</dd></div>
                  </dl>
                  @if (item.notes) { <p class="brief-note">{{ item.notes }}</p> }
                </article>

                <article class="overview-card readiness-card">
                  <div class="readiness-heading">
                    <div><p class="eng-eyebrow">Readiness by work area</p><h2>{{ workspaceRecord.readiness.overallPercent }}% · {{ workspaceRecord.readiness.status.replace('-', ' ') }}</h2></div>
                    <strong>{{ workspaceRecord.readiness.attentionItems.length }}</strong>
                  </div>
                  <div class="readiness-list">
                    @for (lane of workspaceRecord.readiness.lanes; track lane.key) {
                      <article>
                        <div><strong>{{ lane.label }}</strong><small>{{ lane.detail }}</small></div>
                        <div class="progress"><span [style.width.%]="lane.percent"></span></div>
                        <b>{{ lane.percent }}%</b>
                      </article>
                    }
                  </div>
                </article>

                <article class="overview-card attention-card">
                  <p class="eng-eyebrow">Needs attention</p>
                  <h2>What needs to move next?</h2>
                  @if (workspaceRecord.readiness.attentionItems.length === 0) {
                    <div class="empty-list">No readiness gaps are currently surfaced.</div>
                  } @else {
                    <ol>
                      @for (attention of workspaceRecord.readiness.attentionItems; track attention) {
                        <li>{{ attention }}</li>
                      }
                    </ol>
                  }
                </article>

                <article class="overview-card activity-card">
                  <div class="activity-heading"><div><p class="eng-eyebrow">Assignment activity</p><h2>Ministry log</h2></div><span>{{ workspaceRecord.activity.length }} events</span></div>
                  @if (workspaceRecord.activity.length === 0) {
                    <div class="empty-list">No assignment activity is recorded yet.</div>
                  } @else {
                    <div class="activity-list">
                      @for (activity of workspaceRecord.activity.slice(0, 8); track $index) {
                        <article>
                          <span></span>
                          <div><strong>{{ activity.title }}</strong><p>{{ activity.detail }}</p><small>{{ activity.actor }} · {{ dateTimeLabel(activity.occurredAtUtc) }}</small></div>
                        </article>
                      }
                    </div>
                  }
                </article>
              </section>
            }
          }
          @case ('checklist') {
            <app-checklist-tab [assignment]="item" (assignmentUpdated)="assignment.set($event)" />
          }
          @case ('travel') {
            @if (workspace(); as workspaceRecord) {
              <app-travel-tab [workspace]="workspaceRecord" (workspaceUpdated)="workspace.set($event)" />
            }
          }
          @case ('contacts') {
            @if (workspace(); as workspaceRecord) {
              <app-contacts-tab [workspace]="workspaceRecord" (workspaceUpdated)="workspace.set($event)" />
            }
          }
          @case ('care') {
            @if (completion(); as completionRecord) {
              <app-care-network-tab [assignment]="item" [completion]="completionRecord" />
            }
          }
          @case ('documents') {
            @if (workspace(); as workspaceRecord) {
              <app-documents-tab
                [assignment]="item"
                [workspace]="workspaceRecord"
                (assignmentUpdated)="assignment.set($event)"
                (workspaceUpdated)="workspace.set($event)" />
            }
          }
          @case ('closeout') {
            @if (completion(); as completionRecord) {
              <app-closeout-tab
                [assignmentId]="item.summary.id"
                [completion]="completionRecord"
                (completionUpdated)="completion.set($event)" />
            }
          }
        }
      }
    </section>
  `,
  styles: [`
    .workspace-page{padding-top:1.25rem}.back-link{display:inline-block;margin:.35rem 0 1rem;color:#526178;font-size:.8rem;font-weight:800;text-decoration:none}
    .workspace-header{display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;padding-bottom:1.35rem;border-bottom:1px solid var(--eng-line)}.workspace-header h1{margin:0;font-size:clamp(2rem,4vw,3.5rem);line-height:1;letter-spacing:-.04em}.workspace-header p:last-child{margin:.55rem 0 0;color:var(--eng-muted)}.workspace-header__status{display:grid;min-width:130px;justify-items:end}.workspace-header__status strong{font-size:2rem}.workspace-header__status span,.workspace-header__status small{color:var(--eng-muted);font-size:.75rem}
    .assignment-tabs{display:flex;gap:0;margin-top:1rem;overflow:auto;border:1px solid var(--eng-line);border-radius:10px;background:rgba(255,255,255,.72)}.tab-group{display:flex;min-width:max-content;align-items:stretch;border-right:1px solid var(--eng-line)}.tab-group:last-child{border-right:0}.tab-group>span{width:72px;padding:.9rem .55rem;color:#818897;font-size:.64rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;border-right:1px solid var(--eng-line)}.tab-group>div{display:flex}.tab-group button{min-width:150px;padding:.8rem .9rem;border:0;border-right:1px solid rgba(18,26,44,.08);text-align:left;color:var(--eng-ink);background:transparent;cursor:pointer}.tab-group button:last-child{border-right:0}.tab-group button strong,.tab-group button small{display:block}.tab-group button strong{font-size:.82rem}.tab-group button small{margin-top:.22rem;color:#7f8795;font-size:.68rem}.tab-group button.active{background:#fff;box-shadow:inset 0 -2px 0 var(--eng-violet)}.tab-group--ministry>span{color:#315faf}.tab-group--ministry button.active{box-shadow:inset 0 -2px 0 #315faf}
    .overview-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1rem;margin-top:1rem}.overview-card{padding:1.35rem;border:1px solid var(--eng-line);border-radius:12px;background:var(--eng-surface)}.overview-card h2{margin:0;font-size:1.35rem}.assignment-brief dl{display:grid;grid-template-columns:1fr 1fr;margin:1rem 0 0;border:1px solid var(--eng-line);border-radius:8px;overflow:hidden}.assignment-brief dl div{padding:.75rem;border-right:1px solid var(--eng-line);border-bottom:1px solid var(--eng-line)}.assignment-brief dl div:nth-child(2n){border-right:0}.assignment-brief dt{color:var(--eng-muted);font-size:.61rem;text-transform:uppercase}.assignment-brief dd{margin:.2rem 0 0;font-size:.76rem;font-weight:800;text-transform:capitalize}.brief-note{margin:1rem 0 0;padding:.8rem;border-left:3px solid #6b55c9;color:#667080;background:#f7f5fb;font-size:.74rem;line-height:1.5}
    .readiness-heading,.activity-heading{display:flex;justify-content:space-between;gap:1rem}.readiness-heading>strong,.activity-heading>span{height:fit-content;padding:.35rem .5rem;border-radius:999px;background:#edf0f4;color:#5f6878;font-size:.65rem}.readiness-list{display:grid;margin-top:.9rem}.readiness-list>article{display:grid;grid-template-columns:minmax(180px,1fr) minmax(120px,.75fr) 42px;align-items:center;gap:.7rem;padding:.7rem 0;border-bottom:1px solid rgba(18,26,44,.08)}.readiness-list>article:last-child{border-bottom:0}.readiness-list strong,.readiness-list small{display:block}.readiness-list strong{font-size:.75rem}.readiness-list small{margin-top:.17rem;color:var(--eng-muted);font-size:.63rem;line-height:1.35}.progress{height:6px;border-radius:999px;background:#e9ebee;overflow:hidden}.progress span{display:block;height:100%;border-radius:inherit;background:#5d50c6}.readiness-list b{text-align:right;font-size:.7rem}
    .attention-card ol{display:grid;gap:.45rem;margin:1rem 0 0;padding:0;list-style:none;counter-reset:attention}.attention-card li{counter-increment:attention;display:grid;grid-template-columns:28px minmax(0,1fr);gap:.6rem;align-items:start;padding:.7rem;border:1px solid rgba(18,26,44,.08);border-radius:7px;color:#596476;font-size:.72rem;line-height:1.4}.attention-card li:before{content:counter(attention);display:grid;width:24px;height:24px;place-items:center;border-radius:50%;color:#6d51b7;background:#eee9f8;font-size:.62rem;font-weight:900}.empty-list{margin-top:.8rem;padding:1rem;color:var(--eng-muted);background:#faf9f7;border-radius:8px;text-align:center;font-size:.72rem}
    .activity-list{display:grid;margin-top:.7rem}.activity-list article{display:grid;grid-template-columns:15px minmax(0,1fr);gap:.55rem;padding:.65rem 0}.activity-list article>span{width:8px;height:8px;margin-top:.25rem;border:2px solid #6854ca;border-radius:50%}.activity-list strong,.activity-list small{display:block}.activity-list strong{font-size:.73rem}.activity-list p{margin:.2rem 0;color:#626d7d;font-size:.67rem;line-height:1.4}.activity-list small{color:#8a919d;font-size:.61rem}.loading-state{padding:3rem;color:var(--eng-muted);text-align:center}.loading-state--error{color:var(--eng-danger)}
    @media(max-width:900px){.overview-grid{grid-template-columns:1fr}.workspace-header__status{display:none}}
    @media(max-width:620px){.workspace-header{align-items:flex-start}.assignment-brief dl{grid-template-columns:1fr}.assignment-brief dl div{border-right:0}.readiness-list>article{grid-template-columns:1fr 42px}.readiness-list .progress{grid-column:1/-1}}
  `],
})
export class AssignmentWorkspaceComponent implements OnInit {
  readonly assignment = signal<EngagementDetails | null>(null);
  readonly completion = signal<EngagementCompletion | null>(null);
  readonly workspace = signal<AssignmentWorkspaceDetails | null>(null);
  readonly tab = signal<WorkspaceTab>('overview');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: EngagementsApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('The assignment identifier is missing.');
      this.loading.set(false);
      return;
    }

    forkJoin({
      assignment: this.api.getAssignment(id),
      completion: this.api.getCompletion(id),
      workspace: this.api.getWorkspace(id),
    }).subscribe({
      next: ({ assignment, completion, workspace }) => {
        this.assignment.set(assignment);
        this.completion.set(completion);
        this.workspace.set(workspace.workspace);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('This assignment workspace could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  dateLabel(value: string | null): string {
    if (!value) return 'Pending';
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  dateTimeLabel(value: string): string {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
