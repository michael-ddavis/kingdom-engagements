import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CtgProgramsStateService } from '../core/ctg-programs-state.service';

@Component({
  selector: 'app-ctg-event-registration',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="registration-page">
      @if (event(); as conference) {
        <section class="event-hero">
          <span class="brand">CYNTHIA THOMPSON GLOBAL</span>
          <p class="kicker">{{ conference.subtitle }}</p>
          <h1>{{ conference.title }}</h1>
          <div class="event-meta"><span>{{ conference.dates }}</span><span>{{ conference.location }}</span></div>
          <p class="hero-copy">Reserve your place for this CTG gathering. Choose your access level, tell us who is coming, and keep your confirmation connected to the event.</p>
        </section>

        @if (confirmation()) {
          <section class="confirmation-card">
            <span class="confirmation-mark">✓</span>
            <p class="kicker">Registration received</p>
            <h2>Your place is being held.</h2>
            <p>{{ firstName }}, your registration for <strong>{{ conference.title }}</strong> has been added to the CTG attendee list.</p>
            <div class="confirmation-grid">
              <div><small>Access</small><strong>{{ selectedTier()?.name }}</strong></div>
              <div><small>Registration</small><strong>{{ confirmation() }}</strong></div>
            </div>
            <p class="fine-print">Payment/checkout can be connected to CTG's preferred processor; ApostolOS keeps the attendee, access tier, communication, check-in, and follow-up record together.</p>
          </section>
        } @else {
          <section class="registration-layout">
            <form class="registration-form" (ngSubmit)="submit()">
              <header><p class="kicker">Secure your seat</p><h2>Conference registration</h2><p>One person per registration.</p></header>

              <fieldset>
                <legend>Choose your access</legend>
                <div class="tier-grid">
                  @for (tier of conference.tiers; track tier.id) {
                    <label class="tier-card" [class.selected]="tierId === tier.id">
                      <input type="radio" name="tier" [value]="tier.id" [(ngModel)]="tierId" required />
                      <span><strong>{{ tier.name }}</strong><em>\${{ tier.price }}</em><small>{{ tier.detail }}</small></span>
                    </label>
                  }
                </div>
              </fieldset>

              <fieldset>
                <legend>About you</legend>
                <div class="field-grid">
                  <label>First name<input name="firstName" [(ngModel)]="firstName" required /></label>
                  <label>Last name<input name="lastName" [(ngModel)]="lastName" required /></label>
                  <label>Email<input name="email" type="email" [(ngModel)]="email" required /></label>
                  <label>Mobile phone<input name="phone" [(ngModel)]="phone" required /></label>
                  <label>City<input name="city" [(ngModel)]="city" required /></label>
                  <label>State / region<input name="state" [(ngModel)]="state" required /></label>
                  <label class="wide">Church / ministry <span>(optional)</span><input name="church" [(ngModel)]="church" /></label>
                  <label class="wide">Accessibility or accommodation needs <span>(optional)</span><textarea name="accessibility" [(ngModel)]="accessibility" rows="3"></textarea></label>
                </div>
              </fieldset>

              <button class="submit" type="submit">Complete registration</button>
              <p class="fine-print">By registering, you agree to receive event-related communication from Cynthia Thompson Global.</p>
            </form>

            <aside class="event-summary">
              <p class="kicker">Your gathering</p>
              <h2>{{ conference.title }}</h2>
              <dl>
                <div><dt>When</dt><dd>{{ conference.dates }}</dd></div>
                <div><dt>Where</dt><dd>{{ conference.location }}</dd></div>
                <div><dt>Access</dt><dd>{{ selectedTier()?.name || 'Choose a registration tier' }}</dd></div>
                @if (selectedTier()) { <div><dt>Investment</dt><dd>\${{ selectedTier()!.price }}</dd></div> }
              </dl>
              <div class="summary-note"><strong>After registration</strong><span>CTG can use ApostolOS for attendee communication, hotel/travel information, check-in, access verification, and post-event follow-up.</span></div>
            </aside>
          </section>
        }
      } @else {
        <section class="not-found"><h1>Registration is not available.</h1><p>This CTG event could not be found.</p></section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;background:#f4f0e8;color:#1d2430;min-height:100vh}.registration-page{min-height:100vh}.event-hero{padding:64px max(28px,calc((100vw - 1180px)/2));background:linear-gradient(135deg,#182844,#243a60);color:#fff}.brand{display:block;font-size:.72rem;font-weight:900;letter-spacing:.16em}.kicker{margin:18px 0 6px;color:#b88c43;font-size:.72rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.event-hero h1{max-width:850px;margin:0;font-size:clamp(2.6rem,6vw,5rem);letter-spacing:-.055em;line-height:.96}.event-meta{display:flex;flex-wrap:wrap;gap:10px 24px;margin-top:22px;font-weight:750}.hero-copy{max-width:720px;margin:22px 0 0;color:#dce4f0;line-height:1.7}.registration-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:28px;max-width:1180px;margin:0 auto;padding:36px 28px 70px}.registration-form,.event-summary,.confirmation-card{background:#fff;border:1px solid #ded8cf;border-radius:18px;box-shadow:0 16px 48px rgba(25,32,43,.06)}.registration-form{padding:30px}.registration-form header h2,.event-summary h2,.confirmation-card h2{margin:0;font-size:1.65rem;letter-spacing:-.035em}.registration-form header>p:last-child{color:#6e747c}.registration-form fieldset{margin:28px 0 0;padding:0;border:0}.registration-form legend{margin-bottom:14px;font-weight:850}.tier-grid{display:grid;gap:10px}.tier-card{display:block;padding:16px;border:1px solid #ddd7ce;border-radius:13px;cursor:pointer}.tier-card.selected{border-color:#b88c43;box-shadow:0 0 0 2px rgba(184,140,67,.13)}.tier-card input{position:absolute;opacity:0}.tier-card span{display:grid;grid-template-columns:1fr auto;gap:5px 18px}.tier-card strong{font-size:.92rem}.tier-card em{font-style:normal;font-weight:900}.tier-card small{grid-column:1/-1;color:#737880;line-height:1.5}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field-grid label{display:grid;gap:6px;font-size:.72rem;font-weight:800}.field-grid label span{font-weight:500;color:#8b8f95}.field-grid .wide{grid-column:1/-1}.field-grid input,.field-grid textarea{width:100%;box-sizing:border-box;border:1px solid #d7d2ca;border-radius:10px;background:#fdfcf9;padding:12px;font:inherit;color:inherit}.submit{width:100%;margin-top:24px;border:0;border-radius:11px;background:#1d3557;color:#fff;padding:14px 18px;font-weight:850;cursor:pointer}.fine-print{color:#7a7e84;font-size:.68rem;line-height:1.55}.event-summary{position:sticky;top:24px;height:max-content;padding:24px}.event-summary dl{margin:20px 0}.event-summary dl div{display:grid;gap:4px;padding:13px 0;border-top:1px solid #eee9e2}.event-summary dt{color:#84888d;font-size:.66rem;text-transform:uppercase;font-weight:850;letter-spacing:.08em}.event-summary dd{margin:0;font-weight:750}.summary-note{display:grid;gap:6px;padding:16px;border-radius:12px;background:#f6f1e8}.summary-note span{color:#686e75;font-size:.73rem;line-height:1.55}.confirmation-card{max-width:720px;margin:42px auto;padding:42px;text-align:center}.confirmation-mark{display:grid;width:52px;height:52px;margin:0 auto 10px;border-radius:50%;place-items:center;background:#e8f4ec;color:#28693d;font-size:1.25rem;font-weight:900}.confirmation-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:24px 0;text-align:left}.confirmation-grid div{display:grid;gap:4px;padding:14px;border-radius:10px;background:#f6f3ee}.confirmation-grid small{color:#7b8086;font-size:.64rem;text-transform:uppercase}.not-found{padding:80px 30px;text-align:center}@media(max-width:850px){.registration-layout{grid-template-columns:1fr}.event-summary{position:static}.field-grid{grid-template-columns:1fr}.field-grid .wide{grid-column:auto}.confirmation-grid{grid-template-columns:1fr}}
  `],
})
export class CtgEventRegistrationComponent {
  readonly eventId: string;
  readonly event = computed(() => this.state.eventById(this.eventId));
  readonly confirmation = signal('');

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  city = '';
  state = '';
  church = '';
  accessibility = '';
  tierId = '';

  constructor(route: ActivatedRoute, readonly stateService: CtgProgramsStateService) {
    this.state = stateService;
    this.eventId = route.snapshot.paramMap.get('eventId') || 'power-glory-2026';
    const firstTier = this.state.eventById(this.eventId)?.tiers[0];
    this.tierId = firstTier?.id ?? '';
  }

  private readonly state: CtgProgramsStateService;

  selectedTier() {
    return this.event()?.tiers.find(item => item.id === this.tierId);
  }

  submit(): void {
    if (!this.event() || !this.firstName.trim() || !this.lastName.trim() || !this.email.trim() || !this.tierId) return;
    const record = this.state.register({
      eventId: this.eventId,
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      city: this.city.trim(),
      state: this.state.trim(),
      church: this.church.trim(),
      tierId: this.tierId,
      accessibility: this.accessibility.trim(),
    });
    this.confirmation.set(`CTG-${record.id.slice(0, 8).toUpperCase()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
