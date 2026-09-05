import { Component, computed, signal } from '@angular/core';
import { CtgProgramsStateService, Power12Status, RegistrationStatus } from '../core/ctg-programs-state.service';

@Component({
  selector: 'app-ctg-programs',
  standalone: true,
  template: `
    <section class="programs-page">
      <header class="programs-header">
        <div>
          <span class="eyebrow">Cynthia Thompson Global · Engagements</span>
          <h1>Events & Programs</h1>
          <p>One place to steward conference attendees and the deeper mentorship relationships that continue beyond an event.</p>
        </div>
        <div class="header-actions">
          <a href="/register/power-glory-2026" target="_blank">Open registration page</a>
          <a class="primary" href="/join-the-12" target="_blank">Open Power of 12 application</a>
        </div>
      </header>

      <nav class="program-tabs" aria-label="CTG programs">
        <button type="button" [class.active]="activeTab() === 'events'" (click)="activeTab.set('events')">Conferences</button>
        <button type="button" [class.active]="activeTab() === 'power12'" (click)="activeTab.set('power12')">Power of 12</button>
      </nav>

      @if (activeTab() === 'events') {
        <section class="summary-strip">
          <article><small>Events this year</small><strong>{{ programs.events().length }}</strong><span>Registration and attendee journeys</span></article>
          <article><small>Registrations</small><strong>{{ programs.totalRegistrations() }}</strong><span>Across CTG events</span></article>
          <article><small>Checked in</small><strong>{{ programs.checkedIn() }}</strong><span>Ready/on site</span></article>
        </section>

        <section class="section-block">
          <header class="section-heading"><div><span class="eyebrow">Conference portfolio</span><h2>Gatherings throughout the year</h2></div></header>
          <div class="event-grid">
            @for (event of programs.events(); track event.id) {
              <button type="button" class="event-card" [class.selected]="selectedEventId() === event.id" (click)="selectedEventId.set(event.id)">
                <span class="event-status">{{ event.status }}</span>
                <small>{{ event.dates }}</small>
                <strong>{{ event.title }}</strong>
                <span>{{ event.subtitle }} · {{ event.location }}</span>
                <div><b>{{ programs.registrationsFor(event.id).length }}</b><em>registered</em><b>{{ event.capacity }}</b><em>capacity</em></div>
              </button>
            }
          </div>
        </section>

        @if (selectedEvent(); as event) {
          <section class="section-block attendee-block">
            <header class="section-heading">
              <div><span class="eyebrow">Attendee journey</span><h2>{{ event.title }}</h2><p>Registration, access tier, accommodations, check-in, communication, and post-event follow-up stay connected to the same attendee.</p></div>
              <a [href]="'/register/' + event.id" target="_blank">Public registration →</a>
            </header>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Attendee</th><th>Access</th><th>From</th><th>Church / ministry</th><th>Needs</th><th>Status</th></tr></thead>
                <tbody>
                  @for (person of selectedRegistrations(); track person.id) {
                    <tr>
                      <td><strong>{{ person.firstName }} {{ person.lastName }}</strong><small>{{ person.email }}</small></td>
                      <td>{{ tierName(person.tierId) }}</td>
                      <td>{{ person.city }}, {{ person.state }}</td>
                      <td>{{ person.church || '—' }}</td>
                      <td>{{ person.accessibility || 'None noted' }}</td>
                      <td>
                        <select [value]="person.status" (change)="changeRegistrationStatus(person.id, $event)">
                          <option value="registered">Registered</option>
                          <option value="checked-in">Checked in</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="empty">No registrations yet. Open the public registration page to add one.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      } @else {
        <section class="power12-intro">
          <div>
            <span class="eyebrow">Private mentorship</span>
            <h2>The Power of 12</h2>
            <p>This is not managed like a conference ticket. It is a discernment, acceptance, enrollment, and 12-month formation relationship with Apostle Cynthia Thompson.</p>
          </div>
          <div class="seat-meter">
            <span><strong>{{ programs.power12SeatsCommitted() }}</strong> / 12</span>
            <small>accepted or enrolled</small>
            <div><i [style.width.%]="power12Fill()"></i></div>
          </div>
        </section>

        <section class="summary-strip power12-summary">
          <article><small>Applicants</small><strong>{{ programs.applicants().length }}</strong><span>Current mentorship pipeline</span></article>
          <article><small>In review</small><strong>{{ statusCount('review') + statusCount('applied') }}</strong><span>Need discernment / conversation</span></article>
          <article><small>Seats committed</small><strong>{{ programs.power12SeatsCommitted() }}</strong><span>Of 12 available seats</span></article>
        </section>

        <section class="section-block">
          <header class="section-heading">
            <div><span class="eyebrow">Mentorship pipeline</span><h2>People, not applications</h2><p>Keep the applicant's calling, goals, readiness, decision, and eventual mentorship journey together.</p></div>
            <a href="/join-the-12" target="_blank">Public application →</a>
          </header>

          <div class="applicant-list">
            @for (person of programs.applicants(); track person.id) {
              <article class="applicant-card">
                <div class="applicant-main">
                  <span class="avatar">{{ person.firstName.charAt(0) }}{{ person.lastName.charAt(0) }}</span>
                  <div><strong>{{ person.firstName }} {{ person.lastName }}</strong><small>{{ person.ministryRole }} · {{ person.city }}, {{ person.state }}</small></div>
                </div>
                <div class="calling"><small>Calling</small><span>{{ person.calling }}</span></div>
                <div class="goals"><small>Mentorship goals</small><span>{{ person.goals }}</span></div>
                <div class="investment"><small>Investment</small><span>{{ paymentLabel(person.paymentPreference) }}</span></div>
                <div class="applicant-status">
                  <select [value]="person.status" (change)="changePower12Status(person.id, $event)">
                    <option value="applied">Applied</option>
                    <option value="review">In review</option>
                    <option value="accepted">Accepted</option>
                    <option value="waitlist">Waitlist</option>
                    <option value="enrolled">Enrolled</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </article>
            }
          </div>
        </section>

        <section class="mentorship-rhythm">
          <div><span class="eyebrow">After enrollment</span><h2>What ApostolOS should carry for the cohort</h2></div>
          <div class="rhythm-grid">
            <article><b>01</b><strong>Bi-weekly sessions</strong><span>Schedule, attendance, Zoom/link, replay, notes, and session focus.</span></article>
            <article><b>02</b><strong>Assignments & activations</strong><span>Prophetic exercises, reflection, completion, and Apostle Cynthia's response.</span></article>
            <article><b>03</b><strong>Private resources</strong><span>Replays, notes, documents, recommended study, and cohort-only material.</span></article>
            <article><b>04</b><strong>Formation journey</strong><span>Goals, prophetic maturity, leadership development, milestones, and commissioning.</span></article>
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.programs-page{max-width:1320px;margin:0 auto;padding:30px 34px 70px;color:#1d2430}.programs-header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;padding:10px 0 26px}.eyebrow{display:block;color:#8d6b36;font-size:.62rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.programs-header h1{margin:7px 0;font-size:clamp(2.3rem,4vw,3.6rem);letter-spacing:-.055em}.programs-header p,.section-heading p,.power12-intro p{max-width:740px;margin:0;color:#72777d;line-height:1.6}.header-actions{display:flex;gap:8px}.header-actions a,.section-heading>a{display:inline-flex;min-height:38px;padding:0 13px;border:1px solid #d8d9dd;border-radius:9px;align-items:center;color:#2d568f;text-decoration:none;font-size:.7rem;font-weight:850}.header-actions a.primary{border-color:#1f3b60;background:#1f3b60;color:#fff}.program-tabs{display:flex;gap:4px;border-bottom:1px solid #dddfe3}.program-tabs button{padding:12px 17px;border:0;border-bottom:2px solid transparent;background:transparent;color:#70757d;font-weight:850;cursor:pointer}.program-tabs button.active{border-bottom-color:#a77a35;color:#1e2d43}.summary-strip{display:grid;grid-template-columns:repeat(3,1fr);margin:22px 0;border:1px solid #e0e1e4;border-radius:14px;background:#fff;overflow:hidden}.summary-strip article{display:grid;gap:3px;padding:18px 20px;border-right:1px solid #e4e5e8}.summary-strip article:last-child{border-right:0}.summary-strip small,.event-card small,.applicant-card small,.seat-meter small{color:#83878d;font-size:.62rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.summary-strip strong{font-size:1.6rem}.summary-strip span{color:#777b81;font-size:.68rem}.section-block{margin-top:28px}.section-heading{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:14px}.section-heading h2,.power12-intro h2,.mentorship-rhythm h2{margin:5px 0;font-size:1.45rem;letter-spacing:-.035em}.event-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.event-card{display:grid;gap:7px;padding:20px;border:1px solid #dedfe2;border-radius:14px;background:#fff;text-align:left;cursor:pointer}.event-card.selected{border-color:#a77a35;box-shadow:0 0 0 2px rgba(167,122,53,.10)}.event-status{justify-self:start;padding:4px 7px;border-radius:999px;background:#eaf4ec;color:#356846;font-size:.58rem;font-weight:900;text-transform:uppercase}.event-card>strong{font-size:1rem}.event-card>span:not(.event-status){color:#71767d;font-size:.72rem}.event-card>div{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:4px 8px;margin-top:8px;padding-top:12px;border-top:1px solid #ececef;align-items:baseline}.event-card b{font-size:1rem}.event-card em{color:#888;font-size:.6rem;font-style:normal;text-transform:uppercase}.attendee-block{padding-top:4px}.table-wrap{overflow:auto;border:1px solid #dedfe3;border-radius:14px;background:#fff}table{width:100%;border-collapse:collapse;min-width:900px}th,td{padding:13px 14px;border-bottom:1px solid #ececef;text-align:left;font-size:.7rem;vertical-align:top}th{background:#f7f7f8;color:#747980;font-size:.6rem;text-transform:uppercase;letter-spacing:.06em}td strong,td small{display:block}td small{margin-top:3px;color:#878b91}td select,.applicant-status select{border:1px solid #d8d9dc;border-radius:8px;background:#fff;padding:7px;font:inherit}.empty{text-align:center;color:#85898e;padding:28px}.power12-intro{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:30px;align-items:end;margin:28px 0 10px;padding:26px;border-radius:16px;background:#24202a;color:#f8f2e9}.power12-intro p{color:#c6bec9}.power12-intro .eyebrow{color:#d0a15c}.seat-meter{display:grid;gap:6px}.seat-meter>span strong{font-size:2rem}.seat-meter>div{height:7px;border-radius:999px;background:#4a414d;overflow:hidden}.seat-meter i{display:block;height:100%;background:#c89a54}.applicant-list{display:grid;gap:9px}.applicant-card{display:grid;grid-template-columns:220px minmax(160px,1fr) minmax(160px,1fr) 130px 120px;gap:16px;align-items:center;padding:15px;border:1px solid #e0e1e4;border-radius:12px;background:#fff}.applicant-main{display:flex;gap:10px;align-items:center}.avatar{display:grid;width:38px;height:38px;border-radius:50%;place-items:center;background:#efe6d8;color:#785729;font-size:.66rem;font-weight:900}.applicant-main>div{min-width:0}.applicant-main strong,.applicant-main small{display:block}.calling,.goals,.investment{display:grid;gap:4px}.calling span,.goals span,.investment span{color:#5f646b;font-size:.69rem;line-height:1.45}.mentorship-rhythm{margin-top:34px;padding:26px;border-radius:16px;background:#f1ece4}.rhythm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.rhythm-grid article{display:grid;gap:7px;padding:16px;border-radius:11px;background:#fff}.rhythm-grid b{color:#b3823b}.rhythm-grid strong{font-size:.8rem}.rhythm-grid span{color:#73777d;font-size:.67rem;line-height:1.5}@media(max-width:1000px){.programs-header,.power12-intro{grid-template-columns:1fr}.header-actions{flex-wrap:wrap}.applicant-card{grid-template-columns:1fr 1fr}.rhythm-grid{grid-template-columns:1fr 1fr}}@media(max-width:700px){.programs-page{padding:22px 18px 60px}.summary-strip,.event-grid,.rhythm-grid,.applicant-card{grid-template-columns:1fr}.summary-strip article{border-right:0;border-bottom:1px solid #e4e5e8}.section-heading{align-items:start;flex-direction:column}}
  `],
})
export class CtgProgramsComponent {
  readonly activeTab = signal<'events' | 'power12'>('events');
  readonly selectedEventId = signal('power-glory-2026');
  readonly selectedEvent = computed(() => this.programs.eventById(this.selectedEventId()));
  readonly selectedRegistrations = computed(() => this.programs.registrationsFor(this.selectedEventId()));
  readonly power12Fill = computed(() => Math.min(100, Math.round((this.programs.power12SeatsCommitted() / 12) * 100)));

  constructor(readonly programs: CtgProgramsStateService) {}

  tierName(tierId: string): string {
    return this.selectedEvent()?.tiers.find(item => item.id === tierId)?.name ?? tierId;
  }

  changeRegistrationStatus(id: string, event: Event): void {
    this.programs.setRegistrationStatus(id, (event.target as HTMLSelectElement).value as RegistrationStatus);
  }

  changePower12Status(id: string, event: Event): void {
    this.programs.updatePower12(id, (event.target as HTMLSelectElement).value as Power12Status);
  }

  statusCount(status: Power12Status): number {
    return this.programs.applicants().filter(item => item.status === status).length;
  }

  paymentLabel(value: string): string {
    if (value === 'pay-in-full') return 'Pay in full';
    if (value === 'installments') return 'Installments';
    return 'Needs conversation';
  }
}
