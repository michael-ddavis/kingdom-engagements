import { Component, OnInit, computed, signal } from '@angular/core';
import { EngagementsApiService } from '../core/engagements-api.service';
import { EngagementSummary } from '../core/models';

interface DestinationImage {
  terms: readonly string[];
  url: string;
}

const DESTINATION_IMAGES: readonly DestinationImage[] = [
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
    <section class="executive-view">
      <header class="executive-hero">
        <div class="executive-hero__copy">
          <span class="hero-eyebrow">Global reach · Eternal impact.</span>
          <h1>{{ greeting() }}<br><em>Apostle Cynthia</em></h1>
          <p>Your road ahead at a glance.</p>
          <div class="hero-rule"></div>
          <small>People · Places · Purpose · A greater tomorrow</small>
        </div>

        <div class="executive-hero__scripture" aria-hidden="true">
          <strong>Until<br>all nations<br>hear.</strong>
          <span>Matthew 24:14</span>
          <i></i>
        </div>

      </header>

      @if (loading()) {
        <div class="loading-card">Preparing your road ahead…</div>
      } @else {
        <section class="metric-grid" aria-label="Executive engagement summary">
          <article class="metric-card">
            <span class="metric-icon">▦</span>
            <div>
              <small>Next engagement</small>
              @if (nextAssignment(); as next) {
                <strong>{{ shortDate(next.startsAtUtc) }}</strong>
                <p>{{ next.location || 'Location being finalized' }}</p>
              } @else {
                <strong>None scheduled</strong>
                <p>Your team will add the next confirmed assignment here.</p>
              }
            </div>
          </article>

          <article class="metric-card">
            <span class="metric-icon">●●●</span>
            <div>
              <small>Upcoming engagements</small>
              <strong>{{ nextThirtyDays().length }}</strong>
              <p>Next 30 days</p>
            </div>
          </article>

          <article class="metric-card metric-card--readiness">
            <div class="metric-ring" [style.background]="readinessRing(averageReadiness())">
              <span>{{ averageReadiness() }}%</span>
            </div>
            <div>
              <small>Average readiness</small>
              <strong>{{ averageReadiness() }}%</strong>
              <p>Across upcoming engagements</p>
            </div>
          </article>

          <article class="metric-card">
            <span class="metric-icon">◆</span>
            <div>
              <small>Cities / nations ahead</small>
              <strong>{{ destinationCities() }}</strong>
              <p>{{ destinationCountries() }} nations · {{ destinationCities() }} cities</p>
            </div>
          </article>
        </section>

        <section class="executive-grid">
          <article class="panel next-panel">
            <header class="panel-heading">
              <div><span class="panel-icon">▦</span><h2>Next Engagement</h2></div>
              @if (nextAssignment(); as next) {
                <a [href]="assignmentHref(next.id)">Open engagement <span>→</span></a>
              }
            </header>

            @if (nextAssignment(); as next) {
              <div class="next-summary">
                <div class="date-card">
                  <span>{{ month(next.startsAtUtc) }}</span>
                  <strong>{{ day(next.startsAtUtc) }}</strong>
                  <small>{{ year(next.startsAtUtc) }}</small>
                </div>

                <div class="next-summary__copy">
                  <h3>{{ next.title }}</h3>
                  <p><span>●</span>{{ next.location || 'Location being finalized' }}</p>
                  <p><span>▰</span>{{ next.hostOrganization }}</p>
                </div>

                <div class="readiness">
                  <div class="readiness-ring" [style.background]="readinessRing(next.readinessPercent)">
                    <div>{{ next.readinessPercent }}%</div>
                  </div>
                  <small>Readiness</small>
                </div>
              </div>

              <a
                class="destination-photo"
                [href]="assignmentHref(next.id)"
                [attr.aria-label]="'Open ' + next.title"
              >
                @if (destinationImage(next.location); as photo) {
                  <img [src]="photo" [alt]="destinationImageAlt(next.location)" />
                } @else {
                  <div class="destination-fallback" aria-hidden="true"></div>
                }
                <span class="destination-shade"></span>
                <div class="destination-label">
                  <strong>{{ cityName(next.location) }}</strong>
                  <small>{{ locationTail(next.location) }}</small>
                </div>
                <p>Equipping leaders.<br>Transforming nations.</p>
              </a>
            } @else {
              <div class="empty-state">
                <strong>No confirmed engagement is currently ahead.</strong>
                <span>Your team can continue stewarding the booking pipeline.</span>
              </div>
            }
          </article>

          <article class="panel month-panel">
            <header class="panel-heading">
              <div><span class="panel-icon">▦</span><h2>Next 30 Days</h2></div>
              <a href="/assignments">View all <span>→</span></a>
            </header>

            <div class="month-list">
              @for (item of nextThirtyDaysPreview(); track item.id) {
                <a [href]="assignmentHref(item.id)">
                  <time>
                    <span>{{ month(item.startsAtUtc) }}</span>
                    <strong>{{ day(item.startsAtUtc) }}</strong>
                  </time>
                  <span class="destination-dot" [attr.data-tone]="readinessTone(item.readinessPercent)"></span>
                  <div>
                    <strong>{{ item.location || 'Location pending' }}</strong>
                    <small>{{ item.title }}</small>
                  </div>
                  <b>{{ item.readinessPercent }}%</b>
                  <span class="month-arrow">›</span>
                </a>
              } @empty {
                <div class="empty-list">No confirmed engagements fall within the next 30 days.</div>
              }
            </div>
          </article>

          <aside class="panel awareness-panel">
            <header class="panel-heading">
              <div><span class="panel-icon">●</span><h2>For Your Awareness</h2></div>
            </header>

            <div class="awareness-list">
              <article>
                <span class="awareness-icon">✈</span>
                <div>
                  <strong>Travel Details Pending</strong>
                  <small>Awaiting final confirmation</small>
                </div>
                <b>{{ travelPending() }}</b>
              </article>

              <article>
                <span class="awareness-icon">▤</span>
                <div>
                  <strong>Host Details Pending</strong>
                  <small>Additional information coming</small>
                </div>
                <b>{{ hostPending() }}</b>
              </article>

              <article>
                <span class="awareness-icon">▥</span>
                <div>
                  <strong>Documents Pending</strong>
                  <small>Pre-engagement materials</small>
                </div>
                <b>{{ documentsPending() }}</b>
              </article>
            </div>

            <blockquote>
              “The harvest is great, and the laborers are few.”
              <cite>Luke 10:2</cite>
            </blockquote>
          </aside>
        </section>

        <section class="road-ahead" aria-label="Road ahead for the next 30 days">
          <header>
            <div><span>▦</span><strong>Road Ahead</strong><small>· Next 30 Days</small></div>
            <a href="/assignments">View all engagements →</a>
          </header>

          <div class="road-line">
            @for (item of nextThirtyDaysPreview(); track item.id) {
              <a [href]="assignmentHref(item.id)" class="road-stop">
                <span class="road-dot" [attr.data-tone]="readinessTone(item.readinessPercent)"></span>
                <strong>{{ month(item.startsAtUtc) }} {{ day(item.startsAtUtc) }}</strong>
                <small>{{ cityName(item.location) }}</small>
                <em>{{ locationTail(item.location) }}</em>
              </a>
            } @empty {
              <p class="road-empty">No confirmed travel is scheduled in the next 30 days.</p>
            }

            <div class="road-callout" aria-hidden="true">
              <span class="road-callout__map"></span>
              <div><small>A global assignment.</small><strong>A higher calling.</strong><i></i></div>
            </div>
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block;min-height:calc(100vh - 68px);background:#f4f1e9;color:#161d1b}
    *{box-sizing:border-box}
    .executive-view{width:min(1540px,calc(100% - 34px));margin:0 auto;padding:16px 0 30px}
    .loading-card{padding:48px;border:1px solid #dfd9cc;border-radius:12px;background:#fffdf8;color:#6f746f;text-align:center}
    .executive-hero{position:relative;min-height:290px;overflow:hidden;border:1px solid rgba(188,166,90,.24);border-radius:10px;background:linear-gradient(90deg,rgba(5,16,10,.36) 0%,rgba(7,22,12,.12) 31%,rgba(17,38,13,0) 62%,rgba(5,18,10,.12) 100%),url('/ctg-executive-map.webp') center/cover no-repeat;color:#fff;box-shadow:0 12px 30px rgba(18,32,20,.12)}
    .executive-hero::after{position:absolute;inset:0;background:linear-gradient(90deg,rgba(1,8,5,.35),transparent 45%,rgba(2,10,5,.15));content:'';pointer-events:none}
    .executive-hero__copy{position:relative;z-index:2;width:min(720px,58%);padding:31px 34px 24px}
    .hero-eyebrow{display:block;color:#d4cfab;font-size:.61rem;font-weight:850;letter-spacing:.34em;text-transform:uppercase}
    .executive-hero h1{margin:13px 0 7px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2.8rem,5vw,5rem);font-weight:500;line-height:.86;letter-spacing:-.055em}
    .executive-hero h1 em{color:#e2bd62;font-style:normal}
    .executive-hero__copy>p{margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:1.08rem}
    .hero-rule{width:44px;height:2px;margin:19px 0 14px;background:#d6ac49}
    .executive-hero__copy>small{color:#c8c9b8;font-size:.54rem;font-weight:800;letter-spacing:.29em;text-transform:uppercase}
    .executive-hero__portrait{position:absolute;z-index:3;right:9%;bottom:-2px;width:clamp(210px,22vw,350px);max-height:98%;object-fit:contain;object-position:bottom;filter:drop-shadow(-18px 12px 25px rgba(0,0,0,.2));pointer-events:none}
    .executive-hero__scripture{position:absolute;z-index:3;right:25px;top:62px;display:grid;justify-items:center;color:#ebe7d5;text-align:center;text-transform:uppercase}
    .executive-hero__scripture strong{font-family:Georgia,'Times New Roman',serif;font-size:.76rem;font-weight:500;letter-spacing:.16em;line-height:1.45}
    .executive-hero__scripture span{margin-top:10px;font-size:.45rem;letter-spacing:.17em}
    .executive-hero__scripture i{width:30px;height:1px;margin-top:14px;background:#d8b456}

    .metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:10px 0}
    .metric-card{display:flex;min-height:94px;padding:15px 17px;border:1px solid #e2ddd2;border-radius:10px;align-items:center;gap:14px;background:#fffdf8;box-shadow:0 5px 14px rgba(27,35,29,.035)}
    .metric-card>div{min-width:0}
    .metric-card small,.metric-card strong,.metric-card p{display:block;margin:0}
    .metric-card small{color:#353c37;font-size:.66rem;font-weight:850;text-transform:uppercase}
    .metric-card strong{margin-top:4px;font-size:1.26rem;letter-spacing:-.025em}
    .metric-card p{margin-top:2px;color:#6e746f;font-size:.62rem}
    .metric-icon{display:grid;width:49px;height:49px;flex:0 0 49px;border-radius:50%;place-items:center;color:#927426;background:#f6f0df;font-size:.86rem;font-weight:900}
    .metric-ring{display:grid;width:55px;height:55px;flex:0 0 55px;padding:6px;border-radius:50%;place-items:center}
    .metric-ring span{display:grid;width:43px;height:43px;border-radius:50%;place-items:center;background:#fffdf8;font-size:.63rem;font-weight:900}

    .executive-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(330px,.95fr) minmax(280px,.62fr);gap:10px}
    .panel{overflow:hidden;border:1px solid #dfd9ce;border-radius:10px;background:#fffdf8;box-shadow:0 6px 18px rgba(28,34,28,.035)}
    .panel-heading{display:flex;min-height:49px;padding:0 14px;border-bottom:1px solid #e8e3d9;align-items:center;justify-content:space-between;gap:12px}
    .panel-heading>div{display:flex;align-items:center;gap:8px}
    .panel-heading h2{margin:0;font-family:Georgia,'Times New Roman',serif;font-size:.96rem;font-weight:600}
    .panel-heading a{color:#1572a9;font-size:.6rem;font-weight:850;text-decoration:none}
    .panel-icon{color:#8c7427;font-size:.8rem}

    .next-summary{display:grid;grid-template-columns:76px minmax(0,1fr) 82px;gap:14px;align-items:center;padding:12px 14px}
    .date-card{display:grid;min-height:92px;border-radius:8px;place-items:center;align-content:center;background:#f6f3ed}
    .date-card span{font-size:.64rem;font-weight:900;text-transform:uppercase}
    .date-card strong{font-family:Georgia,serif;font-size:2.15rem;font-weight:500;line-height:1}
    .date-card small{margin-top:4px;font-size:.59rem}
    .next-summary__copy h3{margin:0 0 9px;font-family:Georgia,serif;font-size:1.08rem}
    .next-summary__copy p{display:flex;margin:5px 0;align-items:center;gap:8px;color:#59645d;font-size:.64rem}
    .next-summary__copy p span{color:#355b72}
    .readiness{display:grid;justify-items:center;gap:4px}
    .readiness-ring{display:grid;width:62px;height:62px;padding:6px;border-radius:50%;place-items:center}
    .readiness-ring>div{display:grid;width:50px;height:50px;border-radius:50%;place-items:center;background:#fffdf8;font-size:.8rem;font-weight:900}
    .readiness small{color:#707770;font-size:.55rem}
    .destination-photo{position:relative;display:block;height:168px;margin:0 10px 10px;overflow:hidden;border-radius:7px;color:#fff;text-decoration:none;background:#132218}
    .destination-photo img,.destination-fallback{display:block;width:100%;height:100%;object-fit:cover}
    .destination-fallback{background:url('/ctg-executive-map.webp') center/cover no-repeat}
    .destination-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(4,12,8,.72) 100%)}
    .destination-label{position:absolute;z-index:2;left:14px;bottom:12px;display:grid;text-transform:uppercase}
    .destination-label strong{font-family:Georgia,serif;font-size:1rem;letter-spacing:.12em}
    .destination-label small{font-size:.55rem;letter-spacing:.16em}
    .destination-photo>p{position:absolute;z-index:2;right:14px;bottom:12px;margin:0;font-family:Georgia,serif;font-size:.66rem;font-style:italic;line-height:1.25;text-align:right}

    .month-list{display:grid}
    .month-list>a{display:grid;grid-template-columns:46px 9px minmax(0,1fr) 36px 12px;gap:8px;align-items:center;min-height:53px;padding:5px 10px;border-bottom:1px solid #ebe7de;color:inherit;text-decoration:none}
    .month-list>a:last-child{border-bottom:0}
    .month-list>a:hover{background:#faf7ef}
    .month-list time{display:grid;justify-items:center;padding:4px;border-radius:6px;background:#f6f3ed}
    .month-list time span{font-size:.46rem;font-weight:900;text-transform:uppercase}
    .month-list time strong{font-family:Georgia,serif;font-size:1rem}
    .destination-dot,.road-dot{width:9px;height:9px;border-radius:50%;background:#5ca967}
    .destination-dot[data-tone='gold'],.road-dot[data-tone='gold']{background:#d6ae4e}
    .destination-dot[data-tone='blue'],.road-dot[data-tone='blue']{background:#5d83ad}
    .month-list a>div strong,.month-list a>div small{display:block}
    .month-list a>div strong{font-size:.66rem}
    .month-list a>div small{margin-top:2px;color:#727870;font-size:.54rem}
    .month-list a>b{color:#44504a;font-size:.58rem}
    .month-arrow{color:#8e7429;font-size:1rem}
    .empty-list{padding:32px 14px;color:#7c827c;font-size:.66rem;text-align:center}

    .awareness-panel{background:linear-gradient(180deg,#fffdf8,#f8f3e9)}
    .awareness-list{display:grid;gap:7px;padding:10px}
    .awareness-list article{display:grid;grid-template-columns:35px 1fr auto;gap:9px;align-items:center;padding:10px;border-radius:8px;background:rgba(255,255,255,.7)}
    .awareness-icon{display:grid;width:32px;height:32px;place-items:center;color:#75611f;font-size:.88rem}
    .awareness-list strong,.awareness-list small{display:block}
    .awareness-list strong{font-size:.65rem}
    .awareness-list small{margin-top:2px;color:#737972;font-size:.54rem}
    .awareness-list b{font-size:.9rem}
    blockquote{margin:5px 18px 16px;color:#8b6a30;font-family:Georgia,serif;font-size:.74rem;font-style:italic;line-height:1.4;text-align:center}
    blockquote cite{display:block;margin-top:7px;color:#50554f;font-size:.48rem;font-style:normal;letter-spacing:.16em;text-transform:uppercase}

    .road-ahead{margin-top:10px;overflow:hidden;border:1px solid #243829;border-radius:10px;background:linear-gradient(135deg,#13261a,#192c1d 62%,#0e1d14);color:#fff}
    .road-ahead>header{display:flex;min-height:38px;padding:0 14px;align-items:center;justify-content:space-between;gap:12px}
    .road-ahead>header>div{display:flex;align-items:center;gap:7px}
    .road-ahead>header span{color:#d9b54f}
    .road-ahead>header strong{font-family:Georgia,serif;font-size:.75rem}
    .road-ahead>header small{color:#c9d1ca;font-size:.62rem}
    .road-ahead>header a{color:#72b5df;font-size:.52rem;text-decoration:none}
    .road-line{position:relative;display:grid;grid-template-columns:repeat(5,minmax(85px,1fr)) minmax(180px,1.25fr);min-height:102px;padding:12px 12px 12px;gap:8px}
    .road-line::before{position:absolute;top:20px;left:5%;right:27%;height:1px;background:rgba(211,219,208,.32);content:''}
    .road-stop{position:relative;z-index:2;display:grid;justify-items:center;align-content:start;color:#fff;text-decoration:none;text-align:center}
    .road-stop .road-dot{width:10px;height:10px;margin:3px 0 8px;box-shadow:0 0 0 3px #17291c}
    .road-stop strong{font-size:.57rem;text-transform:uppercase}
    .road-stop small{margin-top:3px;font-size:.55rem}
    .road-stop em{color:#cbd2cc;font-size:.49rem;font-style:normal}
    .road-callout{display:grid;grid-template-columns:72px 1fr;align-items:center;min-height:65px;padding:8px 10px;border:1px solid rgba(255,255,255,.12);border-radius:7px;background:#0b1710}
    .road-callout__map{height:45px;background:url('/ctg-executive-map.webp') center/cover no-repeat;opacity:.65}
    .road-callout small,.road-callout strong{display:block}
    .road-callout small{font-size:.43rem;letter-spacing:.16em;text-transform:uppercase}
    .road-callout strong{margin-top:4px;font-family:Georgia,serif;font-size:.58rem;text-transform:uppercase}
    .road-callout i{display:block;width:25px;height:1px;margin-top:8px;background:#d4ae4e}
    .road-empty{grid-column:1/-2;align-self:center;margin:0;color:#cad2cb;font-size:.65rem;text-align:center}
    .empty-state{display:grid;min-height:250px;padding:32px;place-items:center;align-content:center;color:#747a74;text-align:center;gap:7px}

    @media(max-width:1180px){
      .executive-grid{grid-template-columns:1fr 1fr}
      .awareness-panel{grid-column:1/-1}
      .awareness-list{grid-template-columns:repeat(3,1fr)}
      blockquote{grid-column:1/-1}
      .executive-hero__portrait{right:4%}
      .executive-hero__scripture{display:none}
    }
    @media(max-width:900px){
      .metric-grid{grid-template-columns:1fr 1fr}
      .executive-hero__copy{width:68%}
      .executive-hero__portrait{right:-10px;width:260px}
      .road-line{grid-template-columns:repeat(5,minmax(90px,1fr));overflow-x:auto}
      .road-callout{display:none}
      .road-line::before{right:5%}
    }
    @media(max-width:720px){
      .executive-view{width:calc(100% - 20px);padding-top:10px}
      .executive-hero{min-height:315px}
      .executive-hero__copy{width:100%;padding:24px 20px}
      .executive-hero h1{font-size:clamp(2.45rem,14vw,3.5rem)}
      .executive-hero__copy>p{font-size:.92rem}
      .executive-hero__copy>small{max-width:58%;line-height:1.7}
      .executive-hero__portrait{right:-42px;width:200px;opacity:.72}
      .metric-grid{grid-template-columns:1fr}
      .executive-grid{grid-template-columns:1fr}
      .awareness-panel{grid-column:auto}
      .awareness-list{grid-template-columns:1fr}
      .next-summary{grid-template-columns:66px 1fr 66px}
      .destination-photo{height:150px}
      .road-ahead>header a{display:none}
      .road-line{grid-template-columns:repeat(5,110px)}
    }
  `],
})
export class CtgApostleDashboardComponent implements OnInit {
  greeting(): string {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
  }

  readonly assignments = signal<readonly EngagementSummary[]>([]);
  readonly loading = signal(true);

  readonly activeAssignments = computed(() =>
    [...this.assignments()]
      .filter(item => !['complete', 'completed', 'archived', 'cancelled'].includes((item.status || '').toLowerCase()))
      .sort((a, b) => this.time(a.startsAtUtc) - this.time(b.startsAtUtc)),
  );

  readonly futureAssignments = computed(() => {
    const cutoff = Date.now() - 86400000;
    return this.activeAssignments().filter(item => this.time(item.startsAtUtc) >= cutoff);
  });

  readonly nextAssignment = computed(() => this.futureAssignments()[0] ?? null);

  readonly nextThirtyDays = computed(() => {
    const now = Date.now() - 86400000;
    const end = Date.now() + (30 * 86400000);
    return this.futureAssignments().filter(item => {
      const starts = this.time(item.startsAtUtc);
      return starts >= now && starts <= end;
    });
  });

  readonly nextThirtyDaysPreview = computed(() => this.nextThirtyDays().slice(0, 5));

  readonly averageReadiness = computed(() => {
    const items = this.nextThirtyDays();
    if (items.length === 0) return this.nextAssignment()?.readinessPercent ?? 0;
    return Math.round(items.reduce((total, item) => total + item.readinessPercent, 0) / items.length);
  });

  readonly destinationCities = computed(() => {
    const cities = new Set(
      this.nextThirtyDays()
        .map(item => this.cityName(item.location).toLowerCase())
        .filter(Boolean),
    );
    return cities.size;
  });

  readonly destinationCountries = computed(() => {
    const countries = new Set(
      this.nextThirtyDays()
        .map(item => this.countryName(item.location).toLowerCase())
        .filter(Boolean),
    );
    return countries.size;
  });

  readonly travelPending = computed(() =>
    this.nextThirtyDays().filter(item =>
      !this.isConfirmed(item.travelStatus) ||
      !this.isConfirmed(item.lodgingStatus) ||
      !this.isConfirmed(item.transportationStatus),
    ).length,
  );

  readonly hostPending = computed(() =>
    this.nextThirtyDays().filter(item => !this.isConfirmed(item.hostStatus)).length,
  );

  readonly documentsPending = computed(() =>
    this.nextThirtyDays().filter(item => !this.isConfirmed(item.documentsStatus)).length,
  );

  constructor(private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    this.api.getAssignments().subscribe({
      next: assignments => {
        this.assignments.set(assignments);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  assignmentHref(id: string): string {
    return `/assignments/${encodeURIComponent(id)}`;
  }

  destinationImage(value: string | null | undefined): string | null {
    const normalized = (value ?? '').trim().toLowerCase();
    if (!normalized) return null;
    return DESTINATION_IMAGES.find(image =>
      image.terms.some(term => normalized.includes(term)),
    )?.url ?? null;
  }

  destinationImageAlt(value: string | null | undefined): string {
    return value ? `${value} destination` : 'Upcoming ministry destination';
  }

  readinessRing(percent: number): string {
    const value = Math.max(0, Math.min(100, percent));
    const color = value >= 80 ? '#4fa65e' : value >= 65 ? '#d0a53d' : '#b86b50';
    return `conic-gradient(${color} ${value}%, #e7e5dc 0)`;
  }

  readinessTone(percent: number): 'green' | 'gold' | 'blue' {
    if (percent >= 80) return 'green';
    if (percent >= 65) return 'gold';
    return 'blue';
  }

  isConfirmed(value: string | null | undefined): boolean {
    return ['confirmed', 'complete', 'completed', 'received', 'ready'].includes((value || '').toLowerCase());
  }

  shortDate(value: string | null): string {
    return value
      ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'TBD';
  }

  month(value: string | null): string {
    return value ? new Date(value).toLocaleDateString(undefined, { month: 'short' }) : 'TBD';
  }

  day(value: string | null): string {
    return value ? new Date(value).getDate().toString() : '—';
  }

  year(value: string | null): string {
    return value ? new Date(value).getFullYear().toString() : '';
  }

  cityName(value: string | null | undefined): string {
    return (value ?? '').split(',')[0]?.trim() || 'Destination';
  }

  locationTail(value: string | null | undefined): string {
    const parts = (value ?? '').split(',').map(part => part.trim()).filter(Boolean);
    return parts.length > 1 ? parts.slice(1).join(', ') : '';
  }

  countryName(value: string | null | undefined): string {
    const parts = (value ?? '').split(',').map(part => part.trim()).filter(Boolean);
    if (parts.length < 2) return '';

    const last = parts[parts.length - 1].toLowerCase();
    const unitedStatesRegions = new Set([
      'alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida',
      'georgia','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine',
      'maryland','massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska',
      'nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota',
      'ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota',
      'tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming',
      'dc','d.c.','ga','nc','md','va'
    ]);

    return unitedStatesRegions.has(last) ? 'United States' : parts[parts.length - 1];
  }

  private time(value: string | null): number {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  }
}
