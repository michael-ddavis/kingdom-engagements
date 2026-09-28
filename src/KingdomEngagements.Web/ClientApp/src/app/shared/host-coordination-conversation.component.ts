import { DatePipe } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, Output, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
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
  imports: [DatePipe],
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
        <div #messageList class="message-list" aria-live="polite">
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
            rows="2"
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
    :host{display:block;min-height:0;--conversation-height:min(600px,calc(100vh - 235px))}.conversation-card{display:flex;height:var(--conversation-height);min-height:430px;flex-direction:column;overflow:hidden;border:1px solid #e1ddd4;border-radius:14px;background:#fff}
    header{display:flex;flex:0 0 auto;justify-content:space-between;gap:24px;align-items:flex-start;padding:18px 20px;border-bottom:1px solid #ece8df}
    h3{margin:3px 0 5px;font-size:1.1rem}.eyebrow{font-size:.68rem;font-weight:800;letter-spacing:.13em;color:#687387}
    header p,.empty-state,.error-state{margin:0;color:#687387;font-size:.84rem;line-height:1.5}
    .connection-state{border:1px solid #d9d3c7;border-radius:999px;padding:6px 10px;background:#f7f5ef;color:#687387;font-size:.72rem;font-weight:800;white-space:nowrap}
    .connection-state.is-live{border-color:#b9d8c1;background:#edf8ef;color:#2f6b3b}
    .message-list{display:flex;min-height:0;flex:1 1 auto;flex-direction:column;gap:10px;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding:16px 18px 20px;background:#fbfaf7}
    .message-list>.empty-state{margin:auto;text-align:center}
    .message{max-width:min(80%,720px);margin-left:auto;border:1px solid #d7e0ea;border-radius:12px;padding:11px 13px;background:#f1f6fb}
    .message.from-host{margin-right:auto;margin-left:0;border-color:#e1ddd4;background:#fff}.message div{display:flex;justify-content:space-between;gap:12px}.message strong{font-size:.78rem}.message time{font-size:.68rem;color:#8a94a4}.message p{margin:5px 0 0;white-space:pre-wrap;font-size:.84rem;line-height:1.45}
    form{display:flex;flex:0 0 auto;gap:10px;align-items:flex-end;border-top:1px solid #ece8df;padding:12px 14px;background:#fff}textarea{flex:1;min-height:46px;max-height:120px;resize:vertical;border:1px solid #d9d3c7;border-radius:9px;padding:10px 12px;font:inherit}button{min-height:42px;border:0;border-radius:8px;padding:0 16px;background:#17365d;color:#fff;font-weight:800;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}.error-state{padding:18px 20px;color:#b42318}
    @media(max-width:720px){.conversation-card{height:65vh;min-height:430px}header{gap:12px;padding:15px 16px}.message-list{padding:14px}.message{max-width:94%}form{align-items:stretch;flex-direction:column}button{width:100%}}
  `],
})
export class HostCoordinationConversationComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Output() readonly threadChanged = new EventEmitter<HostCoordinationThread>();
  @Input({ required: true }) assignmentId = '';
  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;

  readonly thread = signal<HostCoordinationThread>({ isClosed: false, messages: [] });
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly live = signal(false);
  readonly error = signal('');
  readonly draft = signal('');

  private disconnectRealtime: (() => Promise<void>) | null = null;
  private scrollLatestPending = false;

  constructor(
    private readonly api: EngagementsApiService,
    private readonly realtime: EngagementRealtimeService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load(true);
    await this.connectRealtime();
  }

  ngOnDestroy(): void {
    void this.disconnectRealtime?.();
  }

  ngAfterViewChecked(): void {
    if (!this.scrollLatestPending) return;
    this.scrollLatestPending = false;
    this.scrollToLatest();
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
      this.threadChanged.emit(thread);
      this.draft.set('');
      this.requestScrollToLatest();
    } catch {
      this.error.set('The coordination message could not be sent.');
    } finally {
      this.sending.set(false);
    }
  }

  private async load(scrollToLatest = false): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const thread = await firstValueFrom(
        this.api.getHostCoordinationMessages(this.assignmentId),
      );
      this.thread.set(thread);
      this.threadChanged.emit(thread);
      if (scrollToLatest) this.requestScrollToLatest();
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
            if (event.assignmentId === this.assignmentId) void this.load(false);
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

    const shouldFollowLatest = this.isNearLatest();
    this.thread.set({
      ...current,
      messages: [...current.messages, event.message],
    });
    this.threadChanged.emit(this.thread());
    if (shouldFollowLatest) this.requestScrollToLatest();
  }

  private requestScrollToLatest(): void {
    this.scrollLatestPending = true;
  }

  private scrollToLatest(): void {
    const element = this.messageList?.nativeElement;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }

  private isNearLatest(): boolean {
    const element = this.messageList?.nativeElement;
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight < 96;
  }
}
