import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, signal } from '@angular/core';

interface HostInvitation { invitationUrl: string; expiresAtUtc: string; hostName: string; }
@Component({
  selector: 'app-host-access-link', standalone: true, imports: [DatePipe],
  template: `
    <section class="host-link-bar" aria-label="Private host link">
      <div class="link-status">
        <small>HOST LINK</small>
        @if (invitation(); as link) {
          <strong>Ready to share with {{ link.hostName }}</strong>
          <span>Expires {{ link.expiresAtUtc | date:'shortDate' }}</span>
        } @else {
          <strong>No private host link yet</strong>
        }
      </div>

      <div class="link-actions">
        @if (invitation(); as link) {
          <button type="button" (click)="copy()">Copy link</button>
          <a [href]="link.invitationUrl" target="_blank" rel="noopener noreferrer">Open ↗</a>
          <details>
            <summary aria-label="More host link options">•••</summary>
            <div class="more-menu">
              <p>Replacing the link ends the earlier invitation and host session.</p>
              <button class="secondary" type="button" [disabled]="busy()" (click)="create()">
                {{ busy() ? 'Creating…' : 'Replace link' }}
              </button>
            </div>
          </details>
        } @else {
          <button type="button" [disabled]="busy()" (click)="create()">{{ busy() ? 'Creating…' : 'Create host link' }}</button>
        }
      </div>

      @if (message()) { <span class="message" role="status">{{ message() }}</span> }
    </section>
  `,
  styles: [`
    .host-link-bar{position:relative;display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:14px;margin-bottom:8px;padding:9px 11px;border:1px solid #dde3d9;border-radius:10px;background:#fff;color:#26362b}
    .link-status{display:flex;min-width:0;align-items:baseline;gap:8px}.link-status small{color:#677653;font-size:.55rem;font-weight:850;letter-spacing:.1em}.link-status strong{overflow:hidden;font-size:.68rem;text-overflow:ellipsis;white-space:nowrap}.link-status span{color:#7b837a;font-size:.57rem;white-space:nowrap}
    .link-actions{display:flex;flex:0 0 auto;align-items:center;gap:6px}.link-actions button,.link-actions a,.link-actions summary{display:inline-flex;min-height:32px;align-items:center;justify-content:center;border-radius:7px;font:inherit;font-size:.61rem;font-weight:800;white-space:nowrap}.link-actions button{border:0;padding:0 10px;background:#334f36;color:#fff;cursor:pointer}.link-actions button:disabled{opacity:.6;cursor:default}.link-actions a{padding:0 9px;border:1px solid #cad5ca;background:#fff;color:#345838;text-decoration:none}.link-actions details{position:relative}.link-actions summary{width:34px;border:1px solid #d4dad4;background:#fff;color:#59655b;cursor:pointer;list-style:none}.link-actions summary::-webkit-details-marker{display:none}
    .more-menu{position:absolute;z-index:10;top:38px;right:0;width:250px;padding:11px;border:1px solid #d9dfd8;border-radius:9px;background:#fff;box-shadow:0 12px 28px rgba(18,26,44,.12)}.more-menu p{margin:0 0 9px;color:#657063;font-size:.61rem;line-height:1.45}.link-actions .secondary{width:100%;border:1px solid #ccd5c9;background:#fff;color:#334f36}
    .message{position:absolute;top:100%;right:10px;z-index:5;margin-top:4px;padding:5px 8px;border:1px solid #cfe0d2;border-radius:7px;background:#f3f8f4;color:#345838;font-size:.58rem;font-weight:750}
    @media(max-width:700px){.host-link-bar{align-items:flex-start;flex-direction:column}.link-status{align-items:flex-start;flex-direction:column;gap:2px}.link-actions{width:100%}.link-actions>button:first-child{flex:1}.more-menu{right:auto;left:0}}
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
