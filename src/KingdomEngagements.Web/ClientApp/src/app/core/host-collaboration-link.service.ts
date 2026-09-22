import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { AssignmentWorkspaceEnvelope } from './models';
import { MutationToastService } from './mutation-toast.service';

interface HostAccessInvitationResponse {
  invitationUrl: string;
  expiresAtUtc: string;
  hostName: string;
  hostEmail?: string | null;
}

interface HostCoordinationMessage {
  id: string;
  senderType: 'host' | 'ministry';
  senderName: string;
  message: string;
  createdAtUtc: string;
}

interface HostCoordinationThread {
  isClosed: boolean;
  messages: HostCoordinationMessage[];
}

interface EngagementRealtimeEvent {
  type: 'message-created' | 'coordination-updated' | 'document-added';
  assignmentId: string;
  payload: unknown;
}

@Injectable({ providedIn: 'root' })
export class HostCollaborationLinkService {
  private readonly cardId = 'apostolos-host-collaboration-link';
  private readonly styleId = `${this.cardId}-styles`;
  private readonly collaborationSyncKey = 'apostolos.engagement-collaboration-sync';
  private mounted = false;
  private requestVersion = 0;

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly toasts: MutationToastService,
  ) {}

  mount(): void {
    if (this.mounted || typeof window === 'undefined' || typeof document === 'undefined') return;
    this.mounted = true;
    this.ensureStyles();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.refresh());

    window.addEventListener('storage', event => this.handleCollaborationSync(event));
    window.addEventListener('apostolos:engagement-realtime', event => {
      this.handleRealtimeUpdate(event as CustomEvent<EngagementRealtimeEvent>);
    });
    window.setTimeout(() => this.refresh(), 0);
  }

  private refresh(): void {
    this.requestVersion += 1;
    const version = this.requestVersion;
    document.getElementById(this.cardId)?.remove();

    if (!this.isCtg()) return;

    const assignmentId = this.currentAssignmentId();
    if (!assignmentId) return;

    this.http.get<AssignmentWorkspaceEnvelope>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/workspace`,
    ).subscribe({
      next: envelope => {
        if (version !== this.requestVersion) return;
        this.mountCard(assignmentId, envelope, version);
      },
      error: () => {
        // The assignment page owns its normal load/error state. This enhancement
        // should never make the workspace fail just because a host link is unavailable.
      },
    });
  }

  private mountCard(
    assignmentId: string,
    envelope: AssignmentWorkspaceEnvelope,
    version: number,
    attempt = 0,
  ): void {
    if (version !== this.requestVersion) return;
    if (!window.location.pathname.includes(`/assignments/${assignmentId}`)) return;
    if (document.getElementById(this.cardId)) return;

    const heading = document.querySelector<HTMLElement>('.legacy-workspace-heading');
    if (!heading) {
      if (attempt < 24) {
        window.setTimeout(() => this.mountCard(assignmentId, envelope, version, attempt + 1), 75);
      }
      return;
    }

    const preparation = envelope.workspace.preparation;
    const collaborationLive = preparation.termsStatus === 'accepted';

    const card = document.createElement('section');
    card.id = this.cardId;
    card.className = 'apostolos-host-collaboration';
    card.setAttribute('aria-label', 'Host collaboration link');

    const copy = document.createElement('div');
    copy.className = 'apostolos-host-collaboration__copy';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'apostolos-host-collaboration__eyebrow';
    eyebrow.textContent = 'HOST COLLABORATION';

    const titleRow = document.createElement('div');
    titleRow.className = 'apostolos-host-collaboration__title-row';

    const title = document.createElement('strong');
    title.textContent = 'Share the same engagement with the host';

    const badge = document.createElement('span');
    badge.className = `apostolos-host-collaboration__badge ${collaborationLive ? 'is-live' : ''}`;
    badge.textContent = collaborationLive ? 'Coordination live' : 'Host setup';

    titleRow.append(title, badge);

    const detail = document.createElement('p');
    detail.textContent = collaborationLive
      ? 'Create a one-time secure host invitation for this engagement. Creating a new link revokes any previous host link or active host session.'
      : 'Create a one-time secure host invitation. The host accepts the terms first, then continues into coordination on this same engagement.';

    const linkLine = document.createElement('code');
    linkLine.className = 'apostolos-host-collaboration__url';
    linkLine.textContent = 'Secure host links are generated on demand and are never stored in readable form.';
    linkLine.title = 'Create a secure link when you are ready to send it to the host.';

    copy.append(eyebrow, titleRow, detail, linkLine);

    const actions = document.createElement('div');
    actions.className = 'apostolos-host-collaboration__actions';

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Create & copy link';
    copyButton.title = 'Creating a new link revokes any previous host link or active host session.';
    copyButton.addEventListener('click', async () => {
      const originalText = copyButton.textContent;
      copyButton.disabled = true;
      copyButton.textContent = 'Creating…';

      try {
        const invitation = await this.issueHostInvitation(assignmentId);
        await navigator.clipboard.writeText(invitation.invitationUrl);
        linkLine.textContent = `Secure link created · expires ${new Date(invitation.expiresAtUtc).toLocaleString()}`;
        this.toasts.success('New secure host invitation copied. Previous host access was revoked.');
      } catch {
        this.toasts.error('The secure host invitation could not be created or copied.');
      } finally {
        copyButton.disabled = false;
        copyButton.textContent = originalText;
      }
    });

    const refreshButton = document.createElement('button');
    refreshButton.type = 'button';
    refreshButton.textContent = 'Refresh';
    refreshButton.title = 'Reload the latest host collaboration changes';
    refreshButton.addEventListener('click', () => window.location.reload());

    const revokeButton = document.createElement('button');
    revokeButton.type = 'button';
    revokeButton.textContent = 'Revoke access';
    revokeButton.title = 'Immediately invalidates the current host link and host session.';
    revokeButton.addEventListener('click', async () => {
      revokeButton.disabled = true;

      try {
        const result = await this.revokeHostAccess(assignmentId);
        linkLine.textContent = result.revoked
          ? 'Host access revoked. Create a new secure link when access is needed again.'
          : 'No active host access was found.';
        this.toasts.success(result.revoked ? 'Host access revoked.' : 'There was no active host access to revoke.');
      } catch {
        this.toasts.error('Host access could not be revoked.');
      } finally {
        revokeButton.disabled = false;
      }
    });

    actions.append(copyButton, refreshButton, revokeButton);

    const conversation = this.createConversation(assignmentId);
    card.append(copy, actions, conversation);
    heading.insertAdjacentElement('afterend', card);

    void this.loadConversation(assignmentId, conversation);
  }

  private createConversation(assignmentId: string): HTMLElement {
    const conversation = document.createElement('section');
    conversation.className = 'apostolos-host-conversation';
    conversation.dataset['assignmentId'] = assignmentId;
    conversation.innerHTML = `
      <div class="apostolos-host-conversation__heading">
        <div>
          <span>COORDINATION MESSAGES</span>
          <strong>Host ↔ ministry team</strong>
        </div>
        <small>Saved to this engagement</small>
      </div>
      <div class="apostolos-host-conversation__messages" role="log" aria-live="polite">
        <p class="apostolos-host-conversation__empty">Loading messages…</p>
      </div>
      <div class="apostolos-host-conversation__composer">
        <textarea rows="2" maxlength="4000" placeholder="Send the host a coordination message."></textarea>
        <button type="button">Send</button>
      </div>
    `;

    const input = conversation.querySelector<HTMLTextAreaElement>('textarea');
    const sendButton = conversation.querySelector<HTMLButtonElement>('.apostolos-host-conversation__composer button');

    sendButton?.addEventListener('click', () => {
      if (input && sendButton) {
        void this.sendMessage(assignmentId, input, sendButton, conversation);
      }
    });

    input?.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && sendButton) {
        event.preventDefault();
        void this.sendMessage(assignmentId, input, sendButton, conversation);
      }
    });

    return conversation;
  }

  private async loadConversation(
    assignmentId: string,
    conversation?: HTMLElement,
  ): Promise<void> {
    const target = conversation
      ?? document.querySelector<HTMLElement>(
        `.apostolos-host-conversation[data-assignment-id="${CSS.escape(assignmentId)}"]`,
      );
    if (!target) return;

    try {
      const thread = await firstValueFrom(
        this.http.get<HostCoordinationThread>(
          `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/preparation/messages`,
        ),
      );
      this.renderConversation(target, thread);
    } catch {
      const list = target.querySelector<HTMLElement>('.apostolos-host-conversation__messages');
      if (list) {
        list.innerHTML = '<p class="apostolos-host-conversation__empty">Messages are unavailable for this engagement.</p>';
      }
    }
  }

  private async sendMessage(
    assignmentId: string,
    input: HTMLTextAreaElement,
    sendButton: HTMLButtonElement,
    conversation: HTMLElement,
  ): Promise<void> {
    const message = input.value.trim();
    if (!message) {
      this.toasts.error('Write a message before sending.');
      return;
    }

    sendButton.disabled = true;
    sendButton.textContent = 'Sending…';

    try {
      const thread = await firstValueFrom(
        this.http.post<HostCoordinationThread>(
          `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/preparation/messages`,
          { message },
        ),
      );

      input.value = '';
      this.renderConversation(conversation, thread);
    } catch {
      this.toasts.error('The coordination message could not be sent.');
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = 'Send';
    }
  }

  private renderConversation(
    conversation: HTMLElement,
    thread: HostCoordinationThread,
  ): void {
    const list = conversation.querySelector<HTMLElement>('.apostolos-host-conversation__messages');
    const input = conversation.querySelector<HTMLTextAreaElement>('textarea');
    const sendButton = conversation.querySelector<HTMLButtonElement>('.apostolos-host-conversation__composer button');
    if (!list || !input || !sendButton) return;

    list.innerHTML = thread.messages.length
      ? thread.messages.map(message => {
          const ownMessage = message.senderType === 'ministry';
          const sender = ownMessage ? 'Ministry team' : message.senderName;
          return `
            <article class="apostolos-host-conversation__message ${ownMessage ? 'is-internal' : 'is-host'}">
              <div><strong>${this.escapeText(sender)}</strong><time>${this.escapeText(new Date(message.createdAtUtc).toLocaleString())}</time></div>
              <p>${this.escapeText(message.message)}</p>
            </article>`;
        }).join('')
      : '<p class="apostolos-host-conversation__empty">No messages yet. Start the conversation when a host detail needs clarification.</p>';

    input.disabled = thread.isClosed;
    sendButton.disabled = thread.isClosed;
    input.placeholder = thread.isClosed
      ? 'Host coordination is complete and this thread is closed.'
      : 'Send the host a coordination message.';

    if (thread.messages.length) {
      list.scrollTop = list.scrollHeight;
    }
  }

  private handleRealtimeUpdate(event: CustomEvent<EngagementRealtimeEvent>): void {
    const update = event.detail;
    const assignmentId = this.currentAssignmentId();
    if (!assignmentId || update?.assignmentId !== assignmentId) return;

    if (update.type === 'message-created') {
      void this.loadConversation(assignmentId);
      return;
    }

    this.toasts.success('The host updated this engagement. Loading the latest collaboration details…');
    window.setTimeout(() => window.location.reload(), 300);
  }

  private escapeText(value: string): string {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private issueHostInvitation(assignmentId: string): Promise<HostAccessInvitationResponse> {
    return firstValueFrom(
      this.http.post<HostAccessInvitationResponse>(
        `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/host-access/invitations`,
        {},
      ),
    );
  }

  private revokeHostAccess(assignmentId: string): Promise<{ revoked: boolean }> {
    return firstValueFrom(
      this.http.post<{ revoked: boolean }>(
        `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/host-access/revoke`,
        {},
      ),
    );
  }

  private handleCollaborationSync(event: StorageEvent): void {
    if (event.key !== this.collaborationSyncKey || !event.newValue || !this.isCtg()) return;
    const assignmentId = this.currentAssignmentId();
    if (!assignmentId) return;

    try {
      const update = JSON.parse(event.newValue) as {
        assignmentId?: string;
        source?: string;
      };
      if (update.source !== 'host' || update.assignmentId !== assignmentId) return;
      this.toasts.success('The host updated this engagement. Loading the latest collaboration details…');
      window.setTimeout(() => window.location.reload(), 300);
    } catch {
      // Ignore malformed collaboration signals. Server persistence remains authoritative.
    }
  }

  private currentAssignmentId(): string | null {
    const match = window.location.pathname.match(/^\/assignments\/([^/?#]+)\/?$/i);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private isCtg(): boolean {
    const storageValue = globalThis.localStorage?.getItem('kingdomos.demo-organization');
    if (storageValue) return storageValue === 'ctg';

    const cookie = document.cookie
      .split(';')
      .map(item => item.trim())
      .find(item => item.startsWith('KingdomOS.DemoOrganization='));
    return !cookie || decodeURIComponent(cookie.split('=').slice(1).join('=')) === 'ctg';
  }

  private ensureStyles(): void {
    if (document.getElementById(this.styleId)) return;

    const style = document.createElement('style');
    style.id = this.styleId;
    style.textContent = `
      .apostolos-host-collaboration{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:.72rem 0 1rem;padding:14px 16px;border:1px solid rgba(49,91,135,.18);border-left:4px solid var(--action-primary,#315b87);border-radius:12px;background:linear-gradient(105deg,rgba(248,250,253,.98),rgba(255,255,255,.98));box-shadow:0 8px 24px rgba(15,23,42,.06)}
      .apostolos-host-collaboration__copy{display:grid;min-width:0;gap:4px}.apostolos-host-collaboration__eyebrow{color:#667085;font-size:.61rem;font-weight:900;letter-spacing:.11em}.apostolos-host-collaboration__title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.apostolos-host-collaboration__title-row>strong{color:#17263a;font-size:.9rem;letter-spacing:-.01em}.apostolos-host-collaboration__badge{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;background:#fff4d8;color:#85621c;font-size:.59rem;font-weight:850}.apostolos-host-collaboration__badge.is-live{background:#e9f7ef;color:#236b48}.apostolos-host-collaboration p{margin:0;color:#5f6b7a;font-size:.7rem;line-height:1.45}.apostolos-host-collaboration__url{display:block;max-width:min(680px,58vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#536273;font-size:.62rem;background:transparent}.apostolos-host-collaboration__actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.apostolos-host-collaboration__actions button,.apostolos-host-collaboration__actions a{display:inline-flex;min-height:38px;align-items:center;justify-content:center;padding:0 12px;border-radius:9px;font-size:.68rem;font-weight:850;text-decoration:none;cursor:pointer}.apostolos-host-collaboration__actions button{border:1px solid #d6dce5;background:#fff;color:#334155}.apostolos-host-collaboration__actions button:hover{background:#f7f8fa}.apostolos-host-collaboration__actions button:focus-visible,.apostolos-host-collaboration__actions a:focus-visible{outline:2px solid var(--action-primary,#315b87);outline-offset:2px}
      .apostolos-host-collaboration{flex-wrap:wrap}.apostolos-host-conversation{flex:1 0 100%;display:grid;gap:10px;padding-top:12px;border-top:1px solid rgba(49,91,135,.13)}.apostolos-host-conversation__heading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.apostolos-host-conversation__heading>div{display:grid;gap:2px}.apostolos-host-conversation__heading span{color:#667085;font-size:.58rem;font-weight:900;letter-spacing:.1em}.apostolos-host-conversation__heading strong{color:#253447;font-size:.76rem}.apostolos-host-conversation__heading small{color:#7a8492;font-size:.6rem}.apostolos-host-conversation__messages{display:grid;gap:6px;max-height:190px;overflow:auto;padding-right:3px}.apostolos-host-conversation__empty{margin:0;padding:9px 10px;border:1px dashed #d9dee6;border-radius:7px;color:#7b8490;font-size:.65rem}.apostolos-host-conversation__message{max-width:82%;padding:8px 10px;border:1px solid #dfe4ea;border-radius:8px;background:#fff}.apostolos-host-conversation__message.is-internal{justify-self:end;background:#f4f7fb;border-color:#d4deea}.apostolos-host-conversation__message.is-host{justify-self:start}.apostolos-host-conversation__message>div{display:flex;justify-content:space-between;gap:12px;margin-bottom:3px;color:#7b8490;font-size:.55rem}.apostolos-host-conversation__message strong{color:#405064;font-size:.6rem}.apostolos-host-conversation__message p{margin:0;color:#354255;font-size:.66rem;line-height:1.45;white-space:pre-wrap}.apostolos-host-conversation__composer{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}.apostolos-host-conversation__composer textarea{min-height:58px;resize:vertical;padding:9px 10px;border:1px solid #d6dce5;border-radius:8px;color:#334155;font:inherit;font-size:.68rem}.apostolos-host-conversation__composer button{min-height:38px;padding:0 12px;border:1px solid var(--action-primary,#315b87);border-radius:8px;background:var(--action-primary,#315b87);color:#fff;font-size:.66rem;font-weight:850;cursor:pointer}
            @media(max-width:860px){.apostolos-host-collaboration{align-items:stretch;flex-direction:column}.apostolos-host-collaboration__url{max-width:calc(100vw - 72px)}.apostolos-host-collaboration__actions{justify-content:flex-start;flex-wrap:wrap}}
      @media(max-width:520px){.apostolos-host-conversation__composer{grid-template-columns:1fr}.apostolos-host-conversation__composer button{width:100%}.apostolos-host-conversation__message{max-width:94%}.apostolos-host-collaboration__actions{display:grid;grid-template-columns:1fr 1fr}.apostolos-host-collaboration__actions a{grid-column:1/-1}.apostolos-host-collaboration__actions button,.apostolos-host-collaboration__actions a{width:100%}.apostolos-host-collaboration__url{max-width:calc(100vw - 60px)}}
    `;
    document.head.appendChild(style);
  }
}
