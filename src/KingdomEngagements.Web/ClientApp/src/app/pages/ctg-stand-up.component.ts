import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EngagementsApiService } from '../core/engagements-api.service';
import { EngagementResponsibilitySnapshot, ResponsibilityLaneState } from '../core/models';

@Component({
  selector: 'app-ctg-stand-up',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="standup-page">
      <header class="standup-header">
        <div>
          <p>CTG · Engagement Operations</p>
          <h1>Stand-Up Mode</h1>
          <span>Walk the team through each upcoming engagement without leaving the page.</span>
        </div>
        <div>
          <a routerLink="/organization/ctg/command-center">← Command Center</a>
          <button type="button" (click)="showAll.set(!showAll())">{{ showAll() ? 'Focus one at a time' : 'Show all engagements' }}</button>
        </div>
      </header>

      @if (loading()) {
        <div class="standup-state">Loading stand-up…</div>
      } @else if (error()) {
        <div class="standup-state standup-state--error">{{ error() }}</div>
      } @else if (items().length === 0) {
        <div class="standup-state">No engagements are scheduled in the next 30 days.</div>
      } @else if (showAll()) {
        <section class="standup-list">
          @for (snapshot of items(); track snapshot.assignment.id) {
            <ng-container [ngTemplateOutlet]="standupCard" [ngTemplateOutletContext]="{ snapshot: snapshot }"></ng-container>
          }
        </section>
      } @else {
        @if (current(); as snapshot) {
          <div class="standup-progress">
            <span>Engagement {{ index() + 1 }} of {{ items().length }}</span>
            <div><i [style.width.%]="((index() + 1) / items().length) * 100"></i></div>
          </div>

          <ng-container [ngTemplateOutlet]="standupCard" [ngTemplateOutletContext]="{ snapshot: snapshot }"></ng-container>

          <nav class="standup-controls" aria-label="Stand-up navigation">
            <button type="button" [disabled]="index() === 0" (click)="previous()">← Previous</button>
            <a [routerLink]="['/assignments', snapshot.assignment.id]">Open engagement workspace</a>
            <button type="button" [disabled]="index() === items().length - 1" (click)="next()">Next engagement →</button>
          </nav>
        }
      }

      <ng-template #standupCard let-snapshot="snapshot">
        <article class="standup-card">
          <header>
            <div>
              <small>{{ dateLabel(snapshot.assignment.startsAtUtc) }} · {{ snapshot.assignment.location || 'Location pending' }}</small>
              <h2>{{ snapshot.assignment.title }}</h2>
              <p>{{ snapshot.assignment.hostOrganization }}</p>
            </div>
            <div class="readiness">
              <strong>{{ snapshot.responsibilityReadinessPercent }}%</strong>
              <span>Operational readiness</span>
            </div>
          </header>

          <section class="standup-summary">
            <article><strong>{{ snapshot.completedLaneCount }}/{{ snapshot.applicableLaneCount }}</strong><span>Lanes complete</span></article>
            <article><strong>{{ snapshot.hostCoordinationPercent }}%</strong><span>Host coordination</span></article>
            <article [class.danger]="snapshot.overdueLaneCount > 0"><strong>{{ snapshot.overdueLaneCount }}</strong><span>Overdue</span></article>
            <article [class.warning]="snapshot.unassignedLaneCount > 0"><strong>{{ snapshot.unassignedLaneCount }}</strong><span>Unassigned</span></article>
          </section>

          <section class="standup-lanes">
            @for (laneItem of importantLanes(snapshot); track laneItem.key) {
              <article
                [class.complete]="laneItem.status === 'complete'"
                [class.waiting]="laneItem.status === 'waiting-on-host'"
                [class.danger]="laneItem.isOverdue || laneItem.status === 'blocked'">
                <div>
                  <strong>{{ laneItem.label }}</strong>
                  <span>{{ laneItem.owner?.displayName || 'Unassigned' }}</span>
                </div>
                <b>{{ laneStatus(laneItem) }}</b>
                <small>{{ laneItem.detail || dueLabel(laneItem) }}</small>
              </article>
            }
          </section>

          @if (blockers(snapshot).length > 0) {
            <section class="standup-blockers">
              <h3>What needs attention</h3>
              @for (laneItem of blockers(snapshot); track laneItem.key) {
                <div>
                  <span>!</span>
                  <p><strong>{{ laneItem.label }}</strong> — {{ blockerReason(laneItem) }}</p>
                </div>
              }
            </section>
          } @else {
            <section class="standup-clear">
              <strong>Nothing is blocked.</strong>
              <span>Every applicable responsibility is assigned and on track.</span>
            </section>
          }
        </article>
      </ng-template>
    </section>
  `,
  styles: [`
    :host{display:block;background:#f5f3ee;min-height:calc(100vh - 72px)}
    .standup-page{width:min(1180px,calc(100% - 36px));margin:0 auto;padding:28px 0 60px}
    .standup-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:20px}
    .standup-header p{margin:0;color:#8c7434;font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    .standup-header h1{margin:5px 0;font:500 clamp(2rem,4vw,3.5rem)/1 Georgia,'Times New Roman',serif;color:#17243a}
    .standup-header span{color:#6c746f}.standup-header>div:last-child{display:flex;gap:8px;flex-wrap:wrap}
    .standup-header a,.standup-header button,.standup-controls a,.standup-controls button{min-height:40px;padding:0 13px;border:1px solid #d8ddda;border-radius:9px;background:#fff;color:#172a46;font:800 .72rem system-ui,sans-serif;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
    .standup-header button,.standup-controls button:last-child{color:#fff;background:#172a46;border-color:#172a46}.standup-controls button:disabled{opacity:.35;cursor:not-allowed}
    .standup-progress{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:14px;margin:12px 0;color:#68716d;font-size:.7rem;font-weight:800}.standup-progress div{height:5px;background:#e0e3e0;border-radius:999px;overflow:hidden}.standup-progress i{display:block;height:100%;background:#9d7438}
    .standup-card{overflow:hidden;border:1px solid #dce0dd;border-radius:18px;background:#fffdfa;box-shadow:0 16px 40px rgba(18,26,44,.06)}
    .standup-card>header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:25px 28px;border-bottom:1px solid #e2e5e2;background:linear-gradient(100deg,#fffdfa,#f7f4eb)}
    .standup-card>header small{color:#8b7435;font-size:.66rem;font-weight:850;text-transform:uppercase;letter-spacing:.08em}.standup-card h2{margin:5px 0 3px;font:500 2rem/1.1 Georgia,'Times New Roman',serif;color:#17243a}.standup-card>header p{margin:0;color:#69716d}
    .readiness{text-align:right}.readiness strong{display:block;font-size:2.2rem;color:#172a46}.readiness span{color:#777f7a;font-size:.68rem}
    .standup-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid #e5e7e4}.standup-summary article{padding:16px 20px;border-right:1px solid #e5e7e4}.standup-summary article:last-child{border-right:0}.standup-summary strong{display:block;font-size:1.25rem}.standup-summary span{font-size:.66rem;color:#7a817d}.standup-summary .danger strong{color:#a84642}.standup-summary .warning strong{color:#996e25}
    .standup-lanes{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;padding:18px}.standup-lanes article{min-height:105px;padding:13px;border:1px solid #e1e4e1;border-radius:11px;background:#f8f7f3}.standup-lanes article.complete{background:#eef6f1;border-color:#d6e8dc}.standup-lanes article.waiting{background:#fbf5e8;border-color:#ebdfbe}.standup-lanes article.danger{background:#fbefed;border-color:#ead1ce}.standup-lanes article>div{display:flex;justify-content:space-between;gap:8px}.standup-lanes strong{font-size:.75rem}.standup-lanes span{color:#747c78;font-size:.63rem;text-align:right}.standup-lanes b{display:block;margin:11px 0 4px;font-size:.72rem}.standup-lanes small{color:#777f7a;font-size:.62rem}
    .standup-blockers{margin:0 18px 18px;padding:16px;border:1px solid #ead1ce;border-radius:11px;background:#fff8f7}.standup-blockers h3{margin:0 0 9px;font-size:.78rem;color:#8f3e3b}.standup-blockers div{display:flex;gap:8px;align-items:flex-start;margin:6px 0}.standup-blockers div>span{display:grid;width:21px;height:21px;place-items:center;border-radius:50%;background:#a84642;color:#fff;font-weight:900;font-size:.65rem}.standup-blockers p{margin:1px 0;font-size:.72rem;color:#5c625f}
    .standup-clear{margin:0 18px 18px;padding:15px;border-radius:10px;background:#eef6f1;color:#2d6d52}.standup-clear strong{display:block}.standup-clear span{font-size:.7rem}
    .standup-controls{display:flex;justify-content:space-between;gap:8px;margin-top:14px}.standup-list{display:flex;flex-direction:column;gap:16px}.standup-state{padding:40px;border:1px solid #dce0dd;border-radius:14px;background:#fff;text-align:center;color:#737b77}.standup-state--error{color:#a84642}
    @media(max-width:850px){.standup-lanes{grid-template-columns:1fr 1fr}.standup-header{flex-direction:column}.standup-summary{grid-template-columns:1fr 1fr}.standup-summary article:nth-child(2){border-right:0}.standup-summary article:nth-child(-n+2){border-bottom:1px solid #e5e7e4}}
    @media(max-width:560px){.standup-lanes{grid-template-columns:1fr}.standup-card>header{align-items:flex-start;flex-direction:column}.readiness{text-align:left}.standup-controls{flex-direction:column}}
  `],
})
export class CtgStandUpComponent implements OnInit {
  readonly snapshots = signal<readonly EngagementResponsibilitySnapshot[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly index = signal(0);
  readonly showAll = signal(false);

  readonly items = computed(() => {
    const now = Date.now();
    const upper = now + 30 * 86_400_000;
    return [...this.snapshots()]
      .filter(item => {
        if (!item.assignment.startsAtUtc) return true;
        const date = new Date(item.assignment.startsAtUtc).getTime();
        return date >= now - 86_400_000 && date <= upper;
      })
      .sort((a, b) => this.dateValue(a.assignment.startsAtUtc) - this.dateValue(b.assignment.startsAtUtc));
  });

  readonly current = computed(() => this.items()[this.index()] ?? null);

  constructor(private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    this.api.getCommandCenter().subscribe({
      next: items => {
        this.snapshots.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Stand-up data could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  next(): void {
    this.index.update(value => Math.min(value + 1, this.items().length - 1));
  }

  previous(): void {
    this.index.update(value => Math.max(value - 1, 0));
  }

  importantLanes(snapshot: EngagementResponsibilitySnapshot): readonly ResponsibilityLaneState[] {
    const keys = ['host-coordination', 'travel', 'lodging', 'transportation', 'media', 'program', 'documents', 'finance'];
    return keys
      .map(key => snapshot.lanes.find(lane => lane.key === key && lane.isApplicable))
      .filter((lane): lane is ResponsibilityLaneState => !!lane);
  }

  blockers(snapshot: EngagementResponsibilitySnapshot): readonly ResponsibilityLaneState[] {
    return snapshot.lanes.filter(lane =>
      lane.isApplicable &&
      (lane.owner === null || lane.isOverdue || ['blocked', 'overdue'].includes(lane.status)),
    );
  }

  blockerReason(lane: ResponsibilityLaneState): string {
    if (!lane.owner) return 'No owner is assigned.';
    if (lane.isOverdue || lane.status === 'overdue') return `Overdue${lane.dueAtUtc ? ` since ${this.dateLabel(lane.dueAtUtc)}` : ''}.`;
    return lane.detail || 'This responsibility is blocked.';
  }

  laneStatus(lane: ResponsibilityLaneState): string {
    if (lane.isOverdue) return 'Overdue';
    return this.label(lane.status);
  }

  dueLabel(lane: ResponsibilityLaneState): string {
    return lane.dueAtUtc ? `Due ${this.dateLabel(lane.dueAtUtc)}` : 'No due date';
  }

  dateLabel(value: string | null): string {
    if (!value) return 'Date pending';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private label(value: string): string {
    return value.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  private dateValue(value: string | null): number {
    return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
  }
}
