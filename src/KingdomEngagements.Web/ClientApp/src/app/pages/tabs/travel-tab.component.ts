import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EngagementsApiService } from '../../core/engagements-api.service';
import {
  AssignmentWorkspaceDetails,
  HostCoordinationDetails,
} from '../../core/models';

@Component({
  selector: 'app-travel-tab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="travel-workspace">
      <header>
        <div>
          <p>Preparation · Travel</p>
          <h2>Travel itinerary</h2>
          <span>Keep flights, lodging and local transportation together in the assignment record.</span>
        </div>
      </header>

      @if (message()) { <div class="message">{{ message() }}</div> }
      @if (error()) { <div class="message error">{{ error() }}</div> }

      <div class="trip-grid">
        <section>
          <div class="section-title"><span>01</span><div><strong>Outbound</strong><small>Arrival into the assignment city</small></div></div>
          <div class="fields">
            <label><span>Airline</span><input [(ngModel)]="draft.outboundAirline" /></label>
            <label><span>Flight number</span><input [(ngModel)]="draft.outboundFlightNumber" /></label>
            <label><span>Confirmation</span><input [(ngModel)]="draft.outboundConfirmationNumber" /></label>
            <label><span>Departure airport</span><input [(ngModel)]="draft.outboundDepartureAirport" /></label>
            <label><span>Arrival airport</span><input [(ngModel)]="draft.outboundArrivalAirport" /></label>
            <label><span>Departs</span><input type="datetime-local" [ngModel]="localDate(draft.outboundDepartsAtUtc)" (ngModelChange)="draft.outboundDepartsAtUtc = utcDate($event)" /></label>
            <label><span>Arrives</span><input type="datetime-local" [ngModel]="localDate(draft.outboundArrivesAtUtc)" (ngModelChange)="draft.outboundArrivesAtUtc = utcDate($event)" /></label>
          </div>
        </section>

        <section>
          <div class="section-title"><span>02</span><div><strong>Return</strong><small>Departure after ministry</small></div></div>
          <div class="fields">
            <label><span>Airline</span><input [(ngModel)]="draft.returnAirline" /></label>
            <label><span>Flight number</span><input [(ngModel)]="draft.returnFlightNumber" /></label>
            <label><span>Confirmation</span><input [(ngModel)]="draft.returnConfirmationNumber" /></label>
            <label><span>Departure airport</span><input [(ngModel)]="draft.returnDepartureAirport" /></label>
            <label><span>Arrival airport</span><input [(ngModel)]="draft.returnArrivalAirport" /></label>
            <label><span>Departs</span><input type="datetime-local" [ngModel]="localDate(draft.returnDepartsAtUtc)" (ngModelChange)="draft.returnDepartsAtUtc = utcDate($event)" /></label>
            <label><span>Arrives</span><input type="datetime-local" [ngModel]="localDate(draft.returnArrivesAtUtc)" (ngModelChange)="draft.returnArrivesAtUtc = utcDate($event)" /></label>
          </div>
        </section>

        <section>
          <div class="section-title"><span>03</span><div><strong>Lodging</strong><small>Stay and confirmation details</small></div></div>
          <div class="fields">
            <label><span>Hotel</span><input [(ngModel)]="draft.hotelName" /></label>
            <label class="wide"><span>Address</span><input [(ngModel)]="draft.hotelAddress" /></label>
            <label><span>Confirmation</span><input [(ngModel)]="draft.hotelConfirmationNumber" /></label>
            <label><span>Check in</span><input type="datetime-local" [ngModel]="localDate(draft.hotelCheckInAtUtc)" (ngModelChange)="draft.hotelCheckInAtUtc = utcDate($event)" /></label>
            <label><span>Check out</span><input type="datetime-local" [ngModel]="localDate(draft.hotelCheckOutAtUtc)" (ngModelChange)="draft.hotelCheckOutAtUtc = utcDate($event)" /></label>
          </div>
        </section>

        <section>
          <div class="section-title"><span>04</span><div><strong>Local transportation</strong><small>Ground plan and accountable pickup contact</small></div></div>
          <div class="fields">
            <label class="wide"><span>Transportation plan</span><textarea rows="4" [(ngModel)]="draft.transportationPlan"></textarea></label>
            <label><span>Pickup contact</span><input [(ngModel)]="draft.pickupContactName" /></label>
            <label><span>Pickup phone</span><input [(ngModel)]="draft.pickupContactPhone" /></label>
          </div>
        </section>
      </div>

      <div class="save-dock" role="region" aria-label="Travel save actions">
        <div>
          <strong>Travel coordination</strong>
          <span>Save flights, lodging and local transportation together.</span>
        </div>
        <button type="button" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save travel' }}</button>
      </div>
    </section>
  `,
  styles: [`
    .travel-workspace{position:relative;margin-top:1rem;padding-bottom:5.5rem;border:1px solid var(--eng-line);border-radius:9px;background:var(--eng-surface);overflow:visible}
    header{display:flex;justify-content:space-between;gap:1rem;padding:1.25rem 1.4rem;border-bottom:1px solid var(--eng-line)}
    header p{margin:0 0 .35rem;color:var(--eng-blue);font-size:.7rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    header h2{margin:0;font-size:1.55rem} header span{display:block;margin-top:.3rem;color:var(--eng-muted);font-size:.78rem}
    .message{padding:.7rem 1.4rem;color:#25684d;background:#edf7f1;font-size:.75rem;font-weight:750}.message.error{color:var(--eng-danger);background:#fff0ef}
    .trip-grid{display:grid;grid-template-columns:1fr 1fr}
    .trip-grid>section{padding:1.2rem 1.3rem;border-right:1px solid var(--eng-line);border-bottom:1px solid var(--eng-line)}
    .trip-grid>section:nth-child(2n){border-right:0}.trip-grid>section:nth-last-child(-n+2){border-bottom:0}
    .section-title{display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem}.section-title>span{display:grid;width:30px;height:30px;place-items:center;border-radius:50%;color:#6554b9;background:#efecfb;font-size:.65rem;font-weight:900}
    .section-title strong,.section-title small{display:block}.section-title strong{font-size:.92rem}.section-title small{margin-top:.1rem;color:var(--eng-muted);font-size:.66rem}
    .fields{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}.fields label{display:grid;gap:.3rem}.fields label.wide{grid-column:1/-1}.fields label>span{font-size:.65rem;font-weight:800;color:#596476}
    input,textarea{width:100%;padding:.62rem .68rem;border:1px solid #ccd2db;border-radius:7px;color:var(--eng-ink);background:#fff}textarea{resize:vertical}
    .save-dock{position:sticky;bottom:.8rem;z-index:15;display:flex;align-items:center;justify-content:space-between;gap:1rem;width:calc(100% - 2rem);margin:1rem 1rem -4.65rem;padding:.8rem .9rem;border:1px solid rgba(18,26,44,.12);border-radius:9px;background:rgba(255,253,250,.96);box-shadow:0 12px 36px rgba(18,26,44,.13);backdrop-filter:blur(14px)}.save-dock strong,.save-dock span{display:block}.save-dock strong{font-size:.72rem}.save-dock span{margin-top:.12rem;color:var(--eng-muted);font-size:.62rem}.save-dock button{min-height:42px;padding:.58rem .9rem;border:0;border-radius:7px;color:#fff;background:var(--eng-ink);font-size:.72rem;font-weight:850;cursor:pointer}.save-dock button:disabled{opacity:.55;cursor:wait}
    @media(max-width:900px){.trip-grid{grid-template-columns:1fr}.trip-grid>section{border-right:0}.trip-grid>section:nth-last-child(-n+2){border-bottom:1px solid var(--eng-line)}.trip-grid>section:last-child{border-bottom:0}}
    @media(max-width:560px){.fields{grid-template-columns:1fr}.fields label.wide{grid-column:auto}header{display:grid}.save-dock{display:grid;bottom:.5rem}.save-dock button{width:100%}}
  `],
})
export class TravelTabComponent {
  private _workspace!: AssignmentWorkspaceDetails;
  draft!: HostCoordinationDetails;
  @Input({ required: true })
  set workspace(value: AssignmentWorkspaceDetails) {
    this._workspace = value;
    this.draft = this.clone(value.preparation.coordination);
  }
  get workspace(): AssignmentWorkspaceDetails { return this._workspace; }
  @Output() workspaceUpdated = new EventEmitter<AssignmentWorkspaceDetails>();
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor(private readonly api: EngagementsApiService) {}

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.api.saveCoordination(this.workspace.preparation.assignmentId, this.draft).subscribe({
      next: (updated) => {
        this.workspaceUpdated.emit(updated);
        this.message.set('Travel, lodging and transportation saved.');
        this.saving.set(false);
      },
      error: () => {
        this.error.set('Travel details could not be saved.');
        this.saving.set(false);
      },
    });
  }

  localDate(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  utcDate(value: string): string | null {
    return value ? new Date(value).toISOString() : null;
  }

  private clone(value: HostCoordinationDetails): HostCoordinationDetails {
    return {
      ...value,
      schedule: value.schedule.map((item) => ({ ...item })),
      contacts: value.contacts.map((item) => ({ ...item })),
      documents: [...value.documents],
    };
  }
}
