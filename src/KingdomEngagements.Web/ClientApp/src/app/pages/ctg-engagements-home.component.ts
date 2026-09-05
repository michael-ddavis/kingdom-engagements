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
          <h1>See the ministry relationship. Know the next move.</h1>
          <p>CTG receives invitations from around the world, travels to approved assignments, hosts its own gatherings, and walks with a private mentorship cohort. Each kind of relationship has one clear home.</p>
        </div>
        <aside>
          <small>Global Booking Desk</small>
          <strong>{{ bookingAttention() }} request{{ bookingAttention() === 1 ? '' : 's' }} need attention</strong>
          <span>{{ internationalBookings() }} international opportunities active</span>
          <a href="/organization/ctg/bookings">Open Booking Desk →</a>
        </aside>
      </header>

      <section class="executive-brief">
        <a href="/organization/ctg/bookings"><small>Bookings needing attention</small><strong>{{ bookingAttention() }}</strong><span>Capture, follow up, discern and protect the calendar</span></a>
        <a href="/assignments"><small>Confirmed engagements</small><strong>{{ activeAssignments() }}</strong><span>Travel, host readiness, ministry preparation and closeout</span></a>
        <a href="/organization/ctg/programs"><small>Event registrations</small><strong>{{ programs.totalRegistrations() }}</strong><span>CTG-hosted gatherings, attendee access and check-in</span></a>
        <a href="/organization/ctg/programs"><small>Power of 12</small><strong>{{ programs.power12SeatsCommitted() }} / 12</strong><span>Applications, enrollment and mentorship journey</span></a>
      </section>

      <section class="flow-section">
        <span class="eyebrow">Three ministry flows</span>
        <div class="flow-list">
          <article>
            <span class="number">01</span>
            <div><small>People asking Cynthia to come to them</small><h2>Global Booking Desk</h2><p>Every invitation lands here whether it came through the formal website form, Cynthia herself, email, WhatsApp, a referral, or a team member. Once approved, it moves into Engagements.</p></div>
            <a href="/organization/ctg/bookings">Manage bookings →</a>
          </article>
          <article>
            <span class="number">02</span>
            <div><small>Places Cynthia is actually going</small><h2>Engagements</h2><p>Approved ministry is managed here: travel, lodging, host coordination, itinerary, documents, ministry preparation, responses, and closeout.</p></div>
            <a href="/assignments">Open engagements →</a>
          </article>
          <article>
            <span class="number">03</span>
            <div><small>People coming to CTG</small><h2>Events & Programs</h2><p>Conference attendees and Power of 12 applicants enter here, with the right registration, enrollment, check-in, mentorship, and follow-up journey.</p></div>
            <a href="/organization/ctg/programs">Open events & programs →</a>
          </article>
        </div>
      </section>

      <section class="right-now">
        <header><div><span class="eyebrow">Right now</span><h2>What deserves attention</h2></div></header>
        <div class="attention-list">
          <a href="/organization/ctg/bookings"><i class="blue"></i><span><small>Booking Desk</small><strong>{{ bookingAttention() }} booking decision{{ bookingAttention() === 1 ? '' : 's' }} are moving</strong><em>{{ bookingState.expiringHolds() }} date hold{{ bookingState.expiringHolds() === 1 ? '' : 's' }} expiring · {{ bookingState.stalledCount() }} manual request{{ bookingState.stalledCount() === 1 ? '' : 's' }} quiet for 5+ days</em></span><b>Review →</b></a>
          <a href="/assignments"><i class="green"></i><span><small>Itinerant ministry</small><strong>{{ activeAssignments() }} active engagement{{ activeAssignments() === 1 ? '' : 's' }}</strong><em>Travel, host readiness and ministry preparation</em></span><b>Open →</b></a>
          <a href="/organization/ctg/programs"><i class="gold"></i><span><small>Power & Glory Intensive</small><strong>Registration is open</strong><em>{{ programs.totalRegistrations() }} demo registrations · attendee access and check-in</em></span><b>Manage →</b></a>
          <a href="/organization/ctg/programs"><i class="plum"></i><span><small>Power of 12</small><strong>{{ programs.applicants().length }} people in the mentorship pipeline</strong><em>{{ programs.power12SeatsCommitted() }} of 12 seats committed</em></span><b>Review →</b></a>
        </div>
      </section>
    </section>
  `,
  styles: [`
    :host{display:block}.ctg-home{max-width:1320px;margin:0 auto;padding:32px 34px 72px;color:#1d2430}.eyebrow{display:block;color:#986f32;font-size:.62rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.ctg-hero{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:42px;align-items:end;padding:18px 0 30px;border-bottom:1px solid #dedfe3}.ctg-hero h1{max-width:900px;margin:8px 0 10px;font-size:clamp(2.55rem,5vw,4.55rem);line-height:.98;letter-spacing:-.06em}.ctg-hero p{max-width:800px;margin:0;color:#747980;line-height:1.65}.ctg-hero aside{display:grid;gap:6px;padding:19px;border-left:3px solid #496f9b;background:#f2f5f8}.ctg-hero aside small{color:#6f7d8c;font-size:.61rem;text-transform:uppercase;font-weight:900}.ctg-hero aside strong{font-size:1rem}.ctg-hero aside span{color:#707781;font-size:.7rem}.ctg-hero aside a{margin-top:8px;color:#2e5b92;text-decoration:none;font-size:.69rem;font-weight:850}.executive-brief{display:grid;grid-template-columns:repeat(4,1fr);margin-top:20px;border-top:1px solid #dfe1e4;border-bottom:1px solid #dfe1e4}.executive-brief a{display:grid;gap:3px;padding:17px 18px;border-right:1px solid #e3e5e8;color:inherit;text-decoration:none}.executive-brief a:last-child{border-right:0}.executive-brief a:hover{background:#faf9f6}.executive-brief small{color:#81868c;font-size:.59rem;font-weight:850;text-transform:uppercase}.executive-brief strong{font-size:1.42rem;letter-spacing:-.035em}.executive-brief span{color:#777d84;font-size:.65rem;line-height:1.45}.flow-section{padding-top:31px}.flow-list{margin-top:10px;border-top:1px solid #dfe1e4}.flow-list article{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:16px;align-items:center;padding:19px 4px;border-bottom:1px solid #e4e6e9}.number{color:#b48238;font-size:1.25rem;font-family:Georgia,serif}.flow-list small{color:#858a90;font-size:.58rem;font-weight:900;text-transform:uppercase}.flow-list h2{margin:3px 0 5px;font-size:1.15rem;letter-spacing:-.035em}.flow-list p{max-width:800px;margin:0;color:#767c84;font-size:.71rem;line-height:1.6}.flow-list a{color:#315d8f;font-size:.66rem;font-weight:850;text-decoration:none}.right-now{margin-top:34px}.right-now h2{margin:4px 0 10px;font-size:1.42rem;letter-spacing:-.035em}.attention-list{border:1px solid #dfe1e4;border-radius:12px;overflow:hidden;background:#fff}.attention-list>a{display:grid;grid-template-columns:7px minmax(0,1fr) auto;gap:14px;align-items:center;padding:15px 17px;border-bottom:1px solid #e7e9ec;color:inherit;text-decoration:none}.attention-list>a:last-child{border-bottom:0}.attention-list>a:hover{background:#faf9f6}.attention-list i{width:5px;height:40px;border-radius:999px;background:#71829a}.attention-list i.blue{background:#4a719d}.attention-list i.green{background:#5f8568}.attention-list i.gold{background:#bd8a3d}.attention-list i.plum{background:#684a69}.attention-list>a>span{display:grid;gap:3px}.attention-list small{color:#85898f;font-size:.58rem;text-transform:uppercase;font-weight:900}.attention-list strong{font-size:.81rem}.attention-list em{color:#777c82;font-size:.66rem;font-style:normal}.attention-list b{color:#315d92;font-size:.65rem}@media(max-width:950px){.ctg-hero{grid-template-columns:1fr}.executive-brief{grid-template-columns:1fr 1fr}.executive-brief a:nth-child(2){border-right:0}.executive-brief a:nth-child(-n+2){border-bottom:1px solid #e3e5e8}}@media(max-width:650px){.ctg-home{padding:22px 18px 60px}.executive-brief{grid-template-columns:1fr}.executive-brief a{border-right:0;border-bottom:1px solid #e3e5e8}.executive-brief a:last-child{border-bottom:0}.flow-list article{grid-template-columns:38px 1fr}.flow-list a{grid-column:2}.attention-list>a{grid-template-columns:7px 1fr}.attention-list b{display:none}}
  `],
})
export class CtgEngagementsHomeComponent implements OnInit {
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly assignments = signal<readonly EngagementSummary[]>([]);

  readonly bookingAttention = computed(() => {
    const formal = this.requests().filter(item => !['approved','declined'].includes(item.status)).length;
    const manual = this.bookingState.active().length;
    return formal + manual;
  });

  readonly internationalBookings = computed(() => {
    const formal = this.requests().filter(item => !['approved','declined'].includes(item.status) && this.isInternational(item.country)).length;
    return formal + this.bookingState.internationalCount();
  });

  readonly activeAssignments = computed(() => this.assignments().filter(item => item.status !== 'completed').length);

  constructor(
    readonly programs: CtgProgramsStateService,
    readonly bookingState: CtgBookingDeskStateService,
    private readonly api: EngagementsApiService,
  ) {}

  ngOnInit(): void {
    this.api.getRequests().subscribe({ next: items => this.requests.set(items), error: () => this.requests.set([]) });
    this.api.getAssignments().subscribe({ next: items => this.assignments.set(items), error: () => this.assignments.set([]) });
  }

  private isInternational(country: string): boolean {
    return !['united states','united states of america','usa','us','u.s.'].includes((country || '').trim().toLowerCase());
  }
}
