import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EngagementsApiService } from '../../core/engagements-api.service';
import { Closeout, EngagementCompletion } from '../../core/models';

@Component({
  selector: 'app-closeout-tab',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="closeout-workspace">
      <header>
        <div>
          <p>Record · Closeout</p>
          <h2>Outcome and completion</h2>
          <span>Capture what happened, finish accountable follow-up, and close the assignment without losing the ministry record.</span>
        </div>
        <span class="completion-state" [class.ready]="completion.canComplete">
          {{ completion.closeout.completedAtUtc ? 'Assignment complete' : completion.canComplete ? 'Ready to complete' : 'Closeout in progress' }}
        </span>
      </header>

      @if (message()) { <div class="message">{{ message() }}</div> }
      @if (error()) { <div class="message error">{{ error() }}</div> }

      <div class="closeout-grid">
        <section class="narrative">
          <label>
            <span>Event notes</span>
            <textarea rows="6" [(ngModel)]="draft.eventNotes" placeholder="What happened in the room, service, gathering, or ministry moment?"></textarea>
          </label>
          <label>
            <span>Testimony / outcome summary</span>
            <textarea rows="6" [(ngModel)]="draft.testimonySummary" placeholder="Record the outcomes worth carrying forward."></textarea>
          </label>
          <label>
            <span>Host follow-up notes</span>
            <textarea rows="4" [(ngModel)]="draft.hostFollowUpNotes"></textarea>
          </label>
        </section>

        <aside class="closeout-checks">
          <p>Completion record</p>
          <label><input type="checkbox" [(ngModel)]="draft.outcomesRecorded" /><span><strong>Outcomes recorded</strong><small>Ministry response and testimony record is complete.</small></span></label>
          <label><input type="checkbox" [(ngModel)]="draft.hostFollowUpComplete" /><span><strong>Host follow-up complete</strong><small>Thank-you and host communication are finished.</small></span></label>
          <label><input type="checkbox" [(ngModel)]="draft.finalDocumentsComplete" /><span><strong>Final documents complete</strong><small>The assignment record has the files it needs.</small></span></label>
          <label><input type="checkbox" [(ngModel)]="draft.paymentComplete" /><span><strong>Payment complete</strong><small>Honorarium or reimbursement obligations are resolved.</small></span></label>
          <label><input type="checkbox" [(ngModel)]="draft.administrativeFollowUpComplete" /><span><strong>Administrative follow-up complete</strong><small>No internal coordination remains open.</small></span></label>
          <div class="system-check">
            <span [class.ok]="completion.closeout.allFollowUpsComplete">{{ completion.closeout.allFollowUpsComplete ? '✓' : '•' }}</span>
            <div><strong>Personal follow-ups</strong><small>{{ completion.followUpsOpen }} still open</small></div>
          </div>
          <div class="system-check">
            <span [class.ok]="completion.closeout.allReadinessTasksResolved">{{ completion.closeout.allReadinessTasksResolved ? '✓' : '•' }}</span>
            <div><strong>Readiness work</strong><small>{{ completion.closeout.allReadinessTasksResolved ? 'Resolved' : 'Still has open work' }}</small></div>
          </div>
        </aside>
      </div>

      <footer>
        <button type="button" class="secondary" [disabled]="saving()" (click)="save(false)">{{ saving() ? 'Saving…' : 'Save closeout' }}</button>
        <button type="button" class="primary" [disabled]="saving() || !completion.canComplete" (click)="save(true)">Complete assignment</button>
      </footer>
    </section>
  `,
  styles: [`
    .closeout-workspace{margin-top:1rem;border:1px solid var(--eng-line);border-radius:12px;background:var(--eng-surface);overflow:hidden}
    header{display:flex;justify-content:space-between;gap:1rem;padding:1.25rem 1.4rem;border-bottom:1px solid var(--eng-line)}header p{margin:0 0 .35rem;color:var(--eng-blue);font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}header h2{margin:0;font-size:1.55rem}header span:not(.completion-state){display:block;margin-top:.3rem;color:var(--eng-muted);font-size:.76rem}
    .completion-state{align-self:start;padding:.42rem .6rem;border-radius:999px;color:#70551f;background:#f7eddc;font-size:.68rem;font-weight:850}.completion-state.ready{color:#266d50;background:#e7f4ec}
    .message{padding:.7rem 1.4rem;color:#25684d;background:#edf7f1;font-size:.75rem;font-weight:750}.message.error{color:var(--eng-danger);background:#fff0ef}
    .closeout-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr)}.narrative{display:grid;gap:.8rem;padding:1.2rem 1.3rem;border-right:1px solid var(--eng-line)}label{display:grid;gap:.3rem}label>span{color:#5d6879;font-size:.66rem;font-weight:800}textarea{width:100%;padding:.7rem;border:1px solid #ccd2db;border-radius:7px;color:var(--eng-ink);background:#fff;resize:vertical}
    .closeout-checks{padding:1.2rem}.closeout-checks>p{margin:0 0 .65rem;color:var(--eng-blue);font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.closeout-checks label{display:grid;grid-template-columns:20px minmax(0,1fr);gap:.55rem;padding:.7rem 0;border-bottom:1px solid rgba(18,26,44,.08);cursor:pointer}.closeout-checks input{margin-top:.15rem}.closeout-checks label strong,.closeout-checks label small{display:block}.closeout-checks label strong{color:var(--eng-ink);font-size:.76rem}.closeout-checks label small{margin-top:.2rem;color:var(--eng-muted);font-size:.65rem;line-height:1.4}
    .system-check{display:flex;gap:.6rem;align-items:center;padding:.7rem 0;border-bottom:1px solid rgba(18,26,44,.08)}.system-check>span{display:grid;width:25px;height:25px;place-items:center;border-radius:50%;color:#7f8794;background:#eceff2;font-weight:900}.system-check>span.ok{color:#fff;background:#2d7d5c}.system-check strong,.system-check small{display:block}.system-check strong{font-size:.73rem}.system-check small{margin-top:.15rem;color:var(--eng-muted);font-size:.64rem}
    footer{display:flex;justify-content:flex-end;gap:.6rem;padding:1rem 1.3rem;border-top:1px solid var(--eng-line);background:#faf9f7}footer button{min-height:42px;padding:.62rem .85rem;border-radius:8px;font-weight:850;cursor:pointer}.secondary{border:1px solid var(--eng-line);color:var(--eng-ink);background:#fff}.primary{border:1px solid transparent;color:#fff;background:var(--eng-ink)}button:disabled{cursor:default;opacity:.45}
    @media(max-width:850px){.closeout-grid{grid-template-columns:1fr}.narrative{border-right:0;border-bottom:1px solid var(--eng-line)}}
  `],
})
export class CloseoutTabComponent {
  private _completion!: EngagementCompletion;
  draft!: Closeout;

  @Input({ required: true })
  set completion(value: EngagementCompletion) {
    this._completion = value;
    this.draft = { ...value.closeout };
  }
  get completion(): EngagementCompletion { return this._completion; }

  @Input({ required: true }) assignmentId!: string;
  @Output() completionUpdated = new EventEmitter<EngagementCompletion>();
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor(private readonly api: EngagementsApiService) {}

  save(complete: boolean): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    const payload: EngagementCompletion = {
      ...this.completion,
      closeout: { ...this.draft },
    };
    this.api.updateCloseout(this.assignmentId, payload, complete).subscribe({
      next: (updated) => {
        this.completionUpdated.emit(updated);
        this.message.set(complete ? 'Assignment completed.' : 'Closeout saved.');
        this.saving.set(false);
      },
      error: (response) => {
        this.error.set(response?.error?.message ?? 'The closeout record could not be saved.');
        this.saving.set(false);
      },
    });
  }
}
