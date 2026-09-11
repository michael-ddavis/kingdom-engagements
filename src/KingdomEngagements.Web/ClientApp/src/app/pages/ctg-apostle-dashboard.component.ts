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
            <a class="next-assignment__photo" [href]="assignmentHref(next.id)" [attr.aria-label]="'Open ' + next.title">
              @if (cityImage(next.location); as photo) {
                <img [src]="photo" [alt]="cityImageAlt(next.location)" />
              } @else {
                <div class="photo-fallback" aria-hidden="true"></div>
              }
              <div class="photo-shade"></div>
              <div class="art-copy">
                <span>{{ cityCode(next.location) }}</span>
                <strong>{{ next.location || 'Global ministry assignment' }}</strong>
                <small>Next destination · Open engagement →</small>
              </div>
            </a>

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
                  <h2><a [href]="assignmentHref(next.id)">{{ next.title }}</a></h2>
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
              <a class="gold-action" [href]="assignmentHref(next.id)">View details <span>→</span></a>
              <small>{{ daysUntil(next.startsAtUtc) }} days away</small>
            </div>
          </section>
        }

        <section class="pulse-grid" aria-label="Ministry pulse">
          <a href="/organization/ctg/apostle#decisions" aria-label="Review open opportunities">
            <div class="metric-icon">◎</div>
            <div><strong>{{ openOpportunities() }}</strong><span>Open opportunities</span><small>Invitations the team is stewarding</small></div><b>→</b>
          </a>
          <a href="/assignments" aria-label="View confirmed ministry engagements">
            <div class="metric-icon">▦</div>
            <div><strong>{{ activeAssignments().length }}</strong><span>Confirmed ministry</span><small>Assignments currently on the road ahead</small></div><b>→</b>
          </a>
          <a href="/assignments" aria-label="View ready engagements">
            <div class="metric-icon">✈</div>
            <div><strong>{{ readyAssignments() }}</strong><span>Ready to go</span><small>80% readiness or better</small></div><b>→</b>
          </a>
          <a href="/organization/ctg/apostle#decisions" aria-label="Review items needing your eye">
            <div class="metric-icon">!</div>
            <div><strong>{{ decisionSignals().length }}</strong><span>Needs your eye</span><small>Only decisions worth surfacing to you</small></div><b>→</b>
          </a>
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
  styles: [`
    :host{display:block;min-height:calc(100vh - 72px);background:#f6f3ed;color:#171d25}*{box-sizing:border-box}.apostle-dashboard{max-width:1480px;margin:0 auto;padding:24px 28px 54px}.eyebrow{display:block;color:#9a7133;font-size:.61rem;font-weight:900;letter-spacing:.15em;text-transform:uppercase}.loading-card{padding:48px;border:1px solid #e3ded4;border-radius:18px;background:#fff;text-align:center;color:#777f88}
    .travel-hero{position:relative;min-height:150px;overflow:hidden;margin:-24px -28px 16px;padding:31px 34px 28px;border-bottom:1px solid #e3ddd2;background:#fbf9f4}.travel-hero__map{position:absolute;inset:0;background:url('/ctg-world-route.svg') center/cover no-repeat;opacity:.8}.travel-hero::after{position:absolute;inset:0;background:linear-gradient(90deg,rgba(251,249,244,.98),rgba(251,249,244,.86) 37%,rgba(251,249,244,.18) 77%,rgba(251,249,244,.66));content:''}.travel-hero__content,.travel-hero__mission{position:relative;z-index:1}.travel-hero h1{margin:7px 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2.4rem,4.2vw,4.2rem);font-weight:500;line-height:.98;letter-spacing:-.052em}.travel-hero p{margin:0;color:#606872;font-size:.9rem}.travel-hero__mission{position:absolute;right:32px;top:28px;display:grid;gap:3px;color:#a27b40;font-size:.54rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase}
    .next-assignment{display:grid;grid-template-columns:280px minmax(0,1fr) 170px;overflow:hidden;border:1px solid #dfd9ce;border-radius:18px;background:#fff;box-shadow:0 12px 32px rgba(26,29,34,.07)}.next-assignment__photo{position:relative;min-height:208px;overflow:hidden;color:#fff;text-decoration:none;background:#1d2c3b}.next-assignment__photo img,.decision-card__visual img,.road-card__visual img,.decision-brief__photo img{width:100%;height:100%;object-fit:cover;display:block}.photo-fallback{width:100%;height:100%;min-height:100%;background:#243447 url('/ctg-world-route.svg') center/cover no-repeat}.photo-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,16,23,.04),rgba(10,16,23,.1) 42%,rgba(8,13,18,.84))}.art-copy{position:absolute;z-index:1;left:18px;right:18px;bottom:16px}.art-copy span{display:block;color:#e7c98d;font-size:.56rem;font-weight:900;letter-spacing:.15em}.art-copy strong{display:block;margin:3px 0;font-family:Georgia,serif;font-size:1.1rem;font-weight:500}.art-copy small{color:rgba(255,255,255,.78);font-size:.57rem}.next-assignment__photo:hover img{transform:scale(1.025)}.next-assignment__photo img{transition:transform .25s ease}.next-assignment__main{padding:20px 23px}.next-assignment__identity{display:grid;grid-template-columns:68px 1fr;gap:16px;align-items:center;margin-top:9px}.date-tile{display:grid;place-items:center;padding:8px 5px;border:1px solid #e3ddd2;border-radius:11px;background:#fbfaf7}.date-tile span{color:#8d6933;font-size:.55rem;font-weight:900;text-transform:uppercase}.date-tile strong{font-family:Georgia,serif;font-size:2.05rem;font-weight:500;line-height:1}.date-tile small{color:#777d84;font-size:.56rem}.pin-line{color:#86632e;font-size:.63rem;font-weight:850}.next-assignment h2{margin:4px 0 3px;font-family:Georgia,serif;font-size:1.5rem;font-weight:500}.next-assignment h2 a{color:inherit;text-decoration:none}.next-assignment h2 a:hover{color:#8e682e}.next-assignment p{margin:0;color:#747a82;font-size:.68rem}.status-row{display:grid;grid-template-columns:repeat(4,minmax(90px,1fr));gap:7px;margin-top:15px}.status-row>span{display:grid;grid-template-columns:25px 1fr;grid-template-rows:auto auto;column-gap:7px;align-items:center;padding:8px;border:1px solid #e6e2da;border-radius:10px;background:#faf9f6}.status-row b{grid-row:1/3;display:grid;width:25px;height:25px;place-items:center;border-radius:7px;background:#efece5;color:#6e7379}.status-row small{color:#7d8289;font-size:.5rem;font-weight:800}.status-row strong{font-size:.55rem}.status-row>span.ready b{background:#f4ead6;color:#987038}.next-assignment__readiness{display:grid;place-items:center;align-content:center;gap:10px;padding:18px;border-left:1px solid #e8e4dc;background:linear-gradient(180deg,#fff,#fbf7ef)}.readiness-ring{display:grid;width:106px;height:106px;place-items:center;border-radius:50%;padding:8px}.readiness-ring>div{display:grid;width:90px;height:90px;place-items:center;align-content:center;border-radius:50%;background:#fff}.readiness-ring strong{font-size:1.35rem}.readiness-ring span{font-size:.52rem;text-transform:uppercase}.gold-action{display:inline-flex;gap:7px;align-items:center;padding:10px 15px;border-radius:999px;background:linear-gradient(180deg,#c69b4c,#a97d32);color:#fff;font-size:.62rem;font-weight:900;text-decoration:none}.next-assignment__readiness>small{color:#8b8f95;font-size:.55rem}
    .pulse-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin:12px 0}.pulse-grid>a{display:grid;grid-template-columns:46px 1fr auto;gap:12px;align-items:center;min-height:104px;padding:16px 17px;border:1px solid #e1ddd5;border-radius:16px;background:#fff;color:inherit;text-decoration:none;box-shadow:0 7px 18px rgba(25,29,35,.035);transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.pulse-grid>a:hover{transform:translateY(-2px);border-color:#cfb47f;box-shadow:0 11px 26px rgba(25,29,35,.07)}.pulse-grid>a>b{color:#aa8240;font-size:.9rem}.metric-icon{display:grid;width:43px;height:43px;place-items:center;border-radius:50%;background:#f6eddc;color:#9a7135;font-size:1.05rem}.pulse-grid strong{display:block;font-family:Georgia,serif;font-size:1.55rem;font-weight:500;line-height:1}.pulse-grid span{display:block;margin:3px 0;color:#242a32;font-size:.68rem;font-weight:850}.pulse-grid small{display:block;color:#8a8f96;font-size:.56rem;line-height:1.35}
    .dashboard-grid{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:12px}.dashboard-grid__main{display:grid;gap:12px}.decision-section,.road-section,.movement-panel{border:1px solid #e1ddd5;border-radius:17px;background:#fff;overflow:hidden}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 15px;border-bottom:1px solid #ece8e1}.section-heading>div{display:flex;align-items:center;gap:8px}.section-heading h2{margin:0;font-family:Georgia,serif;font-size:1rem;font-weight:500}.section-heading small,.section-heading>a{color:#858a91;font-size:.57rem;font-weight:800}.section-heading>a{color:#8d692f;text-decoration:none}.section-icon{color:#a77b37}
    .decision-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;padding:10px}.decision-card{display:grid;grid-template-columns:100px minmax(0,1fr) 18px;gap:10px;align-items:center;min-height:136px;padding:0 10px 0 0;border:1px solid #e4e0d9;border-radius:13px;background:#fff;color:inherit;font:inherit;text-align:left;cursor:pointer;overflow:hidden;transition:transform .15s ease,box-shadow .15s ease}.decision-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(23,28,35,.08)}.decision-card__visual{position:relative;align-self:stretch;min-height:136px;overflow:hidden;background:#243447}.decision-card__visual img{position:absolute;inset:0}.decision-card__photo-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,12,18,.05),rgba(8,12,18,.68))}.decision-card__visual>b{position:absolute;z-index:1;left:9px;bottom:9px;color:#fff;font-size:.55rem;letter-spacing:.1em}.decision-card__body small{display:block;color:#868b92;font-size:.53rem}.decision-card__body>strong{display:block;margin:3px 0 6px;font-size:.72rem}.decision-pill{display:inline-block;padding:4px 7px;border-radius:999px;background:#f5ead6;color:#8d662b;font-size:.5rem;font-weight:900}.decision-card[data-tone='rose'] .decision-pill{background:#fae9e6;color:#a94f45}.decision-card[data-tone='blue'] .decision-pill{background:#eaf0f6;color:#426b95}.decision-card__body p{margin:6px 0 0;color:#737981;font-size:.57rem;line-height:1.4}.decision-card__arrow{color:#a27a3a}.all-clear{display:flex;gap:10px;padding:25px}.all-clear>span{display:grid;width:32px;height:32px;place-items:center;border-radius:50%;background:#e9f4ed;color:#397156}.all-clear p{margin:4px 0;color:#7d838b;font-size:.65rem}
    .road-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;padding:10px}.road-card{display:grid;grid-template-columns:100px minmax(0,1fr) 58px;gap:10px;align-items:center;overflow:hidden;min-height:102px;border:1px solid #e4e0d9;border-radius:13px;background:#fff;color:inherit;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease}.road-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(23,28,35,.08)}.road-card__visual{position:relative;height:102px;overflow:hidden;background:#243447}.road-card__visual img{position:absolute;inset:0}.road-card__visual::after{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,12,18,.08),rgba(8,12,18,.6));content:''}.road-card__date{position:absolute;z-index:1;top:8px;left:8px;display:grid;place-items:center;width:39px;padding:4px;border-radius:8px;background:rgba(255,255,255,.91)}.road-card__date span{color:#8d672f;font-size:.46rem;font-weight:900;text-transform:uppercase}.road-card__date strong{font-family:Georgia,serif;font-size:1.18rem;font-weight:500;line-height:1}.road-card__visual>small{position:absolute;z-index:1;left:9px;bottom:8px;color:#fff;font-size:.5rem;font-weight:900;letter-spacing:.1em}.road-card__body small,.road-card__body span{display:block;color:#858b92;font-size:.54rem}.road-card__body strong{display:block;margin:3px 0;font-size:.68rem}.road-card__ready{text-align:center}.mini-ring{display:grid;width:42px;height:42px;margin:auto;place-items:center;border-radius:50%;padding:4px}.mini-ring>span{display:grid;width:34px;height:34px;place-items:center;border-radius:50%;background:#fff;color:#20252c;font-size:.53rem;font-weight:900}.road-card__ready>small{color:#8d9298;font-size:.45rem;text-transform:uppercase}.empty-road{grid-column:1/-1;padding:25px;text-align:center;color:#858b92}
    .movement-list{display:grid}.movement-list>a,.movement-empty{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:14px 15px;border-bottom:1px solid #ece8e1;color:inherit;text-decoration:none}.movement-list>a:hover{background:#fbf8f1}.movement-list>a>span{color:#a77d3b}.movement-icon{display:grid;width:32px;height:32px;place-items:center;border-radius:50%;background:#f5ecdc;color:#9a7134}.movement-list strong{font-size:.66rem}.movement-list p{margin:2px 0;color:#656d76;font-size:.58rem}.movement-list small{color:#94989e;font-size:.5rem}.movement-quote{min-height:150px;padding:23px;background:linear-gradient(135deg,rgba(19,31,45,.94),rgba(80,65,43,.88)),url('/ctg-world-route.svg') center/cover;color:#fff}.movement-quote span{font-family:Georgia,serif;font-size:1.08rem;line-height:1.35}.movement-quote i{display:block;width:35px;height:2px;margin-top:14px;background:#c79b4d}
    .executive-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:15px;padding:14px 2px;color:#747b83;font-size:.56rem}.executive-footer span{display:flex;gap:7px;align-items:center}.executive-footer i{width:3px;height:3px;border-radius:50%;background:#b58a43}.executive-footer a{color:#8c672f;font-size:.6rem;font-weight:900;text-decoration:none}
    .brief-backdrop{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;padding:24px;background:rgba(13,18,24,.48);backdrop-filter:blur(7px)}.decision-brief{display:grid;grid-template-columns:270px minmax(0,1fr);width:min(760px,95vw);overflow:hidden;border:1px solid rgba(255,255,255,.25);border-radius:20px;background:#fff;box-shadow:0 30px 90px rgba(0,0,0,.24)}.decision-brief__photo{position:relative;min-height:340px;background:#243447}.decision-brief__photo img{position:absolute;inset:0}.decision-brief__photo::after{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,15,21,.05),rgba(10,15,21,.76));content:''}.decision-brief__photo>div:last-child{position:absolute;z-index:1;left:20px;right:20px;bottom:20px;color:#fff}.decision-brief__photo span,.decision-brief__photo strong{display:block}.decision-brief__photo span{color:#e4c684;font-size:.55rem;font-weight:900;text-transform:uppercase}.decision-brief__photo strong{margin-top:4px;font-family:Georgia,serif;font-size:1.25rem;font-weight:500}.decision-brief__content{position:relative;padding:28px}.decision-brief__content h2{margin:7px 0 8px;font-family:Georgia,serif;font-size:1.8rem;font-weight:500}.decision-brief__content>p{color:#69717b;line-height:1.55}.close-button{position:absolute;top:14px;right:14px;width:34px;height:34px;border:0;border-radius:50%;background:#f0ede7;color:#555;font-size:1.2rem;cursor:pointer}.brief-note{display:grid;gap:5px;margin:22px 0;padding:15px;border-left:3px solid #b78a43;background:#faf6ee}.brief-note span{color:#8b713f;font-size:.55rem;font-weight:900;text-transform:uppercase}.brief-note strong{font-size:.76rem}.brief-actions{display:flex;gap:9px;flex-wrap:wrap}.brief-actions button,.brief-actions a{display:inline-flex;align-items:center;min-height:38px;padding:0 13px;border-radius:9px;font-size:.62rem;font-weight:900;text-decoration:none}.brief-actions button{border:1px solid #d8d3c9;background:#fff;color:#555;cursor:pointer}.brief-actions a{background:#172a46;color:#fff}
    @media(max-width:1100px){.next-assignment{grid-template-columns:230px 1fr}.next-assignment__readiness{grid-column:1/-1;grid-template-columns:auto auto 1fr;justify-content:start;border-top:1px solid #e8e4dc;border-left:0}.readiness-ring{width:75px;height:75px}.readiness-ring>div{width:59px;height:59px}.pulse-grid{grid-template-columns:1fr 1fr}.dashboard-grid{grid-template-columns:1fr}.decision-cards,.road-cards{grid-template-columns:1fr}.movement-panel{display:grid;grid-template-columns:1fr 280px}.movement-panel>.section-heading{grid-column:1/-1}}
    @media(max-width:720px){.apostle-dashboard{padding:18px 14px 45px}.travel-hero{margin:-18px -14px 13px;padding:25px 18px}.travel-hero__mission{display:none}.next-assignment{grid-template-columns:1fr}.next-assignment__photo{min-height:210px}.next-assignment__readiness{grid-column:auto;grid-template-columns:auto 1fr;border-left:0}.next-assignment__readiness>small{grid-column:2}.status-row{grid-template-columns:1fr 1fr}.pulse-grid{grid-template-columns:1fr}.decision-card,.road-card{grid-template-columns:92px 1fr 28px}.movement-panel{display:block}.decision-brief{grid-template-columns:1fr}.decision-brief__photo{min-height:190px}.executive-footer{align-items:flex-start;flex-direction:column}}
  `],
})
export class CtgApostleDashboardComponent implements OnInit {
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly assignments = signal<readonly EngagementSummary[]>([]);
  readonly loading = signal(true);
  readonly selectedSignal = signal<ExecutiveSignal | null>(null);

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
    return `conic-gradient(#b58a45 ${Math.max(0, Math.min(100, percent))}%, #eee9df 0)`;
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
