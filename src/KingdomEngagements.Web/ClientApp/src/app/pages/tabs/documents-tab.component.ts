import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { EngagementsApiService } from '../../core/engagements-api.service';
import {
  AssignmentWorkspaceDetails,
  EngagementDetails,
  HostCoordinationDocument,
} from '../../core/models';

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  template: `
    <section class="documents-workspace">
      <header>
        <div>
          <p>Record · Documents</p>
          <h2>Assignment documents</h2>
          <span>Agreements, host files, itineraries, and preparation documents stay connected to this assignment.</span>
        </div>
        <label class="upload-button">
          <input type="file" [disabled]="saving()" (change)="upload($event)" />
          {{ saving() ? 'Uploading…' : '＋ Add document' }}
        </label>
      </header>

      @if (message()) { <div class="message">{{ message() }}</div> }
      @if (error()) { <div class="message error">{{ error() }}</div> }

      <section class="document-group">
        <div class="group-heading">
          <p>Host coordination files</p>
          <strong>{{ workspace.preparation.coordination.documents.length }}</strong>
        </div>
        @if (workspace.preparation.coordination.documents.length === 0) {
          <div class="empty">No host coordination files have been uploaded.</div>
        } @else {
          <div class="document-list">
            @for (document of workspace.preparation.coordination.documents; track document.id) {
              <article>
                <span class="file-icon">DOC</span>
                <div><strong>{{ document.fileName }}</strong><small>{{ fileSize(document.length) }} · {{ dateLabel(document.uploadedAtUtc) }}</small></div>
                <em>{{ document.contentType }}</em>
                <button type="button" [disabled]="saving()" (click)="remove(document)">Remove</button>
              </article>
            }
          </div>
        }
      </section>

      <section class="document-group">
        <div class="group-heading">
          <p>Assignment record</p>
          <strong>{{ assignment.documents.length }}</strong>
        </div>
        @if (assignment.documents.length === 0) {
          <div class="empty">No assignment record documents are listed.</div>
        } @else {
          <div class="record-grid">
            @for (document of assignment.documents; track document.id) {
              <article>
                <span>{{ document.category }}</span>
                <strong>{{ document.name }}</strong>
                <small>{{ document.status.replace('-', ' ') }} · {{ dateLabel(document.updatedAtUtc) }}</small>
              </article>
            }
          </div>
        }
      </section>
    </section>
  `,
  styles: [`
    .documents-workspace{margin-top:1rem;border:1px solid var(--eng-line);border-radius:12px;background:var(--eng-surface);overflow:hidden}
    header{display:flex;justify-content:space-between;gap:1rem;padding:1.25rem 1.4rem;border-bottom:1px solid var(--eng-line)}
    header p,.group-heading p{margin:0 0 .3rem;color:var(--eng-blue);font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}header h2{margin:0;font-size:1.55rem}header span{display:block;margin-top:.3rem;color:var(--eng-muted);font-size:.76rem}
    .upload-button{display:flex;align-items:center;min-height:40px;padding:.58rem .8rem;border-radius:8px;color:#fff;background:var(--eng-ink);font-size:.75rem;font-weight:800;cursor:pointer}.upload-button input{display:none}
    .message{padding:.7rem 1.4rem;color:#25684d;background:#edf7f1;font-size:.75rem;font-weight:750}.message.error{color:var(--eng-danger);background:#fff0ef}
    .document-group{padding:1.2rem 1.3rem;border-bottom:1px solid var(--eng-line)}.document-group:last-child{border-bottom:0}.group-heading{display:flex;align-items:center;justify-content:space-between}.group-heading strong{padding:.25rem .4rem;border-radius:999px;background:#edf0f4;font-size:.65rem}
    .document-list{display:grid;margin-top:.75rem;border:1px solid rgba(18,26,44,.09);border-radius:8px;overflow:hidden}.document-list article{display:grid;grid-template-columns:42px minmax(0,1fr) minmax(160px,.7fr) auto;gap:.75rem;align-items:center;padding:.8rem;border-bottom:1px solid rgba(18,26,44,.08)}.document-list article:last-child{border-bottom:0}
    .file-icon{display:grid;width:38px;height:38px;place-items:center;border-radius:7px;color:#315faf;background:#e9effb;font-size:.58rem;font-weight:900}.document-list strong,.document-list small{display:block}.document-list small{margin-top:.15rem;color:var(--eng-muted);font-size:.66rem}.document-list em{color:#7a8290;font-size:.64rem;font-style:normal}.document-list button{min-height:34px;padding:.45rem .6rem;border:1px solid #e2c3c1;border-radius:7px;color:#a34742;background:#fff;font-weight:800;cursor:pointer}
    .record-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;margin-top:.75rem}.record-grid article{padding:.85rem;border:1px solid rgba(18,26,44,.09);border-radius:8px;background:#fbfaf8}.record-grid span{color:var(--eng-blue);font-size:.6rem;font-weight:900;text-transform:uppercase}.record-grid strong,.record-grid small{display:block}.record-grid strong{margin-top:.25rem;font-size:.8rem}.record-grid small{margin-top:.25rem;color:var(--eng-muted);font-size:.64rem;text-transform:capitalize}.empty{margin-top:.75rem;padding:1rem;color:var(--eng-muted);background:#faf9f7;border-radius:8px;text-align:center;font-size:.75rem}
    @media(max-width:800px){.document-list article{grid-template-columns:42px minmax(0,1fr)}.document-list em,.document-list button{grid-column:2}.document-list button{justify-self:start}.record-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:560px){header{display:grid}.upload-button{justify-self:start}.record-grid{grid-template-columns:1fr}}
  `],
})
export class DocumentsTabComponent {
  @Input({ required: true }) assignment!: EngagementDetails;
  @Input({ required: true }) workspace!: AssignmentWorkspaceDetails;
  @Output() assignmentUpdated = new EventEmitter<EngagementDetails>();
  @Output() workspaceUpdated = new EventEmitter<AssignmentWorkspaceDetails>();
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor(private readonly api: EngagementsApiService) {}

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.api.uploadWorkspaceDocument(this.assignment.summary.id, file).subscribe({
      next: () => {
        this.refresh('Document uploaded.');
        input.value = '';
      },
      error: () => {
        this.error.set('The document could not be uploaded.');
        this.saving.set(false);
        input.value = '';
      },
    });
  }

  remove(document: HostCoordinationDocument): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.api.deleteWorkspaceDocument(this.assignment.summary.id, document.id).subscribe({
      next: () => this.refresh('Document removed.'),
      error: () => {
        this.error.set('The document could not be removed.');
        this.saving.set(false);
      },
    });
  }

  fileSize(value: number): string {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  dateLabel(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private refresh(message: string): void {
    forkJoin({
      assignment: this.api.getAssignment(this.assignment.summary.id),
      workspace: this.api.getWorkspace(this.assignment.summary.id),
    }).subscribe({
      next: ({ assignment, workspace }) => {
        this.assignmentUpdated.emit(assignment);
        this.workspaceUpdated.emit(workspace.workspace);
        this.message.set(message);
        this.saving.set(false);
      },
      error: () => {
        this.error.set('The document changed, but the assignment could not be refreshed.');
        this.saving.set(false);
      },
    });
  }
}
