import { Component, OnInit, computed, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  CtgBookingDeskStateService,
  ManualBookingRecord,
} from '../core/ctg-booking-desk-state.service';
import { EngagementsApiService } from '../core/engagements-api.service';
import { EngagementSummary } from '../core/models';
import { SpeakingRequestDetails } from '../core/speaking-request.models';

interface ExecutiveSignal {
  key: string;
  title: string;
  place: string;
  kicker: string;
  detail: string;
  priority: number;
  tone: 'gold' | 'blue' | 'rose';
}

interface CityImage {
  terms: readonly string[];
  url: string;
}

const CITY_IMAGES: readonly CityImage[] = [
  {
    terms: ['atlanta'],
    url: 'https://images.unsplash.com/photo-1675449672066-db3b9a6cd717?auto=format&fit=crop&w=1400&q=82',
  },
  {
    terms: ['charlotte'],
    url: 'https://images.unsplash.com/photo-1746590809189-666b05b4e58b?auto=format&fit=crop&w=1400&q=82',
  },
  {
    terms: ['baltimore'],
    url: 'https://images.unsplash.com/photo-1644006754934-c61f73f47baa?auto=format&fit=crop&w=1400&q=82',
  },
  {
    terms: ['richmond'],
    url: 'https://images.unsplash.com/photo-1575474007145-7bc306677fa4?auto=format&fit=crop&w=1400&q=82',
  },
  {
    terms: ['lagos', 'nigeria'],
    url: 'https://images.unsplash.com/photo-1749058387817-8c3a73d0dac0?auto=format&fit=crop&w=1400&q=82',
  },
  {
    terms: ['london', 'united kingdom', 'england'],
    url: 'https://images.unsplash.com/photo-1549483249-f0b359d1e289?auto=format&fit=crop&w=1400&q=82',
  },
  {
    terms: ['kingston', 'jamaica'],
    url: 'https://images.unsplash.com/photo-1579578160888-5f4ef4425b4b?auto=format&fit=crop&w=1400&q=82',
  },
];

