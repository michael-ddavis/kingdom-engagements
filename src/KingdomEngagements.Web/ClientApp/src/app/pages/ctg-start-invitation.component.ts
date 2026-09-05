import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  EngagementsApiService,
  StartSpeakingInvitationInput,
  StartedInvitationLinkResult,
} from '../core/engagements-api.service';

@Component({
  selector: 'app-ctg-start-invitation',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="start-page">
      <a class="back-link" routerLink="/organization/ctg/bookings">← Global Booking Desk</a>

      <header class="page-header">
        <div>
          <span class="eyebrow">Cynthia Thompson Global · Assistant quick action</span>
          <h1>Start the invitation. Let the host finish it.</h1>
          <p>Create the CTG record first, then send the host one secure link to finish that exact invitation. The reference number stays with the relationship from first contact through review and preparation.</p>
        </div>
        <aside>
          <small>Fast handoff</small>
          <strong>1. Start · 2. Send · 3. Review</strong>
          <span>Name and email are enough. Add anything else only if you already know it.</span>
        </aside>
      </header>

      @if (!result()) {
        <form class="start-form" (submit)="$event.preventDefault(); createInvitation()">
          <section class="form-intro">
            <div><span class="eyebrow">Two required fields</span><h2>Who should finish this invitation?</h2></div>
            <p>ApostolOS creates the CTG reference immediately. The host completes the full event and travel information from the secure link.</p>
          </section>

          @if (error()) { <p class="error">{{ error() }}</p> }

          <div class="essential-fields">
            <label>Host / primary contact <em>*</em><input name="contactName" [(ngModel)]="draft.contactName" required autocomplete="name" placeholder="Pastor James Okoro" /></label>
            <label>Email <em>*</em><input name="contactEmail" type="email" [(ngModel)]="draft.contactEmail" required autocomplete="email" placeholder="pastor@ministry.org" /></label>
            <label>Ministry / organization <span>optional</span><input name="organizationName" [(ngModel)]="draft.organizationName" placeholder="Kingdom Leadership Network" /></label>
            <label>Event / gathering <span>optional</span><input name="eventName" [(ngModel)]="draft.eventName" placeholder="Leadership Conference" /></label>
          </div>

          <details class="optional-details">
            <summary><span>Add details I already know</span><small>Dates, location, phone or a handoff note</small></summary>
            <div class="fields">
              <label>Phone / WhatsApp<input name="contactPhone" [(ngModel)]="draft.contactPhone" /></label>
              <label>City<input name="city" [(ngModel)]="draft.city" placeholder="Lagos" /></label>
              <label>State / province<input name="state" [(ngModel)]="draft.state" /></label>
              <label>Country<input name="country" [(ngModel)]="draft.country" placeholder="Nigeria" /></label>
              <label>Requested start<input name="startDate" type="date" [(ngModel)]="draft.startDate" /></label>
              <label>Requested end<input name="endDate" type="date" [(ngModel)]="draft.endDate" /></label>
              <label class="wide">Internal handoff note<textarea name="note" rows="3" [(ngModel)]="draft.note" placeholder="Spoke with Apostle after service. Please complete the formal invitation details."></textarea></label>
            </div>
          </details>

          <footer>
            <span>Creates one CTG record and one secure completion link.</span>
            <button type="submit" class="primary" [disabled]="saving()">{{ saving() ? 'Opening invitation…' : 'Start invitation' }}</button>
          </footer>
        </form>
      } @else if (result(); as created) {
        <section class="handoff-card">
          <div class="success-mark">✓</div>
          <span class="eyebrow">Ready to send</span>
          <h2>{{ created.request.referenceNumber }}</h2>
          <p class="lead">This invitation now exists in CTG and is waiting for {{ created.request.contactName }} to finish it. They cannot accidentally create a second record from this link.</p>

          <div class="record-strip">
            <div><small>Record</small><strong>{{ created.request.referenceNumber }}</strong></div>
            <div><small>Status</small><strong>Waiting on host</strong></div>
            <div><small>Link expires</small><strong>{{ expiry(created.request.editTokenExpiresAtUtc) }}</strong></div>
          </div>

          <section class="share-section">
            <div><span class="eyebrow">Secure completion link</span><h3>Send this exact invitation</h3></div>
            <div class="link-box"><code>{{ created.completionUrl }}</code><button type="button" (click)="copy(created.completionUrl, 'Link copied')">Copy link</button></div>
            <p>The form displays <strong>{{ created.request.referenceNumber }}</strong>. When the host submits it, this link closes and the same record moves to CTG's review queue.</p>
          </section>

          <section class="message-section">
            <span class="eyebrow">Ready-to-send message</span>
            <div class="message-box">{{ shareMessage(created) }}</div>
            <div class="send-actions">
              <a class="primary email-action" [href]="emailHref(created)">Email host</a>
              <button type="button" class="secondary" (click)="copy(shareMessage(created), 'Message copied')">Copy message</button>
            </div>
          </section>

          @if (copyNotice()) { <p class="copy-notice">{{ copyNotice() }}</p> }

          <footer class="result-actions">
            <a [href]="'/invitations?request=' + created.request.id">Open invitation record</a>
            <button type="button" class="secondary" (click)="startAnother()">Start another</button>
          </footer>
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.start-page{max-width:1060px;margin:0 auto;padding:30px 34px 72px;color:#1f2937}.back-link{display:inline-block;margin-bottom:18px;color:#53677e;font-size:.69rem;font-weight:800;text-decoration:none}.eyebrow{display:block;color:#8f6d3c;font-size:.6rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.page-header{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:38px;align-items:end;padding-bottom:26px;border-bottom:1px solid #dedfdc}.page-header h1{max-width:760px;margin:7px 0 10px;font-size:clamp(2.25rem,5vw,4rem);line-height:1;letter-spacing:-.052em}.page-header p{max-width:750px;margin:0;color:#707985;line-height:1.65}.page-header aside{display:grid;gap:7px;padding:17px;border-left:3px solid #9b7846;background:#f8f4ec}.page-header aside small{color:#84765f;font-size:.6rem;font-weight:900;text-transform:uppercase}.page-header aside strong{font-size:.84rem}.page-header aside span{color:#747b84;font-size:.68rem;line-height:1.5}.start-form,.handoff-card{margin-top:22px;border:1px solid #dedfdc;border-radius:13px;background:#fffefa;overflow:hidden}.form-intro{display:flex;justify-content:space-between;gap:30px;align-items:end;padding:19px 22px;border-bottom:1px solid #e6e6e2;background:#fbfaf7}.form-intro h2{margin:4px 0 0;font-size:1.3rem;letter-spacing:-.03em}.form-intro p{max-width:430px;margin:0;color:#777e87;font-size:.69rem;line-height:1.55}.essential-fields,.fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.essential-fields{padding:22px}.essential-fields label,.fields label{display:grid;gap:6px;color:#5d6671;font-size:.65rem;font-weight:800}.essential-fields label span{color:#91969c;font-size:.58rem;font-weight:700}.essential-fields em{color:#a84f47;font-style:normal}.essential-fields input,.fields input,.fields textarea{box-sizing:border-box;width:100%;padding:11px;border:1px solid #d3d7db;border-radius:8px;background:#fff;color:#202a35;font:inherit}.fields label.wide{grid-column:1/-1}.fields textarea{resize:vertical}.optional-details{margin:0 22px 20px;border:1px solid #e0e2e3;border-radius:10px;background:#fbfaf7;overflow:hidden}.optional-details summary{display:flex;justify-content:space-between;gap:18px;padding:13px 14px;color:#405066;cursor:pointer;list-style:none}.optional-details summary::-webkit-details-marker{display:none}.optional-details summary span{font-size:.7rem;font-weight:850}.optional-details summary small{color:#858b92;font-size:.62rem}.optional-details[open] summary{border-bottom:1px solid #e4e5e4}.optional-details .fields{padding:16px}.start-form footer{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:15px 22px;border-top:1px solid #e6e6e2;background:#fcfbf8}.start-form footer span{color:#80868e;font-size:.65rem}.primary,.secondary,.result-actions a,.link-box button{display:inline-flex;min-height:40px;padding:0 14px;border:1px solid #d4d9df;border-radius:8px;align-items:center;justify-content:center;background:#fff;color:#315d87;font:inherit;font-size:.68rem;font-weight:850;text-decoration:none;cursor:pointer}.primary{border-color:#273b53;background:#273b53;color:#fff}.primary:disabled{opacity:.55;cursor:wait}.error{margin:16px 22px 0;padding:11px 13px;border-left:3px solid #b75b52;background:#fff0ee;color:#91443e;font-size:.7rem}.handoff-card{padding:28px}.success-mark{display:grid;width:42px;height:42px;border-radius:50%;place-items:center;margin-bottom:18px;background:#e8f3ec;color:#2d7450;font-weight:900}.handoff-card h2{margin:5px 0 6px;font-size:2.15rem;letter-spacing:-.04em}.lead{max-width:740px;margin:0;color:#6e7680;line-height:1.6}.record-strip{display:grid;grid-template-columns:repeat(3,1fr);margin-top:23px;border-top:1px solid #e1e4e7;border-bottom:1px solid #e1e4e7}.record-strip div{display:grid;gap:4px;padding:14px;border-right:1px solid #e5e7ea}.record-strip div:last-child{border-right:0}.record-strip small{color:#868c93;font-size:.58rem;font-weight:850;text-transform:uppercase}.record-strip strong{font-size:.78rem}.share-section,.message-section{margin-top:23px}.share-section h3{margin:4px 0 10px;font-size:1.03rem}.share-section>p{color:#737b84;font-size:.68rem;line-height:1.55}.link-box{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:8px;border:1px solid #dce0e5;border-radius:10px;background:#f7f8f8}.link-box code{overflow:auto;padding:8px;color:#41566e;font-size:.64rem;white-space:nowrap}.message-box{margin-top:8px;padding:14px;border-left:3px solid #a98248;background:#f8f4ec;color:#5f6872;font-size:.7rem;line-height:1.65;white-space:pre-line}.send-actions{display:flex;gap:8px;margin-top:9px}.email-action{min-width:116px}.copy-notice{margin:14px 0 0;color:#327054;font-size:.68rem;font-weight:800}.result-actions{display:flex;justify-content:flex-end;gap:8px;margin:26px -28px -28px;padding:16px 28px;border-top:1px solid #e5e7ea;background:#fbfbfa}.secondary{background:#fff;color:#536477}@media(max-width:800px){.page-header{grid-template-columns:1fr}.form-intro{display:grid}.record-strip{grid-template-columns:1fr}.record-strip div{border-right:0;border-bottom:1px solid #e5e7ea}.record-strip div:last-child{border-bottom:0}}@media(max-width:600px){.start-page{padding:22px 16px 58px}.essential-fields,.fields{grid-template-columns:1fr}.fields label.wide{grid-column:auto}.optional-details summary{display:grid}.start-form footer,.result-actions,.send-actions{display:grid}.link-box{grid-template-columns:1fr}.handoff-card{padding:20px}.result-actions{margin:22px -20px -20px;padding:14px 20px}}
  `],
})
export class CtgStartInvitationComponent {
  readonly saving = signal(false);
  readonly error = signal('');
  readonly result = signal<StartedInvitationLinkResult | null>(null);
  readonly copyNotice = signal('');

  draft = this.blankDraft();

  constructor(private readonly api: EngagementsApiService) {}

  createInvitation(): void {
    this.error.set('');
    if (!this.draft.contactName.trim() || !this.draft.contactEmail.trim()) {
      this.error.set('Host name and email are required.');
      return;
    }
    if (this.draft.startDate && this.draft.endDate && this.draft.endDate < this.draft.startDate) {
      this.error.set('The requested end date cannot be before the start date.');
      return;
    }

    this.saving.set(true);
    const input: StartSpeakingInvitationInput = {
      contactName: this.draft.contactName.trim(),
      contactEmail: this.draft.contactEmail.trim(),
      organizationName: this.orNull(this.draft.organizationName),
      eventName: this.orNull(this.draft.eventName),
      contactPhone: this.orNull(this.draft.contactPhone),
      city: this.orNull(this.draft.city),
      state: this.orNull(this.draft.state),
      country: this.orNull(this.draft.country),
      startDate: this.draft.startDate || null,
      endDate: this.draft.endDate || null,
      note: this.orNull(this.draft.note),
    };

    this.api.startInvitation(input).subscribe({
      next: result => {
        this.saving.set(false);
        this.result.set(result);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: error => {
        this.saving.set(false);
        const validation = error?.error?.errors ? Object.values(error.error.errors).flat().join(' ') : '';
        this.error.set(validation || error?.error?.message || error?.error?.title || 'The invitation could not be started.');
      },
    });
  }

  async copy(value: string, notice: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copyNotice.set(notice);
      window.setTimeout(() => this.copyNotice.set(''), 2500);
    } catch {
      this.copyNotice.set('Copy was blocked by the browser. Select the text and copy it manually.');
    }
  }

  shareMessage(result: StartedInvitationLinkResult): string {
    return `Hello ${result.request.contactName},\n\nCynthia Thompson Global has opened invitation ${result.request.referenceNumber} for your ministry. Please use the secure link below to complete the remaining event and host details.\n\n${result.completionUrl}\n\nThis link continues invitation ${result.request.referenceNumber}; it does not create a new request. Once you submit it, the invitation will return to the CTG team for review.`;
  }

  emailHref(result: StartedInvitationLinkResult): string {
    const subject = `Complete CTG invitation ${result.request.referenceNumber}`;
    return `mailto:${encodeURIComponent(result.request.contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(this.shareMessage(result))}`;
  }

  expiry(value: string | null): string {
    if (!value) return 'No expiration';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  startAnother(): void {
    this.result.set(null);
    this.copyNotice.set('');
    this.draft = this.blankDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private blankDraft() {
    return {
      contactName: '',
      contactEmail: '',
      organizationName: '',
      eventName: '',
      contactPhone: '',
      city: '',
      state: '',
      country: 'United States',
      startDate: '',
      endDate: '',
      note: '',
    };
  }

  private orNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed || null;
  }
}
