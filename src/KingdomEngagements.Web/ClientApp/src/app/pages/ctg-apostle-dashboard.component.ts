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
    <section class="apostle-dashboard">
      <header class="travel-hero">
        <div class="travel-hero__map" aria-hidden="true"></div>
        <div class="travel-hero__content">
          <span class="eyebrow">Cynthia Thompson Global · Executive view</span>
          <h1>Good morning, Apostle Cynthia.</h1>
          <p>Here is what matters right now. Your team is carrying the details.</p>
        </div>
        <div class="travel-hero__mission" aria-hidden="true">
          <span>People</span><span>Cities</span><span>Nations</span><strong>A brighter tomorrow</strong>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-card">Preparing your ministry picture…</div>
      } @else {
        @if (nextAssignment(); as next) {
          <section class="next-assignment" aria-label="Next assignment">
            <div class="next-assignment__art">
              <div class="route-globe" aria-hidden="true">
                <span class="route-globe__ring route-globe__ring--one"></span>
                <span class="route-globe__ring route-globe__ring--two"></span>
                <span class="route-globe__ring route-globe__ring--three"></span>
                <span class="route-globe__plane">✦</span>
              </div>
              <div class="art-copy">
                <span>{{ cityCode(next.location) }}</span>
                <strong>{{ next.location || 'Global ministry assignment' }}</strong>
                <small>Next destination</small>
              </div>
            </div>

            <div class="next-assignment__main">
              <span class="eyebrow">Next assignment</span>
              <div class="next-assignment__identity">
                <div class="date-tile">
                  <span>{{ month(next.startsAtUtc) }}</span>
                  <strong>{{ day(next.startsAtUtc) }}</strong>
                  <small>{{ year(next.startsAtUtc) }}</small>
                </div>
                <div>
                  <span class="pin-line">● {{ next.location || 'Location being finalized' }}</span>
                  <h2>{{ next.title }}</h2>
                  <p>Host: {{ next.hostOrganization }}</p>
                </div>
              </div>

              <div class="status-row" aria-label="Preparation status">
                <span [class.ready]="isConfirmed(next.travelStatus)"><b>✈</b><small>Travel</small><strong>{{ stateLabel(next.travelStatus) }}</strong></span>
                <span [class.ready]="isConfirmed(next.lodgingStatus)"><b>▰</b><small>Lodging</small><strong>{{ stateLabel(next.lodgingStatus) }}</strong></span>
                <span [class.ready]="isConfirmed(next.hostStatus)"><b>●</b><small>Host</small><strong>{{ stateLabel(next.hostStatus) }}</strong></span>
                <span [class.ready]="isConfirmed(next.documentsStatus)"><b>▤</b><small>Documents</small><strong>{{ stateLabel(next.documentsStatus) }}</strong></span>
              </div>
            </div>

            <div class="next-assignment__readiness">
              <div class="readiness-ring" [style.background]="ring(next.readinessPercent)">
                <div><strong>{{ next.readinessPercent }}%</strong><span>ready</span></div>
              </div>
              <a [href]="assignmentHref(next.id)">View details <span>→</span></a>
              <small>{{ daysUntil(next.startsAtUtc) }} days away</small>
            </div>
          </section>
        }

        <section class="pulse-grid" aria-label="Ministry pulse">
          <article>
            <div class="metric-icon metric-icon--globe">◎</div>
            <div><strong>{{ openOpportunities() }}</strong><span>Open opportunities</span><small>Invitations the team is stewarding</small></div>
          </article>
          <article>
            <div class="metric-icon metric-icon--calendar">▦</div>
            <div><strong>{{ activeAssignments().length }}</strong><span>Confirmed ministry</span><small>Assignments currently on the road ahead</small></div>
          </article>
          <article>
            <div class="metric-icon metric-icon--plane">✈</div>
            <div><strong>{{ readyAssignments() }}</strong><span>Ready to go</span><small>80% readiness or better</small></div>
          </article>
          <article>
            <div class="metric-icon metric-icon--alert">!</div>
            <div><strong>{{ decisionSignals().length }}</strong><span>Needs your eye</span><small>Only decisions worth surfacing to you</small></div>
          </article>
        </section>

        <section class="dashboard-grid">
          <div class="dashboard-grid__main">
            <section class="decision-section">
              <div class="section-heading">
                <div><span class="section-icon">◉</span><h2>What needs your eye</h2></div>
                <small>{{ decisionSignals().length }} items</small>
              </div>

              @if (decisionSignals().length) {
                <div class="decision-cards">
                  @for (signal of decisionSignals(); track signal.key; let i = $index) {
                    <article class="decision-card" [attr.data-tone]="signal.tone">
                      <div class="decision-card__visual" [attr.data-index]="i">
                        <span class="decision-card__pin">●</span>
                        <span class="decision-card__route"></span>
                        <b>{{ placeCode(signal.place) }}</b>
                      </div>
                      <div class="decision-card__body">
                        <small>{{ signal.place }}</small>
                        <strong>{{ signal.title }}</strong>
                        <span class="decision-pill">{{ signal.kicker }}</span>
                        <p>{{ signal.detail }}</p>
                      </div>
                      <span class="decision-card__arrow">→</span>
                    </article>
                  }
                </div>
              } @else {
                <div class="all-clear"><span>✓</span><div><strong>Nothing is waiting on you.</strong><p>Your team has the current booking and preparation work in hand.</p></div></div>
              }
            </section>

            <section class="road-section">
              <div class="section-heading">
                <div><span class="section-icon">●</span><h2>Your road ahead</h2></div>
                <small>Next {{ upcomingAssignments().length }} engagements</small>
              </div>

              <div class="road-cards">
                @for (item of upcomingAssignments(); track item.id; let i = $index) {
                  <a class="road-card" [href]="assignmentHref(item.id)">
                    <div class="road-card__visual" [attr.data-index]="i">
                      <span>{{ month(item.startsAtUtc) }}</span>
                      <strong>{{ day(item.startsAtUtc) }}</strong>
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
              <small>Recent activity</small>
            </div>

            <div class="movement-list">
              @for (item of recentMovement(); track item.id; let i = $index) {
                <article>
                  <div class="movement-icon">{{ movementIcon(item, i) }}</div>
                  <div><strong>{{ movementTitle(item) }}</strong><p>{{ item.title }}</p><small>{{ item.location || item.hostOrganization }} · {{ dateTime(item.updatedAtUtc) }}</small></div>
                </article>
              } @empty {
                <article><div class="movement-icon">✓</div><div><strong>All quiet</strong><p>No recent assignment movement.</p><small>Your team updates will surface here.</small></div></article>
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
          <strong>You focus on the calling. Your team handles the details.</strong>
        </footer>
      }
    </section>
  `,
  styles: [`
    :host{display:block;min-height:calc(100vh - 72px);background:#f6f3ed;color:#151b24}
    *{box-sizing:border-box}
    .apostle-dashboard{max-width:1480px;margin:0 auto;padding:24px 28px 54px}.eyebrow{display:block;color:#9c7335;font-size:.61rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.loading-card{padding:48px;border:1px solid #e3ded4;border-radius:18px;background:#fff;text-align:center;color:#777f88}
    .travel-hero{position:relative;min-height:150px;overflow:hidden;margin:-24px -28px 16px;padding:31px 34px 28px;border-bottom:1px solid #e3ddd2;background:#fbf9f4}.travel-hero__map{position:absolute;inset:0;background:url('/ctg-world-route.svg') center/cover no-repeat;opacity:.78}.travel-hero::after{position:absolute;inset:0;background:linear-gradient(90deg,rgba(251,249,244,.98) 0%,rgba(251,249,244,.88) 35%,rgba(251,249,244,.22) 78%,rgba(251,249,244,.62) 100%);content:''}.travel-hero__content,.travel-hero__mission{position:relative;z-index:1}.travel-hero__content{max-width:860px}.travel-hero h1{margin:7px 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2.4rem,4.2vw,4.2rem);font-weight:500;line-height:.98;letter-spacing:-.052em}.travel-hero p{margin:0;color:#5f6670;font-size:.9rem}.travel-hero__mission{position:absolute;right:32px;top:28px;display:grid;gap:3px;color:#a27b40;font-size:.54rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.travel-hero__mission strong{margin-top:4px;color:#a27b40;font-size:.54rem;font-weight:900}
    .next-assignment{display:grid;grid-template-columns:250px minmax(0,1fr) 170px;overflow:hidden;border:1px solid #dfd9ce;border-radius:17px;background:#fff;box-shadow:0 11px 30px rgba(26,29,34,.07)}.next-assignment__art{position:relative;min-height:190px;overflow:hidden;padding:18px;background:linear-gradient(145deg,#16202d,#203248 58%,#b18440 160%);color:#fff}.next-assignment__art::after{position:absolute;inset:auto -35px -58px auto;width:210px;height:210px;border:1px solid rgba(227,194,137,.27);border-radius:50%;content:''}.route-globe{position:absolute;top:21px;left:28px;width:130px;height:130px;border:1px solid rgba(229,195,137,.48);border-radius:50%}.route-globe::before,.route-globe::after{position:absolute;inset:19px;border:1px solid rgba(229,195,137,.36);border-radius:50%;content:''}.route-globe::after{inset:44px -17px 44px;transform:rotate(-11deg)}.route-globe__ring{position:absolute;left:50%;top:50%;display:block;border:1px solid rgba(229,195,137,.33);border-radius:50%;transform:translate(-50%,-50%)}.route-globe__ring--one{width:92%;height:38%}.route-globe__ring--two{width:42%;height:96%}.route-globe__ring--three{width:70%;height:72%;transform:translate(-50%,-50%) rotate(30deg)}.route-globe__plane{position:absolute;right:-14px;top:26px;color:#dfbd7a;font-size:1.35rem;transform:rotate(24deg)}.art-copy{position:absolute;left:18px;right:18px;bottom:16px;z-index:1}.art-copy>span{display:block;color:#d9b873;font-size:.54rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.art-copy strong{display:block;margin-top:3px;font-family:Georgia,serif;font-size:1rem;font-weight:500}.art-copy small{color:rgba(255,255,255,.68);font-size:.57rem}.next-assignment__main{padding:19px 23px 18px}.next-assignment__identity{display:grid;grid-template-columns:66px 1fr;gap:16px;align-items:center;margin-top:8px}.date-tile{display:grid;place-items:center;padding:8px 5px;border:1px solid #e4dfd5;border-radius:11px;background:#fbfaf7}.date-tile span{color:#8b6933;font-size:.55rem;font-weight:900;text-transform:uppercase}.date-tile strong{font-family:Georgia,serif;font-size:2.05rem;font-weight:500;line-height:1}.date-tile small{color:#777d84;font-size:.56rem}.pin-line{color:#87652f;font-size:.63rem;font-weight:850}.next-assignment h2{margin:3px 0 3px;font-family:Georgia,serif;font-size:1.45rem;font-weight:500;letter-spacing:-.025em}.next-assignment__identity p{margin:0;color:#747a82;font-size:.67rem}.status-row{display:grid;grid-template-columns:repeat(4,minmax(90px,1fr));gap:7px;margin-top:13px}.status-row>span{display:grid;grid-template-columns:24px 1fr;grid-template-rows:auto auto;column-gap:6px;align-items:center;padding:8px;border:1px solid #e6e2da;border-radius:10px;background:#faf9f6}.status-row b{grid-row:1/3;display:grid;width:24px;height:24px;place-items:center;border-radius:7px;background:#efece5;color:#6e7379;font-size:.72rem}.status-row small{color:#7d8289;font-size:.5rem;font-weight:800}.status-row strong{color:#30363e;font-size:.55rem}.status-row>span.ready b{background:#f4ead6;color:#9a7337}.status-row>span.ready strong{color:#7f612f}.next-assignment__readiness{display:grid;place-items:center;align-content:center;gap:9px;padding:18px;border-left:1px solid #e8e4dc;background:linear-gradient(180deg,#fff,#fbf7ef)}.readiness-ring{display:grid;width:105px;height:105px;place-items:center;border-radius:50%;padding:8px}.readiness-ring>div{display:grid;width:89px;height:89px;place-items:center;align-content:center;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 1px #eee9df}.readiness-ring strong{font-family:Georgia,serif;font-size:1.55rem;line-height:1}.readiness-ring span{margin-top:2px;color:#777d84;font-size:.54rem;font-weight:900;text-transform:uppercase}.next-assignment__readiness>a{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:linear-gradient(180deg,#b88b3f,#9c722f);color:#fff;font-size:.61rem;font-weight:900;text-decoration:none;box-shadow:0 6px 14px rgba(157,113,45,.21)}.next-assignment__readiness>small{color:#8a8f95;font-size:.55rem}
    .pulse-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}.pulse-grid article{display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;min-height:92px;padding:14px 15px;border:1px solid #e2ddd4;border-radius:14px;background:#fff;box-shadow:0 7px 22px rgba(25,30,37,.04)}.metric-icon{display:grid;width:48px;height:48px;place-items:center;border-radius:50%;background:#f4ead6;color:#a27735;font-size:1.2rem;font-weight:800;box-shadow:inset 0 0 0 1px #ead9b9}.metric-icon--calendar{background:#f5efe2}.metric-icon--plane{background:#f3eadb}.metric-icon--alert{background:#f5ebdd}.pulse-grid strong{display:block;font-family:Georgia,serif;font-size:1.65rem;font-weight:500;line-height:1}.pulse-grid span{display:block;margin-top:2px;font-size:.67rem;font-weight:850}.pulse-grid small{display:block;margin-top:3px;color:#848a91;font-size:.55rem;line-height:1.35}
    .dashboard-grid{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:12px;margin-top:12px}.dashboard-grid__main{display:grid;gap:12px}.decision-section,.road-section,.movement-panel{border:1px solid #e2ddd4;border-radius:15px;background:#fff;box-shadow:0 7px 22px rgba(25,30,37,.04)}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 15px;border-bottom:1px solid #ebe7df}.section-heading>div{display:flex;align-items:center;gap:8px}.section-heading h2{margin:0;font-family:Georgia,serif;font-size:1.05rem;font-weight:500}.section-heading small{color:#868b92;font-size:.54rem;font-weight:800}.section-icon{color:#9f7636;font-size:.84rem}.decision-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;padding:10px}.decision-card{position:relative;display:grid;grid-template-columns:82px minmax(0,1fr) 22px;gap:10px;align-items:center;min-height:118px;overflow:hidden;padding:8px;border:1px solid #e7e2d9;border-radius:12px;background:#fff}.decision-card__visual{position:relative;height:96px;overflow:hidden;border-radius:9px;background:linear-gradient(145deg,#213346,#6f8392)}.decision-card__visual[data-index='1']{background:linear-gradient(145deg,#3f5262,#b58345)}.decision-card__visual[data-index='2']{background:linear-gradient(145deg,#293b4c,#86644a)}.decision-card__visual::before{position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(8,14,22,.5));content:''}.decision-card__route{position:absolute;left:13px;top:26px;width:66px;height:33px;border-top:1px solid rgba(240,211,159,.78);border-radius:50%;transform:rotate(-12deg)}.decision-card__pin{position:absolute;left:13px;top:37px;color:#e2bf7d;font-size:.65rem}.decision-card__visual b{position:absolute;left:9px;bottom:7px;color:#fff;font-family:Georgia,serif;font-size:1.05rem;font-weight:500;letter-spacing:.06em}.decision-card__body small{display:block;color:#858b92;font-size:.51rem}.decision-card__body>strong{display:block;margin:3px 0 5px;font-size:.68rem}.decision-pill{display:inline-flex;padding:3px 6px;border-radius:999px;background:#f8ede8;color:#a44d43;font-size:.48rem;font-weight:850}.decision-card[data-tone='blue'] .decision-pill{background:#edf3f8;color:#456f98}.decision-card[data-tone='gold'] .decision-pill{background:#f7efdf;color:#8c692f}.decision-card p{margin:6px 0 0;color:#6e7680;font-size:.55rem;line-height:1.35}.decision-card__arrow{display:grid;width:22px;height:22px;place-items:center;border:1px solid #ded9cf;border-radius:50%;color:#8c6b35;font-size:.62rem}.all-clear{display:flex;gap:12px;align-items:center;padding:25px}.all-clear>span{display:grid;width:36px;height:36px;place-items:center;border-radius:50%;background:#eaf4ee;color:#3f775c;font-weight:900}.all-clear strong{display:block}.all-clear p{margin:3px 0 0;color:#7d838b;font-size:.64rem}
    .road-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:10px}.road-card{display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:9px;align-items:center;padding:7px;border:1px solid #e5e0d7;border-radius:11px;background:#fff;color:inherit;text-decoration:none}.road-card:hover{border-color:#cfbd9c;box-shadow:0 8px 18px rgba(32,35,40,.06)}.road-card__visual{display:grid;height:76px;place-items:center;align-content:center;border-radius:8px;background:linear-gradient(145deg,#233649,#8a6d4a);color:#fff}.road-card__visual[data-index='1']{background:linear-gradient(145deg,#445565,#9f7b4d)}.road-card__visual[data-index='2']{background:linear-gradient(145deg,#283c4e,#665946)}.road-card__visual[data-index='3']{background:linear-gradient(145deg,#5a4c42,#a17c46)}.road-card__visual>span{font-size:.48rem;font-weight:900;text-transform:uppercase}.road-card__visual>strong{font-family:Georgia,serif;font-size:1.5rem;font-weight:500;line-height:1}.road-card__visual>small{margin-top:4px;color:#e7c98d;font-size:.48rem;font-weight:900;letter-spacing:.08em}.road-card__body{min-width:0}.road-card__body small,.road-card__body span{display:block;color:#858a91;font-size:.49rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.road-card__body>strong{display:block;margin:3px 0;font-size:.62rem;line-height:1.25}.road-card__ready{display:grid;justify-items:center;gap:2px}.mini-ring{display:grid;width:38px;height:38px;place-items:center;border-radius:50%;padding:4px}.mini-ring span{display:grid;width:30px;height:30px;place-items:center;border-radius:50%;background:#fff;font-size:.48rem;font-weight:900}.road-card__ready small{color:#8b9096;font-size:.43rem;text-transform:uppercase}.empty-road{grid-column:1/-1;padding:22px;color:#858b92;text-align:center}
    .movement-panel{display:flex;flex-direction:column;min-height:100%}.movement-list{display:grid}.movement-list article{display:grid;grid-template-columns:34px 1fr;gap:9px;padding:13px 15px;border-bottom:1px solid #ece8e0}.movement-icon{display:grid;width:32px;height:32px;place-items:center;border-radius:50%;background:#f3ead9;color:#987137;font-size:.78rem}.movement-list strong{display:block;font-size:.63rem}.movement-list p{margin:2px 0;color:#67717c;font-size:.54rem}.movement-list small{color:#92969b;font-size:.49rem}.movement-quote{margin:auto 15px 15px;padding:17px;border-radius:12px;background:linear-gradient(135deg,#23364a,#a1773c);color:#fff}.movement-quote span{font-family:Georgia,serif;font-size:1rem;line-height:1.3}.movement-quote i{display:block;width:30px;height:2px;margin-top:10px;background:#d5af69}.executive-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 2px 0;color:#858a90;font-size:.52rem}.executive-footer span{display:flex;gap:6px;align-items:center}.executive-footer i{width:3px;height:3px;border-radius:50%;background:#af8a4e}.executive-footer strong{color:#525b65;font-size:.53rem;font-weight:800}
    @media(max-width:1180px){.next-assignment{grid-template-columns:210px minmax(0,1fr) 150px}.status-row{grid-template-columns:1fr 1fr}.dashboard-grid{grid-template-columns:1fr}.movement-panel{min-height:auto}.movement-quote{margin:15px}.road-cards{grid-template-columns:1fr 1fr}.decision-cards{grid-template-columns:1fr 1fr}.travel-hero__mission{display:none}}
    @media(max-width:820px){.apostle-dashboard{padding:18px 14px 42px}.travel-hero{margin:-18px -14px 12px;padding:27px 18px 24px}.travel-hero h1{font-size:2.35rem}.next-assignment{grid-template-columns:1fr}.next-assignment__art{min-height:150px}.next-assignment__readiness{grid-template-columns:auto auto;justify-content:center;border-top:1px solid #e8e4dc;border-left:0}.readiness-ring{width:86px;height:86px}.readiness-ring>div{width:70px;height:70px}.pulse-grid{grid-template-columns:1fr 1fr}.decision-cards,.road-cards{grid-template-columns:1fr}.executive-footer{align-items:flex-start;flex-direction:column}}
    @media(max-width:520px){.pulse-grid{grid-template-columns:1fr}.next-assignment__identity{grid-template-columns:58px 1fr}.status-row{grid-template-columns:1fr 1fr}.decision-card{grid-template-columns:70px minmax(0,1fr)}.decision-card__arrow{display:none}.road-card{grid-template-columns:52px minmax(0,1fr) auto}.travel-hero p{font-size:.76rem}}
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

  readonly upcomingAssignments = computed(() => this.activeAssignments().slice(0, 4));
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
    return [...manual, ...formal]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
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

  assignmentHref(id: string): string { return `/assignments/${encodeURIComponent(id)}`; }
  ring(percent: number): string { return `conic-gradient(#b58a45 ${Math.max(0, Math.min(100, percent))}%, #eee9df 0)`; }
  isConfirmed(value: string): boolean { return ['confirmed', 'complete', 'received'].includes((value || '').toLowerCase()); }
  month(value: string | null): string { return value ? new Date(value).toLocaleDateString(undefined, { month: 'short' }) : 'TBD'; }
  day(value: string | null): string { return value ? new Date(value).getDate().toString() : '—'; }
  year(value: string | null): string { return value ? new Date(value).getFullYear().toString() : ''; }
  dateTime(value: string): string { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

  daysUntil(value: string | null): number | string {
    if (!value) return '—';
    return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86400000));
  }

  cityCode(location: string | null): string {
    if (!location) return 'GO';
    const city = location.split(',')[0].trim();
    const words = city.split(/\s+/).filter(Boolean);
    if (words.length > 1) return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
    return city.slice(0, 3).toUpperCase();
  }

  placeCode(place: string): string {
    if (!place) return 'GO';
    const city = place.split(',')[0].trim();
    return city.slice(0, 3).toUpperCase();
  }

  stateLabel(value: string): string {
    const normalized = (value || 'not-started').toLowerCase();
    if (['confirmed', 'complete', 'received'].includes(normalized)) return 'Confirmed';
    if (normalized === 'in-progress') return 'In progress';
    if (normalized === 'needs-attention') return 'Needs attention';
    if (normalized === 'requested') return 'Requested';
    return 'Pending';
  }

  movementIcon(item: EngagementSummary, index: number): string {
    if (item.readinessPercent >= 90) return '✈';
    if (item.hostStatus === 'confirmed') return '◆';
    if (item.travelStatus === 'confirmed' && item.lodgingStatus === 'confirmed') return '▤';
    return ['✦', '●', '↗', '✓'][index % 4];
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
      return { key: `manual-${item.id}`, title: item.eventName, place, kicker: 'Schedule decision', detail: 'A date is being protected while the team finishes discernment and terms.', priority: 100, tone: 'gold' };
    }
    if (item.stage === 'under-review') {
      return { key: `manual-${item.id}`, title: item.eventName, place, kicker: 'Your input needed', detail: 'The team has gathered enough information for leadership discernment.', priority: 90, tone: 'blue' };
    }
    if (item.stage === 'new' && item.source === 'apostle-cynthia') {
      return { key: `manual-${item.id}`, title: item.eventName, place, kicker: 'New opportunity', detail: 'Your team captured the opportunity and is beginning follow-up.', priority: 70, tone: 'rose' };
    }
    return null;
  }

  private requestSignal(item: SpeakingRequestDetails): ExecutiveSignal | null {
    if (!['awaiting-review', 'submitted'].includes(item.status)) return null;
    return {
      key: `request-${item.id}`,
      title: item.eventName || 'Host invitation',
      place: [item.city, item.country].filter(Boolean).join(', ') || item.organizationName,
      kicker: 'Awaiting review',
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
