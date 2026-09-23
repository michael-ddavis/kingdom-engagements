import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, signal } from '@angular/core';

interface HostInvitation { invitationUrl: string; expiresAtUtc: string; hostName: string; }
@Component({
  selector: 'app-host-access-link', standalone: true, imports: [DatePipe],
  template: `
    <section aria-labelledby="host-link-title">
      <small>PRIVATE HOST PORTAL</small><h3 id="host-link-title">Host coordination link</h3>
      <p>Hosts can add travel, lodging, schedule and contact details, upload documents, and chat with your team. Updates return to this engagement.</p>
      @if (invitation(); as link) {
        <label>Private invitation for {{ link.hostName }}<input readonly [value]="link.invitationUrl" (click)="$any($event.target).select()"></label>
        <div class="actions"><button type="button" (click)="copy()">Copy link</button><a [href]="link.invitationUrl" target="_blank" rel="noopener noreferrer">Open host portal ↗</a></div>
        <p class="detail">One-time invitation · expires {{ link.expiresAtUtc | date:'short' }}. Opening it starts a private host session.</p>
      }
      <button type="button" [disabled]="busy()" (click)="create()">{{ busy() ? 'Creating…' : invitation() ? 'Create replacement link' : 'Create secure host link' }}</button>
      <p class="detail">Creating a link replaces any earlier invitation and host session for this engagement.</p>
      @if (message()) { <p role="status">{{ message() }}</p> }
    </section>
  `,
  styles: [`section{background:#fff;border:1px solid #dde3d9;border-radius:14px;padding:22px;margin-bottom:18px;color:#26362b}small{font-size:10px;letter-spacing:.12em;color:#677653}h3{margin:7px 0;font-size:20px}p{font-size:13px;line-height:1.5;color:#657063}label{display:block;font-size:12px;font-weight:600}input{display:block;box-sizing:border-box;width:100%;padding:10px;border:1px solid #ccd5c9;border-radius:7px;margin-top:7px;background:#f8faf6}.actions{display:flex;align-items:center;gap:16px;margin:12px 0}button{border:0;border-radius:7px;background:#334f36;color:white;padding:10px 14px;font:inherit;font-size:13px;cursor:pointer}button:disabled{opacity:.6}a{color:#345838;font-weight:600;font-size:13px}.detail{font-size:11px}`],
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
