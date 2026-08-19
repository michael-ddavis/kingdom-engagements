import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import { EngagementSummary } from '../core/models';
import { SpeakingRequestDetails } from '../core/speaking-request.models';

type EngagementView = 'upcoming' | 'review' | 'attention' | 'completed';

@Component({
  selector: 'app-assignment-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="eng-page legacy-assignment-index">
      <header class="legacy-assignment-hero">
        <div>
          <p class="eng-eyebrow">Itinerant ministry</p>
          <h1>Engagements</h1>
          <p>
            Invitations, host preparation, ministry travel, responses, Care Network handoff,
            and closeout in one assignment record.
          </p>
        </div>
      </header>

      <section class="legacy-assignment-summary" aria-label="Engagement summary">
        <article>
          <span class="legacy-summary-icon legacy-summary-icon--navy">ACT</span>
          <div><strong>{{ activeAssignments().length }}</strong><span>Active assignments</span><small>Upcoming ministry work</small></div>
        </article>
        <article>
          <span class="legacy-summary-icon legacy-summary-icon--gold">30</span>
          <div><strong>{{ withinThirtyDays() }}</strong><span>Next 30 days</span><small>Assignments approaching</small></div>
        </article>
        <article>
          <span class="legacy-summary-icon legacy-summary-icon--violet">!</span>
          <div><strong>{{ attentionAssignments().length }}</strong><span>Need attention</span><small>Readiness work still open</small></div>
        </article>
        <article>
          <span class="legacy-summary-icon legacy-summary-icon--green">%</span>
          <div><strong>{{ averageReadiness() }}%</strong><span>Average readiness</span><small>Across active assignments</small></div>
        </article>
      </section>

      @if (attentionAssignments().length > 0) {
        <section class="legacy-attention-banner" aria-live="polite">
          <span aria-hidden="true">!</span>
          <div>
            <strong>{{ attentionAssignments().length }} assignment{{ attentionAssignments().length === 1 ? '' : 's' }} need movement.</strong>
            <p>Open the assignment record to resolve preparation, travel, contacts, Care, or closeout responsibilities.</p>
          </div>
        </section>
      }

      <div class="legacy-assignment-toolbar">
        <div class="legacy-filter-group" aria-label="Engagement views">
          <button type="button" [class.selected]="view() === 'upcoming'" (click)="view.set('upcoming')">
            Upcoming <span>{{ activeAssignments().length }}</span>
          </button>
          <button type="button" [class.selected]="view() === 'review'" (click)="view.set('review')">
            Needs review <span>{{ reviewRequests().length }}</span>
          </button>
          <button type="button" [class.selected]="view() === 'attention'" (click)="view.set('attention')">
            Needs attention <span>{{ attentionAssignments().length }}</span>
          </button>
          <button type="button" [class.selected]="view() === 'completed'" (click)="view.set('completed')">
            Completed <span>{{ completedAssignments().length }}</span>
          </button>
        </div>
        <span class="legacy-result-count">
          {{ view() === 'review' ? reviewRequests().length : visibleAssignments().length }} result{{ (view() === 'review' ? reviewRequests().length : visibleAssignments().length) === 1 ? '' : 's' }}
        </span>
      </div>

      <section class="assignment-list" aria-live="polite">
        @if (loading()) {
          <div class="legacy-empty-state"><span>...</span><h2>Loading engagements</h2><p>Opening the current ministry assignment queue.</p></div>
        } @else if (error()) {
          <div class="legacy-empty-state"><span>!</span><h2>Engagements could not be loaded</h2><p>{{ error() }}</p></div>
        } @else if (view() === 'review') {
          @if (reviewRequests().length === 0) {
            <div class="legacy-empty-state"><span>✓</span><h2>No invitations need review</h2><p>The ministry decision queue is clear.</p></div>
          } @else {
            @for (item of reviewRequests(); track item.id) {
              <a class="legacy-assignment-card" routerLink="/invitations" [queryParams]="{ request: item.id }">
                <header class="legacy-assignment-card-heading">
                  <div>
                    <span class="legacy-assignment-status legacy-assignment-status--active">Needs review</span>
                    <span class="legacy-assignment-reference">INVITATION</span>
                  </div>
                  <time class="legacy-event-timing">{{ dateLabelFromDate(item.startDate) }}</time>
                </header>
                <div class="legacy-assignment-card-body">
                  <div class="legacy-assignment-main">
                    <p class="legacy-event-type">Ministry invitation</p>
                    <h2>{{ item.eventName }}</h2>
                    <p class="legacy-organization-name">{{ item.organizationName }}</p>
                    <div class="legacy-event-details">
                      <span><strong>Location</strong>{{ requestLocation(item) }}</span>
                      <span><strong>Status</strong>{{ statusLabel(item.status) }}</span>
                    </div>
                  </div>
                  <aside class="legacy-current-stage">
                    <small>Current stage</small>
                    <strong>Invitation review</strong>
                    <span>{{ requestNextStep(item) }}</span>
                  </aside>
                </div>
                <footer class="legacy-assignment-card-footer">
                  <div class="legacy-assignment-progress">
                    <div><span>Invitation decision</span><strong>Review needed</strong></div>
                    <div class="legacy-progress-bar"><i style="width:35%"></i></div>
                    <small>Approve, request information, or decline before assignment preparation begins.</small>
                  </div>
                  <div class="legacy-assignment-meta">
                    <span class="legacy-next-task"><small>Next action</small><strong>{{ requestNextStep(item) }}</strong><span>Open invitation</span></span>
                    <span class="legacy-open-arrow" aria-hidden="true">→</span>
                  </div>
                </footer>
              </a>
            }
          }
        } @else {
          @if (visibleAssignments().length === 0) {
            <div class="legacy-empty-state"><span>✓</span><h2>{{ emptyTitle() }}</h2><p>{{ emptyMessage() }}</p></div>
          } @else {
            @for (item of visibleAssignments(); track item.id) {
              <a class="legacy-assignment-card" [routerLink]="['/assignments', item.id]">
                <header class="legacy-assignment-card-heading">
                  <div>
                    <span class="legacy-assignment-status" [class]="'legacy-assignment-status legacy-assignment-status--' + statusClass(item)">
                      {{ assignmentState(item) }}
                    </span>
                    <span class="legacy-assignment-reference">{{ item.externalAssignmentId }}</span>
                  </div>
                  <time class="legacy-event-timing" [class.legacy-event-timing--soon]="isWithinThirtyDays(item)">
                    {{ dateLabel(item.startsAtUtc) }}
                  </time>
                </header>

                <div class="legacy-assignment-card-body">
                  <div class="legacy-assignment-main">
                    <p class="legacy-event-type">Ministry assignment</p>
                    <h2>{{ item.title }}</h2>
                    <p class="legacy-organization-name">{{ item.hostOrganization }}</p>
                    <div class="legacy-event-details">
                      <span><strong>Location</strong>{{ item.location || 'Location pending' }}</span>
                      <span><strong>Speaker</strong>{{ item.speakerName }}</span>
                    </div>
                  </div>

                  <aside class="legacy-current-stage">
                    <small>Current stage</small>
                    <strong>{{ currentStage(item) }}</strong>
                    <span>{{ stageDetail(item) }}</span>
                  </aside>
                </div>

                <footer class="legacy-assignment-card-footer">
                  <div class="legacy-assignment-progress">
                    <div><span>Overall readiness</span><strong>{{ item.readinessPercent }}%</strong></div>
                    <div class="legacy-progress-bar"><i [style.width.%]="item.readinessPercent"></i></div>
                    <small>{{ nextStep(item) }}</small>
                  </div>
                  <div class="legacy-assignment-meta">
                    @if (item.openTasks > 0) {
                      <span class="legacy-blocked-count"><b>{{ item.openTasks }}</b> open</span>
                    }
                    <span class="legacy-next-task">
                      <small>Next action</small>
                      <strong>{{ nextStep(item) }}</strong>
                      <span>Open assignment record</span>
                    </span>
                    <span class="legacy-open-arrow" aria-hidden="true">→</span>
                  </div>
                </footer>
              </a>
            }
          }
        }
      </section>
    </section>
  `,
})
export class AssignmentListComponent implements OnInit {
  private readonly curatedDemoAssignments = new Set([
    'assignment-demo-001',
    'assignment-demo-002',
    'assignment-demo-007',
  ]);
  private readonly curatedDemoRequests = new Set(['CTG-DEMO-001']);

  readonly assignments = signal<readonly EngagementSummary[]>([]);
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly view = signal<EngagementView>('upcoming');

  readonly activeAssignments = computed(() =>
    [...this.assignments()]
      .filter(item => this.shouldShowAssignment(item))
      .filter(item => item.status !== 'complete')
      .sort((a, b) => this.sortDate(a.startsAtUtc) - this.sortDate(b.startsAtUtc)),
  );
  readonly completedAssignments = computed(() =>
    [...this.assignments()]
      .filter(item => this.shouldShowAssignment(item))
      .filter(item => item.status === 'complete')
      .sort((a, b) => this.sortDate(b.startsAtUtc) - this.sortDate(a.startsAtUtc)),
  );
  readonly attentionAssignments = computed(() =>
    this.activeAssignments().filter(item => item.openTasks > 0 || item.readinessPercent < 100),
  );
  readonly reviewRequests = computed(() =>
    this.requests()
      .filter(item => this.shouldShowRequest(item))
      .filter(item => !['approved', 'declined'].includes(item.status)),
  );
  readonly visibleAssignments = computed(() => {
    if (this.view() === 'completed') return this.completedAssignments();
    if (this.view() === 'attention') return this.attentionAssignments();
    return this.activeAssignments();
  });
  readonly withinThirtyDays = computed(() =>
    this.activeAssignments().filter(item => this.isWithinThirtyDays(item)).length,
  );
  readonly averageReadiness = computed(() => {
    const items = this.activeAssignments();
    if (items.length === 0) return 0;
    return Math.round(items.reduce((sum, item) => sum + item.readinessPercent, 0) / items.length);
  });

  constructor(private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    forkJoin({ assignments: this.api.getAssignments(), requests: this.api.getRequests() }).subscribe({
      next: ({ assignments, requests }) => {
        this.assignments.set(assignments);
        this.requests.set(requests);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The assignment queue could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  assignmentState(item: EngagementSummary): string {
    if (item.status === 'complete') return 'Completed';
    if (item.openTasks > 0) return 'Active';
    return item.readinessPercent === 100 ? 'Ready' : this.statusLabel(item.status);
  }

  statusClass(item: EngagementSummary): 'active' | 'completed' | 'cancelled' {
    if (item.status === 'complete') return 'completed';
    if (item.status === 'cancelled') return 'cancelled';
    return 'active';
  }

  currentStage(item: EngagementSummary): string {
    if (item.status === 'complete') return 'Assignment complete';
    if (item.closeoutStatus === 'complete') return 'Closeout complete';
    if (item.readinessPercent === 100) return 'Ready for ministry';
    if (item.travelStatus !== 'complete' || item.lodgingStatus !== 'complete') return 'Travel preparation';
    if (item.hostStatus !== 'complete') return 'Host coordination';
    return 'Assignment preparation';
  }

  stageDetail(item: EngagementSummary): string {
    if (item.status === 'complete') return 'The ministry record is closed and available for reference.';
    if (item.openTasks > 0) return `${item.openTasks} preparation item${item.openTasks === 1 ? '' : 's'} still need attention.`;
    if (item.readinessPercent === 100) return 'Travel, host preparation, and assignment responsibilities are ready.';
    return 'Continue the assignment record until readiness is complete.';
  }

  nextStep(item: EngagementSummary): string {
    if (item.status === 'complete') return 'Review completed record';
    if (item.openTasks > 0) return `${item.openTasks} readiness item${item.openTasks === 1 ? '' : 's'} to resolve`;
    if (item.readinessPercent === 100) return 'Ready for ministry';
    return 'Continue preparation';
  }

  requestNextStep(item: SpeakingRequestDetails): string {
    return item.status === 'information-needed' ? 'Waiting on host information' : 'Review ministry request';
  }

  requestLocation(item: SpeakingRequestDetails): string {
    return [item.city, item.state || item.region, item.country].filter(Boolean).join(', ') || 'Location pending';
  }

  statusLabel(value: string): string {
    return value.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  dateLabel(value: string | null): string {
    if (!value) return 'Date pending';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  dateLabelFromDate(value: string): string {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  isWithinThirtyDays(item: EngagementSummary): boolean {
    if (!item.startsAtUtc) return false;
    const now = Date.now();
    const value = new Date(item.startsAtUtc).getTime();
    return value >= now && value <= now + 30 * 24 * 60 * 60 * 1000;
  }

  emptyTitle(): string {
    if (this.view() === 'completed') return 'No completed assignments yet';
    if (this.view() === 'attention') return 'Nothing needs attention';
    return 'No active assignments';
  }

  emptyMessage(): string {
    if (this.view() === 'completed') return 'Completed ministry records will appear here.';
    if (this.view() === 'attention') return 'Every active assignment is currently moving without an open readiness signal.';
    return 'Approved ministry assignments will appear here when they are scheduled.';
  }

  private shouldShowAssignment(item: EngagementSummary): boolean {
    if (item.title.startsWith('Demo-lock Engagement ')) return false;
    if (!item.externalAssignmentId.startsWith('assignment-demo-')) return true;
    return this.curatedDemoAssignments.has(item.externalAssignmentId);
  }

  private shouldShowRequest(item: SpeakingRequestDetails): boolean {
    if (item.eventName.startsWith('Demo-lock Engagement ')) return false;
    if (!item.referenceNumber.startsWith('CTG-DEMO-')) return true;
    return this.curatedDemoRequests.has(item.referenceNumber);
  }

  private sortDate(value: string | null): number {
    return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
  }
}
