import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngagementsApiService } from '../core/engagements-api.service';
import { EngagementSummary } from '../core/models';

@Component({
  selector: 'app-assignment-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="eng-page">
      <p class="eng-eyebrow">Itinerant ministry</p>
      <h1 class="eng-title">Assignments</h1>
      <p class="eng-subtitle">
        Track every approved engagement from initial preparation through travel,
        ministry response, Care Network handoff, and closeout.
      </p>

      <section class="metrics" aria-label="Assignment summary">
        <article><span>Total assignments</span><strong>{{ assignments().length }}</strong><small>Approved ministry engagements</small></article>
        <article><span>Active assignments</span><strong>{{ activeCount() }}</strong><small>Currently in preparation</small></article>
        <article><span>Within 30 days</span><strong>{{ withinThirtyDays() }}</strong><small>Engagements approaching</small></article>
        <article><span>Average readiness</span><strong>{{ averageReadiness() }}%</strong><small>Across all assignments</small></article>
      </section>

      <section class="eng-section">
        <header class="eng-section__header">
          <div>
            <h2>Assignment record</h2>
            <p>This Angular page is reading the same certified Engagements APIs as the current client.</p>
          </div>
          <a class="eng-button secondary" href="/#assignments">Open legacy view</a>
        </header>

        @if (loading()) {
          <div class="state">Loading assignments…</div>
        } @else if (error()) {
          <div class="state state--error">{{ error() }}</div>
        } @else {
          <div class="eng-table">
            @for (item of assignments(); track item.id) {
              <a class="eng-row" [routerLink]="['/assignments', item.id]">
                <span>
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.hostOrganization }} · {{ item.location || 'Location pending' }}</small>
                </span>
                <span>
                  <strong>{{ item.speakerName }}</strong>
                  <small>{{ dateLabel(item.startsAtUtc) }}</small>
                </span>
                <span>
                  <strong>{{ item.readinessPercent }}% ready</strong>
                  <small>{{ item.openTasks }} open tasks</small>
                </span>
                <span class="eng-status" [attr.data-status]="item.status">{{ item.status }}</span>
              </a>
            }
          </div>
        }
      </section>
    </section>
  `,
  styles: [`
    .metrics {
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:.9rem;
      margin-top:1.5rem;
    }
    .metrics article {
      padding:1.1rem 1.2rem;
      border:1px solid var(--eng-line);
      border-radius:11px;
      background:var(--eng-surface);
    }
    .metrics span,.metrics small { display:block; color:var(--eng-muted); }
    .metrics span { font-size:.78rem; }
    .metrics strong { display:block; margin:.35rem 0 .2rem; font-size:2rem; letter-spacing:-.03em; }
    .metrics small { font-size:.75rem; }
    .state { padding:2.5rem; color:var(--eng-muted); text-align:center; }
    .state--error { color:var(--eng-danger); }
    @media (max-width:900px) { .metrics { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media (max-width:560px) { .metrics { grid-template-columns:1fr; } }
  `],
})
export class AssignmentListComponent implements OnInit {
  readonly assignments = signal<readonly EngagementSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeCount = computed(() => this.assignments().filter((item) => item.status !== 'complete').length);
  readonly withinThirtyDays = computed(() => {
    const now = Date.now();
    const horizon = now + 30 * 24 * 60 * 60 * 1000;
    return this.assignments().filter((item) => {
      if (!item.startsAtUtc) return false;
      const value = new Date(item.startsAtUtc).getTime();
      return value >= now && value <= horizon;
    }).length;
  });
  readonly averageReadiness = computed(() => {
    const items = this.assignments();
    if (!items.length) return 0;
    return Math.round(items.reduce((total, item) => total + item.readinessPercent, 0) / items.length);
  });

  constructor(private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    this.api.getAssignments().subscribe({
      next: (items) => {
        this.assignments.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Assignments could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  dateLabel(value: string | null): string {
    if (!value) return 'Date pending';
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
