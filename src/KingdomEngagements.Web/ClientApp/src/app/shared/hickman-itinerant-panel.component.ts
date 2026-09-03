import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import { SpeakingRequestDetails } from '../core/speaking-request.models';

@Component({
  selector: 'app-hickman-itinerant-panel',
  standalone: true,
  template: `
    @if (visible()) {
      <section class="itinerant-shell">
        <div class="itinerant-profile">
          <img
            src="https://s3-us-west-1.amazonaws.com/faithnetworkuserfilestore/FAITHNETWORK_USERFILESTORE/FAITHNETWORK_USERFILESTORE/imagelibraries/ministries/151c3d41-ea00-477d-bc53-b09a3b31047b/pastors/derwin.jpg"
            alt="Pastor Derwin Hickman" />
          <div>
            <p class="itinerant-eyebrow">Heyy King · Itinerant ministry</p>
            <h2>Pastor Derwin Hickman</h2>
            <p>One connected invitation-to-assignment flow for speaking, leadership, mentoring and ministry engagements.</p>
          </div>
        </div>

        <div class="itinerant-actions">
          <button type="button" class="primary" (click)="openPublicForm()">Open invitation form</button>
          <button type="button" (click)="reviewInvitations()">Review invitations</button>
          <button type="button" (click)="openWorkspace()">Open itinerant workspace</button>
        </div>

        <div class="itinerant-metrics">
          <article><span>Awaiting review</span><strong>{{ awaitingReview() }}</strong><small>host invitations</small></article>
          <article><span>Information needed</span><strong>{{ informationNeeded() }}</strong><small>host responses pending</small></article>
          <article><span>Approved</span><strong>{{ approved() }}</strong><small>moved into preparation</small></article>
          <article><span>Host readiness</span><strong>{{ averageReadiness() }}%</strong><small>across active requests</small></article>
        </div>

        <div class="itinerant-grid">
          <article class="itinerant-card">
            <p class="itinerant-eyebrow">Invitation workflow</p>
            <h3>Invitation → prayerful review → itinerary</h3>
            <ol>
              <li><b>Host submits</b><span>Event, assignment, dates, contact, travel, lodging and honorarium.</span></li>
              <li><b>Ministry team reviews</b><span>Request information, decline, or approve without losing the host record.</span></li>
              <li><b>Accepted invitation</b><span>Becomes Pastor Hickman’s Engagements assignment with preparation tasks.</span></li>
              <li><b>Operations coordinates</b><span>The Itinerant Ministry workspace owns itinerary, travel, lodging, resources and execution.</span></li>
            </ol>
          </article>

          <article class="itinerant-card">
            <div class="card-head"><div><p class="itinerant-eyebrow">Invitation queue</p><h3>Current requests</h3></div><button type="button" (click)="reload()">Refresh</button></div>
            @if (loading()) {
              <p class="empty">Loading Pastor Hickman invitations…</p>
            } @else if (requests().length === 0) {
              <div class="empty-state"><strong>No invitations yet</strong><p>Use the public form to submit a demo invitation. It will appear here and in Invitation Review.</p><button type="button" class="primary" (click)="openPublicForm()">Submit demo invitation</button></div>
            } @else {
              @for (item of requests().slice(0, 4); track item.id) {
                <button type="button" class="request-row" (click)="reviewInvitations(item.id)">
                  <span><strong>{{ item.eventName }}</strong><small>{{ item.organizationName }} · {{ item.city }}, {{ item.state || item.country }}</small></span>
                  <span><b>{{ statusLabel(item.status) }}</b><small>{{ item.referenceNumber }} · {{ item.readinessPercentage }}%</small></span>
                </button>
              }
            }
          </article>
        </div>
      </section>
    }
  `,
  styles: [`
    :host{display:block}.itinerant-shell{width:min(1540px,calc(100% - 3rem));margin:1rem auto 5rem;padding:1.35rem;border:1px solid rgba(17,28,45,.12);border-radius:18px;background:linear-gradient(145deg,#fffdf9,#faf7f1);box-shadow:0 14px 38px rgba(17,28,45,.06)}
    .itinerant-profile{display:flex;align-items:center;gap:1rem}.itinerant-profile img{width:92px;height:108px;object-fit:cover;object-position:center 20%;border-radius:14px;box-shadow:0 10px 24px rgba(15,23,42,.16)}
    .itinerant-eyebrow{margin:0 0 .35rem;color:#9a6c23;font-size:.66rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.itinerant-profile h2,.itinerant-card h3{margin:0;color:#152037}.itinerant-profile h2{font-size:clamp(1.7rem,3vw,2.45rem);letter-spacing:-.035em}.itinerant-profile p:last-child{max-width:760px;margin:.45rem 0 0;color:#687386;line-height:1.55}
    .itinerant-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1.1rem}.itinerant-actions button,.card-head button,.empty-state button{min-height:40px;padding:.55rem .8rem;border:1px solid #d6dae2;border-radius:8px;background:#fff;color:#172035;font-weight:800;cursor:pointer}.itinerant-actions .primary,.empty-state .primary{color:#fff;border-color:#8c6120;background:#8c6120}
    .itinerant-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.7rem;margin-top:1.25rem}.itinerant-metrics article{padding:1rem;border:1px solid #e0ddd6;border-radius:12px;background:#fff}.itinerant-metrics span,.itinerant-metrics small{display:block;color:#717987;font-size:.67rem}.itinerant-metrics strong{display:block;margin:.3rem 0;color:#172035;font-size:1.65rem}
    .itinerant-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:.8rem;margin-top:.8rem}.itinerant-card{padding:1rem;border:1px solid #e0ddd6;border-radius:12px;background:#fff}.itinerant-card h3{font-size:1.05rem}.itinerant-card ol{display:grid;gap:.75rem;margin:.9rem 0 0;padding-left:1.25rem}.itinerant-card li b,.itinerant-card li span{display:block}.itinerant-card li b{font-size:.76rem}.itinerant-card li span{margin-top:.18rem;color:#717987;font-size:.69rem;line-height:1.45}.card-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.card-head button{min-height:34px;padding:.35rem .55rem;font-size:.65rem}
    .request-row{display:flex;width:100%;justify-content:space-between;gap:1rem;padding:.75rem 0;border:0;border-bottom:1px solid #ece9e3;background:transparent;text-align:left;cursor:pointer}.request-row:last-child{border-bottom:0}.request-row span:last-child{text-align:right}.request-row strong,.request-row small,.request-row b{display:block}.request-row strong{font-size:.76rem}.request-row b{color:#8c6120;font-size:.68rem}.request-row small{margin-top:.18rem;color:#7a8290;font-size:.62rem}.empty,.empty-state{color:#747d8a;font-size:.72rem}.empty-state{padding:.7rem 0}.empty-state strong{color:#172035}.empty-state p{line-height:1.5}
    @media(max-width:900px){.itinerant-metrics{grid-template-columns:1fr 1fr}.itinerant-grid{grid-template-columns:1fr}}
    @media(max-width:600px){.itinerant-shell{width:min(100% - 1.2rem,1540px);padding:1rem}.itinerant-profile{align-items:flex-start}.itinerant-profile img{width:72px;height:88px}.itinerant-metrics{grid-template-columns:1fr}.itinerant-actions{display:grid}.itinerant-actions button{width:100%}}
  `]
})
export class HickmanItinerantPanelComponent {
  private readonly router = inject(Router);
  private readonly api = inject(EngagementsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = signal(this.isHeyyKingRoute());
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly loading = signal(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.visible.set(this.isHeyyKingRoute());
      if (this.visible()) this.reload();
    });
    if (this.visible()) this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.getRequests().subscribe({
      next: items => {
        this.requests.set(items.filter(item => item.tenantId?.toLowerCase() === 'e1100000-0000-4000-8000-000000000001'));
        this.loading.set(false);
      },
      error: () => {
        this.requests.set([]);
        this.loading.set(false);
      }
    });
  }

  awaitingReview(): number {
    return this.requests().filter(item => item.status === 'awaiting-review').length;
  }

  informationNeeded(): number {
    return this.requests().filter(item => item.status === 'information-needed').length;
  }

  approved(): number {
    return this.requests().filter(item => item.status === 'approved').length;
  }

  averageReadiness(): number {
    const active = this.requests().filter(item => item.status !== 'declined');
    if (!active.length) return 0;
    return Math.round(active.reduce((sum, item) => sum + item.readinessPercentage, 0) / active.length);
  }

  openPublicForm(): void {
    window.open('/invite/pastor-hickman', '_blank', 'noopener,noreferrer');
  }

  reviewInvitations(requestId?: string): void {
    void this.router.navigate(['/invitations'], requestId ? { queryParams: { request: requestId } } : undefined);
  }

  openWorkspace(): void {
    window.location.assign('http://localhost:5101#workspace/itinerant-ministry');
  }

  statusLabel(value: string): string {
    return value.replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  private isHeyyKingRoute(): boolean {
    return this.router.url.startsWith('/organization/hey-king');
  }
}
