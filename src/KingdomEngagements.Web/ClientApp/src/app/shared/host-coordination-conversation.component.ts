import { DatePipe } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, Output, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import { EngagementRealtimeService } from '../core/engagement-realtime.service';
import { EngagementDemoRoleService } from '../core/engagement-demo-role.service';
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
          <h3>Host conversation</h3>
          <p>Messages here stay with the engagement and are shared with the host in real time.</p>
        </div>
        <div class="conversation-actions">
          @if (thread().isClosed) {
            <span class="thread-state closed">Closed</span>
          }
          <span class="connection-state" [class.is-live]="live()">
            {{ live() ? 'Live' : 'Saved' }}
          </span>
          @if (roles.canDirectEngagements()) {
            <details class="conversation-menu">
              <summary aria-label="Conversation options">•••</summary>
              <div class="conversation-menu-panel">
                <strong>{{ thread().isClosed ? 'Conversation closed' : 'Conversation open' }}</strong>
                @if (thread().isClosed && thread().closedByName) {
                  <span>
                    Closed by {{ thread().closedByName }}
                    @if (thread().closedAtUtc) { · {{ thread().closedAtUtc | date:'short' }} }
                  </span>
                } @else {
                  <span>The host and ministry team can send messages.</span>
                }
                <button
                  type="button"
                  [class.reopen]="thread().isClosed"
                  [disabled]="changingState()"
                  (click)="setConversationClosed(!thread().isClosed, $event)">
                  {{ changingState()
                    ? 'Updating…'
                    : thread().isClosed
                      ? 'Reopen conversation'
                      : 'Close conversation' }}
                </button>
              </div>
            </details>
          }
        </div>
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
              @if (message.senderType === 'system') {
                <div class="system-message">
                  <span>{{ message.message }}</span>
                  <time>{{ message.createdAtUtc | date:'short' }}</time>
                </div>
              } @else {
                <article class="message" [class.from-host]="message.senderType === 'host'">
                  <div>
                    <strong>{{ message.senderName }}</strong>
                    <time>{{ message.createdAtUtc | date:'short' }}</time>
                  </div>
                  <p>{{ message.message }}</p>
                </article>
              }
            }
          }
        </div>

        @if (thread().isClosed) {
          <div class="closed-banner">
            <div>
              <strong>Conversation closed</strong>
              <span>Previous messages stay available, but new messages are paused.</span>
            </div>
            @if (roles.canDirectEngagements()) {
              <button type="button" [disabled]="changingState()" (click)="setConversationClosed(false, $event)">
                {{ changingState() ? 'Reopening…' : 'Reopen' }}
              </button>
            }
          </div>
        } @else {
          <form (submit)="send($event)">
            <textarea
              rows="2"
              maxlength="4000"
              [disabled]="sending()"
              [value]="draft()"
              (input)="draft.set($any($event.target).value)"
              placeholder="Send a coordination update…"></textarea>
            <button type="submit" [disabled]="sending() || !draft().trim()">
              {{ sending() ? 'Sending…' : 'Send message' }}
            </button>
          </form>
        }
      }
    </section>
  `,
  styles: [`
    :host{
      display:block;
      min-height:0;
      --conversation-height:min(600px,calc(100vh - 235px));
      --conversation-min-height:430px
    }
    .conversation-card{
      display:flex;
      height:var(--conversation-height);
      min-height:var(--conversation-min-height);
      flex-direction:column;
      overflow:hidden;
      border:1px solid #d5ddda;
      border-radius:14px;
      background:#fbfbf8
    }
    header{
      display:flex;
      flex:0 0 auto;
      justify-content:space-between;
      align-items:flex-start;
      gap:24px;
      padding:16px 18px;
      border-bottom:1px solid #dfe4e1;
      background:linear-gradient(180deg,#f8f9f6 0%,#f4f5f2 100%)
    }
    h3{
      margin:3px 0 5px;
      color:#213640;
      font:500 1.08rem/1.2 Georgia,'Times New Roman',serif;
      letter-spacing:-.015em
    }
    .eyebrow{
      color:#6a7880;
      font-size:.62rem;
      font-weight:850;
      letter-spacing:.13em
    }
    header p,.empty-state,.error-state{
      margin:0;
      color:#748087;
      font-size:.72rem;
      line-height:1.5
    }

    .conversation-actions{
      display:flex;
      align-items:center;
      gap:7px
    }
    .thread-state,.connection-state{
      padding:5px 9px;
      border:1px solid #d5dbd8;
      border-radius:999px;
      color:#68757a;
      background:#eff1ee;
      font-size:.58rem;
      font-weight:850;
      white-space:nowrap
    }
    .thread-state.closed{
      border-color:#d4d9d6;
      color:#727b77;
      background:#e9ebe8
    }
    .connection-state.is-live{
      border-color:#c6dbe4;
      color:#31657e;
      background:#eaf3f6
    }

    .conversation-menu{position:relative}
    .conversation-menu summary{
      display:grid;
      width:34px;
      height:34px;
      place-items:center;
      border:1px solid #d3dad7;
      border-radius:8px;
      color:#5e6b72;
      background:#fbfbf8;
      cursor:pointer;
      list-style:none;
      font-weight:900;
      letter-spacing:.08em
    }
    .conversation-menu summary::-webkit-details-marker{display:none}
    .conversation-menu-panel{
      position:absolute;
      z-index:20;
      top:40px;
      right:0;
      display:grid;
      width:270px;
      gap:6px;
      padding:12px;
      border:1px solid #d6ddda;
      border-radius:10px;
      background:#fbfbf8;
      box-shadow:0 12px 28px rgba(18,26,44,.14)
    }
    .conversation-menu-panel strong{font-size:.74rem}
    .conversation-menu-panel span{
      color:#737c78;
      font-size:.62rem;
      line-height:1.4
    }
    .conversation-menu-panel button{
      width:100%;
      margin-top:4px;
      background:#8f3d50
    }
    .conversation-menu-panel button.reopen{background:#356b54}

    .message-list{
      display:flex;
      min-height:0;
      flex:1 1 auto;
      flex-direction:column;
      gap:11px;
      overflow-y:auto;
      overscroll-behavior:contain;
      scrollbar-gutter:stable;
      padding:18px 20px 22px;
      background:#eceeeb
    }
    .message-list>.empty-state{
      margin:auto;
      text-align:center
    }
    .message{
      max-width:min(76%,720px);
      margin-left:auto;
      padding:11px 13px;
      border:1px solid #cadde6;
      border-radius:12px 12px 4px 12px;
      background:#e8f2f6;
      box-shadow:0 2px 8px rgba(8,39,53,.025)
    }
    .message.from-host{
      margin-right:auto;
      margin-left:0;
      border-color:#d8ddda;
      border-radius:12px 12px 12px 4px;
      background:#fbfbf8
    }
    .message div{
      display:flex;
      justify-content:space-between;
      gap:12px
    }
    .message strong{
      color:#253840;
      font-size:.73rem
    }
    .message time{
      color:#8a9498;
      font-size:.61rem
    }
    .message p{
      margin:5px 0 0;
      color:#273942;
      white-space:pre-wrap;
      font-size:.79rem;
      line-height:1.48
    }
    .system-message{
      align-self:center;
      display:flex;
      gap:7px;
      align-items:center;
      margin:2px 0;
      padding:5px 9px;
      border-radius:999px;
      color:#727b77;
      background:#dfe2df;
      font-size:.59rem
    }
    .system-message time{
      color:#909793;
      font-size:.54rem
    }

    form{
      display:flex;
      flex:0 0 auto;
      gap:10px;
      align-items:flex-end;
      padding:12px 14px;
      border-top:1px solid #dce1de;
      background:#f7f8f5
    }
    textarea{
      flex:1;
      min-height:48px;
      max-height:120px;
      resize:vertical;
      padding:11px 12px;
      border:1px solid #cfd7d4;
      border-radius:10px;
      outline:none;
      color:#273942;
      background:#fbfbf8;
      font:inherit
    }
    textarea:focus{
      border-color:#7ca5b8;
      box-shadow:0 0 0 3px rgba(55,111,141,.08)
    }
    button{
      min-height:42px;
      padding:0 16px;
      border:0;
      border-radius:9px;
      color:#fff;
      background:#113c50;
      font-weight:800;
      cursor:pointer
    }
    button:disabled{
      cursor:not-allowed;
      opacity:.55
    }

    .closed-banner{
      display:flex;
      flex:0 0 auto;
      justify-content:space-between;
      align-items:center;
      gap:14px;
      padding:12px 14px;
      border-top:1px solid #dce1de;
      background:#eceeeb
    }
    .closed-banner strong,.closed-banner span{display:block}
    .closed-banner strong{font-size:.72rem}
    .closed-banner span{
      margin-top:2px;
      color:#737c78;
      font-size:.62rem
    }
    .closed-banner button{
      min-height:36px;
      background:#356b54
    }
    .error-state{
      padding:18px 20px;
      color:#b42318
    }

    @media(max-width:720px){
      .conversation-card{
        height:65vh;
        min-height:430px
      }
      header{
        gap:12px;
        padding:15px 16px
      }
      .conversation-actions{
        align-items:flex-end;
        flex-direction:column
      }
      .conversation-menu-panel{right:0}
      .message-list{padding:14px}
      .message{max-width:94%}
      form{
        align-items:stretch;
        flex-direction:column
      }
      .closed-banner{
        align-items:stretch;
        flex-direction:column
      }
      .closed-banner button,form>button{width:100%}
    }
  `],
})
export class HostCoordinationConversationComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Output() readonly threadChanged = new EventEmitter<HostCoordinationThread>();
  @Input({ required: true }) assignmentId = '';
  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;

  readonly thread = signal<HostCoordinationThread>({
    isClosed: false,
    closedAtUtc: null,
    closedByName: null,
    messages: [],
  });
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly changingState = signal(false);
  readonly live = signal(false);
  readonly error = signal('');
  readonly draft = signal('');

  private disconnectRealtime: (() => Promise<void>) | null = null;
  private scrollLatestPending = false;

  constructor(
    private readonly api: EngagementsApiService,
    private readonly realtime: EngagementRealtimeService,
    readonly roles: EngagementDemoRoleService,
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

  async setConversationClosed(isClosed: boolean, event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();

    if (!this.roles.canDirectEngagements() || this.changingState()) return;

    if (isClosed) {
      const confirmed = globalThis.confirm(
        'Close this conversation? The host and ministry team will not be able to send new messages until an administrator or coordinator reopens it.',
      );
      if (!confirmed) return;
    }

    this.changingState.set(true);
    this.error.set('');

    try {
      const thread = await firstValueFrom(
        this.api.setHostConversationClosed(this.assignmentId, isClosed),
      );
      this.thread.set(thread);
      this.threadChanged.emit(thread);
      this.requestScrollToLatest();
    } catch {
      this.error.set(
        isClosed
          ? 'The conversation could not be closed.'
          : 'The conversation could not be reopened.',
      );
    } finally {
      this.changingState.set(false);
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