@Component({
  selector: 'app-ctg-apostle-dashboard',
  standalone: true,
  template: `
    <section class="apostle-dashboard">
      <header class="travel-hero editorial-hero">
        <div class="travel-hero__map" aria-hidden="true"></div>
        <div class="travel-hero__content">
          <span class="eyebrow">{{ todayLabel }} · Executive briefing</span>
          <h1>Good morning, Apostle Cynthia.</h1>
          <p>Your next assignment is being prepared. Only what needs your attention is surfaced here.</p>
        </div>
        <div class="travel-hero__portrait-stage">
          <img class="travel-hero__portrait" src="/ctg/apostle-cynthia-portrait.webp" alt="Apostle Cynthia Thompson" />
        </div>
      </header>

      @if (loading()) {
        <div class="loading-card">Preparing your ministry picture…</div>
      } @else {
        <section
          class="executive-briefing-grid"
          [class.executive-briefing-grid--without-assignment]="!nextAssignment()"
          aria-label="Executive briefing">
          @if (nextAssignment(); as next) {
            <section class="next-assignment" aria-label="Next assignment">
              <div class="next-assignment__main">
                <div class="next-assignment__heading">
                  <div>
                    <span class="eyebrow">Next assignment</span>
                    <span class="pin-line">{{ next.location || 'Location being finalized' }}</span>
                    <h2><a [href]="assignmentHref(next.id)">{{ next.title }}</a></h2>
                    <p>Hosted by {{ next.hostOrganization }}</p>
                  </div>
                  <div class="date-tile">
                    <span>{{ month(next.startsAtUtc) }}</span>
                    <strong>{{ day(next.startsAtUtc) }}</strong>
                    <small>{{ year(next.startsAtUtc) }}</small>
                  </div>
                </div>

                <div class="status-row" aria-label="Preparation status">
                  <span [class.ready]="isConfirmed(next.travelStatus)"><b>✈</b><small>Travel</small><strong>{{ stateLabel(next.travelStatus) }}</strong></span>
                  <span [class.ready]="isConfirmed(next.lodgingStatus)"><b>▰</b><small>Lodging</small><strong>{{ stateLabel(next.lodgingStatus) }}</strong></span>
                  <span [class.ready]="isConfirmed(next.hostStatus)"><b>●</b><small>Host</small><strong>{{ stateLabel(next.hostStatus) }}</strong></span>
                  <span [class.ready]="isConfirmed(next.documentsStatus)"><b>▤</b><small>Documents</small><strong>{{ stateLabel(next.documentsStatus) }}</strong></span>
                </div>

                <footer class="next-assignment__footer">
                  <div><strong>{{ next.readinessPercent }}%</strong><span>ready · {{ daysUntil(next.startsAtUtc) }} days away</span></div>
                  <a class="gold-action" [href]="assignmentHref(next.id)">Open ministry brief <span>→</span></a>
                </footer>
              </div>
            </section>
          }

          <aside class="today-brief" aria-label="Today's executive brief">
            <header><span class="eyebrow">Today</span><h2>Your brief</h2></header>
            <a href="/organization/ctg/apostle#decisions" aria-label="Review items needing your direction">
              <span class="today-brief__icon">◎</span>
              <div><strong>{{ decisionSignals().length }} item{{ decisionSignals().length === 1 ? '' : 's' }} need{{ decisionSignals().length === 1 ? 's' : '' }} your direction</strong><small>Only leadership decisions are surfaced</small></div>
              <b>→</b>
            </a>
            <a href="/assignments" aria-label="View confirmed ministry engagements">
              <span class="today-brief__icon">▦</span>
              <div><strong>{{ activeAssignments().length }} confirmed assignments</strong><small>Your ministry road ahead</small></div>
              <b>→</b>
            </a>
            <a href="/assignments" aria-label="View ready engagements">
              <span class="today-brief__icon">✈</span>
              <div><strong>{{ readyAssignments() }} ready to go</strong><small>80% readiness or better</small></div>
              <b>→</b>
            </a>
            <a href="/organization/ctg/apostle#decisions" aria-label="Review open ministry opportunities">
              <span class="today-brief__icon">+</span>
              <div><strong>{{ openOpportunities() }} open opportunities</strong><small>Invitations your team is stewarding</small></div>
              <b>→</b>
            </a>
          </aside>
        </section>

        <section class="dashboard-grid">
          <div class="dashboard-grid__main">
            <section class="decision-section" id="decisions">
              <div class="section-heading">
                <div><span class="section-icon">◉</span><h2>What needs your eye</h2></div>
                <small>{{ decisionSignals().length }} items</small>
              </div>

              @if (decisionSignals().length) {
                <div class="decision-cards">
                  @for (signal of decisionSignals(); track signal.key) {
                    <button type="button" class="decision-card" [attr.data-tone]="signal.tone" (click)="openSignal(signal)">
                      <div class="decision-card__visual">
                        @if (cityImage(signal.place); as photo) {
                          <img [src]="photo" [alt]="cityImageAlt(signal.place)" />
                        } @else {
                          <div class="photo-fallback" aria-hidden="true"></div>
                        }
                        <span class="decision-card__photo-shade"></span>
                        <b>{{ placeCode(signal.place) }}</b>
                      </div>
                      <div class="decision-card__body">
                        <small>{{ signal.place }}</small>
                        <strong>{{ signal.title }}</strong>
                        <span class="decision-pill">{{ signal.kicker }}</span>
                        <p>{{ signal.detail }}</p>
                      </div>
                      <span class="decision-card__arrow">→</span>
                    </button>
                  }
                </div>
              } @else {
                <div class="all-clear"><span>✓</span><div><strong>Nothing is waiting on you.</strong><p>Your team has the current booking and preparation work in hand.</p></div></div>
              }
            </section>

            <section class="road-section">
              <div class="section-heading">
                <div><span class="section-icon">●</span><h2>Your road ahead</h2></div>
                <a href="/assignments">View all engagements →</a>
              </div>

              <div class="road-cards">
                @for (item of upcomingAssignments(); track item.id) {
                  <a class="road-card" [href]="assignmentHref(item.id)" [attr.aria-label]="'Open ' + item.title">
                    <div class="road-card__visual">
                      @if (cityImage(item.location); as photo) {
                        <img [src]="photo" [alt]="cityImageAlt(item.location)" />
                      } @else {
                        <div class="photo-fallback" aria-hidden="true"></div>
                      }
                      <div class="road-card__date"><span>{{ month(item.startsAtUtc) }}</span><strong>{{ day(item.startsAtUtc) }}</strong></div>
                      <small>{{ cityCode(item.location) }}</small>
                    </div>
                    <div class="road-card__body">
                      <small>{{ item.location || 'Location pending' }}</small>
                      <strong>{{ item.title }}</strong>
                      <span>{{ item.hostOrganization }}</span>
                    </div>
                    <div class="road-card__ready">
                      <div class="mini-ring" [style.background]="ring(item.readinessPercent)"><span>{{ item.readinessPercent }}%</span></div>
                      <small>ready</small>
                    </div>
                  </a>
                } @empty {
                  <div class="empty-road">No upcoming confirmed engagements yet.</div>
                }
              </div>
            </section>
          </div>

          <aside class="movement-panel">
            <div class="section-heading">
              <div><span class="section-icon">⌁</span><h2>Ministry movement</h2></div>
              <a href="/assignments">View all →</a>
            </div>

            <div class="movement-list">
              @for (item of recentMovement(); track item.id; let i = $index) {
                <a [href]="assignmentHref(item.id)" [attr.aria-label]="'Open update for ' + item.title">
                  <div class="movement-icon">{{ movementIcon(item, i) }}</div>
                  <div><strong>{{ movementTitle(item) }}</strong><p>{{ item.title }}</p><small>{{ item.location || item.hostOrganization }} · {{ dateTime(item.updatedAtUtc) }}</small></div>
                  <span>→</span>
                </a>
              } @empty {
                <div class="movement-empty"><div class="movement-icon">✓</div><div><strong>All quiet</strong><p>No recent assignment movement.</p><small>Your team updates will surface here.</small></div></div>
              }
            </div>

            <div class="movement-quote">
              <span>“More people.<br>More nations.<br>More of Him.”</span>
              <i></i>
            </div>
          </aside>
        </section>

        <footer class="executive-footer">
          <span>Cynthia Thompson Global <i></i> Equip <i></i> Mobilize <i></i> Multiply</span>
          <a href="/assignments">View confirmed engagements →</a>
        </footer>
      }

      @if (selectedSignal(); as signal) {
        <div class="brief-backdrop" role="presentation" (click)="closeSignal()">
          <section class="decision-brief" role="dialog" aria-modal="true" aria-labelledby="decision-brief-title" (click)="$event.stopPropagation()">
            <div class="decision-brief__photo">
              @if (cityImage(signal.place); as photo) {
                <img [src]="photo" [alt]="cityImageAlt(signal.place)" />
              } @else {
                <div class="photo-fallback" aria-hidden="true"></div>
              }
              <div><span>{{ signal.kicker }}</span><strong>{{ signal.place }}</strong></div>
            </div>
            <div class="decision-brief__content">
              <button type="button" class="close-button" aria-label="Close decision brief" (click)="closeSignal()">×</button>
              <span class="eyebrow">Executive decision brief</span>
              <h2 id="decision-brief-title">{{ signal.title }}</h2>
              <p>{{ signal.detail }}</p>
              <div class="brief-note"><span>What your team needs from you</span><strong>{{ executiveAsk(signal) }}</strong></div>
              <div class="brief-actions">
                <button type="button" (click)="closeSignal()">Back to overview</button>
                <a href="/assignments">View confirmed engagements →</a>
              </div>
            </div>
          </section>
        </div>
      }
    </section>
  `,
  styleUrl: './ctg-apostle-dashboard.component.css',
})
export class CtgApostleDashboardComponent implements OnInit {
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly assignments = signal<readonly EngagementSummary[]>([]);
  readonly loading = signal(true);
  readonly selectedSignal = signal<ExecutiveSignal | null>(null);
  readonly todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  readonly activeAssignments = computed(() => this.assignments()
    .filter(item => !['complete', 'completed', 'archived', 'cancelled'].includes(item.status.toLowerCase()))
    .sort((a, b) => this.time(a.startsAtUtc) - this.time(b.startsAtUtc)));

