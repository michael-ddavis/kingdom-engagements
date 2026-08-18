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
      <a class="back-link" routerLink="/">← Engagements</a>

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
          <section class="tab-cluster tab-cluster--preparation">
            <span>Preparation</span>
            <div>
              <button [class.active]="tab() === 'overview'" (click)="tab.set('overview')">Overview</button>
              <button [class.active]="tab() === 'checklist'" (click)="tab.set('checklist')">Checklist</button>
              <button [class.active]="tab() === 'travel'" (click)="tab.set('travel')">Travel</button>
              <button [class.active]="tab() === 'contacts'" (click)="tab.set('contacts')">Contacts</button>
            </div>
          </section>
          <span class="tab-divider" aria-hidden="true"></span>
          <section class="tab-cluster tab-cluster--ministry">
            <span>Ministry</span>
            <div><button [class.active]="tab() === 'care'" (click)="tab.set('care')">Care Network</button></div>
          </section>
          <span class="tab-divider" aria-hidden="true"></span>
          <section class="tab-cluster tab-cluster--record">
            <span>Record</span>
            <div>
              <button [class.active]="tab() === 'documents'" (click)="tab.set('documents')">Documents</button>
              <button [class.active]="tab() === 'closeout'" (click)="tab.set('closeout')">Closeout</button>
            </div>
          </section>
        </nav>

        @switch (tab()) {
          @case ('overview') {
            @if (workspace(); as workspaceRecord) {
              <section class="overview-record">
                <div class="overview-primary">
                  <article class="assignment-brief">
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

                  <article class="ready-summary">
                    <div class="ready-heading">
                      <div>
                        <p class="eng-eyebrow">Readiness</p>
                        <h2>{{ workspaceRecord.readiness.attentionItems.length === 0 ? 'Ready for ministry' : 'Preparation in progress' }}</h2>
                      </div>
                      <strong [class.ready]="workspaceRecord.readiness.attentionItems.length === 0">
                        {{ workspaceRecord.readiness.overallPercent }}%
                      </strong>
                    </div>
                    <div class="ready-list">
                      @for (lane of workspaceRecord.readiness.lanes; track lane.key) {
                        <article [class.complete]="lane.percent === 100">
                          <span>{{ lane.percent === 100 ? '✓' : '!' }}</span>
                          <div><strong>{{ lane.label }}</strong><small>{{ lane.detail }}</small></div>
                          @if (lane.percent < 100) { <b>{{ lane.percent }}%</b> }
                        </article>
                      }
                    </div>
                  </article>
                </div>

                @if (workspaceRecord.readiness.attentionItems.length > 0) {
                  <section class="attention-strip">
                    <div><p class="eng-eyebrow">Needs attention</p><h3>What needs to move next?</h3></div>
                    <ul>
                      @for (attention of workspaceRecord.readiness.attentionItems; track attention) {
                        <li>{{ attention }}</li>
                      }
                    </ul>
                  </section>
                }

                <section class="activity-section">
                  <header><div><p class="eng-eyebrow">Assignment activity</p><h2>Ministry log</h2></div><span>{{ workspaceRecord.activity.length }} events</span></header>
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
                </section>
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
    .workspace-page{padding-top:1.25rem}.back-link{display:inline-block;margin:.35rem 0 1rem;color:#526178;font-size:.76rem;font-weight:800;text-decoration:none}
    .workspace-header{display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;padding-bottom:1.2rem;border-bottom:1px solid var(--eng-line)}.workspace-header h1{margin:0;font-size:clamp(2rem,4vw,3.4rem);line-height:1;letter-spacing:-.04em}.workspace-header p:last-child{margin:.5rem 0 0;color:var(--eng-muted)}.workspace-header__status{display:grid;min-width:120px;justify-items:end}.workspace-header__status strong{font-size:1.85rem}.workspace-header__status span,.workspace-header__status small{color:var(--eng-muted);font-size:.7rem}
    .assignment-tabs{display:flex;width:100%;align-items:stretch;gap:.75rem;margin-top:1rem;padding:.55rem .8rem .2rem;border:1px solid var(--eng-line);border-radius:8px;background:rgba(255,255,255,.48);overflow-x:auto}.tab-cluster{display:grid;min-width:0;gap:.12rem}.tab-cluster--preparation{flex:4 1 0}.tab-cluster--ministry{flex:1.25 1 0}.tab-cluster--record{flex:2 1 0}.tab-cluster>span{padding-left:.55rem;color:#8a909b;font-size:.54rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.tab-cluster--ministry>span{color:var(--eng-blue)}.tab-cluster>div{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(88px,1fr)}.tab-cluster button{min-height:42px;padding:.48rem .7rem;border:0;border-bottom:2px solid transparent;color:#5f6878;background:transparent;font-size:.72rem;font-weight:800;white-space:nowrap;cursor:pointer}.tab-cluster button:hover{color:var(--eng-ink);background:rgba(255,255,255,.64)}.tab-cluster button.active{border-bottom-color:var(--eng-violet);color:var(--eng-ink);background:#fff}.tab-cluster--ministry button.active{border-bottom-color:var(--eng-blue)}.tab-divider{width:1px;margin:.9rem 0 .35rem;background:var(--eng-line);flex:0 0 1px}
    .overview-record{margin-top:1rem;border:1px solid var(--eng-line);border-radius:9px;background:var(--eng-surface);overflow:hidden}.overview-primary{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.assignment-brief,.ready-summary{padding:1.25rem 1.35rem}.assignment-brief{border-right:1px solid var(--eng-line)}.assignment-brief h2,.ready-summary h2,.activity-section h2{margin:0;font-size:1.2rem}.assignment-brief dl{display:grid;grid-template-columns:1fr 1fr;margin:1rem 0 0;border-top:1px solid var(--eng-line);border-left:1px solid var(--eng-line)}.assignment-brief dl div{padding:.72rem;border-right:1px solid var(--eng-line);border-bottom:1px solid var(--eng-line)}.assignment-brief dt{color:var(--eng-muted);font-size:.58rem;text-transform:uppercase}.assignment-brief dd{margin:.18rem 0 0;font-size:.74rem;font-weight:800;text-transform:capitalize}.brief-note{margin:1rem 0 0;padding:.7rem;border-left:3px solid #6b55c9;color:#667080;background:#f7f5fb;font-size:.7rem;line-height:1.45}
    .ready-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.ready-heading>strong{font-size:1.35rem;color:#86631f}.ready-heading>strong.ready{color:var(--eng-green)}.ready-list{display:grid;margin-top:.8rem}.ready-list article{display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:.55rem;padding:.58rem 0;border-bottom:1px solid rgba(18,26,44,.08)}.ready-list article:last-child{border-bottom:0}.ready-list article>span{display:grid;width:22px;height:22px;place-items:center;border-radius:50%;color:#835e19;background:#fff0cf;font-size:.62rem;font-weight:900}.ready-list article.complete>span{color:#fff;background:#2d7d5c}.ready-list strong,.ready-list small{display:block}.ready-list strong{font-size:.72rem}.ready-list small{margin-top:.12rem;color:var(--eng-muted);font-size:.62rem;line-height:1.35}.ready-list b{font-size:.65rem;color:#8b651b}
    .attention-strip{display:grid;grid-template-columns:minmax(180px,.55fr) minmax(0,1.45fr);gap:1rem;padding:1rem 1.35rem;border-top:1px solid #ebd7ae;border-bottom:1px solid #ebd7ae;background:#fff9ed}.attention-strip h3{margin:0;font-size:.95rem}.attention-strip ul{display:grid;gap:.3rem;margin:0;padding-left:1.1rem;color:#665d4c;font-size:.7rem;line-height:1.45}
    .activity-section{padding:1.15rem 1.35rem}.activity-section>header{display:flex;justify-content:space-between;gap:1rem}.activity-section>header>span{color:var(--eng-muted);font-size:.68rem}.activity-list{display:grid;margin-top:.6rem}.activity-list article{display:grid;grid-template-columns:15px minmax(0,1fr);gap:.55rem;padding:.58rem 0}.activity-list article>span{width:8px;height:8px;margin-top:.25rem;border:2px solid #6854ca;border-radius:50%}.activity-list strong,.activity-list small{display:block}.activity-list strong{font-size:.72rem}.activity-list p{margin:.18rem 0;color:#626d7d;font-size:.66rem;line-height:1.4}.activity-list small{color:#8a919d;font-size:.6rem}.empty-list{margin-top:.7rem;padding:.9rem;color:var(--eng-muted);background:#faf9f7;text-align:center;font-size:.7rem}.loading-state{padding:3rem;color:var(--eng-muted);text-align:center}.loading-state--error{color:var(--eng-danger)}
    @media(max-width:900px){.overview-primary{grid-template-columns:1fr}.assignment-brief{border-right:0;border-bottom:1px solid var(--eng-line)}.workspace-header__status{display:none}.attention-strip{grid-template-columns:1fr}.assignment-tabs{min-width:760px}}
    @media(max-width:620px){.workspace-header{align-items:flex-start}.assignment-brief dl{grid-template-columns:1fr}.assignment-tabs{margin-inline:-.1rem;padding-inline:.45rem}.tab-cluster button{padding-inline:.58rem}}
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
