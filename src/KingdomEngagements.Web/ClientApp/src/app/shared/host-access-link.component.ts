import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, signal } from '@angular/core';

interface HostInvitation { invitationUrl: string; expiresAtUtc: string; hostName: string; }
@Component({
  selector: 'app-host-access-link', standalone: true, imports: [DatePipe],
  template: `
    <section class="host-link-bar" aria-label="Private host link">
      <div class="link-status">
        <small>SECURE HOST ACCESS</small>
        <div class="link-copy">
          @if (invitation(); as link) {
            <strong>Host link ready for {{ link.hostName }}</strong>
            <span>Private access · expires {{ link.expiresAtUtc | date:'shortDate' }}</span>
          } @else {
            <strong>No host link created</strong>
            <span>Create a private link when you are ready to invite the host into coordination.</span>
          }
        </div>
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
    .host-link-bar{
      position:relative;
      display:flex;
      flex:0 0 auto;
      align-items:center;
      justify-content:space-between;
      gap:18px;
      margin-bottom:10px;
      padding:11px 13px;
      border:1px solid #d5ddda;
      border-radius:12px;
      background:#f8f8f5;
      color:#26363e
    }
    .link-status{
      display:flex;
      min-width:0;
      align-items:center;
      gap:12px
    }
    .link-status>small{
      flex:0 0 auto;
      color:#7f6c41;
      font-size:.52rem;
      font-weight:850;
      letter-spacing:.1em
    }
    .link-copy{
      display:grid;
      min-width:0;
      gap:2px
    }
    .link-copy strong{
      overflow:hidden;
      color:#283940;
      font-size:.66rem;
      text-overflow:ellipsis;
      white-space:nowrap
    }
    .link-copy span{
      overflow:hidden;
      color:#7c8784;
      font-size:.56rem;
      text-overflow:ellipsis;
      white-space:nowrap
    }

    .link-actions{
      display:flex;
      flex:0 0 auto;
      align-items:center;
      gap:6px
    }
    .link-actions button,.link-actions a,.link-actions summary{
      display:inline-flex;
      min-height:32px;
      align-items:center;
      justify-content:center;
      border-radius:8px;
      font:inherit;
      font-size:.59rem;
      font-weight:800;
      white-space:nowrap
    }
    .link-actions button{
      padding:0 11px;
      border:0;
      color:#fff;
      background:#356b54;
      cursor:pointer
    }
    .link-actions button:disabled{opacity:.6;cursor:default}
    .link-actions a{
      padding:0 9px;
      border:1px solid #ccd6d2;
      color:#315f74;
      background:#fbfbf8;
      text-decoration:none
    }
    .link-actions details{position:relative}
    .link-actions summary{
      width:34px;
      border:1px solid #d1d8d5;
      color:#5f6d72;
      background:#fbfbf8;
      cursor:pointer;
      list-style:none
    }
    .link-actions summary::-webkit-details-marker{display:none}

    .more-menu{
      position:absolute;
      z-index:10;
      top:38px;
      right:0;
      width:250px;
      padding:11px;
      border:1px solid #d5dcd9;
      border-radius:10px;
      background:#fbfbf8;
      box-shadow:0 12px 28px rgba(18,26,44,.12)
    }
    .more-menu p{
      margin:0 0 9px;
      color:#687471;
      font-size:.6rem;
      line-height:1.45
    }
    .link-actions .secondary{
      width:100%;
      border:1px solid #cdd6d2;
      color:#356b54;
      background:#fbfbf8
    }
    .message{
      position:absolute;
      z-index:5;
      top:100%;
      right:10px;
      margin-top:4px;
      padding:5px 8px;
      border:1px solid #cfe0d2;
      border-radius:7px;
      color:#345838;
      background:#f3f8f4;
      font-size:.58rem;
      font-weight:750
    }

    @media(max-width:700px){
      .host-link-bar{
        align-items:flex-start;
        flex-direction:column
      }
      .link-status{
        align-items:flex-start;
        flex-direction:column;
        gap:4px
      }
      .link-copy span{
        white-space:normal
      }
      .link-actions{
        width:100%
      }
      .link-actions>button:first-child{flex:1}
      .more-menu{right:auto;left:0}
    }
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
