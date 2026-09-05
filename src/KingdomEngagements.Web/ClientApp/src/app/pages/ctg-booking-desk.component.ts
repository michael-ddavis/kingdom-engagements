import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  CreateEngagementTaskInput,
  EngagementsApiService,
} from '../core/engagements-api.service';
import { EngagementSummary } from '../core/models';
import { SpeakingRequestDetails } from '../core/speaking-request.models';
import {
  BookingSource,
  BookingStage,
  CtgBookingDeskStateService,
  ManualBookingRecord,
} from '../core/ctg-booking-desk-state.service';

type DeskFilter = 'needs-me' | 'new' | 'needs-information' | 'under-review' | 'date-hold' | 'approved' | 'all';
type DeskKind = 'manual' | 'website';

interface BookingDeskItem {
  key: string;
  kind: DeskKind;
  id: string;
  eventName: string;
  eventType: string;
  hostOrganization: string;
  contactName: string;
  city: string;
  region: string;
  country: string;
  startDate: string;
  endDate: string;
  source: BookingSource;
  sourceDetail: string;
  stage: BookingStage;
  readiness: number | null;
  updatedAtUtc: string;
  holdExpiresAtUtc: string | null;
  assignmentId: string | null;
  notes: string;
}

interface TimelineItem {
  id: string;
  flag: string;
  location: string;
  title: string;
  date: string;
  sortDate: string;
  status: string;
  href?: string;
}