  readonly nextAssignment = computed(() => {
    const cutoff = Date.now() - 86400000;
    return this.activeAssignments().find(item => this.time(item.startsAtUtc) >= cutoff) ?? this.activeAssignments()[0] ?? null;
  });

  readonly upcomingAssignments = computed(() => this.activeAssignments().slice(0, 3));
  readonly readyAssignments = computed(() => this.activeAssignments().filter(item => item.readinessPercent >= 80).length);
  readonly openOpportunities = computed(() =>
    this.requests().filter(item => !['approved', 'declined'].includes(item.status)).length + this.bookingState.active().length,
  );

  readonly decisionSignals = computed<ExecutiveSignal[]>(() => {
    const manual = this.bookingState.active()
      .map(item => this.manualSignal(item))
      .filter((item): item is ExecutiveSignal => item !== null);
    const formal = this.requests()
      .map(item => this.requestSignal(item))
      .filter((item): item is ExecutiveSignal => item !== null);
    return [...manual, ...formal].sort((a, b) => b.priority - a.priority).slice(0, 3);
  });

  readonly recentMovement = computed(() => [...this.activeAssignments()]
    .sort((a, b) => this.time(b.updatedAtUtc) - this.time(a.updatedAtUtc))
    .slice(0, 4));

  constructor(
    readonly bookingState: CtgBookingDeskStateService,
    private readonly api: EngagementsApiService,
  ) {}

