import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import { EngagementRealtimeService } from '../core/engagement-realtime.service';
import { HostCoordinationMessage, HostCoordinationThread } from '../core/models';

interface MessageCreatedEvent {
  assignmentId: string;
  message: HostCoordinationMessage;
}

interface CoordinationUpdatedEvent {
  assignmentId: string;
}

@Component({
  selector: 'app-host-coordination-conversation',
  standalone: true,
  template: `
    <section class="conversation-card">
      <header>
        <div>
          <span class="eyebrow">HOST COORDINATION</span>
          <h3>Conversation</h3>
          <p>Messages are saved to this engagement and delivered to the host in real time.</p>
        </div>
        <span class="connection-state" [class.is-live]="live()">
          {{ live() ? 'Live' : 'Saved updates' }}
        </span>
      </header>

      @if (loading()) {
        <p class="empty-state">Loading conversation…</p>
      } @else if (error()) {
        <p class="error-state">{{ error() }}</p>
      } @else {
        <div class="message-list" aria-live="polite">
          @if (thread().messages.length === 0) {
            <p class="empty-state">No coordination messages yet.</p>
          } @else {
            @for (message of thread().messages; track message.id) {
              <article class="message" [class.from-host]="message.senderType === 'host'">
                <div>
                  <strong>{{ message.senderName }}</strong>
                  <time>{{ message.createdAtUtc | date:'short' }}</time>
                </div>
                <p>{{ message.message }}</p>
              </article>
            }
          }
        </div>

        <form (submit)="send($event)">
          <textarea
            rows="3"
            maxlength="4000"
            [disabled]="thread().isClosed || sending()"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
            placeholder="Send a coordination update…"></textarea>
          <button type="submit" [disabled]="thread().isClosed || sending() || !draft().trim()">
            {{ thread().isClosed ? 'Conversation closed' : sending() ? 'Sending…' : 'Send message' }}
          </button>
        </form>
      }
    </section>
  `,
  styles: [`
    .conversation-card{margin-top:24px;border:1px solid #e1ddd4;border-radius:14px;background:#fff;padding:20px}
    header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:18px}
    h3{margin:3px 0 5px;font-size:1.1rem}.eyebrow{font-size:.68rem;font-weight:800;letter-spacing:.13em;color:#687387}
    header p,.empty-state,.error-state{margin:0;color:#687387;font-size:.84rem;line-height:1.5}
    .connection-state{border:1px solid #d9d3c7;border-radius:999px;padding:6px 10px;background:#f7f5ef;color:#687387;font-size:.72rem;font-weight:800;white-space:nowrap}
    .connection-state.is-live{border-color:#b9d8c1;background:#edf8ef;color:#2f6b3b}
    .message-list{display:grid;gap:10px;max-height:320px;overflow:auto;padding:2px 2px 16px}
    .message{max-width:80%;border:1px solid #e1ddd4;border-radius:12px;padding:11px 13px;background:#faf9f6}
    .message.from-host{margin-left:auto;background:#f1f6fb}.message div{display:flex;justify-content:space-between;gap:12px}.message strong{font-size:.78rem}.message time{font-size:.68rem;color:#8a94a4}.message p{margin:5px 0 0;white-space:pre-wrap;font-size:.84rem;line-height:1.45}
    form{display:flex;gap:10px;align-items:flex-end;border-top:1px solid #ece8df;padding-top:14px}textarea{flex:1;resize:vertical;border:1px solid #d9d3c7;border-radius:9px;padding:10px 12px;font:inherit}button{min-height:42px;border:0;border-radius:8px;padding:0 16px;background:#17365d;color:#fff;font-weight:800;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}.error-state{color:#b42318}
    @media(max-width:720px){header,form{flex-direction:column}.message{max-width:94%}button{width:100%}}
  `],
})
export class HostCoordinationConversationComponent implements OnInit, OnDestroy {
  @Input({ required: true }) assignmentId = '';

  readonly thread = signal<HostCoordinationThread>({ isClosed: false, messages: [] });
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly live = signal(false);
  readonly error = signal('');
  readonly draft = signal('');

  private disconnectRealtime: (() => Promise<void>) | null = null;

  constructor(
    private readonly api: EngagementsApiService,
    private readonly realtime: EngagementRealtimeService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
    await this.connectRealtime();
  }

  ngOnDestroy(): void {
    void this.disconnectRealtime?.();
  }

  async send(event: Event): Promise<void> {
    event.preventDefault();

    const message = this.draft().trim();
    if (!message || this.thread().isClosed || this.sending()) return;

    this.sending.set(true);
    this.error.set('');

    try {
      const thread = await firstValueFrom(
        this.api.sendHostCoordinationMessage(this.assignmentId, message),
      );
      this.thread.set(thread);
      this.draft.set('');
    } catch {
      this.error.set('The coordination message could not be sent.');
    } finally {
      this.sending.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const thread = await firstValueFrom(
        this.api.getHostCoordinationMessages(this.assignmentId),
      );
      this.thread.set(thread);
    } catch {
      this.error.set('The host coordination conversation is not available.');
    } finally {
      this.loading.set(false);
    }
  }

  private async connectRealtime(): Promise<void> {
    try {
      this.disconnectRealtime = await this.realtime.connect(
        this.assignmentId,
        {
          messageCreated: payload => this.applyMessage(payload as MessageCreatedEvent),
          coordinationUpdated: payload => {
            const event = payload as CoordinationUpdatedEvent;
            if (event.assignmentId === this.assignmentId) void this.load();
          },
          connectionChanged: connected => this.live.set(connected),
        },
      );
    } catch {
      this.live.set(false);
    }
  }

  private applyMessage(event: MessageCreatedEvent): void {
    if (event.assignmentId !== this.assignmentId || !event.message) return;

    const current = this.thread();
    if (current.messages.some(message => message.id === event.message.id)) return;

    this.thread.set({
      ...current,
      messages: [...current.messages, event.message],
    });
  }
}