@Component({
  selector: 'app-ctg-booking-desk',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="booking-desk">
      <header class="desk-hero">
        <div>
          <span class="eyebrow">Cynthia Thompson Global · Global Booking Desk</span>
          <h1>Every invitation. One clear place.</h1>
          <p>Capture requests from anywhere, see what needs a response, protect Apostle Cynthia's calendar, and move approved ministry into preparation without losing the original relationship.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="primary" (click)="quickDialog.showModal()">+ Quick Add Booking</button>
          <a href="/invitations">Formal invitation review</a>
        </div>
      </header>

      <section class="today-brief">
        <div class="section-heading">
          <div><span class="eyebrow">Needs you today</span><h2>Booking brief</h2></div>
          <small>{{ activeCount() }} active opportunities</small>
        </div>
        <div class="brief-list">
          @for (signal of briefSignals(); track signal.label) {
            <button type="button" (click)="setFilter(signal.filter)">
              <span class="signal-dot" [attr.data-tone]="signal.tone"></span>
              <span class="brief-value"><strong>{{ signal.value }}</strong><small>{{ signal.label }}</small></span>
              <em>{{ signal.detail }}</em>
              <b>View →</b>
            </button>
          }
        </div>
      </section>

      <section class="outlook">
        <header class="section-heading">
          <div><span class="eyebrow">Global ministry outlook</span><h2>Where the calendar is taking shape</h2></div>
          <span class="region-summary">{{ regionSummary() }}</span>
        </header>
        <div class="travel-timeline">
          @for (item of timeline(); track item.id; let last = $last) {
            <article>
              <div class="timeline-rail"><span class="flag">{{ item.flag }}</span>@if (!last) {<i></i>}</div>
              <div class="timeline-copy">
                <small>{{ item.date }} · {{ item.status }}</small>
                <strong>{{ item.location }}</strong>
                <span>{{ item.title }}</span>
                @if (item.href) { <a [href]="item.href">Open →</a> }
              </div>
            </article>
          } @empty {
            <p class="timeline-empty">Confirmed travel and protected dates will appear here.</p>
          }
        </div>
      </section>

      <section class="pipeline">
        <header class="section-heading pipeline-heading">
          <div><span class="eyebrow">Booking pipeline</span><h2>Requests and opportunities</h2></div>
          <div class="filters" aria-label="Booking filters">
            @for (filter of filters; track filter.id) {
              <button type="button" [class.active]="activeFilter() === filter.id" (click)="setFilter(filter.id)">{{ filter.label }}</button>
            }
          </div>
        </header>

        <div class="pipeline-list">
          @for (item of filteredBookings(); track item.key) {
            <button type="button" class="booking-row" (click)="openBooking(item, detailDialog)">
              <span class="country-flag">{{ flagFor(item.country) }}</span>
              <span class="booking-main">
                <small>{{ sourceLabel(item.source) }} · {{ stageLabel(item.stage) }}</small>
                <strong>{{ item.eventName }}</strong>
                <em>{{ item.hostOrganization }} · {{ location(item) }}</em>
              </span>
              <span class="booking-date"><strong>{{ compactDate(item.startDate) }}</strong><small>{{ item.country }}</small></span>
              <span class="booking-signal">
                @if (item.readiness !== null) { <strong>{{ item.readiness }}%</strong><small>host ready</small> }
                @else { <strong>{{ ageLabel(item.updatedAtUtc) }}</strong><small>last activity</small> }
              </span>
              <b>›</b>
            </button>
          } @empty {
            <p class="empty">Nothing is waiting in this view.</p>
          }
        </div>
      </section>

      <dialog #quickDialog class="quick-dialog">
        <form class="dialog-shell" (submit)="$event.preventDefault(); saveQuickBooking(quickDialog)">
          <header>
            <div><span class="eyebrow">Capture it before it disappears</span><h2>Quick Add Booking</h2><p>Get the relationship safely into CTG. Complete the deeper details when you have them.</p></div>
            <button type="button" class="close" aria-label="Close" (click)="quickDialog.close()">×</button>
          </header>
          <div class="quick-grid">
            <label>Host / leader<input name="hostName" [(ngModel)]="quick.hostName" required /></label>
            <label>Organization<input name="hostOrganization" [(ngModel)]="quick.hostOrganization" /></label>
            <label>City<input name="city" [(ngModel)]="quick.city" required /></label>
            <label>Country<input name="country" [(ngModel)]="quick.country" required /></label>
            <label>Requested start<input name="start" type="date" [(ngModel)]="quick.requestedStartDate" /></label>
            <label>Requested end<input name="end" type="date" [(ngModel)]="quick.requestedEndDate" /></label>
            <label class="wide">Event / gathering<input name="eventName" [(ngModel)]="quick.eventName" placeholder="Leadership Conference" required /></label>
            <label>Type<input name="eventType" [(ngModel)]="quick.eventType" placeholder="Conference" /></label>
            <label>Source<select name="source" [(ngModel)]="quick.source"><option value="apostle-cynthia">Apostle Cynthia</option><option value="team-member">Team member</option><option value="email">Email</option><option value="whatsapp">WhatsApp / text</option><option value="phone">Phone</option><option value="referral">Pastor / ministry referral</option><option value="social">Social media</option><option value="returning-host">Returning host</option><option value="other">Other</option></select></label>
            <label>Email<input name="email" type="email" [(ngModel)]="quick.contactEmail" /></label>
            <label>Phone / WhatsApp<input name="phone" [(ngModel)]="quick.contactPhone" /></label>
            <label class="wide">What do we know?<textarea name="notes" rows="4" [(ngModel)]="quick.notes" placeholder="Spoke with Apostle after service. Formal information pending."></textarea></label>
          </div>
          <footer><button type="button" class="secondary" (click)="quickDialog.close()">Cancel</button><button type="submit" class="primary">Save booking</button></footer>
        </form>
      </dialog>

      <dialog #detailDialog class="detail-dialog" (close)="closeDetail()">
        @if (selected(); as item) {
          <article class="detail-shell">
            <header class="detail-header">
              <div><span class="eyebrow">{{ sourceLabel(item.source) }} · {{ stageLabel(item.stage) }}</span><h2>{{ item.eventName }}</h2><p>{{ item.hostOrganization }} · {{ location(item) }}</p></div>
              <div class="detail-header-actions">
                @if (manualFor(item); as manual) { <button type="button" class="quiet" (click)="editing() ? cancelEdit() : beginEdit(manual)">{{ editing() ? 'Cancel edit' : 'Edit details' }}</button> }
                <button type="button" class="close" aria-label="Close" (click)="detailDialog.close()">×</button>
              </div>
            </header>

            @if (conflictMessages(item).length) {
              <section class="conflict-panel">
                <strong>Calendar attention</strong>
                @for (message of conflictMessages(item); track message) { <p>⚠ {{ message }}</p> }
              </section>
            }

            @if (editing() && editDraft(); as draft) {
              <form class="edit-form" (submit)="$event.preventDefault(); saveEdit()">
                <section>
                  <span class="eyebrow">Booking details</span><h3>Complete what CTG knows</h3>
                  <div class="edit-grid">
                    <label>Host / leader<input name="editHost" [(ngModel)]="draft.hostName" /></label>
                    <label>Organization<input name="editOrg" [(ngModel)]="draft.hostOrganization" /></label>
                    <label>Email<input name="editEmail" type="email" [(ngModel)]="draft.contactEmail" /></label>
                    <label>Phone<input name="editPhone" [(ngModel)]="draft.contactPhone" /></label>
                    <label>WhatsApp<input name="editWhatsapp" [(ngModel)]="draft.whatsapp" /></label>
                    <label>Time zone<input name="editTimezone" [(ngModel)]="draft.timeZone" placeholder="Africa/Lagos" /></label>
                    <label>City<input name="editCity" [(ngModel)]="draft.city" /></label>
                    <label>Region / state<input name="editRegion" [(ngModel)]="draft.region" /></label>
                    <label>Country<input name="editCountry" [(ngModel)]="draft.country" /></label>
                    <label>Expected attendance<input name="editAttendance" type="number" min="0" [(ngModel)]="draft.expectedAttendance" /></label>
                    <label>Requested start<input name="editStart" type="date" [(ngModel)]="draft.requestedStartDate" /></label>
                    <label>Requested end<input name="editEnd" type="date" [(ngModel)]="draft.requestedEndDate" /></label>
                    <label class="wide">Alternate dates<input name="editAlternate" [(ngModel)]="draft.alternateDates" placeholder="March 25–28, 2027" /></label>
                    <label class="wide">Requested role / ministry<textarea name="editRole" rows="3" [(ngModel)]="draft.requestedRole"></textarea></label>
                    <label class="wide">Internal relationship note<textarea name="editNotes" rows="3" [(ngModel)]="draft.notes"></textarea></label>
                  </div>
                </section>

                <section>
                  <span class="eyebrow">International & travel</span><h3>What needs to be verified</h3>
                  <div class="toggle-grid">
                    <label><input name="editPassport" type="checkbox" [(ngModel)]="draft.passportRequired" /> Passport planning</label>
                    <label><input name="editVisa" type="checkbox" [(ngModel)]="draft.visaRequired" /> Visa required / verify</label>
                    <label><input name="editLetter" type="checkbox" [(ngModel)]="draft.invitationLetterRequired" /> Invitation letter required</label>
                    <label><input name="editInterpreter" type="checkbox" [(ngModel)]="draft.interpreterNeeded" /> Interpreter needed</label>
                  </div>
                  <div class="edit-grid">
                    <label class="wide">Entry / visa notes<textarea name="editEntry" rows="3" [(ngModel)]="draft.entryRequirements"></textarea></label>
                    <label>Nearest airport<input name="editAirport" [(ngModel)]="draft.nearestAirport" /></label>
                    <label>Interpreter language<input name="editLanguage" [(ngModel)]="draft.interpreterLanguage" /></label>
                    <label class="wide">Local transportation<textarea name="editTransport" rows="2" [(ngModel)]="draft.localTransportation"></textarea></label>
                    <label class="wide">Security / protocol notes<textarea name="editSecurity" rows="2" [(ngModel)]="draft.securityNotes"></textarea></label>
                  </div>
                </section>

                <section>
                  <span class="eyebrow">Host commitments</span><h3>Financial and logistical responsibility</h3>
                  <div class="edit-grid">
                    <label>Airfare responsibility<input name="editAirfare" [(ngModel)]="draft.airfareResponsibility" /></label>
                    <label>Lodging responsibility<input name="editLodging" [(ngModel)]="draft.lodgingResponsibility" /></label>
                    <label>Ground responsibility<input name="editGround" [(ngModel)]="draft.groundResponsibility" /></label>
                    <label>Honorarium<input name="editHonorarium" type="number" min="0" [(ngModel)]="draft.honorariumAmount" /></label>
                    <label>Currency<input name="editCurrency" [(ngModel)]="draft.honorariumCurrency" placeholder="USD" /></label>
                    <label>Agreement status<select name="editAgreement" [(ngModel)]="draft.agreementStatus"><option value="not-started">Not started</option><option value="drafting">Drafting</option><option value="sent">Sent</option><option value="signed">Signed</option></select></label>
                    <label>Booking owner<input name="editOwner" [(ngModel)]="draft.owner" /></label>
                  </div>
                </section>
                <footer><button type="button" class="secondary" (click)="cancelEdit()">Cancel</button><button type="submit" class="primary">Save booking details</button></footer>
              </form>
            } @else {
              <div class="detail-body">
                <section class="detail-section">
                  <span class="eyebrow">The invitation</span>
                  <div class="detail-grid">
                    <div><small>Host</small><strong>{{ item.contactName }}</strong></div>
                    <div><small>Requested dates</small><strong>{{ dateRange(item.startDate, item.endDate) }}</strong></div>
                    <div><small>Source</small><strong>{{ sourceLabel(item.source) }}</strong></div>
                    <div><small>Country</small><strong>{{ flagFor(item.country) }} {{ item.country }}</strong></div>
                  </div>
                  @if (manualFor(item); as manual) {
                    <div class="contact-line"><span>{{ manual.contactEmail || 'Email pending' }}</span><span>{{ manual.whatsapp || manual.contactPhone || 'Phone / WhatsApp pending' }}</span><span>{{ manual.timeZone || 'Time zone pending' }}</span></div>
                    @if (manual.alternateDates) { <p class="alternate"><strong>Alternate dates:</strong> {{ manual.alternateDates }}</p> }
                    @if (manual.requestedRole) { <p class="record-note"><strong>Requested ministry:</strong> {{ manual.requestedRole }}</p> }
                  }
                  @if (item.sourceDetail || item.notes) { <p class="record-note">{{ item.sourceDetail || item.notes }}</p> }
                </section>

                @if (manualFor(item); as manual) {
                  <section class="detail-section">
                    <span class="eyebrow">{{ isInternational(item.country) ? 'International readiness' : 'Travel readiness' }}</span>
                    <h3>{{ isInternational(item.country) ? 'Travel and entry considerations' : 'Travel considerations' }}</h3>
                    <div class="check-list">
                      <span [class.done]="manual.passportRequired">{{ manual.passportRequired ? '✓' : '–' }} Passport planning</span>
                      <span [class.attention]="manual.visaRequired">{{ manual.visaRequired ? '!' : '–' }} Visa {{ manual.visaRequired ? 'required / verify' : 'not marked required' }}</span>
                      <span [class.attention]="manual.invitationLetterRequired">{{ manual.invitationLetterRequired ? '!' : '–' }} Invitation letter</span>
                      <span [class.attention]="manual.interpreterNeeded">{{ manual.interpreterNeeded ? '!' : '–' }} Interpreter {{ manual.interpreterLanguage || '' }}</span>
                    </div>
                    <div class="detail-grid compact">
                      <div><small>Nearest airport</small><strong>{{ manual.nearestAirport || 'Not supplied yet' }}</strong></div>
                      <div><small>Local transportation</small><strong>{{ manual.localTransportation || 'Not supplied yet' }}</strong></div>
                      <div><small>Entry notes</small><strong>{{ manual.entryRequirements || 'No additional notes yet' }}</strong></div>
                      <div><small>Security / protocol</small><strong>{{ manual.securityNotes || 'Not supplied yet' }}</strong></div>
                    </div>
                  </section>

                  <section class="detail-section">
                    <span class="eyebrow">Host commitments</span>
                    <h3>Travel, lodging and financial readiness</h3>
                    <div class="detail-grid compact">
                      <div><small>Airfare</small><strong>{{ manual.airfareResponsibility || 'Needs confirmation' }}</strong></div>
                      <div><small>Lodging</small><strong>{{ manual.lodgingResponsibility || 'Needs confirmation' }}</strong></div>
                      <div><small>Ground transport</small><strong>{{ manual.groundResponsibility || 'Needs confirmation' }}</strong></div>
                      <div><small>Honorarium</small><strong>{{ honorarium(manual) }}</strong></div>
                      <div><small>Agreement</small><strong>{{ labelize(manual.agreementStatus) }}</strong></div>
                      <div><small>Owner</small><strong>{{ manual.owner }}</strong></div>
                    </div>
                  </section>
                }

                <section class="detail-section next-step">
                  <span class="eyebrow">Next decision</span>
                  @if (item.kind === 'website') {
                    @if (item.assignmentId) {
                      <h3>This invitation is now an Engagement.</h3><p>Preparation and ministry delivery now belong in the assignment workspace.</p><a class="primary action-link" [href]="'/assignments/' + item.assignmentId">Open engagement</a>
                    } @else {
                      <h3>Continue the formal invitation review.</h3><p>The host already supplied the structured invitation. Use the formal review for communication, approval, or decline.</p><a class="primary action-link" [href]="'/invitations?request=' + item.id">Open formal review</a>
                    }
                  } @else if (item.stage === 'converted' && item.assignmentId) {
                    <h3>This booking is now an Engagement.</h3><p>The original booking remains here for source and relationship history. Delivery now belongs in Engagements.</p><a class="primary action-link" [href]="'/assignments/' + item.assignmentId">Open engagement</a>
                  } @else {
                    <h3>{{ nextStepTitle(item.stage) }}</h3><p>{{ nextStepCopy(item.stage) }}</p>
                    @if (conversionError()) { <p class="conversion-error">{{ conversionError() }}</p> }
                    <div class="stage-actions">
                      @if (item.stage === 'new') { <button type="button" (click)="setManualStage(item, 'needs-information')">Request details</button><button type="button" class="primary" (click)="setManualStage(item, 'under-review')">Begin review</button> }
                      @if (item.stage === 'needs-information') { <button type="button" (click)="recordResponse(item)">Record host response</button><button type="button" class="primary" (click)="setManualStage(item, 'under-review')">Move to review</button> }
                      @if (item.stage === 'under-review') { <button type="button" (click)="setManualStage(item, 'date-hold')">Place 7-day hold</button><button type="button" class="primary" (click)="setManualStage(item, 'approved')">Approve direction</button> }
                      @if (item.stage === 'date-hold') { <button type="button" (click)="setManualStage(item, 'under-review')">Release hold</button><button type="button" class="primary" (click)="setManualStage(item, 'approved')">Approve direction</button> }
                      @if (item.stage === 'approved') { <button type="button" class="primary" [disabled]="converting()" (click)="convertManualBooking(item)">{{ converting() ? 'Creating engagement…' : 'Convert to Engagement' }}</button> }
                      @if (!['declined','converted'].includes(item.stage)) { <button type="button" class="danger" [disabled]="converting()" (click)="setManualStage(item, 'declined')">Decline</button> }
                    </div>
                  }
                </section>
              </div>
            }
          </article>
        }
      </dialog>
    </section>
  `,
  styles: [`
    :host{display:block}.booking-desk{max-width:1320px;margin:0 auto;padding:30px 34px 72px;color:#1d2633}.eyebrow{display:block;color:#936d35;font-size:.61rem;font-weight:900;letter-spacing:.115em;text-transform:uppercase}.desk-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:32px;align-items:end;padding:16px 0 28px;border-bottom:1px solid #dfe2e6}.desk-hero h1{max-width:820px;margin:7px 0 9px;font-size:clamp(2.35rem,5vw,4.45rem);line-height:.98;letter-spacing:-.058em}.desk-hero p{max-width:800px;margin:0;color:#707781;line-height:1.65}.hero-actions{display:flex;gap:8px;align-items:center}.hero-actions a,.hero-actions button,.primary,.secondary,.quiet{min-height:40px;padding:0 14px;border:1px solid #d7dce2;border-radius:8px;background:#fff;color:#2b557f;font:inherit;font-size:.69rem;font-weight:850;text-decoration:none;cursor:pointer}.primary{border-color:#17263a!important;background:#17263a!important;color:#fff!important}.primary:disabled,.stage-actions button:disabled{opacity:.55;cursor:wait}.today-brief,.outlook,.pipeline{margin-top:30px}.section-heading{display:flex;justify-content:space-between;gap:20px;align-items:end}.section-heading h2{margin:4px 0 0;font-size:1.42rem;letter-spacing:-.035em}.section-heading>small,.region-summary{color:#7a8088;font-size:.67rem}.brief-list{margin-top:10px;border-top:1px solid #dfe2e6;border-bottom:1px solid #dfe2e6}.brief-list button{display:grid;width:100%;grid-template-columns:9px 180px minmax(0,1fr) auto;gap:13px;align-items:center;padding:13px 4px;border:0;border-bottom:1px solid #e7e9ec;background:transparent;text-align:left;color:inherit;cursor:pointer}.brief-list button:last-child{border-bottom:0}.brief-list button:hover{background:#f8f7f4}.signal-dot{width:7px;height:28px;border-radius:999px;background:#8290a3}.signal-dot[data-tone='red']{background:#b96458}.signal-dot[data-tone='gold']{background:#b88a45}.signal-dot[data-tone='blue']{background:#4e7299}.signal-dot[data-tone='plum']{background:#745372}.brief-value{display:flex;gap:6px;align-items:baseline}.brief-list strong{font-size:1rem}.brief-list small{color:#69717a;font-size:.67rem}.brief-list em{color:#7d838a;font-size:.68rem;font-style:normal}.brief-list b{color:#365f8c;font-size:.65rem}.travel-timeline{display:flex;gap:0;margin-top:14px;padding:18px;border:1px solid #e0e2e5;border-radius:14px;background:#fbfaf7;overflow:auto}.travel-timeline article{display:grid;grid-template-columns:48px minmax(170px,1fr);min-width:270px}.timeline-rail{display:flex;align-items:center;flex-direction:column}.flag{display:grid;width:38px;height:38px;border:1px solid #dedbd3;border-radius:50%;place-items:center;background:#fff;font-size:1.35rem}.timeline-rail i{width:1px;min-height:74px;flex:1;background:#d8d9dc}.timeline-copy{padding:1px 18px 18px 0}.timeline-copy small{display:block;color:#8a8172;font-size:.6rem;font-weight:800;text-transform:uppercase}.timeline-copy strong{display:block;margin-top:5px;font-size:.88rem}.timeline-copy span{display:block;margin-top:3px;color:#777e87;font-size:.7rem;line-height:1.45}.timeline-copy a{display:inline-block;margin-top:8px;color:#315d8e;font-size:.65rem;font-weight:850;text-decoration:none}.timeline-empty{margin:0;color:#7d838a;font-size:.72rem}.pipeline-heading{align-items:center}.filters{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.filters button{padding:7px 9px;border:1px solid transparent;border-radius:999px;background:transparent;color:#747b84;font-size:.61rem;font-weight:850;cursor:pointer}.filters button.active{border-color:#d7dbe0;background:#fff;color:#263b55}.pipeline-list{margin-top:11px;border:1px solid #dfe2e6;border-radius:12px;overflow:hidden;background:#fff}.booking-row{display:grid;width:100%;grid-template-columns:38px minmax(0,1fr) 150px 100px 16px;gap:12px;align-items:center;padding:14px 16px;border:0;border-bottom:1px solid #e8eaed;background:#fff;text-align:left;color:inherit;cursor:pointer}.booking-row:last-child{border-bottom:0}.booking-row:hover{background:#faf9f6}.country-flag{font-size:1.35rem}.booking-main{display:grid;gap:3px}.booking-main small{color:#92713e;font-size:.58rem;font-weight:900;text-transform:uppercase}.booking-main strong{font-size:.82rem}.booking-main em{color:#777e87;font-size:.66rem;font-style:normal}.booking-date,.booking-signal{display:grid;gap:2px}.booking-date strong,.booking-signal strong{font-size:.72rem}.booking-date small,.booking-signal small{color:#8a9097;font-size:.58rem}.booking-row>b{color:#8b929a;font-size:1.2rem}.empty{padding:34px;text-align:center;color:#7c838c}.quick-dialog,.detail-dialog{padding:0;border:0;background:transparent}.quick-dialog::backdrop,.detail-dialog::backdrop{background:rgba(11,17,26,.44);backdrop-filter:blur(3px)}.quick-dialog{width:min(760px,calc(100vw - 28px));max-width:none}.dialog-shell{overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 30px 100px rgba(10,16,26,.3)}.dialog-shell header,.detail-header{display:flex;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #e1e4e8}.dialog-shell header h2,.detail-header h2{margin:4px 0;font-size:1.55rem}.dialog-shell header p,.detail-header p{margin:0;color:#757c85;font-size:.72rem}.close{width:38px;height:38px;padding:0;border:0;border-radius:50%;background:#f1f2f4;color:#4e5661;font-size:1.15rem;cursor:pointer}.quick-grid,.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.quick-grid{padding:22px 24px}.quick-grid label,.edit-grid label{display:grid;gap:6px;color:#5f6670;font-size:.65rem;font-weight:800}.quick-grid .wide,.edit-grid .wide{grid-column:1/-1}.quick-grid input,.quick-grid select,.quick-grid textarea,.edit-grid input,.edit-grid select,.edit-grid textarea{box-sizing:border-box;width:100%;padding:11px;border:1px solid #d3d8df;border-radius:8px;background:#fbfbfa;color:#202a36;font:inherit}.dialog-shell footer,.edit-form footer{display:flex;justify-content:flex-end;gap:8px;padding:16px 24px;border-top:1px solid #e1e4e8}.detail-dialog{width:min(610px,100vw);max-width:none;height:100dvh;max-height:100dvh;margin:0 0 0 auto}.detail-shell{min-height:100dvh;background:#fff;box-shadow:-20px 0 70px rgba(12,18,28,.2)}.detail-header{position:sticky;top:0;z-index:3;background:#fff}.detail-header-actions{display:flex;gap:8px;align-items:center}.quiet{min-height:36px;color:#4f6174;background:#f7f8f8}.detail-body{padding:0 24px 36px}.conflict-panel{margin:18px 24px 0;padding:13px 15px;border-left:3px solid #c47a43;background:#fff5e9}.conflict-panel strong{font-size:.72rem}.conflict-panel p{margin:5px 0 0;color:#755738;font-size:.67rem;line-height:1.5}.detail-section{padding:20px 0;border-bottom:1px solid #e5e7ea}.detail-section:last-child{border-bottom:0}.detail-section h3,.edit-form h3{margin:5px 0 10px;font-size:1rem}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}.detail-grid div{display:grid;gap:4px;padding:11px;border-radius:9px;background:#f7f7f5}.detail-grid small{color:#858b92;font-size:.58rem;text-transform:uppercase;font-weight:850}.detail-grid strong{font-size:.69rem;line-height:1.45}.contact-line{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;color:#727a84;font-size:.65rem}.alternate{margin:10px 0 0;color:#636b75;font-size:.69rem}.record-note{margin:12px 0 0;padding:12px 14px;border-left:2px solid #b88a45;background:#f8f4ec;color:#606770;font-size:.72rem;line-height:1.6}.check-list{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.check-list span{padding:6px 8px;border-radius:999px;background:#f1f3f4;color:#68717b;font-size:.6rem;font-weight:800}.check-list span.done{background:#eaf4ed;color:#2d6d49}.check-list span.attention{background:#fff0dc;color:#8b611c}.next-step p{color:#737a83;font-size:.72rem;line-height:1.6}.stage-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.stage-actions button,.action-link{min-height:39px;padding:0 12px;border:1px solid #d4d9df;border-radius:8px;background:#fff;color:#315b87;font-size:.65rem;font-weight:850;cursor:pointer}.danger{color:#9c4846!important;border-color:#e3c4c2!important}.action-link{display:inline-flex;align-items:center;text-decoration:none}.conversion-error{padding:10px 12px;border-radius:8px;background:#fff0ee!important;color:#954b45!important}.edit-form{padding:0 24px 32px}.edit-form>section{padding:20px 0;border-bottom:1px solid #e5e7ea}.toggle-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 14px}.toggle-grid label{display:flex;gap:8px;align-items:center;padding:10px;border-radius:8px;background:#f7f7f5;color:#58616c;font-size:.65rem;font-weight:800}.edit-form footer{margin:0 -24px -32px}.region-summary{max-width:520px;text-align:right}.secondary{color:#536071!important}@media(max-width:850px){.desk-hero{grid-template-columns:1fr}.hero-actions{justify-content:flex-start}.brief-list button{grid-template-columns:8px 140px 1fr}.brief-list b{display:none}.booking-row{grid-template-columns:36px 1fr 80px 12px}.booking-signal{display:none}.pipeline-heading{display:grid}.filters{justify-content:flex-start;margin-top:9px}.region-summary{display:none}}@media(max-width:600px){.booking-desk{padding:22px 16px 58px}.brief-list button{grid-template-columns:8px 1fr}.brief-list em{display:none}.booking-row{grid-template-columns:30px 1fr 12px}.booking-date{display:none}.quick-grid,.edit-grid,.detail-grid,.toggle-grid{grid-template-columns:1fr}.quick-grid .wide,.edit-grid .wide{grid-column:auto}.hero-actions{display:grid}.travel-timeline article{min-width:240px}.detail-header-actions .quiet{display:none}}
  `],
})
export class CtgBookingDeskComponent implements OnInit {
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly assignments = signal<readonly EngagementSummary[]>([]);
  readonly activeFilter = signal<DeskFilter>('needs-me');
  readonly selected = signal<BookingDeskItem | null>(null);
  readonly editing = signal(false);
  readonly editDraft = signal<ManualBookingRecord | null>(null);
  readonly converting = signal(false);
  readonly conversionError = signal('');

  readonly filters: { id: DeskFilter; label: string }[] = [
    { id: 'needs-me', label: 'Needs me' },
    { id: 'new', label: 'New' },
    { id: 'needs-information', label: 'Needs info' },
    { id: 'under-review', label: 'Review' },
    { id: 'date-hold', label: 'Date holds' },
    { id: 'approved', label: 'Approved' },
    { id: 'all', label: 'All' },
  ];

  quick = this.blankQuick();

  readonly allBookings = computed<BookingDeskItem[]>(() => {
    const manual = this.state.bookings().map(item => this.fromManual(item));
    const website = this.requests().map(item => this.fromWebsite(item));
    return [...manual, ...website].sort((a, b) => this.priority(a) - this.priority(b) || a.startDate.localeCompare(b.startDate));
  });
  readonly activeCount = computed(() => this.allBookings().filter(item => !['declined', 'converted'].includes(item.stage)).length);
  readonly newCount = computed(() => this.allBookings().filter(item => item.stage === 'new').length);
  readonly needsInfoCount = computed(() => this.allBookings().filter(item => item.stage === 'needs-information').length);
  readonly internationalCount = computed(() => this.allBookings().filter(item => !['declined','converted'].includes(item.stage) && this.isInternational(item.country)).length);
  readonly expiringHoldCount = computed(() => this.allBookings().filter(item => item.stage === 'date-hold' && this.expiresWithinDays(item.holdExpiresAtUtc, 7)).length);
  readonly stalledCount = computed(() => this.allBookings().filter(item => !['declined','converted'].includes(item.stage) && this.daysSince(item.updatedAtUtc) >= 5).length);

  readonly briefSignals = computed(() => [
    { value: this.newCount(), label: 'new invitations', detail: 'Requests that have not entered review yet.', filter: 'new' as DeskFilter, tone: 'blue' },
    { value: this.needsInfoCount(), label: 'waiting on host information', detail: 'Follow up before discernment can move forward.', filter: 'needs-information' as DeskFilter, tone: 'gold' },
    { value: this.expiringHoldCount(), label: 'date holds expire this week', detail: 'Release or confirm dates before they quietly lapse.', filter: 'date-hold' as DeskFilter, tone: 'red' },
    { value: this.internationalCount(), label: 'international opportunities active', detail: `${this.stalledCount()} active request${this.stalledCount() === 1 ? '' : 's'} with no activity for 5+ days.`, filter: 'needs-me' as DeskFilter, tone: 'plum' },
  ]);

  readonly filteredBookings = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'all') return this.allBookings();
    if (filter === 'needs-me') return this.allBookings().filter(item =>
      ['new', 'needs-information', 'under-review'].includes(item.stage) ||
      (item.stage === 'date-hold' && this.expiresWithinDays(item.holdExpiresAtUtc, 7)) ||
      this.daysSince(item.updatedAtUtc) >= 5,
    );
    return this.allBookings().filter(item => item.stage === filter);
  });

  readonly timeline = computed<TimelineItem[]>(() => {
    const assignments: TimelineItem[] = this.assignments()
      .filter(item => !!item.startsAtUtc && item.status !== 'completed')
      .map(item => {
        const country = this.countryFromLocation(item.location || '');
        return { id: `assignment-${item.id}`, flag: this.flagFor(country), location: item.location || 'Location pending', title: item.title, date: this.compactDate(item.startsAtUtc || ''), sortDate: item.startsAtUtc || '', status: item.readinessPercent >= 80 ? 'Confirmed' : `${item.readinessPercent}% ready`, href: `/assignments/${item.id}` };
      });
    const protectedDates: TimelineItem[] = this.state.bookings()
      .filter(item => ['date-hold', 'approved'].includes(item.stage) && !!item.requestedStartDate && !this.assignmentForManual(item.id))
      .map(item => ({ id: `booking-${item.id}`, flag: this.flagFor(item.country), location: [item.city, item.country].filter(Boolean).join(', '), title: item.eventName, date: this.compactDate(item.requestedStartDate), sortDate: item.requestedStartDate, status: item.stage === 'date-hold' ? 'Date hold' : 'Approved direction' }));
    return [...assignments, ...protectedDates].sort((a, b) => a.sortDate.localeCompare(b.sortDate)).slice(0, 7);
  });

  readonly regionSummary = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.allBookings().filter(item => !['declined','converted'].includes(item.stage))) {
      const region = this.worldRegion(item.country);
      counts.set(region, (counts.get(region) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => `${name} ${count}`).join(' · ');
  });

  constructor(readonly state: CtgBookingDeskStateService, private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    this.api.getRequests().subscribe({ next: items => this.requests.set(items), error: () => this.requests.set([]) });
    this.refreshAssignments();
  }

  setFilter(filter: DeskFilter): void { this.activeFilter.set(filter); }

  openBooking(item: BookingDeskItem, dialog: HTMLDialogElement): void {
    this.selected.set(item); this.editing.set(false); this.editDraft.set(null); this.conversionError.set(''); dialog.showModal();
  }

  closeDetail(): void { this.selected.set(null); this.editing.set(false); this.editDraft.set(null); this.conversionError.set(''); }

  saveQuickBooking(dialog: HTMLDialogElement): void {
    if (!this.quick.hostName.trim() || !this.quick.city.trim() || !this.quick.country.trim() || !this.quick.eventName.trim()) return;
    this.state.add({ hostName: this.quick.hostName.trim(), hostOrganization: this.quick.hostOrganization.trim(), eventName: this.quick.eventName.trim(), eventType: this.quick.eventType.trim() || 'Ministry invitation', city: this.quick.city.trim(), region: '', country: this.quick.country.trim(), requestedStartDate: this.quick.requestedStartDate, requestedEndDate: this.quick.requestedEndDate || this.quick.requestedStartDate, source: this.quick.source, sourceDetail: this.quick.notes.trim(), contactEmail: this.quick.contactEmail.trim(), contactPhone: this.quick.contactPhone.trim(), notes: this.quick.notes.trim() });
    this.quick = this.blankQuick(); this.activeFilter.set('new'); dialog.close();
  }

  beginEdit(manual: ManualBookingRecord): void { this.editDraft.set({ ...manual }); this.editing.set(true); }
  cancelEdit(): void { this.editing.set(false); this.editDraft.set(null); }
  saveEdit(): void {
    const draft = this.editDraft(); if (!draft) return;
    this.state.update(draft.id, { ...draft });
    const updated = this.state.bookings().find(record => record.id === draft.id);
    if (updated) this.selected.set(this.fromManual(updated));
    this.cancelEdit();
  }

  setManualStage(item: BookingDeskItem, stage: BookingStage): void {
    if (item.kind !== 'manual') return;
    this.state.setStage(item.id, stage);
    const updated = this.state.bookings().find(record => record.id === item.id);
    if (updated) this.selected.set(this.fromManual(updated));
  }

  recordResponse(item: BookingDeskItem): void {
    if (item.kind !== 'manual') return;
    this.state.touchResponse(item.id);
    const updated = this.state.bookings().find(record => record.id === item.id);
    if (updated) this.selected.set(this.fromManual(updated));
  }

  convertManualBooking(item: BookingDeskItem): void {
    if (item.kind !== 'manual' || this.converting()) return;
    const manual = this.manualFor(item); if (!manual) return;
    const existing = this.assignmentForManual(manual.id);
    if (existing) { this.finishConversion(manual.id, existing.id); return; }

    this.converting.set(true); this.conversionError.set('');
    this.api.createAssignment({
      externalAssignmentId: `ctg-manual-${manual.id}`,
      title: manual.eventName,
      speakerName: 'Apostle Cynthia Thompson',
      hostOrganization: manual.hostOrganization || manual.hostName,
      startsAtUtc: this.dateUtc(manual.requestedStartDate),
      endsAtUtc: this.dateUtc(manual.requestedEndDate || manual.requestedStartDate),
      location: [manual.city, manual.region, manual.country].filter(Boolean).join(', '),
    }).subscribe({
      next: created => this.seedPreparationTasks(manual, created.summary.id),
      error: error => {
        if (error?.status === 409) {
          this.api.getAssignments().subscribe({ next: assignments => {
            this.assignments.set(assignments);
            const found = this.assignmentForManual(manual.id);
            if (found) this.finishConversion(manual.id, found.id);
            else { this.converting.set(false); this.conversionError.set('This booking appears to have an Engagement already, but ApostolOS could not resolve it.'); }
          }, error: () => { this.converting.set(false); this.conversionError.set('This booking already has an Engagement, but it could not be loaded.'); } });
          return;
        }
        this.converting.set(false); this.conversionError.set('ApostolOS could not create the Engagement. Try again.');
      },
    });
  }

  manualFor(item: BookingDeskItem): ManualBookingRecord | null { return item.kind === 'manual' ? this.state.bookings().find(record => record.id === item.id) ?? null : null; }

  conflictMessages(item: BookingDeskItem): string[] {
    if (!item.startDate) return [];
    const start = this.toDay(item.startDate), end = this.toDay(item.endDate || item.startDate);
    if (start === null || end === null) return [];
    const messages: string[] = [];
    for (const assignment of this.assignments()) {
      if (!assignment.startsAtUtc || assignment.status === 'completed' || assignment.id === item.assignmentId) continue;
      const day = this.toDay(assignment.startsAtUtc); if (day === null) continue;
      if (day >= start && day <= end) messages.push(`${assignment.title} is already on the calendar during these requested dates.`);
      else { const spacing = Math.min(Math.abs(day - end), Math.abs(start - day)); if (spacing <= 2) messages.push(`${assignment.title} leaves only ${spacing} travel/recovery day(s) around this request.`); }
    }
    for (const other of this.state.bookings()) {
      if (other.id === item.id || !['date-hold','approved'].includes(other.stage) || !other.requestedStartDate) continue;
      const otherStart = this.toDay(other.requestedStartDate), otherEnd = this.toDay(other.requestedEndDate || other.requestedStartDate);
      if (otherStart !== null && otherEnd !== null && otherStart <= end && otherEnd >= start) messages.push(`${other.eventName} in ${other.city} is holding overlapping dates.`);
    }
    return [...new Set(messages)].slice(0, 3);
  }

  location(item: BookingDeskItem): string { return [item.city, item.region, item.country].filter(Boolean).join(', '); }
  isInternational(country: string): boolean { return !['united states','united states of america','usa','us','u.s.'].includes((country || '').trim().toLowerCase()); }
  compactDate(value: string): string { if (!value) return 'Date pending'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Date pending' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  dateRange(start: string, end: string): string { return !end || start === end ? this.compactDate(start) : `${this.compactDate(start)} – ${this.compactDate(end)}`; }
  ageLabel(value: string): string { const days = this.daysSince(value); return days === 0 ? 'Today' : `${days}d ago`; }
  stageLabel(stage: BookingStage): string { return ({ new: 'New', 'needs-information': 'Needs information', 'under-review': 'Under review', 'date-hold': 'Date hold', approved: 'Approved', declined: 'Declined', converted: 'Converted' } as Record<BookingStage,string>)[stage]; }
  sourceLabel(source: BookingSource): string { return ({ website: 'Website form', email: 'Email', referral: 'Pastor / ministry referral', phone: 'Phone', whatsapp: 'WhatsApp / text', social: 'Social media', 'apostle-cynthia': 'Apostle Cynthia', 'team-member': 'Team member', 'returning-host': 'Returning host', other: 'Other' } as Record<BookingSource,string>)[source]; }
  labelize(value: string): string { return (value || 'Not supplied').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  honorarium(item: ManualBookingRecord): string { return item.honorariumAmount ? `${item.honorariumCurrency || 'USD'} ${item.honorariumAmount.toLocaleString()}` : 'Needs confirmation'; }
  nextStepTitle(stage: BookingStage): string { return ({ new: 'Get enough information to discern the request.', 'needs-information': 'Keep the request visible while the host responds.', 'under-review': 'Discern the assignment and protect the calendar.', 'date-hold': 'Confirm or release the dates before the hold expires.', approved: 'Move the approved ministry into formal engagement preparation.', declined: 'This opportunity has been closed.', converted: 'This booking has moved into engagement delivery.' } as Record<BookingStage,string>)[stage]; }
  nextStepCopy(stage: BookingStage): string { return ({ new: 'Capture the relationship first, then request only the missing details.', 'needs-information': 'The booking stays in the daily desk until the host supplies what CTG needs.', 'under-review': 'Use calendar warnings, host commitments, and international requirements before deciding.', 'date-hold': 'A temporary hold protects the opportunity without treating it as confirmed ministry.', approved: 'The direction is approved. Convert it once so Engagements can own preparation and delivery.', declined: 'The record remains available for relationship history.', converted: 'Engagements now owns travel, itinerary, preparation, ministry delivery, and closeout.' } as Record<BookingStage,string>)[stage]; }

  flagFor(country: string): string {
    const key = (country || '').trim().toLowerCase();
    const flags: Record<string,string> = { 'united states': '🇺🇸', 'united states of america': '🇺🇸', usa: '🇺🇸', us: '🇺🇸', nigeria: '🇳🇬', 'united kingdom': '🇬🇧', england: '🇬🇧', jamaica: '🇯🇲', ghana: '🇬🇭', kenya: '🇰🇪', 'south africa': '🇿🇦', canada: '🇨🇦', bahamas: '🇧🇸', 'trinidad and tobago': '🇹🇹', brazil: '🇧🇷', france: '🇫🇷', germany: '🇩🇪', australia: '🇦🇺' };
    return flags[key] ?? '🌍';
  }

  private seedPreparationTasks(manual: ManualBookingRecord, assignmentId: string): void {
    const tasks: CreateEngagementTaskInput[] = [
      { category: 'host', title: 'Confirm formal host contact and event details', owner: 'CTG Administration', detail: [`Host: ${manual.hostName}`, manual.contactEmail && `Email: ${manual.contactEmail}`, (manual.whatsapp || manual.contactPhone) && `Phone/WhatsApp: ${manual.whatsapp || manual.contactPhone}`, manual.sourceDetail || manual.notes].filter(Boolean).join(' · '), dueAtUtc: null },
      { category: 'travel', title: 'Begin travel readiness', owner: 'Engagement Coordinator', detail: [manual.nearestAirport && `Nearest airport: ${manual.nearestAirport}`, manual.timeZone && `Timezone: ${manual.timeZone}`].filter(Boolean).join(' · ') || null, dueAtUtc: null },
      ...(this.isInternational(manual.country) ? [{ category: 'documents', title: 'Verify international entry documents', owner: 'Engagement Coordinator', detail: manual.entryRequirements || 'Verify passport validity, visa, invitation-letter, and current entry requirements.', dueAtUtc: null } satisfies CreateEngagementTaskInput] : []),
      { category: 'transportation', title: 'Confirm local ground transportation', owner: 'Host Coordinator', detail: manual.localTransportation || null, dueAtUtc: null },
      { category: 'agreement', title: 'Confirm honorarium, agreement, and financial commitments', owner: 'CTG Administration', detail: [manual.airfareResponsibility && `Airfare: ${manual.airfareResponsibility}`, manual.lodgingResponsibility && `Lodging: ${manual.lodgingResponsibility}`, manual.groundResponsibility && `Ground: ${manual.groundResponsibility}`, manual.honorariumAmount && `Honorarium: ${manual.honorariumCurrency || 'USD'} ${manual.honorariumAmount}`, `Agreement: ${this.labelize(manual.agreementStatus)}`].filter(Boolean).join(' · '), dueAtUtc: null },
    ];
    forkJoin(tasks.map(task => this.api.addAssignmentTask(assignmentId, task))).subscribe({ next: () => this.finishConversion(manual.id, assignmentId), error: () => this.finishConversion(manual.id, assignmentId) });
  }

  private finishConversion(bookingId: string, assignmentId: string): void {
    this.state.setStage(bookingId, 'converted'); this.converting.set(false); this.conversionError.set('');
    window.location.assign(`/assignments/${assignmentId}`);
  }

  private refreshAssignments(): void { this.api.getAssignments().subscribe({ next: items => this.assignments.set(items), error: () => this.assignments.set([]) }); }
  private assignmentForManual(id: string): EngagementSummary | undefined { return this.assignments().find(item => item.externalAssignmentId === `ctg-manual-${id}`); }

  private fromManual(item: ManualBookingRecord): BookingDeskItem {
    const assignment = this.assignmentForManual(item.id);
    return { key: `manual-${item.id}`, kind: 'manual', id: item.id, eventName: item.eventName, eventType: item.eventType, hostOrganization: item.hostOrganization || item.hostName, contactName: item.hostName, city: item.city, region: item.region, country: item.country, startDate: item.requestedStartDate, endDate: item.requestedEndDate, source: item.source, sourceDetail: item.sourceDetail, stage: assignment ? 'converted' : item.stage, readiness: null, updatedAtUtc: item.updatedAtUtc, holdExpiresAtUtc: item.holdExpiresAtUtc, assignmentId: assignment?.id ?? null, notes: item.notes };
  }

  private fromWebsite(item: SpeakingRequestDetails): BookingDeskItem {
    return { key: `website-${item.id}`, kind: 'website', id: item.id, eventName: item.eventName, eventType: item.eventType, hostOrganization: item.organizationName, contactName: item.contactName, city: item.city, region: item.region || item.state || '', country: item.country || 'United States', startDate: item.startDate, endDate: item.endDate, source: 'website', sourceDetail: item.ministryRequest, stage: this.websiteStage(item), readiness: item.readinessPercentage, updatedAtUtc: item.updatedAtUtc, holdExpiresAtUtc: null, assignmentId: item.assignmentId, notes: item.ministryRequest };
  }

  private websiteStage(item: SpeakingRequestDetails): BookingStage {
    if (item.status === 'approved') return item.assignmentId ? 'converted' : 'approved';
    if (item.status === 'declined') return 'declined';
    if (item.status === 'information-needed') return 'needs-information';
    if (item.status === 'submitted' || item.status === 'new') return 'new';
    return 'under-review';
  }

  private priority(item: BookingDeskItem): number { return ({ new: 0, 'needs-information': 1, 'date-hold': 2, 'under-review': 3, approved: 4, converted: 5, declined: 6 } as Record<BookingStage,number>)[item.stage]; }
  private blankQuick() { return { hostName: '', hostOrganization: '', city: '', country: '', requestedStartDate: '', requestedEndDate: '', eventName: '', eventType: '', source: 'apostle-cynthia' as BookingSource, contactEmail: '', contactPhone: '', notes: '' }; }
  private dateUtc(value: string): string | null { return value ? `${value}T12:00:00Z` : null; }
  private expiresWithinDays(value: string | null, days: number): boolean { if (!value) return false; const time = new Date(value).getTime(); return time >= Date.now() && time <= Date.now() + days * 86400000; }
  private daysSince(value: string): number { const time = new Date(value).getTime(); return Number.isFinite(time) ? Math.max(0, Math.floor((Date.now() - time) / 86400000)) : 0; }
  private toDay(value: string): number | null { if (!value) return null; const time = new Date(value).getTime(); return Number.isNaN(time) ? null : Math.floor(time / 86400000); }
  private countryFromLocation(location: string): string { const text = location.toLowerCase(); if (text.includes('lagos') || text.includes('nigeria')) return 'Nigeria'; if (text.includes('london') || text.includes('united kingdom')) return 'United Kingdom'; if (text.includes('kingston') || text.includes('jamaica')) return 'Jamaica'; if (text.includes('johannesburg') || text.includes('south africa')) return 'South Africa'; if (text.includes('accra') || text.includes('ghana')) return 'Ghana'; return 'United States'; }
  private worldRegion(country: string): string { const key = (country || '').toLowerCase(); if (['nigeria','ghana','kenya','south africa'].some(value => key.includes(value))) return 'Africa'; if (['united kingdom','england','france','germany'].some(value => key.includes(value))) return 'Europe'; if (['jamaica','bahamas','trinidad'].some(value => key.includes(value))) return 'Caribbean'; if (key.includes('brazil')) return 'South America'; return 'North America'; }
}
