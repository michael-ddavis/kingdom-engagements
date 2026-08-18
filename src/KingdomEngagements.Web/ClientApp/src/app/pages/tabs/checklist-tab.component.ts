import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { EngagementsApiService } from '../../core/engagements-api.service';
import { EngagementDetails, EngagementTask } from '../../core/models';

@Component({
  selector: 'app-checklist-tab',
  standalone: true,
  template: `
    <section class="tab-workspace">
      <header>
        <div>
          <p>Preparation · Checklist</p>
          <h2>Readiness work</h2>
          <span>Complete the concrete work required to make this assignment ministry-ready.</span>
        </div>
        <strong>{{ completeCount() }}/{{ assignment.tasks.length }} complete</strong>
      </header>

      @if (message()) { <div class="message">{{ message() }}</div> }
      @if (error()) { <div class="message error">{{ error() }}</div> }

      <div class="task-list">
        @for (task of assignment.tasks; track task.id) {
          <article [attr.data-status]="task.status">
            <button
              type="button"
              class="task-check"
              [class.complete]="isComplete(task)"
              [disabled]="savingId() === task.id"
              [attr.aria-label]="isComplete(task) ? 'Reopen ' + task.title : 'Complete ' + task.title"
              (click)="toggle(task)">
              {{ isComplete(task) ? '✓' : '' }}
            </button>
            <div class="task-copy">
              <span>{{ task.category }}</span>
              <strong>{{ task.title }}</strong>
              <p>{{ task.detail || 'No additional detail recorded.' }}</p>
            </div>
            <div class="task-meta">
              <strong>{{ task.owner }}</strong>
              <small>{{ task.dueAtUtc ? dateLabel(task.dueAtUtc) : 'No due date' }}</small>
              <em>{{ task.status.replace('-', ' ') }}</em>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .tab-workspace { margin-top:1rem; border:1px solid var(--eng-line); border-radius:12px; background:var(--eng-surface); overflow:hidden; }
    header { display:flex; justify-content:space-between; gap:1rem; padding:1.3rem 1.4rem; border-bottom:1px solid var(--eng-line); }
    header p { margin:0 0 .35rem; color:var(--eng-blue); font-size:.7rem; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }
    header h2 { margin:0; font-size:1.55rem; }
    header span { display:block; margin-top:.3rem; color:var(--eng-muted); font-size:.78rem; }
    header > strong { align-self:start; padding:.4rem .55rem; border-radius:999px; background:#eef1f5; font-size:.7rem; }
    .message { padding:.7rem 1.4rem; color:#25684d; background:#edf7f1; border-bottom:1px solid var(--eng-line); font-size:.75rem; font-weight:750; }
    .message.error { color:var(--eng-danger); background:#fff0ef; }
    .task-list { display:grid; }
    article { display:grid; grid-template-columns:40px minmax(0,1fr) minmax(150px,auto); gap:.85rem; align-items:center; padding:1rem 1.2rem; border-bottom:1px solid rgba(18,26,44,.08); }
    article:last-child { border-bottom:0; }
    article[data-status='complete'] { background:#fbfcfb; }
    .task-check { display:grid; width:34px; height:34px; place-items:center; border:1px solid #ccd2db; border-radius:50%; color:#fff; background:#fff; cursor:pointer; font-weight:900; }
    .task-check.complete { border-color:#2d7d5c; background:#2d7d5c; }
    .task-copy span { color:var(--eng-blue); font-size:.63rem; font-weight:900; text-transform:uppercase; }
    .task-copy strong,.task-copy p { display:block; }
    .task-copy strong { margin-top:.18rem; font-size:.88rem; }
    .task-copy p { margin:.25rem 0 0; color:var(--eng-muted); font-size:.72rem; }
    .task-meta { text-align:right; }
    .task-meta strong,.task-meta small,.task-meta em { display:block; }
    .task-meta strong { font-size:.7rem; }
    .task-meta small { margin-top:.2rem; color:var(--eng-muted); font-size:.64rem; }
    .task-meta em { margin-top:.25rem; color:#6150b8; font-size:.62rem; font-style:normal; font-weight:850; text-transform:capitalize; }
    @media(max-width:700px){ article{grid-template-columns:38px minmax(0,1fr)} .task-meta{grid-column:2;text-align:left} }
  `],
})
export class ChecklistTabComponent {
  @Input({ required: true }) assignment!: EngagementDetails;
  @Output() assignmentUpdated = new EventEmitter<EngagementDetails>();
  readonly savingId = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor(private readonly api: EngagementsApiService) {}

  completeCount(): number {
    return this.assignment.tasks.filter((task) => this.isComplete(task)).length;
  }

  isComplete(task: EngagementTask): boolean {
    return ['complete', 'confirmed', 'received', 'waived'].includes(task.status);
  }

  toggle(task: EngagementTask): void {
    if (this.savingId()) return;
    this.savingId.set(task.id);
    this.error.set(null);
    const status = this.isComplete(task) ? 'open' : 'complete';
    this.api.updateTask(this.assignment.summary.id, task, status).subscribe({
      next: (updated) => {
        this.assignmentUpdated.emit(updated);
        this.message.set(status === 'complete' ? 'Readiness item completed.' : 'Readiness item reopened.');
        this.savingId.set(null);
      },
      error: () => {
        this.error.set('The checklist item could not be updated.');
        this.savingId.set(null);
      },
    });
  }

  dateLabel(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}
