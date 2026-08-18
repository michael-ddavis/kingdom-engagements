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
    <section class="eng-page engagements-page">
      <header class="engagements-heading">
        <div>
          <p class="eng-eyebrow">Itinerant ministry</p>
          <h1 class="eng-title">Engagements</h1>
          <p class="eng-subtitle">
            Move ministry invitations through preparation, travel, ministry response,
            Care Network handoff, and closeout from one working queue.
          </p>
        </div>
        <div class="engagements-context">
          <strong>{{ activeAssignments().length }} active</strong>
          <span>{{ withinThirtyDays() }} in the next 30 days</span>
          @if (attentionAssignments().length > 0) {
            <span>{{ attentionAssignments().length }} need attention</span>
          }
        </div>
      </header>

      <nav class="engagement-filters" aria-label="Engagement views">
        <button type="button" [class.active]="view() === 'upcoming'" (click)="view.set('upcoming')">
          Upcoming <span>{{ activeAssignments().length }}</span>
        </button>
        <button type="button" [class.active]="view() === 'review'" (click)="view.set('review')">
          Needs review <span>{{ reviewRequests().length }}</span>
        </button>
        <button type="button" [class.active]="view() === 'attention'" (click)="view.set('attention')">
          Needs attention <span>{{ attentionAssignments().length }}</span>
        </button>
        <button type="button" [class.active]="view() === 'completed'" (click)="view.set('completed')">
          Completed <span>{{ completedAssignments().length }}</span>
        </button>
      </nav>

      <section class="engagement-list" aria-live="polite">
        @if (loading()) {
          <div class="state">Loading engagements…</div>
        } @else if (error()) {
          <div class="state state--error">{{ error() }}</div>
        } @else if (view() === 'review') {
          <header class="list-heading">
            <div><p class="eng-eyebrow">Invitation review</p><h2>Requests waiting on a ministry decision</h2></div>
            <span>{{ reviewRequests().length }}</span>
          </header>
          @if (reviewRequests().length === 0) {
            <div class="state">No invitations need review right now.</div>
          } @else {
            @for (item of reviewRequests(); track item.id) {
              <a class="lifecycle-row" routerLink="/invitations" [queryParams]="{ request: item.id }">
                <span class="lifecycle-row__primary">
                  <small>Invitation · {{ statusLabel(item.status) }}</small>
                  <strong>{{ item.eventName }}</strong>
                  <span>{{ item.organizationName }} · {{ requestLocation(item) }}</span>
                </span>
                <span class="lifecycle-row__meta">
                  <small>Requested date</small>
                  <strong>{{ dateLabelFromDate(item.startDate) }}</strong>
                </span>
                <span class="lifecycle-row__next">
                  <small>Next</small>
                  <strong>{{ requestNextStep(item) }}</strong>
                </span>
                <span class="lifecycle-state lifecycle-state--review">Review</span>
              </a>
            }
          }
        } @else {
          <header class="list-heading">
            <div>
              <p class="eng-eyebrow">Engagement record</p>
              <h2>{{ listTitle() }}</h2>
            </div>
            <span>{{ visibleAssignments().length }}</span>
          </header>
          @if (visibleAssignments().length === 0) {
            <div class="state">{{ emptyMessage() }}</div>
          } @else {
            @for (item of visibleAssignments(); track item.id) {
              <a class="lifecycle-row" [routerLink]="['/assignments', item.id]">
                <span class="lifecycle-row__primary">
                  <small>Assignment</small>
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.hostOrganization }} · {{ item.location || 'Location pending' }}</span>
                </span>
                <span class="lifecycle-row__meta">
                  <small>Ministry date</small>
                  <strong>{{ dateLabel(item.startsAtUtc) }}</strong>
                </span>
                <span class="lifecycle-row__next">
                  <small>{{ item.openTasks > 0 ? 'Needs attention' : 'Next' }}</small>
                  <strong>{{ nextStep(item) }}</strong>
                  <span>{{ item.readinessPercent }}% ready</span>
                </span>
                <span class="lifecycle-state" [attr.data-status]="item.status">
                  {{ assignmentState(item) }}
                </span>
              </a>
            }
          }
        }
      </section>
    </section>
  `,
  styles: [`
    .engagements-page{padding-top:1.7rem}.engagements-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:2rem;padding-bottom:1.25rem;border-bottom:1px solid var(--eng-line)}
    .engagements-context{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.35rem .85rem;max-width:420px;color:var(--eng-muted);font-size:.72rem}.engagements-context strong{color:var(--eng-ink)}
    .engagement-filters{display:flex;gap:.25rem;margin:1rem 0;padding:.2rem;border-bottom:1px solid var(--eng-line);overflow:auto}.engagement-filters button{display:flex;align-items:center;gap:.4rem;min-height:38px;padding:.45rem .65rem;border:0;border-bottom:2px solid transparent;color:#697181;background:transparent;font-size:.74rem;font-weight:800;white-space:nowrap;cursor:pointer}.engagement-filters button span{display:grid;min-width:20px;height:20px;place-items:center;border-radius:999px;background:#eceef2;font-size:.62rem}.engagement-filters button.active{border-bottom-color:var(--eng-violet);color:var(--eng-ink)}
    .engagement-list{overflow:hidden;border:1px solid var(--eng-line);border-radius:9px;background:var(--eng-surface)}.list-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1rem 1.15rem;border-bottom:1px solid var(--eng-line);background:#fbfaf8}.list-heading h2{margin:0;font-size:1.05rem}.list-heading>span{color:var(--eng-muted);font-size:.72rem;font-weight:800}
    .lifecycle-row{display:grid;grid-template-columns:minmax(300px,1.35fr) minmax(130px,.45fr) minmax(190px,.75fr) auto;align-items:center;gap:1rem;padding:.9rem 1.15rem;border-bottom:1px solid rgba(18,26,44,.08);text-decoration:none}.lifecycle-row:last-child{border-bottom:0}.lifecycle-row:hover{background:#f8f6f2}.lifecycle-row__primary,.lifecycle-row__meta,.lifecycle-row__next{display:grid;gap:.15rem}.lifecycle-row small{color:#89909c;font-size:.61rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.lifecycle-row strong{font-size:.8rem}.lifecycle-row__primary>strong{font-size:.9rem}.lifecycle-row__primary>span,.lifecycle-row__next>span{color:var(--eng-muted);font-size:.69rem}.lifecycle-state{justify-self:end;padding:.3rem .48rem;border-radius:999px;color:#4d586b;background:#eef1f4;font-size:.64rem;font-weight:850}.lifecycle-state[data-status='complete']{color:var(--eng-green);background:#e7f4ec}.lifecycle-state[data-status='planning']{color:#604abe;background:#eeeafd}.lifecycle-state--review{color:#855f16;background:#fff2d9}.state{padding:2.5rem;color:var(--eng-muted);text-align:center}.state--error{color:var(--eng-danger)}
    @media(max-width:900px){.engagements-heading{display:grid;align-items:start}.engagements-context{justify-content:flex-start}.lifecycle-row{grid-template-columns:1fr auto}.lifecycle-row__meta,.lifecycle-row__next{grid-column:1}.lifecycle-state{grid-column:2;grid-row:1/3}}
    @media(max-width:560px){.eng-title{font-size:2.7rem}.engagement-filters{margin-inline:-.25rem}.lifecycle-row{padding:.85rem}.engagements-context{display:none}}
  `],
})
export class AssignmentListComponent implements OnInit {
  readonly assignments = signal<readonly EngagementSummary[]>([]);
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly view = signal<EngagementView>('upcoming');

  readonly activeAssignments = computed(() =>
    [...this.assignments()]
      .filter(item => item.status !== 'complete')
      .sort((a, b) => this.sortDate(a.startsAtUtc) - this.sortDate(b.startsAtUtc)),
  );
  readonly completedAssignments = computed(() =>
    [...this.assignments()]
      .filter(item => item.status === 'complete')
      .sort((a, b) => this.sortDate(b.startsAtUtc) - this.sortDate(a.startsAtUtc)),
  );
  readonly attentionAssignments = computed(() =>
    this.activeAssignments().filter(item => item.openTasks > 0 || item.readinessPercent < 100),
  );
  readonly reviewRequests = computed(() =>
    this.requests().filter(item => !['approved', 'declined'].includes(item.status)),
  );
  readonly visibleAssignments = computed(() => {
    if (this.view() === 'completed') return this.completedAssignments();
    if (this.view() === 'attention') return this.attentionAssignments();
    return this.activeAssignments();
  });
  readonly withinThirtyDays = computed(() => {
    const now = Date.now();
    const horizon = now + 30 * 24 * 60 * 60 * 1000;
    return this.activeAssignments().filter(item => {
      if (!item.startsAtUtc) return false;
      const value = new Date(item.startsAtUtc).getTime();
      return value >= now && value <= horizon;
    }).length;
  });
  readonly listTitle = computed(() => {
    if (this.view() === 'completed') return 'Completed ministry records';
    if (this.view() === 'attention') return 'Engagements that need something to move';
    return 'Upcoming and active ministry';
  });
  readonly emptyMessage = computed(() => {
    if (this.view() === 'completed') return 'No completed engagement records yet.';
    if (this.view() === 'attention') return 'No active engagements need attention right now.';
    return 'No active engagements are currently scheduled.';
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
        this.error.set('Engagements could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  assignmentState(item: EngagementSummary): string {
    if (item.status === 'complete') return 'Complete';
    if (item.openTasks > 0) return `${item.openTasks} open`;
    return item.readinessPercent === 100 ? 'Ready' : this.statusLabel(item.status);
  }

  nextStep(item: EngagementSummary): string {
    if (item.openTasks > 0) return `${item.openTasks} readiness item${item.openTasks === 1 ? '' : 's'}`;
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

  private sortDate(value: string | null): number {
    return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
  }
}