  ngOnInit(): void {
    forkJoin({ requests: this.api.getRequests(), assignments: this.api.getAssignments() }).subscribe({
      next: ({ requests, assignments }) => {
        this.requests.set(requests);
        this.assignments.set(assignments);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openSignal(item: ExecutiveSignal): void { this.selectedSignal.set(item); }
  closeSignal(): void { this.selectedSignal.set(null); }
  assignmentHref(id: string): string { return `/assignments/${encodeURIComponent(id)}`; }

  cityImage(value: string | null | undefined): string | null {
    const normalized = (value ?? '').trim().toLowerCase();
    if (!normalized) return null;
    return CITY_IMAGES.find(image => image.terms.some(term => normalized.includes(term)))?.url ?? null;
  }

  cityImageAlt(value: string | null | undefined): string {
    return value ? `${value} city view` : 'Ministry destination city view';
  }

  ring(percent: number): string {
    const readiness = Math.max(0, Math.min(100, percent));
    return `conic-gradient(var(--eng-color-accent, #b58a45) ${readiness}%, var(--eng-color-border, #eee9df) 0)`;
  }

  isConfirmed(value: string): boolean {
    return ['confirmed', 'complete', 'received'].includes((value || '').toLowerCase());
  }

  month(value: string | null): string {
    return value ? new Date(value).toLocaleDateString(undefined, { month: 'short' }) : 'TBD';
  }

  day(value: string | null): string { return value ? new Date(value).getDate().toString() : '—'; }
  year(value: string | null): string { return value ? new Date(value).getFullYear().toString() : ''; }
  dateTime(value: string): string { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

  daysUntil(value: string | null): number | string {
    if (!value) return '—';
    return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
  }

  stateLabel(value: string): string {
    const normalized = (value || 'pending').trim().replaceAll('-', ' ');
    return normalized.replace(/\b\w/g, character => character.toUpperCase());
  }

  cityCode(value: string | null): string {
    const city = (value ?? '').split(',')[0].trim();
    return city ? city.toUpperCase() : 'GLOBAL';
  }

  placeCode(value: string): string {
    const city = value.split(',')[0].trim();
    return city ? city.toUpperCase() : 'GLOBAL';
  }

  movementIcon(item: EngagementSummary, index: number): string {
    if (item.readinessPercent >= 90) return '✓';
    if (item.travelStatus === 'confirmed') return '✈';
    if (item.hostStatus === 'confirmed') return '●';
    return ['↗', '✦', '◎', '•'][index % 4];
  }

  movementTitle(item: EngagementSummary): string {
    if (item.readinessPercent >= 90) return 'Ready for ministry';
    if (item.hostStatus === 'confirmed') return 'Host coordination confirmed';
    if (item.travelStatus === 'confirmed' && item.lodgingStatus === 'confirmed') return 'Travel plan confirmed';
    return 'Preparation moved forward';
  }

  executiveAsk(signal: ExecutiveSignal): string {
    if (signal.kicker === 'Date hold') return 'Confirm whether this opportunity should continue moving toward final approval.';
    if (signal.kicker === 'Ready for review') return 'Review the opportunity and give the team direction on whether to move forward.';
    if (signal.kicker === 'Formal invitation') return 'Discern the invitation while your team continues handling the operational details.';
    return 'No operational work is required from you. Give direction only if something in this opportunity needs your attention.';
  }

  private manualSignal(item: ManualBookingRecord): ExecutiveSignal | null {
    const place = [item.city, item.country].filter(Boolean).join(', ');
    if (item.stage === 'date-hold') {
      return { key: `manual-${item.id}`, title: item.eventName, place, kicker: 'Date hold', detail: 'A date is being protected while the team finishes discernment and terms.', priority: 100, tone: 'gold' };
    }
    if (item.stage === 'under-review') {
      return { key: `manual-${item.id}`, title: item.eventName, place, kicker: 'Ready for review', detail: 'The team has gathered enough information for leadership discernment.', priority: 90, tone: 'blue' };
    }
    if (item.stage === 'new' && item.source === 'apostle-cynthia') {
      return { key: `manual-${item.id}`, title: item.eventName, place, kicker: 'You received this', detail: 'Your team captured the opportunity and is beginning follow-up.', priority: 70, tone: 'rose' };
    }
    return null;
  }

  private requestSignal(item: SpeakingRequestDetails): ExecutiveSignal | null {
    if (!['awaiting-review', 'submitted'].includes(item.status)) return null;
    return {
      key: `request-${item.id}`,
      title: item.eventName || 'Host invitation',
      place: [item.city, item.country].filter(Boolean).join(', ') || item.organizationName,
      kicker: 'Formal invitation',
      detail: 'The host has returned the invitation and the team has it ready for review.',
      priority: 85,
      tone: 'blue',
    };
  }

  private time(value: string | null): number {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  }
}
