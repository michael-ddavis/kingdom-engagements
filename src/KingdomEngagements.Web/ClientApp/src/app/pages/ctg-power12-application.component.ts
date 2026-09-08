import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CtgProgramsStateService } from '../core/ctg-programs-state.service';

@Component({
  selector: 'app-ctg-power12-application',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="power12-page">
      <section class="power12-hero">
        <div class="hero-copy">
          <span class="brand">CYNTHIA THOMPSON GLOBAL</span>
          <p class="kicker">Private apostolic & prophetic mentorship</p>
          <h1>The Power<br/>of <em>12</em></h1>
          <p class="lead">A close-knit mentorship journey with Apostle Cynthia Thompson for leaders ready for prophetic development, spiritual alignment, leadership formation, and Kingdom influence.</p>
          <div class="hero-facts"><span>12 seats</span><span>12 months</span><span>Bi-weekly mentorship</span></div>
        </div>
        <aside class="hero-note">
          <small>This is not a class.</small>
          <strong>It is a calling into deeper formation.</strong>
          <p>Applications help the CTG team discern fit, readiness, goals, and the right next conversation before enrollment.</p>
        </aside>
      </section>

      @if (confirmation()) {
        <section class="confirmation">
          <span>✓</span>
          <p class="kicker">Application received</p>
          <h2>Thank you, {{ firstName }}.</h2>
          <p>Your Power of 12 application is now in the CTG mentorship review queue. The team can review your calling, goals, readiness, and preferred investment option together in ApostolOS.</p>
          <div><small>Application</small><strong>{{ confirmation() }}</strong></div>
        </section>
      } @else {
        <section class="application-layout">
          <form (ngSubmit)="submit()">
            <header><p class="kicker">Begin the conversation</p><h2>Power of 12 application</h2><p>Tell the mentorship team who you are, what God is forming in you, and why this season matters.</p></header>

            <fieldset>
              <legend>About you</legend>
              <div class="grid">
                <label>First name<input name="firstName" [(ngModel)]="firstName" required /></label>
                <label>Last name<input name="lastName" [(ngModel)]="lastName" required /></label>
                <label>Email<input name="email" type="email" [(ngModel)]="email" required /></label>
                <label>Mobile phone<input name="phone" [(ngModel)]="phone" required /></label>
                <label>City<input name="city" [(ngModel)]="city" required /></label>
                <label>State / region<input name="state" [(ngModel)]="state" required /></label>
                <label class="wide">Current ministry / leadership role<input name="ministryRole" [(ngModel)]="ministryRole" required /></label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Your formation journey</legend>
              <label>How would you describe your calling right now?<textarea name="calling" [(ngModel)]="calling" rows="4" required></textarea></label>
              <label>Why does this mentorship matter in this season?<textarea name="whyNow" [(ngModel)]="whyNow" rows="4" required></textarea></label>
              <label>What do you most want to grow in during the mentorship?<textarea name="goals" [(ngModel)]="goals" rows="4" required></textarea></label>
            </fieldset>

            <fieldset>
              <legend>Investment readiness</legend>
              <p class="field-help">The current public program lists a $12,000 investment with a three-payment option. This question helps the team prepare the right enrollment conversation.</p>
              <div class="choice-grid">
                <label [class.selected]="paymentPreference === 'pay-in-full'"><input type="radio" name="paymentPreference" value="pay-in-full" [(ngModel)]="paymentPreference" />Pay in full</label>
                <label [class.selected]="paymentPreference === 'installments'"><input type="radio" name="paymentPreference" value="installments" [(ngModel)]="paymentPreference" />Installments</label>
                <label [class.selected]="paymentPreference === 'undecided'"><input type="radio" name="paymentPreference" value="undecided" [(ngModel)]="paymentPreference" />I need to discuss options</label>
              </div>
            </fieldset>

            <button class="submit" type="submit">Submit application</button>
            <p class="fine-print">Submitting an application does not guarantee one of the 12 cohort seats. CTG can review, accept, waitlist, or invite the applicant into a follow-up conversation.</p>
          </form>

          <aside class="program-summary">
            <p class="kicker">The mentorship</p>
            <h2>Formation in community</h2>
            <ul>
              <li>Direct mentorship with Apostle Cynthia Thompson</li>
              <li>Bi-weekly prophetic group sessions</li>
              <li>Assignments and activations</li>
              <li>Prophetic maturity and accuracy</li>
              <li>Kingdom leadership development</li>
              <li>Replays, notes, and private resources</li>
              <li>Inner healing and identity work</li>
              <li>Legacy and ministry preparation</li>
            </ul>
            <div class="investment"><small>Published investment</small><strong>$12,000</strong><span>or 3 payments of $4,000</span></div>
          </aside>
        </section>
      }
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#151319;color:#f7f1e8}.power12-page{min-height:100vh}.power12-hero{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:60px;max-width:1180px;margin:0 auto;padding:72px 30px 58px}.brand{font-size:.7rem;font-weight:900;letter-spacing:.18em}.kicker{color:#c99b53;font-size:.7rem;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.power12-hero h1{margin:14px 0;font-size:clamp(4rem,9vw,7rem);line-height:.78;letter-spacing:-.07em}.power12-hero h1 em{color:#c99b53;font-family:Georgia,serif;font-weight:400}.lead{max-width:720px;color:#d7d0c8;font-size:1.02rem;line-height:1.75}.hero-facts{display:flex;flex-wrap:wrap;gap:9px;margin-top:26px}.hero-facts span{padding:8px 11px;border:1px solid #423a35;border-radius:999px;color:#e3d9cf;font-size:.7rem;font-weight:800}.hero-note{align-self:end;padding:24px;border-top:1px solid #70583c;border-bottom:1px solid #70583c}.hero-note small{display:block;color:#c99b53;text-transform:uppercase;font-weight:900;letter-spacing:.09em}.hero-note strong{display:block;margin:8px 0;font-family:Georgia,serif;font-size:1.4rem;font-weight:400}.hero-note p{margin:0;color:#aaa39e;font-size:.77rem;line-height:1.6}.application-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:28px;max-width:1180px;margin:0 auto;padding:0 30px 80px}.application-layout form,.program-summary,.confirmation{background:#f9f5ee;color:#1e2025;border-radius:18px}.application-layout form{padding:32px}.application-layout form header h2,.program-summary h2,.confirmation h2{margin:0;font-size:1.8rem;letter-spacing:-.04em}.application-layout form header>p:last-child{color:#6f7074;line-height:1.55}.application-layout fieldset{margin:30px 0 0;padding:0;border:0}.application-layout legend{margin-bottom:14px;font-weight:900}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.grid .wide{grid-column:1/-1}.application-layout label{display:grid;gap:7px;margin-bottom:14px;font-size:.72rem;font-weight:850}.application-layout input,.application-layout textarea{box-sizing:border-box;width:100%;border:1px solid #d8d0c5;border-radius:10px;background:#fffdfa;padding:12px;font:inherit;color:inherit}.choice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.choice-grid label{display:block;margin:0;padding:14px;border:1px solid #d8d0c5;border-radius:11px;cursor:pointer}.choice-grid label.selected{border-color:#b88c43;background:#f2e8d7}.choice-grid input{width:auto;margin-right:7px}.field-help,.fine-print{color:#77787c;font-size:.69rem;line-height:1.55}.submit{width:100%;margin-top:20px;padding:14px;border:0;border-radius:10px;background:#34233b;color:#fff;font-weight:900;cursor:pointer}.program-summary{position:sticky;top:24px;height:max-content;padding:26px}.program-summary ul{display:grid;gap:10px;margin:22px 0;padding-left:18px;color:#55585d;font-size:.76rem;line-height:1.45}.investment{display:grid;gap:3px;padding:18px;border-radius:12px;background:#eee3d1}.investment small{color:#78674d;text-transform:uppercase;font-weight:900;letter-spacing:.08em}.investment strong{font-size:1.8rem}.investment span{color:#6c6255;font-size:.72rem}.confirmation{max-width:700px;margin:20px auto 80px;padding:42px;text-align:center}.confirmation>span{display:grid;width:52px;height:52px;margin:0 auto;border-radius:50%;place-items:center;background:#e3efe4;color:#2d663b;font-size:1.2rem;font-weight:900}.confirmation>p{color:#63666b;line-height:1.65}.confirmation>div{display:grid;gap:5px;margin-top:22px;padding:16px;border-radius:10px;background:#efe8dd;text-align:left}.confirmation small{text-transform:uppercase;color:#777;font-size:.65rem}.confirmation strong{font-size:1rem}@media(max-width:850px){.power12-hero,.application-layout{grid-template-columns:1fr}.program-summary{position:static}.grid,.choice-grid{grid-template-columns:1fr}.grid .wide{grid-column:auto}}
  `],
})
export class CtgPower12ApplicationComponent {
  readonly confirmation = signal('');

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  city = '';
  state = '';
  ministryRole = '';
  calling = '';
  whyNow = '';
  goals = '';
  paymentPreference: 'pay-in-full' | 'installments' | 'undecided' = 'undecided';

  constructor(private readonly programs: CtgProgramsStateService) {}

  submit(): void {
    if (!this.firstName.trim() || !this.lastName.trim() || !this.email.trim() || !this.calling.trim() || !this.whyNow.trim()) return;
    const record = this.programs.applyToPower12({
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      city: this.city.trim(),
      state: this.state.trim(),
      ministryRole: this.ministryRole.trim(),
      calling: this.calling.trim(),
      whyNow: this.whyNow.trim(),
      goals: this.goals.trim(),
      paymentPreference: this.paymentPreference,
    });
    this.confirmation.set(`P12-${record.id.slice(0, 8).toUpperCase()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
