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

@Component({
  selector: 'app-ctg-apostle-dashboard',
  standalone: true,
  template: `
    <section class="apostle-view">
      <header class="welcome">
        <div>
          <span class="eyebrow">Cynthia Thompson Global · Executive view</span>
          <h1>Good morning, Apostle Cynthia.</h1>
          <p>Here is what matters right now. Your team is carrying the details.</p>
        </div>
        <div class="welcome-mark" aria-hidden="true"><span>CT</span></div>
      </header>

      @if (loading()) {
        <div class="loading-card">Preparing your ministry picture…</div>
      } @else {
        <section class="pulse" aria-label="Ministry pulse">
          <article>
            <div class="pulse-icon pulse-icon--gold"><i></i><i></i><i></i></div>
            <div><small>Open opportunities</small><strong>{{ openOpportunities() }}</strong><span>Invitations the team is stewarding</span></div>
          </article>
          <article>
            <div class="pulse-icon pulse-icon--blue"><b></b></div>
            <div><small>Confirmed ministry</small><strong>{{ activeAssignments().length }}</strong><span>Upcoming assignments on the calendar</span></div>
          </article>
          <article>
            <div class="pulse-icon pulse-icon--green"><em>✓</em></div>
            <div><small>Ready to go</small><strong>{{ readyAssignments() }}</strong><span>Assignments at 80% readiness or better</span></div>
          </article>
          <article>
            <div class="pulse-icon pulse-icon--rose"><span>!</span></div>
            <div><small>Needs your eye</small><strong>{{ decisionSignals().length }}</strong><span>Only the decisions worth surfacing to you</span></div>
          </article>
        </section>

        <section class="focus-grid">
          <article class="next-card">
            <div class="section-label"><span>Next assignment</span><small>{{ nextAssignment() ? daysUntil(nextAssignment()!.startsAtUtc) : '—' }} days</small></div>
            @if (nextAssignment(); as next) {
              <div class="next-body">
                <div class="date-block">
                  <small>{{ month(next.startsAtUtc) }}</small>
                  <strong>{{ day(next.startsAtUtc) }}</strong>
                </div>
                <div class="next-copy">
                  <span class="location">{{ next.location || 'Location being finalized' }}</span>
                  <h2>{{ next.title }}</h2>
                  <p>{{ next.hostOrganization }}</p>
                  <div class="journey-line">
                    <span [class.done]="isConfirmed(next.travelStatus)">Travel</span>
                    <i></i>
                    <span [class.done]="isConfirmed(next.lodgingStatus)">Lodging</span>
                    <i></i>
                    <span [class.done]="isConfirmed(next.hostStatus)">Host</span>
                  </div>
                  <a [href]="assignmentHref(next.id)">Open engagement <span>→</span></a>
                </div>
                <div class="readiness-wrap">
                  <div class="readiness-ring" [style.background]="ring(next.readinessPercent)">
                    <div><strong>{{ next.readinessPercent }}%</strong><small>ready</small></div>
                  </div>
                </div>
              </div>
            } @else {
              <div class="empty-focus"><strong>No confirmed travel is currently ahead.</strong><span>Your team can continue working the invitation queue.</span></div>
            }
          </article>

          <aside class="decision-panel">
            <div class="section-label"><span>What needs your eye</span><small>Team-filtered</small></div>
            @if (decisionSignals().length) {
              <div class="decision-list">
                @for (signal of decisionSignals(); track signal.key) {
                  <article [attr.data-tone]="signal.tone">
                    <span class="signal-dot"></span>
                    <div>
                      <small>{{ signal.kicker }}</small>
                      <strong>{{ signal.title }}</strong>
                      <p>{{ signal.place }}</p>
                      <span>{{ signal.detail }}</span>
                    </div>
                  </article>
                }
              </div>
            } @else {
              <div class="all-clear">
                <span>✓</span>
                <div><strong>Nothing is waiting on you.</strong><p>Your team has the current booking and preparation work in hand.</p></div>
              </div>
            }
          </aside>
        </section>

        <section class="upcoming-section">
          <div class="section-heading">
            <div><span class="eyebrow">Your road ahead</span><h2>Coming up</h2></div>
            <span>{{ activeAssignments().length }} active</span>
          </div>
          <div class="upcoming-strip">
            @for (item of upcomingAssignments(); track item.id) {
              <a class="trip-card" [href]="assignmentHref(item.id)">
                <div class="trip-date"><span>{{ month(item.startsAtUtc) }}</span><strong>{{ day(item.startsAtUtc) }}</strong></div>
                <div class="trip-copy"><small>{{ item.location || 'Location pending' }}</small><strong>{{ item.title }}</strong><span>{{ item.hostOrganization }}</span></div>
                <div class="trip-ready"><b>{{ item.readinessPercent }}%</b><span>ready</span></div>
              </a>
            } @empty {
              <div class="strip-empty">No upcoming confirmed engagements yet.</div>
            }
          </div>
        </section>

        <section class="movement-section">
          <div class="section-heading">
            <div><span class="eyebrow">Since you last looked</span><h2>Ministry movement</h2></div>
            <small>No inbox. Just movement.</small>
          </div>
          <div class="movement-grid">
            @for (item of recentMovement(); track item.id) {
              <article>
                <span class="movement-mark" [class.good]="item.readinessPercent >= 80"></span>
                <div><strong>{{ movementTitle(item) }}</strong><p>{{ item.title }} · {{ item.hostOrganization }}</p><small>{{ dateTime(item.updatedAtUtc) }}</small></div>
              </article>
            } @empty {
              <article class="movement-empty"><div><strong>No recent assignment movement.</strong><p>Updates from the team will surface here.</p></div></article>
            }
          </div>
        </section>

        <footer class="quiet-footer">
          <span>Your team still has the full Booking Desk, preparation workspace, host collaboration tools, and closeout controls.</span>
          <a href="/assignments">View confirmed engagements →</a>
        </footer>
      }
    </section>
  `,
  styles: [`
    :host{display:block;background:#f7f5f0;min-height:calc(100vh - 72px)}
    .apostle-view{max-width:1380px;margin:0 auto;padding:34px 38px 72px;color:#172236}.eyebrow{display:block;color:#a07939;font-size:.62rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
    .welcome{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:10px 2px 28px}.welcome h1{margin:7px 0 7px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2.35rem,4.2vw,4.25rem);font-weight:500;line-height:1;letter-spacing:-.045em}.welcome p{margin:0;color:#737a84;font-size:.9rem}.welcome-mark{display:grid;width:76px;height:76px;place-items:center;border:1px solid #d6c7a6;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fff,#efe6d5);box-shadow:0 14px 36px rgba(38,31,20,.09)}.welcome-mark span{font-family:Georgia,serif;color:#8d6a2e;font-size:1.25rem;letter-spacing:.08em}
    .loading-card{padding:42px;border:1px solid #e0ddd6;border-radius:22px;background:#fff;color:#78808b;text-align:center}
    .pulse{display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;border:1px solid #e1ded8;border-radius:20px;background:rgba(255,255,255,.8);box-shadow:0 16px 45px rgba(27,34,46,.05)}.pulse article{display:flex;align-items:center;gap:14px;min-height:108px;padding:18px 20px;border-right:1px solid #e7e4de}.pulse article:last-child{border-right:0}.pulse small,.pulse span{display:block}.pulse small{color:#7b818a;font-size:.59rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.pulse strong{display:block;margin:3px 0 2px;font-size:1.55rem;letter-spacing:-.045em}.pulse article>div:last-child>span{color:#8b9097;font-size:.63rem;line-height:1.35}
    .pulse-icon{position:relative;display:grid;width:46px;height:46px;flex:0 0 46px;place-items:center;border-radius:14px}.pulse-icon--gold{display:flex;align-items:flex-end;justify-content:center;gap:3px;background:#f7eedb}.pulse-icon--gold i{display:block;width:5px;border-radius:4px 4px 1px 1px;background:#aa7d34}.pulse-icon--gold i:nth-child(1){height:12px}.pulse-icon--gold i:nth-child(2){height:22px}.pulse-icon--gold i:nth-child(3){height:16px}.pulse-icon--blue{background:#eaf1f8}.pulse-icon--blue b{width:22px;height:22px;border:5px solid #557ca6;border-top-color:transparent;border-radius:50%}.pulse-icon--green{background:#eaf5ef}.pulse-icon--green em{display:grid;width:25px;height:25px;place-items:center;border-radius:50%;background:#3d7a5f;color:#fff;font-style:normal;font-weight:900}.pulse-icon--rose{background:#fbefec}.pulse-icon--rose span{display:grid;width:25px;height:25px;place-items:center;border:2px solid #b75d52;border-radius:50%;color:#a94d43;font-weight:900}
    .focus-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,.72fr);gap:18px;margin-top:18px}.next-card,.decision-panel{border:1px solid #e1ded8;border-radius:22px;background:#fff;box-shadow:0 16px 45px rgba(27,34,46,.045)}.next-card{overflow:hidden}.section-label{display:flex;align-items:center;justify-content:space-between;padding:17px 20px;border-bottom:1px solid #ece9e3}.section-label>span{font-size:.7rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.section-label small{color:#8b8f96;font-size:.62rem;font-weight:800}.next-body{display:grid;grid-template-columns:88px minmax(0,1fr) 140px;gap:22px;align-items:center;padding:25px 24px 27px;background:linear-gradient(120deg,#fff 0%,#fff 66%,#faf6ee 100%)}.date-block{display:grid;place-items:center;align-self:stretch;border-right:1px solid #ece7dd}.date-block small{color:#a07939;font-size:.65rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.date-block strong{font-family:Georgia,serif;font-size:2.7rem;font-weight:500;line-height:.95}.location{color:#7a818b;font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.next-copy h2{max-width:640px;margin:6px 0 4px;font-size:clamp(1.5rem,2.5vw,2.25rem);letter-spacing:-.045em}.next-copy>p{margin:0;color:#6e7681}.next-copy>a{display:inline-flex;gap:6px;margin-top:16px;color:#234f7e;font-size:.69rem;font-weight:900;text-decoration:none}.journey-line{display:flex;align-items:center;gap:7px;margin-top:16px}.journey-line span{padding:5px 8px;border-radius:999px;background:#f0f1f3;color:#7b8189;font-size:.58rem;font-weight:850}.journey-line span.done{background:#e9f5ee;color:#367157}.journey-line i{width:16px;height:1px;background:#d6d9dc}.readiness-wrap{display:grid;place-items:center}.readiness-ring{display:grid;width:112px;height:112px;place-items:center;border-radius:50%;padding:9px}.readiness-ring>div{display:grid;width:94px;height:94px;place-items:center;align-content:center;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 1px #eee9df}.readiness-ring strong{font-size:1.3rem;line-height:1}.readiness-ring small{margin-top:3px;color:#7d838b;font-size:.59rem;font-weight:800;text-transform:uppercase}.empty-focus{display:grid;gap:5px;padding:44px 28px}.empty-focus span{color:#7d838b;font-size:.75rem}
    .decision-list{display:grid}.decision-list article{display:grid;grid-template-columns:13px 1fr;gap:10px;padding:17px 19px;border-bottom:1px solid #ece9e3}.decision-list article:last-child{border-bottom:0}.signal-dot{width:9px;height:9px;margin-top:4px;border-radius:50%;background:#b58a45;box-shadow:0 0 0 5px #f7f0e3}.decision-list article[data-tone='blue'] .signal-dot{background:#567fa8;box-shadow:0 0 0 5px #edf3f8}.decision-list article[data-tone='rose'] .signal-dot{background:#b95e52;box-shadow:0 0 0 5px #fbeeea}.decision-list small{display:block;color:#8a8f96;font-size:.56rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.decision-list strong{display:block;margin:3px 0;font-size:.82rem}.decision-list p{margin:0;color:#5e6874;font-size:.68rem}.decision-list div>span{display:block;margin-top:5px;color:#858b92;font-size:.62rem;line-height:1.4}.all-clear{display:flex;gap:12px;align-items:flex-start;padding:28px 20px}.all-clear>span{display:grid;width:34px;height:34px;place-items:center;border-radius:50%;background:#eaf5ef;color:#347258;font-weight:900}.all-clear strong{display:block;margin-bottom:4px}.all-clear p{margin:0;color:#7e858e;font-size:.68rem;line-height:1.5}
    .upcoming-section,.movement-section{margin-top:30px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:11px}.section-heading h2{margin:3px 0 0;font-family:Georgia,serif;font-size:1.65rem;font-weight:500}.section-heading>span,.section-heading>small{color:#858b93;font-size:.64rem;font-weight:800}.upcoming-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.trip-card{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:14px;align-items:center;padding:17px;border:1px solid #e2dfd9;border-radius:17px;background:#fff;color:inherit;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease}.trip-card:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(24,31,42,.07)}.trip-date{display:grid;place-items:center;padding-right:13px;border-right:1px solid #ece8e0}.trip-date span{color:#9a7439;font-size:.55rem;font-weight:900;text-transform:uppercase}.trip-date strong{font-family:Georgia,serif;font-size:1.55rem;font-weight:500}.trip-copy small,.trip-copy span{display:block;color:#858b93;font-size:.59rem}.trip-copy strong{display:block;margin:3px 0;font-size:.76rem}.trip-ready{text-align:right}.trip-ready b,.trip-ready span{display:block}.trip-ready b{font-size:.78rem}.trip-ready span{color:#8a9097;font-size:.53rem;text-transform:uppercase}.strip-empty{grid-column:1/-1;padding:24px;border:1px dashed #d9d5cd;border-radius:16px;color:#878c93;text-align:center}
    .movement-grid{display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;border:1px solid #e1ded8;border-radius:18px;background:#fff}.movement-grid article{display:grid;grid-template-columns:12px 1fr;gap:10px;padding:18px;border-right:1px solid #e8e5df}.movement-grid article:last-child{border-right:0}.movement-mark{width:8px;height:8px;margin-top:4px;border-radius:50%;background:#b78a43;box-shadow:0 0 0 4px #f8f1e5}.movement-mark.good{background:#438064;box-shadow:0 0 0 4px #ebf5ef}.movement-grid strong{font-size:.72rem}.movement-grid p{margin:4px 0;color:#6f7781;font-size:.63rem;line-height:1.45}.movement-grid small{color:#92969c;font-size:.55rem}.movement-empty{grid-column:1/-1}.quiet-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:28px;padding-top:18px;border-top:1px solid #dedbd5;color:#7d838b;font-size:.64rem}.quiet-footer a{color:#315d8e;font-weight:900;text-decoration:none}
    @media(max-width:1050px){.pulse{grid-template-columns:1fr 1fr}.pulse article:nth-child(2){border-right:0}.pulse article:nth-child(-n+2){border-bottom:1px solid #e7e4de}.focus-grid{grid-template-columns:1fr}.upcoming-strip{grid-template-columns:1fr 1fr}.movement-grid{grid-template-columns:1fr}.movement-grid article{border-right:0;border-bottom:1px solid #e8e5df}.movement-grid article:last-child{border-bottom:0}}
    @media(max-width:700px){.apostle-view{padding:24px 16px 60px}.welcome-mark{display:none}.pulse{grid-template-columns:1fr}.pulse article{border-right:0;border-bottom:1px solid #e7e4de}.pulse article:last-child{border-bottom:0}.next-body{grid-template-columns:62px 1fr}.readiness-wrap{grid-column:2;justify-items:start}.date-block strong{font-size:2rem}.upcoming-strip{grid-template-columns:1fr}.quiet-footer{align-items:flex-start;flex-direction:column}}
  `],
})
export class CtgApostleDashboardComponent implements OnInit {
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly assignments = signal<readonly EngagementSummary[]>([]);
  readonly loading = signal(true);

