import { HostCoordinationConversationComponent } from '../shared/host-coordination-conversation.component';
import { HostAccessLinkComponent } from '../shared/host-access-link.component';
import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import {
  EngagementResponsibilitySnapshot,
  HostCoordinationMessage,
  HostCoordinationThread,
} from '../core/models';

interface HostThreadView {
  snapshot: EngagementResponsibilitySnapshot;
  thread: HostCoordinationThread;
}

@Component({
  selector: 'app-ctg-host-activity',
  standalone: true,
  imports: [RouterLink, HostCoordinationConversationComponent, HostAccessLinkComponent],
  template: `
    <section class="host-page">
      <header class="host-heading">
        <div>
          <span class="page-kicker">Host coordination</span>
          <h1>Host Activity</h1>
          <p>Review recent host conversations, see new messages, and continue coordination without opening each engagement first.</p>
        </div>
        <a routerLink="/organization/ctg/command-center">← Command Center</a>
      </header>

      @if (loading()) {
        <div class="state">Loading host conversations…</div>
      } @else if (error()) {
        <div class="state error">{{ error() }}</div>
      } @else {
        <section class="host-grid">
          <aside class="host-list">
            <header>
              <div>
                <strong>Host conversations</strong>
                <span>Most recent first</span>
              </div>
              @if (unreadCount() > 0) { <span class="unread-count">{{ unreadCount() }} new</span> }
            </header>

            @for (item of threads(); track item.snapshot.assignment.id) {
              <button
                type="button"
                [class.selected]="selectedId() === item.snapshot.assignment.id"
                [class.unread]="isUnread(item)"
                (click)="selectThread(item.snapshot.assignment.id)">
                <div class="thread-identity">
                  <strong>{{ item.snapshot.assignment.hostOrganization }}</strong>
                  <span>{{ item.snapshot.assignment.title }}</span>
                </div>

                @if (isUnread(item)) {
                  <i class="unread-dot" aria-label="New host message"></i>
                }

                @if (item.thread.messages.length > 0) {
                  <p class="message-preview">{{ lastMessage(item)?.message }}</p>
                  <footer>
                    <span>{{ lastMessage(item)?.senderName }} · {{ relativeDate(lastMessage(item)!.createdAtUtc) }}</span>
                    @if (isUnread(item)) {
                      <b class="new-label">New</b>
                    } @else if (item.thread.isClosed) {
                      <b class="closed-label">Closed</b>
                    }
                  </footer>
                } @else {
                  <p class="message-preview empty">No messages yet</p>
                }
              </button>
            }
          </aside>

          <section class="conversation">
            @if (selected(); as item) {
              <header class="conversation-context">
                <div>
                  <small>Engagement</small>
                  <h2>{{ item.snapshot.assignment.hostOrganization }}</h2>
                  <p>
                    {{ item.snapshot.assignment.title }}
                    <span aria-hidden="true">·</span>
                    {{ dateLabel(item.snapshot.assignment.startsAtUtc) }}
                    <span aria-hidden="true">·</span>
                    {{ item.snapshot.assignment.location || 'Location pending' }}
                  </p>
                </div>

                <div class="coordination-status">
                  <span class="thread-status" [class.closed]="item.thread.isClosed">
                    {{ item.thread.isClosed ? 'Conversation closed' : 'Conversation open' }}
                  </span>
                  <a
                    [routerLink]="['/organization/ctg/engagements', item.snapshot.assignment.id]"
                    [queryParams]="{ lane: 'host-coordination' }">
                    View engagement
                  </a>
                </div>
              </header>

              @for (active of [item]; track active.snapshot.assignment.id) {
                <div class="conversation-body">
                  <app-host-access-link [assignmentId]="active.snapshot.assignment.id" />
                  <app-host-coordination-conversation
                    [assignmentId]="active.snapshot.assignment.id"
                    (threadChanged)="updateThread(active.snapshot.assignment.id, $event)" />
                </div>
              }
            } @else {
              <div class="state">Select a host conversation.</div>
            }
          </section>
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}
    .host-page{
      display:flex;
      width:min(1280px,calc(100% - 42px));
      height:calc(100dvh - 84px);
      min-height:620px;
      margin:0 auto;
      padding:18px 0 20px;
      flex-direction:column;
      overflow:hidden;
      color:#20313a
    }

    .host-heading{
      display:flex;
      flex:0 0 auto;
      justify-content:space-between;
      align-items:flex-end;
      gap:24px;
      margin-bottom:14px;
      padding:4px 2px 16px;
      border-bottom:1px solid #d8ddda
    }
    .page-kicker{
      display:block;
      margin-bottom:5px;
      color:#7a6842;
      font-size:.58rem;
      font-weight:850;
      letter-spacing:.12em;
      text-transform:uppercase
    }
    .host-heading h1,.conversation h2{
      margin:0;
      color:#153448;
      font:500 clamp(1.7rem,2.4vw,2.25rem)/1.08 Georgia,'Times New Roman',serif;
      letter-spacing:-.025em
    }
    .host-heading p{
      max-width:760px;
      margin:6px 0 0;
      color:#6f7b80;
      font-size:.7rem;
      line-height:1.5
    }
    .host-heading>a{
      color:#356f8d;
      font-size:.68rem;
      font-weight:800;
      text-decoration:none;
      white-space:nowrap
    }

    .host-grid{
      display:grid;
      min-height:0;
      flex:1;
      grid-template-columns:310px minmax(0,1fr);
      overflow:hidden;
      border:1px solid #d6ddda;
      border-radius:18px;
      background:#fbfbf8;
      box-shadow:0 12px 34px rgba(8,39,53,.045)
    }

    .host-list{
      min-height:0;
      overflow-y:auto;
      overscroll-behavior:contain;
      border-right:1px solid #dce1de;
      background:#eceeeb
    }
    .host-list>header{
      position:sticky;
      z-index:2;
      top:0;
      display:flex;
      min-height:58px;
      box-sizing:border-box;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      padding:12px 15px;
      border-bottom:1px solid #d9dedb;
      background:rgba(236,238,235,.96);
      backdrop-filter:blur(8px)
    }
    .host-list>header>div{
      display:grid;
      gap:2px
    }
    .host-list>header strong{
      color:#26363e;
      font-size:.72rem
    }
    .host-list>header>div span{
      color:#858f8b;
      font-size:.56rem
    }
    .unread-count{
      padding:4px 8px;
      border:1px solid #c9dce4;
      border-radius:999px;
      color:#2f627c;
      background:#eaf3f6;
      font-size:.54rem;
      font-weight:850
    }

    .host-list button{
      display:grid;
      width:100%;
      min-height:106px;
      box-sizing:border-box;
      grid-template-columns:1fr auto;
      gap:4px;
      padding:14px 15px 12px;
      border:0;
      border-bottom:1px solid #dce1de;
      color:inherit;
      background:transparent;
      text-align:left;
      cursor:pointer;
      transition:background .15s ease,box-shadow .15s ease
    }
    .host-list button:hover{
      background:#f3f4f1
    }
    .host-list button.selected{
      background:#fbfbf8;
      box-shadow:inset 3px 0 #9f814a
    }
    .host-list button.unread:not(.selected){
      background:#f2f4f2
    }
    .thread-identity strong,.thread-identity span{display:block}
    .thread-identity strong{
      color:#20323c;
      font-size:.75rem
    }
    .host-list button.unread .thread-identity strong{
      color:#153448;
      font-weight:850
    }
    .thread-identity span{
      margin-top:3px;
      color:#758087;
      font-size:.61rem
    }
    .unread-dot{
      align-self:start;
      width:8px;
      height:8px;
      margin-top:4px;
      border-radius:50%;
      background:#3e7895;
      box-shadow:0 0 0 3px rgba(62,120,149,.09)
    }
    .message-preview{
      display:-webkit-box;
      grid-column:1/-1;
      margin:8px 0 0;
      overflow:hidden;
      color:#68757a;
      font-size:.61rem;
      line-height:1.42;
      -webkit-box-orient:vertical;
      -webkit-line-clamp:2
    }
    .message-preview.empty{
      color:#949b98;
      font-style:italic
    }
    .host-list button footer{
      display:flex;
      grid-column:1/-1;
      justify-content:space-between;
      align-items:center;
      gap:8px;
      margin-top:7px
    }
    .host-list button footer span{
      color:#8a9491;
      font-size:.55rem
    }
    .new-label,.closed-label{
      padding:2px 6px;
      border-radius:999px;
      font-size:.5rem;
      font-weight:850
    }
    .new-label{
      color:#2f627c;
      background:#e7f1f5
    }
    .closed-label{
      color:#777f7b;
      background:#e7e9e6
    }

    .conversation{
      display:flex;
      min-width:0;
      min-height:0;
      flex-direction:column;
      overflow:hidden;
      background:#f7f8f5
    }
    .conversation-context{
      display:flex;
      flex:0 0 auto;
      justify-content:space-between;
      align-items:center;
      gap:20px;
      min-height:88px;
      box-sizing:border-box;
      padding:15px 20px;
      border-bottom:1px solid #dce1de;
      background:#fbfbf8
    }
    .conversation-context small{
      color:#8a713d;
      font-size:.56rem;
      font-weight:850;
      letter-spacing:.1em;
      text-transform:uppercase
    }
    .conversation h2{
      margin-top:3px;
      font-size:1.42rem
    }
    .conversation-context p{
      display:flex;
      flex-wrap:wrap;
      gap:4px;
      margin:4px 0 0;
      color:#7a858a;
      font-size:.62rem
    }
    .coordination-status{
      display:flex;
      align-items:center;
      gap:9px;
      text-align:right
    }
    .thread-status{
      display:inline-flex;
      padding:5px 9px;
      border:1px solid #c5d8cb;
      border-radius:999px;
      color:#3e7057;
      background:#edf4ef;
      font-size:.56rem;
      font-weight:850;
      white-space:nowrap
    }
    .thread-status.closed{
      border-color:#d5dad7;
      color:#727b77;
      background:#eeefed
    }
    .coordination-status a{
      padding:7px 9px;
      border-radius:8px;
      color:#356f8d;
      font-size:.61rem;
      font-weight:800;
      text-decoration:none;
      white-space:nowrap
    }
    .coordination-status a:hover{
      background:#edf1f1
    }

    .conversation-body{
      display:flex;
      min-height:0;
      flex:1;
      flex-direction:column;
      padding:12px;
      overflow:hidden;
      background:#f1f2ef
    }
    .conversation-body app-host-coordination-conversation{
      display:block;
      min-height:0;
      flex:1;
      --conversation-height:100%;
      --conversation-min-height:0
    }

    .state{
      padding:40px;
      color:#747d79;
      text-align:center
    }
    .state.error{color:#a84642}

    @media(max-width:800px){
      .host-page{
        width:min(100% - 28px,1280px);
        height:auto;
        min-height:0;
        padding-bottom:40px;
        overflow:visible
      }
      .host-heading{
        align-items:flex-start;
        flex-direction:column
      }
      .host-grid{
        height:auto;
        min-height:0;
        grid-template-columns:1fr
      }
      .host-list{
        max-height:300px;
        overflow:auto;
        border-right:0;
        border-bottom:1px solid #dce1de
      }
      .conversation-context{
        align-items:flex-start;
        flex-direction:column
      }
      .coordination-status{
        width:100%;
        justify-content:space-between
      }
      .conversation-body{
        min-height:590px;
        overflow:visible
      }
      .conversation-body app-host-coordination-conversation{
        --conversation-height:540px;
        --conversation-min-height:430px
      }
    }
  `],
})
export class CtgHostActivityComponent implements OnInit {
  readonly threads = signal<readonly HostThreadView[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly selected = computed(() =>
    this.threads().find(item => item.snapshot.assignment.id === this.selectedId()) ?? this.threads()[0] ?? null,
  );
  readonly readThrough = signal<Record<string, string>>({});
  readonly unreadCount = computed(() => this.threads().filter(item => this.isUnread(item)).length);

  private readonly readStateKey = 'apostolos.engagements.host-messages.read-through';

  constructor(private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    this.restoreReadState();
    this.api.getCommandCenter().subscribe({
      next: snapshots => this.loadThreads(snapshots),
      error: () => {
        this.error.set('Host activity could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  updateThread(id: string, thread: HostCoordinationThread): void {
    this.threads.update(items => items.map(item => item.snapshot.assignment.id === id ? { ...item, thread } : item));
    if (this.selectedId() === id) this.markReadThrough(id, thread);
  }

  selectThread(id: string): void {
    this.selectedId.set(id);
    const item = this.threads().find(thread => thread.snapshot.assignment.id === id);
    if (item) this.markReadThrough(id, item.thread);
  }

  isUnread(item: HostThreadView): boolean {
    const latestHostMessage = this.latestHostMessage(item.thread);
    if (!latestHostMessage) return false;
    return this.readThrough()[item.snapshot.assignment.id] !== latestHostMessage.id;
  }

  lastMessage(item: HostThreadView): HostCoordinationMessage | null {
    return item.thread.messages[item.thread.messages.length - 1] ?? null;
  }

  private latestHostMessage(thread: HostCoordinationThread): HostCoordinationMessage | null {
    for (let index = thread.messages.length - 1; index >= 0; index -= 1) {
      const message = thread.messages[index];
      if (message.senderType === 'host') return message;
    }
    return null;
  }

  dateLabel(value: string | null): string {
    if (!value) return 'Date pending';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  relativeDate(value: string): string {
    const milliseconds = Date.now() - new Date(value).getTime();
    const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }

  private loadThreads(snapshots: readonly EngagementResponsibilitySnapshot[]): void {
    if (snapshots.length === 0) {
      this.threads.set([]);
      this.loading.set(false);
      return;
    }

    const requests = snapshots.map(snapshot =>
      this.api.getHostCoordinationMessages(snapshot.assignment.id).pipe(
        catchError(() => of({ isClosed: false, closedAtUtc: null, closedByName: null, messages: [] as const })),
      ),
    );

    forkJoin(requests).subscribe({
      next: threads => {
        const views = snapshots.map((snapshot, index) => ({ snapshot, thread: threads[index] }))
          .sort((a, b) => {
            const aMessage = this.lastMessage(a);
            const bMessage = this.lastMessage(b);
            if (aMessage && bMessage) return new Date(bMessage.createdAtUtc).getTime() - new Date(aMessage.createdAtUtc).getTime();
            if (aMessage) return -1;
            if (bMessage) return 1;
            return this.dateValue(a.snapshot.assignment.startsAtUtc) - this.dateValue(b.snapshot.assignment.startsAtUtc);
          });
        this.threads.set(views);
        const selectedId = (views.find(view => !view.thread.isClosed) ?? views[0])?.snapshot.assignment.id ?? null;
        this.selectedId.set(selectedId);
        if (selectedId) {
          const selected = views.find(view => view.snapshot.assignment.id === selectedId);
          if (selected) this.markReadThrough(selectedId, selected.thread);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Host activity could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  private restoreReadState(): void {
    try {
      const stored = window.localStorage.getItem(this.readStateKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, string>;
      this.readThrough.set(parsed ?? {});
    } catch {
      this.readThrough.set({});
    }
  }

  private markReadThrough(id: string, thread: HostCoordinationThread): void {
    const latest = this.latestHostMessage(thread);
    if (!latest) return;

    const next = { ...this.readThrough(), [id]: latest.id };
    this.readThrough.set(next);
    try {
      window.localStorage.setItem(this.readStateKey, JSON.stringify(next));
    } catch {
      // Reading a message should still work when browser storage is unavailable.
    }
  }

  private dateValue(value: string | null): number {
    return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
  }
}
