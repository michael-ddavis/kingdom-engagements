import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, signal } from '@angular/core';

interface HostInvitation { invitationUrl: string; expiresAtUtc: string; hostName: string; }
@Component({
  selector: 'app-host-access-link', standalone: true, imports: [DatePipe],
  template: `
    <section class="host-link-panel" aria-labelledby="host-link-title">
      <header>
        <div>
          <small>HOST PORTAL</small>
          <h3 id="host-link-title">Private host link</h3>
        </div>
        @if (invitation()) { <span class="ready-state">Ready to share</span> }
      </header>

      @if (invitation(); as link) {
        <p class="intro">Share this with {{ link.hostName }} so they can update travel, lodging, schedule, contacts, documents, and messages.</p>
        <div class="link-row">
          <input readonly [value]="link.invitationUrl" (click)="$any($event.target).select()" aria-label="Private host invitation link">
          <button type="button" (click)="copy()">Copy</button>
          <a [href]="link.invitationUrl" target="_blank" rel="noopener noreferrer">Open ↗</a>
        </div>
        <div class="link-meta">Expires {{ link.expiresAtUtc | date:'short' }}</div>

        <details class="replace-link">
          <summary>Replace this link</summary>
          <p>Replacing it ends the earlier invitation and host session for this engagement.</p>
          <button class="secondary" type="button" [disabled]="busy()" (click)="create()">
            {{ busy() ? 'Creating…' : 'Create replacement link' }}
          </button>
        </details>
      } @else {
        <div class="create-row">
          <p>Create one private link for the host. Their updates come back into this engagement automatically.</p>
          <button type="button" [disabled]="busy()" (click)="create()">{{ busy() ? 'Creating…' : 'Create host link' }}</button>
        </div>
      }

      @if (message()) { <p class="message" role="status">{{ message() }}</p> }
    </section>
  `,
  styles: [`
    .host-link-panel{margin-bottom:12px;padding:14px 16px;border:1px solid #dde3d9;border-radius:12px;background:#fff;color:#26362b}
    header{display:flex;justify-content:space-between;gap:16px;align-items:center}.host-link-panel small{display:block;color:#677653;font-size:.58rem;font-weight:850;letter-spacing:.11em}.host-link-panel h3{margin:3px 0 0;font-size:1rem}
    .ready-state{padding:5px 8px;border:1px solid #b9d8c1;border-radius:999px;background:#edf8ef;color:#2f6b3b;font-size:.61rem;font-weight:850;white-space:nowrap}
    .intro,.create-row p,.replace-link p,.message{margin:8px 0 0;color:#657063;font-size:.68rem;line-height:1.45}
    .create-row{display:flex;justify-content:space-between;gap:18px;align-items:center}.create-row p{max-width:720px;margin-top:5px}
    .link-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;margin-top:10px}.link-row input{box-sizing:border-box;width:100%;min-width:0;padding:9px 10px;border:1px solid #ccd5c9;border-radius:7px;background:#f8faf6;font:inherit;font-size:.68rem}
    button,.link-row a{display:inline-flex;min-height:36px;align-items:center;justify-content:center;border-radius:7px;font:inherit;font-size:.65rem;font-weight:800;white-space:nowrap}.host-link-panel button{border:0;padding:0 12px;background:#334f36;color:#fff;cursor:pointer}.host-link-panel button:disabled{opacity:.6;cursor:default}.link-row a{padding:0 10px;border:1px solid #cad5ca;color:#345838;text-decoration:none;background:#fff}
    .link-meta{margin-top:6px;color:#7b837a;font-size:.58rem}.replace-link{margin-top:8px;border-top:1px solid #e8ece7;padding-top:7px}.replace-link summary{color:#6f786f;font-size:.61rem;font-weight:750;cursor:pointer}.replace-link p{margin:7px 0}.host-link-panel .secondary{border:1px solid #ccd5c9;background:#fff;color:#334f36}
    .message{color:#345838;font-weight:750}
    @media(max-width:700px){.create-row{align-items:stretch;flex-direction:column}.create-row button{width:100%}.link-row{grid-template-columns:1fr 1fr}.link-row input{grid-column:1/-1}}
  `],

})
export class HostAccessLinkComponent {
  @Input({ required: true }) assignmentId = '';
  readonly invitation = signal<HostInvitation | null>(null);
  readonly busy = signal(false);
  readonly message = signal('');
  constructor(private readonly http: HttpClient) {}
  create(): void {
    if (this.busy()) return;
    this.busy.set(true); this.message.set('');
    this.http.post<HostInvitation>(`/api/engagements/assignments/${encodeURIComponent(this.assignmentId)}/host-access/invitations`, {}).subscribe({
      next: link => { this.invitation.set(link); this.busy.set(false); },
      error: () => { this.message.set('The host link could not be created. Please try again.'); this.busy.set(false); },
    });
  }
  async copy(): Promise<void> {
    try { await navigator.clipboard.writeText(this.invitation()!.invitationUrl); this.message.set('Link copied.'); }
    catch { this.message.set('Select the link above and copy it to share.'); }
  }
}
