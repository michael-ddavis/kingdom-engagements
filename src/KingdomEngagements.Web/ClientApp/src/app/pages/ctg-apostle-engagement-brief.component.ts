import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import {
  AssignmentActivityItem,
  AssignmentReadinessLane,
  ExecutiveEngagementBrief,
  EngagementDetails,
} from '../core/models';

interface CityImage {
  terms: readonly string[];
  url: string;
}

const CITY_IMAGES: readonly CityImage[] = [
  { terms: ['atlanta'], url: 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?auto=format&fit=crop&w=1600&q=84' },
  { terms: ['charlotte'], url: 'https://images.unsplash.com/photo-1620785847183-517de72185d5?auto=format&fit=crop&w=1600&q=84' },
  { terms: ['baltimore'], url: 'https://images.unsplash.com/photo-1644006754934-c61f73f47baa?auto=format&fit=crop&w=1600&q=84' },
  { terms: ['richmond'], url: 'https://images.unsplash.com/photo-1575474007145-7bc306677fa4?auto=format&fit=crop&w=1600&q=84' },
  { terms: ['lagos', 'nigeria'], url: 'https://images.unsplash.com/photo-1577948000111-9c970dfe3743?auto=format&fit=crop&w=1600&q=84' },
  { terms: ['london', 'united kingdom', 'england'], url: 'https://images.unsplash.com/photo-1549483249-f0b359d1e289?auto=format&fit=crop&w=1600&q=84' },
  { terms: ['kingston', 'jamaica'], url: 'https://images.unsplash.com/photo-1579578160888-5f4ef4425b4b?auto=format&fit=crop&w=1600&q=84' },
];

@Component({
  selector: 'app-ctg-apostle-engagement-brief',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="apostle-engagement-brief">
      <a class="brief-back" routerLink="/organization/ctg/apostle">← Back to my overview</a>

      @if (loading()) {
        <div class="state-card">Preparing this engagement brief…</div>
      } @else if (error()) {
        <div class="state-card state-card--error"><strong>This engagement could not be opened.</strong><span>{{ error() }}</span></div>
      } @else if (assignment(); as item) {
        <header class="destination-hero">
          <div class="destination-hero__photo">
            @if (cityImage(item.summary.location); as image) {
              <img [src]="image" [alt]="cityImageAlt(item.summary.location)" (error)="imageFailed.set(true)" [hidden]="imageFailed()" />
            }
            <div class="destination-hero__shade"></div>
            <div class="destination-hero__place">
              <span>Next destination</span>
              <strong>{{ item.summary.location || 'Location being finalized' }}</strong>
              <small>{{ item.summary.hostOrganization }}</small>
            </div>
          </div>

          <div class="destination-hero__content">
            <span class="eyebrow">Executive engagement brief</span>
            <div class="hero-date-row">
              <div class="date-tile"><span>{{ month(item.summary.startsAtUtc) }}</span><strong>{{ day(item.summary.startsAtUtc) }}</strong><small>{{ year(item.summary.startsAtUtc) }}</small></div>
              <div><h1>{{ item.summary.title }}</h1><p>{{ dateRange(item.summary.startsAtUtc, item.endsAtUtc) }} · {{ item.summary.location || 'Location pending' }}</p></div>
            </div>
            <div class="hero-message"><span>At a glance</span><strong>{{ executiveHeadline() }}</strong></div>
          </div>

          <aside class="destination-hero__readiness">
            <div class="readiness-ring" [style.background]="ring(overallReadiness())"><div><strong>{{ overallReadiness() }}%</strong><span>ready</span></div></div>
            <strong>{{ readinessLabel() }}</strong>
            <small>{{ daysUntil(item.summary.startsAtUtc) }} days away</small>
          </aside>
        </header>

        <section class="glance-grid" aria-label="Engagement status at a glance">
          <article [class.is-ready]="isReady(item.summary.travelStatus)"><span>✈</span><div><small>Travel</small><strong>{{ statusLabel(item.summary.travelStatus) }}</strong></div></article>
          <article [class.is-ready]="isReady(item.summary.lodgingStatus)"><span>▰</span><div><small>Lodging</small><strong>{{ statusLabel(item.summary.lodgingStatus) }}</strong></div></article>
          <article [class.is-ready]="isReady(item.summary.hostStatus)"><span>●</span><div><small>Host</small><strong>{{ statusLabel(item.summary.hostStatus) }}</strong></div></article>
          <article [class.is-ready]="isReady(item.summary.documentsStatus)"><span>▤</span><div><small>Documents</small><strong>{{ statusLabel(item.summary.documentsStatus) }}</strong></div></article>
        </section>

        <section class="brief-layout">
          <div class="brief-layout__main">
            <section class="brief-card attention-card">
              <header><div><span class="section-mark">◉</span><h2>What needs your eye</h2></div><small>{{ attentionItems().length }} item{{ attentionItems().length === 1 ? '' : 's' }}</small></header>
              @if (attentionItems().length) {
                <div class="attention-list">
                  @for (attention of attentionItems(); track attention) {
                    <article><span>!</span><div><strong>{{ attention }}</strong><p>Your team is carrying the operational follow-through. This is surfaced only because it may affect readiness or your ministry decision.</p></div></article>
                  }
                </div>
              } @else {
                <div class="all-clear"><span>✓</span><div><strong>Nothing needs your attention right now.</strong><p>Your team has the preparation details in hand.</p></div></div>
              }
            </section>

            <section class="brief-card travel-card">
              <header><div><span class="section-mark">✈</span><h2>Travel snapshot</h2></div><small>One glance</small></header>
              @if (workspace(); as envelope) {
                <div class="travel-grid">
                  <article><small>Outbound</small><strong>{{ flightLabel(envelope, 'outbound') }}</strong><span>{{ airportLabel(envelope, 'outbound') }}</span>@if (item.summary.externalAssignmentId.startsWith('assignment-demo-')) { <a class="boarding-pass" href="/demo-boarding-pass.pdf" target="_blank" rel="noopener">View outbound boarding pass (sample) ↗</a> }</article>
                  <article><small>Return</small><strong>{{ flightLabel(envelope, 'return') }}</strong><span>{{ airportLabel(envelope, 'return') }}</span>@if (item.summary.externalAssignmentId.startsWith('assignment-demo-')) { <a class="boarding-pass" href="/demo-boarding-pass.pdf" target="_blank" rel="noopener">View return boarding pass (sample) ↗</a> }</article>
                  <article><small>Hotel</small><strong>{{ envelope.lodging.hotelName || 'Being finalized' }}</strong><span>{{ envelope.lodging.hotelAddress || 'Lodging details with the team' }}</span></article>
                  <article><small>Local transportation</small><strong>{{ item.summary.transportationStatus ? statusLabel(item.summary.transportationStatus) : 'Pending' }}</strong><span>{{ envelope.transportation.transportationPlan || 'Host/team coordination in progress' }}</span></article>
                </div>
              }
            </section>

            <section class="brief-card readiness-card">
              <header><div><span class="section-mark">◎</span><h2>Readiness picture</h2></div><small>{{ overallReadiness() }}% overall</small></header>
              <div class="readiness-lanes">
                @for (lane of readinessLanes(); track lane.key) {
                  <article><div><strong>{{ lane.label }}</strong><span>{{ lane.detail }}</span></div><div class="lane-meter"><i [style.width.%]="lane.percent"></i></div><b>{{ lane.percent }}%</b></article>
                }
              </div>
            </section>
          </div>

          <aside class="brief-layout__side">
            <section class="brief-card host-card">
              <header><div><span class="section-mark">●</span><h2>Host connection</h2></div></header>
              @if (workspace(); as envelope) {
                <dl>
                  <div><dt>Host</dt><dd>{{ item.summary.hostOrganization }}</dd></div>
                  <div><dt>Terms</dt><dd>{{ statusLabel(envelope.termsStatus) }}</dd></div>
                  <div><dt>Coordination</dt><dd>{{ statusLabel(envelope.coordinationStatus) }}</dd></div>
                  <div><dt>Primary contact</dt><dd>{{ primaryContact(envelope) }}</dd></div>
                </dl>
                <div class="prayer-focus"><span>Prayer focus</span><p>{{ envelope.prayerFocus || 'No prayer focus has been added yet.' }}</p></div>
              }
            </section>

            <section class="brief-card movement-card">
              <header><div><span class="section-mark">⌁</span><h2>Recent movement</h2></div></header>
              <div class="movement-list">
                @for (activity of recentActivity(); track $index) {
                  <article><span></span><div><strong>{{ activity.title }}</strong><p>{{ activity.detail }}</p><small>{{ activity.actor }} · {{ dateLabel(activity.occurredAtUtc) }}</small></div></article>
                } @empty {
                  <div class="movement-empty">No recent movement has been recorded.</div>
                }
              </div>
            </section>

            <a class="overview-action" routerLink="/organization/ctg/apostle">Return to executive overview →</a>
          </aside>
        </section>
      }
    </section>
  `,
  styles: [`
    .boarding-pass{display:inline-block;margin-top:10px;color:#345635;font-weight:700;text-decoration:underline;font-size:.85rem;}
    :host{display:block;min-height:calc(100vh - 72px);background:#f6f3ed;color:#171d25}*{box-sizing:border-box}.apostle-engagement-brief{max-width:1480px;margin:0 auto;padding:20px 28px 56px}.brief-back{display:inline-flex;margin:0 0 12px;color:#7d653d;font-size:.67rem;font-weight:850;text-decoration:none}.state-card{padding:48px;border:1px solid #e1ddd5;border-radius:18px;background:#fff;text-align:center;color:#747b83}.state-card--error{display:grid;gap:6px;color:#9c4d44}.eyebrow{display:block;color:#9b7132;font-size:.6rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase}
    .destination-hero{display:grid;grid-template-columns:340px minmax(0,1fr) 190px;overflow:hidden;border:1px solid #ded8cd;border-radius:20px;background:#fff;box-shadow:0 14px 36px rgba(23,29,37,.08)}.destination-hero__photo{position:relative;min-height:250px;overflow:hidden;background:#243447 url('/ctg-world-route.svg') center/cover no-repeat}.destination-hero__photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.destination-hero__shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,12,18,.04),rgba(8,12,18,.14) 45%,rgba(8,12,18,.86))}.destination-hero__place{position:absolute;z-index:1;left:22px;right:22px;bottom:20px;color:#fff}.destination-hero__place span{display:block;color:#e5c482;font-size:.55rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.destination-hero__place strong{display:block;margin:4px 0;font-family:Georgia,serif;font-size:1.3rem;font-weight:500}.destination-hero__place small{color:rgba(255,255,255,.76);font-size:.62rem}.destination-hero__content{padding:28px}.hero-date-row{display:grid;grid-template-columns:72px 1fr;gap:18px;align-items:center;margin-top:9px}.date-tile{display:grid;place-items:center;padding:10px 5px;border:1px solid #e4ded4;border-radius:12px;background:#faf8f3}.date-tile span{color:#8e692f;font-size:.54rem;font-weight:900;text-transform:uppercase}.date-tile strong{font-family:Georgia,serif;font-size:2.2rem;font-weight:500;line-height:1}.date-tile small{color:#838890;font-size:.54rem}.destination-hero h1{margin:0 0 5px;font-family:Georgia,serif;font-size:clamp(1.8rem,3vw,2.8rem);font-weight:500;line-height:1.05;letter-spacing:-.035em}.destination-hero__content p{margin:0;color:#727981;font-size:.72rem}.hero-message{margin-top:22px;padding:13px 15px;border-left:3px solid #b58a44;background:#faf6ed}.hero-message span{display:block;color:#8d6b34;font-size:.52rem;font-weight:900;text-transform:uppercase}.hero-message strong{display:block;margin-top:3px;font-size:.73rem;line-height:1.4}.destination-hero__readiness{display:grid;place-items:center;align-content:center;gap:8px;padding:20px;border-left:1px solid #e7e2d9;background:linear-gradient(180deg,#fff,#fbf7ef);text-align:center}.readiness-ring{display:grid;width:116px;height:116px;place-items:center;border-radius:50%;padding:9px}.readiness-ring>div{display:grid;width:98px;height:98px;place-items:center;align-content:center;border-radius:50%;background:#fff}.readiness-ring strong{font-family:Georgia,serif;font-size:1.55rem;font-weight:500}.readiness-ring span{color:#8b9097;font-size:.5rem;font-weight:900;text-transform:uppercase}.destination-hero__readiness>strong{font-size:.66rem}.destination-hero__readiness>small{color:#8b9097;font-size:.56rem}
    .glance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}.glance-grid article{display:grid;grid-template-columns:42px 1fr;gap:10px;align-items:center;padding:14px 16px;border:1px solid #e2ddd5;border-radius:14px;background:#fff}.glance-grid article>span{display:grid;width:39px;height:39px;place-items:center;border-radius:50%;background:#f0ede7;color:#6e747c}.glance-grid article.is-ready>span{background:#f4ead7;color:#967035}.glance-grid small,.glance-grid strong{display:block}.glance-grid small{color:#8c9197;font-size:.5rem;font-weight:850;text-transform:uppercase}.glance-grid strong{margin-top:2px;font-size:.68rem}
    .brief-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:12px}.brief-layout__main,.brief-layout__side{display:grid;align-content:start;gap:12px}.brief-card{overflow:hidden;border:1px solid #e1ddd5;border-radius:17px;background:#fff}.brief-card>header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;border-bottom:1px solid #ece8e1}.brief-card>header>div{display:flex;align-items:center;gap:8px}.brief-card h2{margin:0;font-family:Georgia,serif;font-size:1rem;font-weight:500}.brief-card header small{color:#898e95;font-size:.55rem}.section-mark{color:#a47a39}.attention-list{display:grid}.attention-list article{display:grid;grid-template-columns:34px 1fr;gap:11px;padding:15px 16px;border-bottom:1px solid #eeeae3}.attention-list article:last-child{border-bottom:0}.attention-list article>span{display:grid;width:31px;height:31px;place-items:center;border-radius:50%;background:#faece8;color:#a65449;font-weight:900}.attention-list strong{font-size:.7rem}.attention-list p,.all-clear p{margin:4px 0 0;color:#777e87;font-size:.6rem;line-height:1.45}.all-clear{display:flex;gap:10px;padding:24px 16px}.all-clear>span{display:grid;width:32px;height:32px;place-items:center;border-radius:50%;background:#e9f4ed;color:#397156}.travel-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#ece8e1}.travel-grid article{min-height:120px;padding:17px;background:#fff}.travel-grid small,.travel-grid strong,.travel-grid span{display:block}.travel-grid small{color:#9a7135;font-size:.52rem;font-weight:900;text-transform:uppercase}.travel-grid strong{margin:7px 0 4px;font-size:.75rem}.travel-grid span{color:#7b828a;font-size:.6rem;line-height:1.4}.readiness-lanes{display:grid;padding:5px 16px 12px}.readiness-lanes article{display:grid;grid-template-columns:minmax(0,1fr) minmax(170px,260px) 44px;gap:13px;align-items:center;padding:13px 0;border-bottom:1px solid #eeeae3}.readiness-lanes article:last-child{border-bottom:0}.readiness-lanes strong,.readiness-lanes span{display:block}.readiness-lanes strong{font-size:.66rem}.readiness-lanes span{margin-top:2px;color:#858b92;font-size:.53rem}.lane-meter{height:7px;overflow:hidden;border-radius:999px;background:#eeeae2}.lane-meter i{display:block;height:100%;border-radius:inherit;background:#b58a45}.readiness-lanes b{font-size:.58rem;text-align:right}
    .host-card dl{margin:0}.host-card dl>div{display:grid;grid-template-columns:105px 1fr;gap:10px;padding:11px 15px;border-bottom:1px solid #eeeae3}.host-card dt{color:#8b9097;font-size:.52rem;font-weight:850;text-transform:uppercase}.host-card dd{margin:0;font-size:.62rem;font-weight:750;text-align:right}.prayer-focus{padding:16px;background:#faf7f0}.prayer-focus span{color:#946d32;font-size:.52rem;font-weight:900;text-transform:uppercase}.prayer-focus p{margin:6px 0 0;color:#5f6770;font-family:Georgia,serif;font-size:.82rem;line-height:1.45}.movement-list{display:grid;padding:3px 15px 9px}.movement-list article{display:grid;grid-template-columns:13px 1fr;gap:9px;padding:12px 0;border-bottom:1px solid #eeeae3}.movement-list article:last-child{border-bottom:0}.movement-list article>span{width:8px;height:8px;margin-top:4px;border-radius:50%;background:#b58a45}.movement-list strong{font-size:.62rem}.movement-list p{margin:3px 0;color:#767d85;font-size:.55rem;line-height:1.35}.movement-list small{color:#9a9ea3;font-size:.48rem}.movement-empty{padding:18px 0;color:#898f96;font-size:.6rem}.overview-action{display:flex;min-height:44px;align-items:center;justify-content:center;border-radius:12px;background:#172a46;color:#fff;font-size:.65rem;font-weight:900;text-decoration:none}
    @media(max-width:1100px){.destination-hero{grid-template-columns:280px 1fr}.destination-hero__readiness{grid-column:1/-1;grid-template-columns:auto auto 1fr;justify-content:start;border-top:1px solid #e7e2d9;border-left:0}.readiness-ring{width:82px;height:82px}.readiness-ring>div{width:64px;height:64px}.brief-layout{grid-template-columns:1fr}.brief-layout__side{grid-template-columns:1fr 1fr}.overview-action{grid-column:1/-1}}
    @media(max-width:720px){.apostle-engagement-brief{padding:14px 14px 42px}.destination-hero{grid-template-columns:1fr}.destination-hero__photo{min-height:230px}.destination-hero__readiness{grid-column:auto}.glance-grid{grid-template-columns:1fr 1fr}.travel-grid{grid-template-columns:1fr}.readiness-lanes article{grid-template-columns:1fr 70px 35px}.brief-layout__side{grid-template-columns:1fr}.overview-action{grid-column:auto}}
  `],
})
export class CtgApostleEngagementBriefComponent implements OnInit {
  readonly assignment = signal<EngagementDetails | null>(null);
  readonly workspace = signal<ExecutiveEngagementBrief | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly imageFailed = signal(false);

  readonly overallReadiness = computed(() => this.workspace()?.readiness.overallPercent ?? this.assignment()?.summary.readinessPercent ?? 0);
  readonly readinessLanes = computed<readonly AssignmentReadinessLane[]>(() => this.workspace()?.readiness.lanes ?? []);
  readonly attentionItems = computed(() => (this.workspace()?.readiness.attentionItems ?? []).slice(0, 3));
  readonly recentActivity = computed<readonly AssignmentActivityItem[]>(() => (this.workspace()?.activity ?? []).slice(0, 4));

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: EngagementsApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('The engagement identifier is missing.');
      this.loading.set(false);
      return;
    }

    forkJoin({ assignment: this.api.getAssignment(id), workspace: this.api.getExecutiveBrief(id) }).subscribe({
      next: ({ assignment, workspace }) => {
        this.assignment.set(assignment);
        this.workspace.set(workspace);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The executive brief could not load the current engagement data.');
        this.loading.set(false);
      },
    });
  }

  cityImage(value: string | null | undefined): string | null {
    const normalized = (value ?? '').trim().toLowerCase();
    if (!normalized) return null;
    return CITY_IMAGES.find(image => image.terms.some(term => normalized.includes(term)))?.url ?? null;
  }

  cityImageAlt(value: string | null | undefined): string { return value ? `${value} city view` : 'Ministry destination'; }
  month(value: string | null): string { return value ? new Date(value).toLocaleDateString(undefined, { month: 'short' }) : 'TBD'; }
  day(value: string | null): string { return value ? new Date(value).getDate().toString() : '—'; }
  year(value: string | null): string { return value ? new Date(value).getFullYear().toString() : ''; }

  dateRange(start: string | null, end: string | null): string {
    if (!start) return 'Dates being finalized';
    const startLabel = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (!end) return startLabel;
    const endLabel = new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  }

  dateLabel(value: string): string { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  daysUntil(value: string | null): number | string { return value ? Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)) : '—'; }
  ring(percent: number): string { return `conic-gradient(#b58a45 ${Math.max(0, Math.min(100, percent))}%, #eee9df 0)`; }
  isReady(value: string): boolean { return ['confirmed', 'complete', 'received', 'waived'].includes((value || '').toLowerCase()); }

  statusLabel(value: string | null | undefined): string {
    const normalized = (value || 'pending').replaceAll('-', ' ');
    return normalized.replace(/\b\w/g, character => character.toUpperCase());
  }

  readinessLabel(): string {
    const percent = this.overallReadiness();
    if (percent >= 90) return 'Ready for ministry';
    if (percent >= 70) return 'Nearly ready';
    if (percent >= 40) return 'Preparation moving';
    return 'Team preparing';
  }

  executiveHeadline(): string {
    const attention = this.attentionItems();
    if (attention.length === 0) return 'Your team has this engagement in hand. Nothing currently requires your attention.';
    if (attention.length === 1) return `One item is being surfaced for your awareness: ${attention[0]}.`;
    return `${attention.length} readiness items are still moving. Your team owns the details; only the highest-level items are shown here.`;
  }

  flightLabel(envelope: ExecutiveEngagementBrief, direction: 'outbound' | 'return'): string {
    const travel = envelope.travel;
    const airline = direction === 'outbound' ? travel.outboundAirline : travel.returnAirline;
    const number = direction === 'outbound' ? travel.outboundFlightNumber : travel.returnFlightNumber;
    return [airline, number].filter(Boolean).join(' ') || 'Being finalized';
  }

  airportLabel(envelope: ExecutiveEngagementBrief, direction: 'outbound' | 'return'): string {
    const travel = envelope.travel;
    const from = direction === 'outbound' ? travel.outboundDepartureAirport : travel.returnDepartureAirport;
    const to = direction === 'outbound' ? travel.outboundArrivalAirport : travel.returnArrivalAirport;
    return from || to ? `${from || 'TBD'} → ${to || 'TBD'}` : 'Flight details with the team';
  }

  primaryContact(envelope: ExecutiveEngagementBrief): string {
    const contacts = envelope.contacts;
    const contact = contacts.find(item => item.type === 'primary') ?? contacts[0];
    return contact?.name || this.assignment()?.hostContactName || 'Being coordinated';
  }
}
