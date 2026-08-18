import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import {
  AssignmentWorkspaceDetails,
  EngagementCompletion,
  EngagementDetails,
  MinistryResponse,
} from '../core/models';
import { CareNetworkTabComponent } from './tabs/care-network-tab.component';
import { ChecklistTabComponent } from './tabs/checklist-tab.component';
import { CloseoutTabComponent } from './tabs/closeout-tab.component';
import { ContactsTabComponent } from './tabs/contacts-tab.component';
import { DocumentsTabComponent } from './tabs/documents-tab.component';
import { TravelTabComponent } from './tabs/travel-tab.component';

type WorkspaceTab =
  | 'overview'
  | 'checklist'
  | 'travel'
  | 'contacts'
  | 'care'
  | 'documents'
  | 'responses'
  | 'closeout'
  | 'activity';

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
    <section class="eng-page legacy-workspace-page">
      <a class="legacy-back-link" routerLink="/"><span aria-hidden="true">←</span> Back to assignments</a>

      @if (loading()) {
        <div class="legacy-workspace-state">Loading assignment workspace…</div>
      } @else if (error()) {
        <div class="legacy-workspace-state legacy-workspace-state--error">{{ error() }}</div>
      } @else if (assignment(); as item) {
        <header class="legacy-workspace-heading">
          <div class="legacy-workspace-title">
            <div class="legacy-heading-meta">
              <p class="eng-eyebrow">Ministry assignment</p>
              <span
                class="legacy-heading-status"
                [class.legacy-heading-status--completed]="item.summary.status === 'complete'"
                [class.legacy-heading-status--cancelled]="item.summary.status === 'cancelled'">
                {{ statusLabel(item.summary.status) }}
              </span>
            </div>
            <h1>{{ item.summary.title }}</h1>
            <p>{{ item.summary.hostOrganization }} <span aria-hidden="true">·</span> {{ item.summary.location || 'Location pending' }}</p>
          </div>

          <div class="legacy-heading-summary">
            <article class="legacy-event-date">
              <small>Event dates</small>
              <strong>{{ dateRange(item.summary.startsAtUtc, item.endsAtUtc) }}</strong>
              <span>{{ item.summary.location || 'Location pending' }}</span>
            </article>
            <article class="legacy-heading-readiness">
              <div><small>Overall readiness</small><strong>{{ workspace()?.readiness?.overallPercent ?? item.summary.readinessPercent }}%</strong></div>
              <div class="legacy-heading-progress"><i [style.width.%]="workspace()?.readiness?.overallPercent ?? item.summary.readinessPercent"></i></div>
              <span>{{ item.summary.openTasks }} open task{{ item.summary.openTasks === 1 ? '' : 's' }}</span>
            </article>
          </div>
        </header>

        <nav class="legacy-assignment-tabs" aria-label="Assignment sections">
          <section class="legacy-assignment-tab-group">
            <span class="legacy-assignment-tab-group-label">Assignment</span>
            <div class="legacy-assignment-tab-group-items">
              <button class="legacy-assignment-tab" type="button" [class.is-active]="tab() === 'overview'" (click)="tab.set('overview')">
                <strong>Overview</strong><small>Executive assignment summary</small>
              </button>
            </div>
          </section>

          <section class="legacy-assignment-tab-group legacy-assignment-tab-group--preparation">
            <span class="legacy-assignment-tab-group-label">Preparation</span>
            <div class="legacy-assignment-tab-group-items">
              <button class="legacy-assignment-tab" type="button" [class.is-active]="tab() === 'checklist'" (click)="tab.set('checklist')">
                <strong>Checklist</strong><small>Preparation responsibilities</small>
              </button>
              <button class="legacy-assignment-tab" type="button" [class.is-active]="tab() === 'travel'" (click)="tab.set('travel')">
                <strong>Travel</strong><small>Flights, lodging and transportation</small>
              </button>
              <button class="legacy-assignment-tab" type="button" [class.is-active]="tab() === 'contacts'" (click)="tab.set('contacts')">
                <strong>Contacts</strong><small>Host and assignment contacts</small>
              </button>
              <button class="legacy-assignment-tab legacy-assignment-tab--care" type="button" [class.is-active]="tab() === 'care'" (click)="tab.set('care')">
                <strong>Care Network</strong><small>Consented responses and handoff</small>
              </button>
              <button class="legacy-assignment-tab" type="button" [class.is-active]="tab() === 'documents'" (click)="tab.set('documents')">
                <strong>Documents</strong><small>Files, schedules and resources</small>
              </button>
            </div>
          </section>

          <section class="legacy-assignment-tab-group legacy-assignment-tab-group--record">
            <span class="legacy-assignment-tab-group-label">Record</span>
            <div class="legacy-assignment-tab-group-items">
              <button class="legacy-assignment-tab" type="button" [class.is-active]="tab() === 'responses'" (click)="tab.set('responses')">
                <strong>Responses</strong><small>Ministry outcomes</small>
              </button>
              <button class="legacy-assignment-tab" type="button" [class.is-active]="tab() === 'closeout'" (click)="tab.set('closeout')">
                <strong>Closeout</strong><small>Reconciliation and archive</small>
              </button>
              <button class="legacy-assignment-tab" type="button" [class.is-active]="tab() === 'activity'" (click)="tab.set('activity')">
                <strong>Ministry Log</strong><small>Updates and decisions</small>
              </button>
            </div>
          </section>
        </nav>

        <div class="legacy-exact-workspace">
          @switch (tab()) {
            @case ('overview') {
              @if (workspace(); as workspaceRecord) {
                <section class="legacy-overview-pane">
                  <div class="legacy-overview-page">
                    <div class="legacy-overview-grid">
                      <article class="legacy-overview-card legacy-overview-card--next">
                        <header>
                          <div><p class="eng-eyebrow">Next action</p><h4>What needs to move now</h4></div>
                          <span class="legacy-action-mark" aria-hidden="true">→</span>
                        </header>
                        <strong class="legacy-next-action-title">{{ nextAction(workspaceRecord) }}</strong>
                        <p>{{ nextActionDetail(workspaceRecord) }}</p>
                        <div class="legacy-next-action-meta">
                          <span><strong>{{ item.summary.openTasks }}</strong> open task{{ item.summary.openTasks === 1 ? '' : 's' }}</span>
                          <span><strong>{{ workspaceRecord.readiness.overallPercent }}%</strong> ready</span>
                        </div>
                        @if (workspaceRecord.readiness.attentionItems.length > 0) {
                          <button class="legacy-card-action" type="button" (click)="openNextPreparationTab(workspaceRecord)">
                            Continue preparation <b aria-hidden="true">→</b>
                          </button>
                        } @else {
                          <span class="legacy-card-action legacy-card-action--disabled">Assignment ready <b aria-hidden="true">✓</b></span>
                        }
                      </article>

                      <article class="legacy-overview-card">
                        <header>
                          <div><p class="eng-eyebrow">Host coordination</p><h4>{{ statusLabel(workspaceRecord.preparation.coordinationStatus) }}</h4></div>
                          <span class="legacy-coordinator-avatar" aria-hidden="true">HC</span>
                        </header>
                        <strong class="legacy-next-action-title">{{ workspaceRecord.preparation.coordination.eventName || item.summary.title }}</strong>
                        <p>
                          Travel, lodging, schedule, local contacts, promotional requirements, and prayer focus stay connected to this assignment record.
                        </p>
                        <div class="legacy-host-progress">
                          <span><small>Host preparation</small><strong>{{ hostProgress(workspaceRecord) }}%</strong></span>
                          <div class="legacy-host-progress-track"><i [style.width.%]="hostProgress(workspaceRecord)"></i></div>
                        </div>
                        <button class="legacy-card-action" type="button" (click)="tab.set('travel')">
                          Open host preparation <b aria-hidden="true">→</b>
                        </button>
                      </article>
                    </div>

                    <details class="legacy-invitation-source-panel">
                      <summary>
                        <span class="legacy-source-mark" aria-hidden="true">IN</span>
                        <span class="legacy-source-summary-copy">
                          <small>Invitation source</small>
                          <strong>{{ workspaceRecord.preparation.referenceNumber }}</strong>
                        </span>
                        <span class="legacy-source-summary-note">Approved request → assignment record</span>
                        <span class="legacy-source-chevron" aria-hidden="true">⌄</span>
                      </summary>
                      <div class="legacy-source-content">
                        <article class="legacy-ministry-request-card">
                          <small>Ministry request</small>
                          <p>{{ item.notes || 'This assignment was created from the approved host invitation and continues as the ministry team’s working record.' }}</p>
                        </article>
                        <dl class="legacy-source-facts">
                          <div><dt>Host</dt><dd>{{ item.summary.hostOrganization }}</dd></div>
                          <div><dt>Speaker</dt><dd>{{ item.summary.speakerName }}</dd></div>
                          <div><dt>Terms</dt><dd>{{ statusLabel(workspaceRecord.preparation.termsStatus) }}</dd></div>
                          <div><dt>Host coordination</dt><dd>{{ statusLabel(workspaceRecord.preparation.coordinationStatus) }}</dd></div>
                        </dl>
                        <a class="legacy-source-link" routerLink="/invitations" [queryParams]="{ request: workspaceRecord.preparation.requestId }">
                          View source invitation <span aria-hidden="true">→</span>
                        </a>
                      </div>
                    </details>

                    <section class="legacy-readiness-panel">
                      <header>
                        <div><p class="eng-eyebrow">Readiness radar</p><h4>Assignment preparation</h4></div>
                        <div class="legacy-overall-readiness"><strong>{{ workspaceRecord.readiness.overallPercent }}%</strong><span>{{ statusLabel(workspaceRecord.readiness.status) }}</span></div>
                      </header>
                      <div class="legacy-readiness-list">
                        @for (lane of workspaceRecord.readiness.lanes; track lane.key) {
                          <article class="legacy-readiness-row">
                            <div><strong>{{ lane.label }}</strong><span>{{ lane.detail }}</span></div>
                            <div class="legacy-readiness-progress">
                              <div><i [style.width.%]="lane.percent"></i></div><strong>{{ lane.percent }}%</strong>
                            </div>
                          </article>
                        }
                      </div>
                    </section>
                  </div>
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
                <app-care-network-tab
                  [assignment]="item"
                  [completion]="completionRecord"
                  (completionUpdated)="completion.set($event)" />
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
            @case ('responses') {
              @if (completion(); as completionRecord) {
                <section class="legacy-record-page">
                  <header class="legacy-record-heading">
                    <div><p class="eng-eyebrow">Ministry responses</p><h2>Record what happened</h2><p>Keep aggregate outcomes here. Add personal information only when individual follow-up is needed.</p></div>
                    <strong>{{ completionRecord.totalResponses }} responses</strong>
                  </header>

                  @if (recordMessage()) {
                    <p class="legacy-record-message" [class.is-error]="recordMessageError()">{{ recordMessage() }}</p>
                  }

                  <form class="legacy-response-form" (submit)="addResponse($event)">
                    <div class="legacy-form-section-title"><span>01</span><div><p>Outcome</p><h3>Add a ministry response</h3></div></div>
                    <div class="legacy-field-grid">
                      <label><span>Response type</span><select name="type"><option value="salvation">Salvation</option><option value="recommitment">Recommitment</option><option value="prayer-request">Prayer request</option><option value="healing-testimony">Healing / testimony</option><option value="discipleship">Discipleship interest</option><option value="pastoral-follow-up">Pastoral follow-up</option><option value="ministry-interest">Ministry interest</option><option value="other">Other</option></select></label>
                      <label><span>Count</span><input type="number" name="count" min="1" value="1" required /></label>
                      <label><span>Name <small>only if follow-up is needed</small></span><input name="personName" /></label>
                      <label><span>Email</span><input type="email" name="email" /></label>
                      <label><span>Phone</span><input type="tel" name="phone" /></label>
                      <label><span>Follow-up due</span><input type="datetime-local" name="followUpDueAtUtc" /></label>
                      <label class="wide"><span>Notes</span><textarea name="notes" rows="3"></textarea></label>
                      <label class="legacy-check wide"><input type="checkbox" name="requiresFollowUp" /><span>This response needs individual follow-up</span></label>
                    </div>
                    <footer class="legacy-form-save">
                      <div><strong>Ministry record</strong><p>Personal follow-up moves securely to Kingdom Care after consent is confirmed.</p></div>
                      <button type="submit" [disabled]="responseSaving()">{{ responseSaving() ? 'Adding…' : 'Add response' }}</button>
                    </footer>
                  </form>

                  <section class="legacy-response-list">
                    @if (completionRecord.responses.length === 0) {
                      <p class="legacy-record-empty">No ministry responses have been recorded.</p>
                    } @else {
                      @for (response of completionRecord.responses; track response.id) {
                        <article>
                          <span class="legacy-response-count">{{ response.count }}</span>
                          <div><strong>{{ responseTypeLabel(response) }}</strong><p>{{ response.personName || response.notes || 'Aggregate ministry outcome' }}</p><small>{{ response.careHandoffCreated ? 'With Kingdom Care' : response.requiresFollowUp ? 'Follow-up required' : 'No individual follow-up required' }}</small></div>
                          @if (response.requiresFollowUp && !response.careHandoffCreated) {
                            <button type="button" (click)="tab.set('care')">Open Care Network</button>
                          } @else if (response.careHandoffCreated) {
                            <span class="legacy-response-state">Transferred ✓</span>
                          }
                        </article>
                      }
                    }
                  </section>
                </section>
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
            @case ('activity') {
              @if (workspace(); as workspaceRecord) {
                <section class="legacy-record-page">
                  <header class="legacy-record-heading"><div><p class="eng-eyebrow">Ministry log</p><h2>Assignment history</h2><p>Invitation exchange, terms, host preparation, coordinator edits, files, and readiness updates in one timeline.</p></div><strong>{{ workspaceRecord.activity.length }} events</strong></header>
                  @if (workspaceRecord.activity.length === 0) {
                    <p class="legacy-record-empty">No assignment activity has been recorded yet.</p>
                  } @else {
                    <section class="legacy-activity-list">
                      @for (activity of workspaceRecord.activity; track $index) {
                        <article><i></i><div><header><strong>{{ activity.title }}</strong><time>{{ dateTimeLabel(activity.occurredAtUtc) }}</time></header><p>{{ activity.detail }}</p><small>{{ activity.actor }}</small></div></article>
                      }
                    </section>
                  }
                </section>
              }
            }
          }
        </div>
      }
    </section>
  `,
})
export class AssignmentWorkspaceComponent implements OnInit {
  readonly assignment = signal<EngagementDetails | null>(null);
  readonly completion = signal<EngagementCompletion | null>(null);
  readonly workspace = signal<AssignmentWorkspaceDetails | null>(null);
  readonly tab = signal<WorkspaceTab>('overview');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly recordMessage = signal<string | null>(null);
  readonly recordMessageError = signal(false);
  readonly responseSaving = signal(false);

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

  addResponse(event: Event): void {
    event.preventDefault();
    const item = this.assignment();
    const form = event.currentTarget as HTMLFormElement;
    if (!item || this.responseSaving()) return;

    const data = new FormData(form);
    const dueValue = String(data.get('followUpDueAtUtc') ?? '').trim();
    this.responseSaving.set(true);
    this.recordMessage.set(null);
    this.recordMessageError.set(false);

    this.api.createResponse(item.summary.id, {
      type: String(data.get('type') ?? 'other'),
      count: Math.max(1, Number(data.get('count') ?? 1)),
      personName: this.optionalValue(data.get('personName')),
      email: this.optionalValue(data.get('email')),
      phone: this.optionalValue(data.get('phone')),
      notes: this.optionalValue(data.get('notes')),
      requiresFollowUp: data.get('requiresFollowUp') === 'on',
      followUpOwner: null,
      followUpDueAtUtc: dueValue ? new Date(dueValue).toISOString() : null,
    }).subscribe({
      next: completion => {
        this.completion.set(completion);
        this.responseSaving.set(false);
        form.reset();
        const count = form.elements.namedItem('count') as HTMLInputElement | null;
        if (count) count.value = '1';
        this.recordMessage.set('Ministry response added to the assignment record.');
      },
      error: () => {
        this.responseSaving.set(false);
        this.recordMessageError.set(true);
        this.recordMessage.set('The ministry response could not be added. Check the required fields and try again.');
      },
    });
  }

  openNextPreparationTab(workspace: AssignmentWorkspaceDetails): void {
    const attention = workspace.readiness.attentionItems.join(' ').toLowerCase();
    if (/travel|flight|hotel|lodging|transport/.test(attention)) this.tab.set('travel');
    else if (/contact|host/.test(attention)) this.tab.set('contacts');
    else if (/document|file/.test(attention)) this.tab.set('documents');
    else this.tab.set('checklist');
  }

  hostProgress(workspace: AssignmentWorkspaceDetails): number {
    const lane = workspace.readiness.lanes.find(item =>
      /host|coordination|contact/i.test(`${item.key} ${item.label}`),
    );
    if (lane) return lane.percent;
    return workspace.preparation.coordinationStatus === 'submitted' ? 100 : 50;
  }

  nextAction(workspace: AssignmentWorkspaceDetails): string {
    return workspace.readiness.attentionItems[0] ?? 'Ready for ministry';
  }

  nextActionDetail(workspace: AssignmentWorkspaceDetails): string {
    return workspace.readiness.attentionItems.length > 0
      ? 'Resolve the next readiness signal, then continue through the same assignment record.'
      : 'The current preparation record has no open readiness signals.';
  }

  responseTypeLabel(response: MinistryResponse): string {
    return response.typeLabel
      || response.type.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  statusLabel(value: string): string {
    return value.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  dateRange(start: string | null, end: string | null): string {
    if (!start) return 'Date pending';
    const startDate = new Date(start);
    if (!end) return this.dateLabel(start);
    const endDate = new Date(end);
    const sameDay = startDate.toDateString() === endDate.toDateString();
    if (sameDay) return this.dateLabel(start);
    return `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
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

  private optionalValue(value: FormDataEntryValue | null): string | null {
    const text = String(value ?? '').trim();
    return text.length > 0 ? text : null;
  }
}
