import { Component, OnInit, computed, signal } from '@angular/core';
import { CtgBookingDeskStateService } from '../core/ctg-booking-desk-state.service';
import { CtgProgramsStateService } from '../core/ctg-programs-state.service';
import { EngagementsApiService } from '../core/engagements-api.service';
import { EngagementSummary } from '../core/models';
import { SpeakingRequestDetails } from '../core/speaking-request.models';

@Component({
  selector: 'app-ctg-engagements-home',
  standalone: true,
  template: `
    <section class="ctg-home">
      <header class="ctg-hero">
        <div>
          <span class="eyebrow">Cynthia Thompson Global · Engagements</span>
          <h1>See the ministry relationship. Know where it belongs.</h1>
          <p>CTG receives invitations from around the world, travels to approved assignments, hosts its own gatherings, and walks with a private mentorship cohort. ApostolOS keeps those relationships connected without making them compete on one screen.</p>
        </div>
        <aside>
          <small>Primary intake</small>
          <strong>Global Booking Desk</strong>
          <span>One place for website requests, referrals, email, WhatsApp, phone, team capture, and opportunities Apostle Cynthia receives personally.</span>
          <a href="/organization/ctg/bookings">Open Booking Desk →</a>
        </aside>
      </header>

      <section class="executive-brief" aria-label="CTG ministry brief">
        <a href="/organization/ctg/bookings"><small>Bookings needing attention</small><strong>{{ bookingAttention() }}</strong><span>{{ internationalBookings() }} international opportunities active</span></a>
        <a href="/assignments"><small>Confirmed engagements</small><strong>{{ activeAssignments() }}</strong><span>Assignments currently in preparation or delivery</span></a>
        <a href="/organization/ctg/programs"><small>Event registrations</small><strong>{{ programs.totalRegistrations() }}</strong><span>People registered for CTG-hosted gatherings</span></a>
        <a href="/organization/ctg/programs"><small>Power of 12</small><strong>{{ programs.power12SeatsCommitted() }} / 12</strong><span>Mentorship seats currently committed</span></a>
      </section>

      <section class="flow-section">
        <span class="eyebrow">The CTG ministry flow</span>
        <div class="flow-list">
          <article>
            <span class="number">01</span>
            <div><small>People asking Cynthia to come to them</small><h2>Global Booking Desk</h2><p>Capture every opportunity, follow up with the host, discern the assignment, protect dates, and resolve international requirements before anything becomes confirmed ministry.</p></div>
            <a href="/organization/ctg/bookings">Manage bookings →</a>
          </article>
          <article>
            <span class="number">02</span>
            <div><small>Places Cynthia is actually going</small><h2>Engagements</h2><p>Once a booking is approved, delivery moves here: travel, lodging, host coordination, itinerary, documents, ministry preparation, responses, and closeout.</p></div>
            <a href="/assignments">Open engagements →</a>
          </article>
          <article>
            <span class="number">03</span>
            <div><small>People coming to CTG</small><h2>Events & Programs</h2><p>Conference attendees and Power of 12 applicants have their own registration, enrollment, check-in, mentorship, and follow-up journeys.</p></div>
            <a href="/organization/ctg/programs">Open events & programs →</a>
          </article>
        </div>
      </section>

      <section class="public-entry">
        <div><span class="eyebrow">Public entry points</span><h2>What people outside CTG see</h2><p>The public experiences stay simple and branded. The operational depth begins after someone submits.</p></div>
        <div class="public-links"><a href="/invite/apostle-cynthia" target="_blank">Invite Apostle Cynthia ↗</a><a href="/register/power-glory-2026" target="_blank">Conference registration ↗</a><a href="/join-the-12" target="_blank">Power of 12 application ↗</a></div>
      </section>
    </section>
  `,
  styles: [`
    :host{display:block}.ctg-home{max-width:1320px;margin:0 auto;padding:32px 34px 72px;color:#1d2430}.eyebrow{display:block;color:#986f32;font-size:.62rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.ctg-hero{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:42px;align-items:end;padding:18px 0 30px;border-bottom:1px solid #dedfe3}.ctg-hero h1{max-width:900px;margin:8px 0 10px;font-size:clamp(2.55rem,5vw,4.55rem);line-height:.98;letter-spacing:-.06em}.ctg-hero p{max-width:810px;margin:0;color:#747980;line-height:1.65}.ctg-hero aside{display:grid;gap:7px;padding:19px;border-left:3px solid #496f9b;background:#f2f5f8}.ctg-hero aside small{color:#6f7d8c;font-size:.61rem;text-transform:uppercase;font-weight:900}.ctg-hero aside strong{font-size:1rem}.ctg-hero aside span{color:#707781;font-size:.7rem;line-height:1.5}.ctg-hero aside a{margin-top:7px;color:#2e5b92;text-decoration:none;font-size:.69rem;font-weight:850}.executive-brief{display:grid;grid-template-columns:repeat(4,1fr);margin-top:20px;border-top:1px solid #dfe1e4;border-bottom:1px solid #dfe1e4}.executive-brief a{display:grid;gap:4px;padding:18px;border-right:1px solid #e3e5e8;color:inherit;text-decoration:none}.executive-brief a:last-child{border-right:0}.executive-brief a:hover{background:#faf9f6}.executive-brief small{color:#81868c;font-size:.59rem;font-weight:850;text-transform:uppercase}.executive-brief strong{font-size:1.42rem;letter-spacing:-.035em}.executive-brief span{color:#777d84;font-size:.65rem;line-height:1.45}.flow-section{padding-top:32px}.flow-list{margin-top:10px;border-top:1px solid #dfe1e4}.flow-list article{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:16px;align-items:center;padding:20px 4px;border-bottom:1px solid #e4e6e9}.number{color:#b48238;font-size:1.25rem;font-family:Georgia,serif}.flow-list small{color:#858a90;font-size:.58rem;font-weight:900;text-transform:uppercase}.flow-list h2{margin:3px 0 5px;font-size:1.15rem;letter-spacing:-.035em}.flow-list p{max-width:820px;margin:0;color:#767c84;font-size:.71rem;line-height:1.6}.flow-list a{color:#315d8f;font-size:.66rem;font-weight:850;text-decoration:none}.public-entry{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;margin-top:34px;padding:20px 0;border-top:1px solid #dfe1e4}.public-entry h2{margin:4px 0 5px;font-size:1.3rem;letter-spacing:-.035em}.public-entry p{margin:0;color:#777d84;font-size:.7rem}.public-links{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.public-links a{padding:9px 11px;border:1px solid #d9dde2;border-radius:8px;color:#315d8e;text-decoration:none;font-size:.65rem;font-weight:850}@media(max-width:950px){.ctg-hero{grid-template-columns:1fr}.executive-brief{grid-template-columns:1fr 1fr}.executive-brief a:nth-child(2){border-right:0}.executive-brief a:nth-child(-n+2){border-bottom:1px solid #e3e5e8}.public-entry{grid-template-columns:1fr}.public-links{justify-content:flex-start}}@media(max-width:650px){.ctg-home{padding:22px 18px 60px}.executive-brief{grid-template-columns:1fr}.executive-brief a{border-right:0;border-bottom:1px solid #e3e5e8}.executive-brief a:last-child{border-bottom:0}.flow-list article{grid-template-columns:38px 1fr}.flow-list a{grid-column:2}}
  `],
})
export class CtgEngagementsHomeComponent implements OnInit {
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly assignments = signal<readonly EngagementSummary[]>([]);

  readonly bookingAttention = computed(() => this.requests().filter(item => !['approved','declined'].includes(item.status)).length + this.bookingState.active().length);
  readonly internationalBookings = computed(() => this.requests().filter(item => !['approved','declined'].includes(item.status) && this.isInternational(item.country)).length + this.bookingState.internationalCount());
  readonly activeAssignments = computed(() => this.assignments().filter(item => item.status !== 'completed').length);

  constructor(readonly programs: CtgProgramsStateService, readonly bookingState: CtgBookingDeskStateService, private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    this.api.getRequests().subscribe({ next: items => this.requests.set(items), error: () => this.requests.set([]) });
    this.api.getAssignments().subscribe({ next: items => this.assignments.set(items), error: () => this.assignments.set([]) });
  }

  private isInternational(country: string): boolean {
    return !['united states','united states of america','usa','us','u.s.'].includes((country || '').trim().toLowerCase());
  }
}