  readonly activeAssignments = computed(() => this.assignments()
    .filter(item => !['complete', 'completed', 'archived', 'cancelled'].includes(item.status.toLowerCase()))
    .sort((a, b) => this.time(a.startsAtUtc) - this.time(b.startsAtUtc)));

  readonly nextAssignment = computed(() => {
    const now = Date.now() - 86400000;
    return this.activeAssignments().find(item => this.time(item.startsAtUtc) >= now) ?? this.activeAssignments()[0] ?? null;
  });

  readonly upcomingAssignments = computed(() => this.activeAssignments().slice(0, 3));
  readonly readyAssignments = computed(() => this.activeAssignments().filter(item => item.readinessPercent >= 80).length);
  readonly openOpportunities = computed(() =>
    this.requests().filter(item => !['approved', 'declined'].includes(item.status)).length +
    this.bookingState.active().length,
  );

  readonly decisionSignals = computed<ExecutiveSignal[]>(() => {
    const manual = this.bookingState.active()
      .map(item => this.manualSignal(item))
      .filter((item): item is ExecutiveSignal => item !== null);
    const formal = this.requests()
      .map(item => this.requestSignal(item))
      .filter((item): item is ExecutiveSignal => item !== null);
    return [...manual, ...formal]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  });

  readonly recentMovement = computed(() => [...this.activeAssignments()]
    .sort((a, b) => this.time(b.updatedAtUtc) - this.time(a.updatedAtUtc))
    .slice(0, 3));

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

  assignmentHref(id: string): string { return `/assignments/${encodeURIComponent(id)}`; }
  ring(percent: number): string { return `conic-gradient(#b58a45 ${Math.max(0, Math.min(100, percent))}%, #eee9df 0)`; }
  isConfirmed(value: string): boolean { return ['confirmed', 'complete', 'received'].includes((value || '').toLowerCase()); }
  month(value: string | null): string { return value ? new Date(value).toLocaleDateString(undefined, { month: 'short' }) : 'TBD'; }
  day(value: string | null): string { return value ? new Date(value).getDate().toString() : '—'; }
  dateTime(value: string): string { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

  daysUntil(value: string | null): number | string {
    if (!value) return '—';
    return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
  }

  movementTitle(item: EngagementSummary): string {
    if (item.readinessPercent >= 90) return 'Ready for ministry';
    if (item.hostStatus === 'confirmed') return 'Host coordination confirmed';
    if (item.travelStatus === 'confirmed' && item.lodgingStatus === 'confirmed') return 'Travel plan confirmed';
    return 'Preparation moved forward';
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
