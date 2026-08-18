import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EngagementsApiService } from '../../core/engagements-api.service';
import {
  AssignmentWorkspaceDetails,
  HostContact,
  HostCoordinationDetails,
  HostScheduleItem,
} from '../../core/models';

@Component({
  selector: 'app-contacts-tab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="contacts-workspace">
      <header>
        <div>
          <p>Preparation · Contacts</p>
          <h2>People and host preparation</h2>
          <span>Keep the people, event schedule, prayer focus, and host notes attached to the assignment.</span>
        </div>
        <button type="button" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save coordination' }}</button>
      </header>

      @if (message()) { <div class="message">{{ message() }}</div> }
      @if (error()) { <div class="message error">{{ error() }}</div> }

      <section class="work-section">
        <div class="section-heading">
          <div><p>Host contacts</p><h3>Who is responsible?</h3></div>
          <button type="button" (click)="addContact()">＋ Add contact</button>
        </div>
        <div class="contact-list">
          @for (contact of draft.contacts; track $index; let index = $index) {
            <article>
              <label><span>Role</span><select [(ngModel)]="contact.type"><option value="primary">Primary</option><option value="host">Host</option><option value="travel">Travel</option><option value="media">Media</option><option value="emergency">Emergency</option></select></label>
              <label><span>Name</span><input [(ngModel)]="contact.name" /></label>
              <label><span>Email</span><input type="email" [(ngModel)]="contact.email" /></label>
              <label><span>Phone</span><input [(ngModel)]="contact.phone" /></label>
              <button type="button" class="remove" aria-label="Remove contact" (click)="removeContact(index)">×</button>
            </article>
          }
        </div>
      </section>

      <section class="work-section">
        <div class="section-heading">
          <div><p>Event schedule</p><h3>What happens when?</h3></div>
          <button type="button" (click)="addScheduleItem()">＋ Add schedule item</button>
        </div>
        @if (draft.schedule.length === 0) {
          <div class="empty">No event schedule has been added yet.</div>
        } @else {
          <div class="schedule-list">
            @for (item of draft.schedule; track $index; let index = $index) {
              <article>
                <label class="title"><span>Title</span><input [(ngModel)]="item.title" /></label>
                <label><span>Date</span><input type="date" [(ngModel)]="item.date" /></label>
                <label><span>Start</span><input type="time" [(ngModel)]="item.startsAt" /></label>
                <label><span>End</span><input type="time" [(ngModel)]="item.endsAt" /></label>
                <label class="location"><span>Location</span><input [(ngModel)]="item.location" /></label>
                <label class="notes"><span>Notes</span><input [(ngModel)]="item.notes" /></label>
                <button type="button" class="remove" aria-label="Remove schedule item" (click)="removeScheduleItem(index)">×</button>
              </article>
            }
          </div>
        }
      </section>

      <section class="context-grid">
        <label><span>Prayer focus</span><textarea rows="5" [(ngModel)]="draft.prayerFocus" placeholder="What should the ministry team carry in prayer?"></textarea></label>
        <label><span>Promotion requirements</span><textarea rows="5" [(ngModel)]="draft.promotionRequirements" placeholder="Approved photos, graphics, deadlines, naming, or media needs"></textarea></label>
        <label class="wide"><span>Host notes</span><textarea rows="4" [(ngModel)]="draft.hostNotes" placeholder="Internal coordination context for this assignment"></textarea></label>
      </section>
    </section>
  `,
  styles: [`
    .contacts-workspace{margin-top:1rem;border:1px solid var(--eng-line);border-radius:12px;background:var(--eng-surface);overflow:hidden}
    header{display:flex;justify-content:space-between;gap:1rem;padding:1.25rem 1.4rem;border-bottom:1px solid var(--eng-line)}
    header p,.section-heading p{margin:0 0 .3rem;color:var(--eng-blue);font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    header h2{margin:0;font-size:1.55rem}header span{display:block;margin-top:.3rem;color:var(--eng-muted);font-size:.76rem}
    header button,.section-heading button{align-self:start;min-height:38px;padding:.55rem .75rem;border:1px solid var(--eng-line);border-radius:7px;color:var(--eng-ink);background:#fff;font-weight:800;cursor:pointer}
    header>button{color:#fff;border-color:transparent;background:var(--eng-ink)}
    .message{padding:.7rem 1.4rem;color:#25684d;background:#edf7f1;font-size:.75rem;font-weight:750}.message.error{color:var(--eng-danger);background:#fff0ef}
    .work-section{padding:1.2rem 1.3rem;border-bottom:1px solid var(--eng-line)}
    .section-heading{display:flex;align-items:start;justify-content:space-between;gap:1rem;margin-bottom:.8rem}.section-heading h3{margin:0;font-size:1.05rem}
    .contact-list,.schedule-list{display:grid;gap:.5rem}.contact-list article{display:grid;grid-template-columns:120px 1fr 1fr 150px 34px;gap:.55rem;align-items:end;padding:.7rem;border:1px solid rgba(18,26,44,.09);border-radius:8px;background:#fbfaf8}
    label{display:grid;gap:.28rem}label>span{color:#596476;font-size:.63rem;font-weight:800}input,select,textarea{width:100%;padding:.58rem .62rem;border:1px solid #ccd2db;border-radius:7px;background:#fff;color:var(--eng-ink)}textarea{resize:vertical}
    .remove{display:grid;width:32px;height:32px;place-items:center;border:1px solid #e2c2c0;border-radius:7px;color:#a34843;background:#fff;cursor:pointer;font-size:1rem}
    .schedule-list article{display:grid;grid-template-columns:minmax(180px,1.1fr) 130px 100px 100px minmax(160px,.8fr) minmax(180px,1fr) 34px;gap:.5rem;align-items:end;padding:.7rem;border-bottom:1px solid rgba(18,26,44,.08)}
    .empty{padding:1rem;color:var(--eng-muted);text-align:center;background:#faf9f7;border-radius:8px}
    .context-grid{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;padding:1.2rem 1.3rem}.context-grid .wide{grid-column:1/-1}
    @media(max-width:1100px){.contact-list article{grid-template-columns:1fr 1fr}.contact-list .remove{grid-column:2;justify-self:end}.schedule-list article{grid-template-columns:1fr 1fr}.schedule-list .remove{grid-column:2;justify-self:end}}
    @media(max-width:650px){header,.section-heading{display:grid}.contact-list article,.schedule-list article,.context-grid{grid-template-columns:1fr}.contact-list .remove,.schedule-list .remove,.context-grid .wide{grid-column:auto}.remove{justify-self:end}}
  `],
})
export class ContactsTabComponent {
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

  addContact(): void {
    (this.draft.contacts as HostContact[]).push({ type: 'host', name: '', email: null, phone: null });
  }

  removeContact(index: number): void {
    (this.draft.contacts as HostContact[]).splice(index, 1);
  }

  addScheduleItem(): void {
    (this.draft.schedule as HostScheduleItem[]).push({
      title: '',
      date: this.draft.eventStartDate,
      startsAt: null,
      endsAt: null,
      location: null,
      notes: null,
    });
  }

  removeScheduleItem(index: number): void {
    (this.draft.schedule as HostScheduleItem[]).splice(index, 1);
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.api.saveCoordination(this.workspace.preparation.assignmentId, this.draft).subscribe({
      next: (updated) => {
        this.workspaceUpdated.emit(updated);
        this.message.set('Contacts and host preparation saved.');
        this.saving.set(false);
      },
      error: () => {
        this.error.set('Host preparation could not be saved.');
        this.saving.set(false);
      },
    });
  }

  private clone(value: HostCoordinationDetails): HostCoordinationDetails {
    return {
      ...value,
      schedule: value.schedule.map((item) => ({ ...item })) as HostScheduleItem[],
      contacts: value.contacts.map((item) => ({ ...item })) as HostContact[],
      documents: [...value.documents],
    };
  }
}
