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

      <section class="work-section schedule-section">
        <div class="section-heading">
          <div><p>Event schedule</p><h3>What happens when?</h3></div>
          <div class="schedule-actions">
            @if (editingSchedule()) {
              <button type="button" (click)="addScheduleItem()">＋ Add item</button>
              <button type="button" class="schedule-done" (click)="editingSchedule.set(false)">Done editing</button>
            } @else {
              <button type="button" (click)="editingSchedule.set(true)">Edit schedule</button>
            }
          </div>
        </div>

        @if (draft.schedule.length === 0) {
          <div class="empty">No event schedule has been added yet.</div>
        } @else if (!editingSchedule()) {
          <div class="schedule-record">
            @for (item of draft.schedule; track $index) {
              <article>
                <time>
                  <strong>{{ timeLabel(item.startsAt) }}</strong>
                  <small>{{ dateLabel(item.date) }}</small>
                </time>
                <div class="schedule-record__body">
                  <strong>{{ item.title || 'Untitled schedule item' }}</strong>
                  <span>{{ item.location || 'Location pending' }}</span>
                  @if (item.notes) { <p>{{ item.notes }}</p> }
                </div>
                @if (item.endsAt) { <small class="schedule-record__end">to {{ timeLabel(item.endsAt) }}</small> }
              </article>
            }
          </div>
        } @else {
          <div class="schedule-editor">
            @for (item of draft.schedule; track $index; let index = $index) {
              <article>
                <div class="schedule-editor__top">
                  <label class="title"><span>Title</span><input [(ngModel)]="item.title" /></label>
                  <button type="button" class="remove" aria-label="Remove schedule item" (click)="removeScheduleItem(index)">×</button>
                </div>
                <div class="schedule-editor__grid">
                  <label class="date"><span>Date</span><input type="date" [(ngModel)]="item.date" /></label>
                  <label><span>Start</span><input type="time" [(ngModel)]="item.startsAt" /></label>
                  <label><span>End</span><input type="time" [(ngModel)]="item.endsAt" /></label>
                  <label class="location"><span>Location</span><input [(ngModel)]="item.location" /></label>
                </div>
                <label class="notes"><span>Notes</span><textarea rows="2" [(ngModel)]="item.notes"></textarea></label>
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

      <div class="save-dock" role="region" aria-label="Coordination save actions">
        <div>
          <strong>Host coordination</strong>
          <span>Save contacts, schedule, prayer focus, promotion requirements, and notes together.</span>
        </div>
        <button type="button" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save coordination' }}</button>
      </div>
    </section>
  `,
  styles: [`
    .contacts-workspace{position:relative;margin-top:1rem;padding-bottom:5.5rem;border:1px solid var(--eng-line);border-radius:9px;background:var(--eng-surface);overflow:visible}
    header{display:flex;justify-content:space-between;gap:1rem;padding:1.2rem 1.35rem;border-bottom:1px solid var(--eng-line)}
    header p,.section-heading p{margin:0 0 .3rem;color:var(--eng-blue);font-size:.65rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    header h2{margin:0;font-size:1.45rem}header span{display:block;margin-top:.3rem;color:var(--eng-muted);font-size:.74rem}
    .section-heading button{align-self:start;min-height:36px;padding:.48rem .7rem;border:1px solid var(--eng-line);border-radius:6px;color:var(--eng-ink);background:#fff;font-size:.72rem;font-weight:800;cursor:pointer}
    .message{padding:.7rem 1.35rem;color:#25684d;background:#edf7f1;font-size:.73rem;font-weight:750}.message.error{color:var(--eng-danger);background:#fff0ef}
    .work-section{padding:1.35rem;border-bottom:1px solid var(--eng-line)}
    .section-heading{display:flex;align-items:start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.section-heading h3{margin:0;font-size:1rem}.schedule-actions{display:flex;gap:.4rem}.schedule-actions .schedule-done{color:#fff;background:var(--eng-ink)}
    .contact-list{display:grid;gap:.65rem}.contact-list article{display:grid;grid-template-columns:130px 1fr 1fr 160px 34px;gap:.7rem;align-items:end;padding:.8rem;border:1px solid rgba(18,26,44,.09);border-radius:7px;background:#fbfaf8}
    label{display:grid;gap:.32rem}label>span{color:#596476;font-size:.61rem;font-weight:800}input,select,textarea{width:100%;padding:.62rem .68rem;border:1px solid #ccd2db;border-radius:6px;background:#fff;color:var(--eng-ink)}textarea{resize:vertical;line-height:1.45}
    .remove{display:grid!important;width:32px!important;height:32px!important;min-height:32px!important;padding:0!important;place-items:center;border:1px solid #e2c2c0!important;border-radius:6px!important;color:#a34843!important;background:#fff!important;cursor:pointer;font-size:1rem!important}
    .schedule-record{display:grid;border-top:1px solid rgba(18,26,44,.08)}.schedule-record article{display:grid;grid-template-columns:120px minmax(0,1fr) auto;gap:1.25rem;align-items:start;padding:1rem .1rem;border-bottom:1px solid rgba(18,26,44,.08)}.schedule-record article:last-child{border-bottom:0}.schedule-record time{display:grid;gap:.14rem}.schedule-record time strong{font-size:.85rem}.schedule-record time small,.schedule-record__end{color:#858d9a;font-size:.64rem}.schedule-record__body{display:grid;gap:.18rem}.schedule-record__body>strong{font-size:.82rem}.schedule-record__body>span{color:#6c7585;font-size:.7rem}.schedule-record__body p{margin:.3rem 0 0;color:#6f7785;font-size:.68rem;line-height:1.45}.schedule-record__end{padding-top:.12rem;white-space:nowrap}
    .schedule-editor{display:grid;gap:1rem}.schedule-editor>article{padding:1rem;border:1px solid rgba(18,26,44,.1);border-radius:8px;background:#fbfaf8}.schedule-editor__top{display:grid;grid-template-columns:1fr 34px;gap:.75rem;align-items:end}.schedule-editor__grid{display:grid;grid-template-columns:minmax(150px,.65fr) minmax(120px,.45fr) minmax(120px,.45fr) minmax(260px,1.45fr);gap:.75rem;margin-top:.8rem}.schedule-editor .notes{margin-top:.8rem}.schedule-editor .notes textarea{min-height:72px}
    .empty{padding:1rem;color:var(--eng-muted);text-align:center;background:#faf9f7;border-radius:7px}.context-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1.35rem}.context-grid .wide{grid-column:1/-1}
    .save-dock{position:sticky;bottom:.8rem;z-index:15;display:flex;align-items:center;justify-content:space-between;gap:1rem;width:calc(100% - 2rem);margin:1rem 1rem -4.65rem;padding:.8rem .9rem;border:1px solid rgba(18,26,44,.12);border-radius:9px;background:rgba(255,253,250,.96);box-shadow:0 12px 36px rgba(18,26,44,.13);backdrop-filter:blur(14px)}.save-dock strong,.save-dock span{display:block}.save-dock strong{font-size:.72rem}.save-dock span{margin-top:.12rem;color:var(--eng-muted);font-size:.62rem}.save-dock button{min-height:42px;padding:.58rem .9rem;border:0;border-radius:7px;color:#fff;background:var(--eng-ink);font-size:.72rem;font-weight:850;cursor:pointer}.save-dock button:disabled{opacity:.55;cursor:wait}
    @media(max-width:1100px){.contact-list article{grid-template-columns:1fr 1fr}.contact-list .remove{grid-column:2;justify-self:end}.schedule-editor__grid{grid-template-columns:1fr 1fr}.schedule-editor__grid .location{grid-column:1/-1}}
    @media(max-width:700px){header,.section-heading{display:grid}.schedule-actions{justify-content:start}.contact-list article,.context-grid,.schedule-editor__grid{grid-template-columns:1fr}.contact-list .remove,.context-grid .wide,.schedule-editor__grid .location{grid-column:auto}.remove{justify-self:end}.schedule-record article{grid-template-columns:92px 1fr}.schedule-record__end{grid-column:2}.save-dock{display:grid;bottom:.5rem}.save-dock button{width:100%}}
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
  readonly editingSchedule = signal(false);
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
      date: this.normalizeDate(this.draft.eventStartDate),
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

  timeLabel(value: string | null): string {
    const normalized = this.normalizeTime(value);
    if (!normalized) return 'Time pending';
    const [hours, minutes] = normalized.split(':').map(Number);
    const date = new Date(2000, 0, 1, hours, minutes);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  dateLabel(value: string): string {
    const normalized = this.normalizeDate(value);
    const [year, month, day] = normalized.split('-').map(Number);
    if (!year || !month || !day) return 'Date pending';
    return new Date(year, month - 1, day, 12, 0, 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private normalizeDate(value: string | null | undefined): string {
    if (!value) return '';
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] ?? value;
  }

  private normalizeTime(value: string | null | undefined): string | null {
    if (!value) return null;
    const timeOnly = value.match(/^(\d{2}:\d{2})/);
    if (timeOnly) return timeOnly[1];
    const isoTime = value.match(/T(\d{2}:\d{2})/);
    return isoTime?.[1] ?? null;
  }

  private clone(value: HostCoordinationDetails): HostCoordinationDetails {
    return {
      ...value,
      eventStartDate: this.normalizeDate(value.eventStartDate),
      eventEndDate: this.normalizeDate(value.eventEndDate),
      schedule: value.schedule.map((item) => ({
        ...item,
        date: this.normalizeDate(item.date),
        startsAt: this.normalizeTime(item.startsAt),
        endsAt: this.normalizeTime(item.endsAt),
      })) as HostScheduleItem[],
      contacts: value.contacts.map((item) => ({ ...item })) as HostContact[],
      documents: [...value.documents],
    };
  }
}
