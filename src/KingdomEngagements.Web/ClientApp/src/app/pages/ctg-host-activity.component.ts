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
          <h1>Host Activity</h1>
          <p>Use this page when you need to see what hosts recently said, who still needs a reply, or which conversation to open.</p>
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
              <strong>Messages</strong>
              @if (unreadCount() > 0) { <span class="unread-count">{{ unreadCount() }} unread</span> }
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
                @if (isUnread(item)) { <i class="unread-dot" aria-label="Unread message"></i> }
                @if (item.thread.messages.length > 0) {
                  <p class="message-preview">{{ lastMessage(item)?.message }}</p>
                  <footer>
                    <span>{{ lastMessage(item)?.senderName }} · {{ relativeDate(lastMessage(item)!.createdAtUtc) }}</span>
                    @if (item.thread.isClosed) { <b class="closed-label">Closed</b> }
                  </footer>
                } @else {
                  <p class="message-preview empty">No messages yet</p>
                }
              </button>
            }
          </aside>

          <section class="conversation">
            @if (selected(); as item) {
              <header>
                <div>
                  <small>{{ item.snapshot.assignment.title }}</small>
                  <h2>{{ item.snapshot.assignment.hostOrganization }}</h2>
                  <p>{{ dateLabel(item.snapshot.assignment.startsAtUtc) }} · {{ item.snapshot.assignment.location || 'Location pending' }}</p>
                </div>
                <div class="coordination-status">
                  <span class="thread-status" [class.closed]="item.thread.isClosed">{{ item.thread.isClosed ? 'Closed' : 'Open' }}</span>
                  <a [routerLink]="['/organization/ctg/engagements', item.snapshot.assignment.id]" [queryParams]="{ lane: 'host-coordination' }">Open engagement →</a>
                </div>
              </header>

              @for (active of [item]; track active.snapshot.assignment.id) {
                <div class="conversation-body">
                  <app-host-access-link [assignmentId]="active.snapshot.assignment.id" />
                  <app-host-coordination-conversation [assignmentId]="active.snapshot.assignment.id" (threadChanged)="updateThread(active.snapshot.assignment.id, $event)" />
                </div>
              }
            } @else {
              <div class="state">Select an engagement host.</div>
            }
          </section>
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.host-page{display:flex;width:min(1240px,calc(100% - 38px));height:calc(100dvh - 82px);min-height:620px;margin:0 auto;padding:14px 0 18px;flex-direction:column;overflow:hidden;color:#17202b}.host-heading{display:flex;flex:0 0 auto;justify-content:space-between;align-items:center;gap:22px;margin-bottom:10px;padding:2px 0 10px;border-bottom:1px solid #dde1df}.host-heading h1,.conversation h2{margin:0;font:500 clamp(1.65rem,2.3vw,2.2rem)/1.08 Georgia,'Times New Roman',serif;color:#17243a}.host-heading p{max-width:720px;margin:5px 0 0;color:#69736e;font-size:.69rem;line-height:1.45}.host-heading>a{color:#315faf;font-size:.68rem;font-weight:850;text-decoration:none}.eyebrow{margin:0!important;color:#876f33!important;font:850 .65rem/1.2 system-ui,sans-serif!important;letter-spacing:.1em;text-transform:uppercase}
    .host-grid{display:grid;min-height:0;flex:1;grid-template-columns:330px 1fr;border:1px solid #dfe3e0;border-radius:16px;background:#fffdfa;overflow:hidden;box-shadow:0 10px 30px rgba(18,26,44,.04)}.host-list{min-height:0;overflow-y:auto;overscroll-behavior:contain;border-right:1px solid #e2e5e2;background:#f8f7f3}.host-list>header{position:sticky;z-index:2;top:0;display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #e2e5e2;background:#f8f7f3;font-size:.74rem}.unread-count{padding:3px 7px;border-radius:999px;background:#172a46;color:#fff;font-size:.55rem;font-weight:850}.host-list button{display:grid;width:100%;grid-template-columns:1fr auto;gap:4px;padding:13px 15px;border:0;border-bottom:1px solid #e5e7e5;background:transparent;text-align:left;color:inherit;cursor:pointer}.host-list button.selected{background:#fffdfa;box-shadow:inset 3px 0 #9d7438}.host-list button.unread{background:#fffefb}.thread-identity strong,.thread-identity span{display:block}.thread-identity strong{font-size:.75rem}.host-list button.unread .thread-identity strong,.host-list button.unread .message-preview{font-weight:850;color:#17243a}.thread-identity span{margin-top:2px;color:#777f7a;font-size:.62rem}.unread-dot{align-self:start;width:9px;height:9px;margin-top:4px;border-radius:50%;background:#315faf;box-shadow:0 0 0 3px rgba(49,95,175,.09)}.message-preview{display:-webkit-box;grid-column:1/-1;margin:6px 0 0;overflow:hidden;color:#65706a;font-size:.61rem;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.message-preview.empty{color:#969c98}.host-list button footer{display:flex;grid-column:1/-1;justify-content:space-between;gap:8px;align-items:center;margin-top:5px}.host-list button footer span{color:#8a918d;font-size:.56rem}.closed-label{color:#8a918d;font-size:.53rem;font-weight:800}
    .conversation{display:flex;min-width:0;min-height:0;flex-direction:column;overflow:hidden}.conversation>header{display:flex;flex:0 0 auto;justify-content:space-between;gap:18px;padding:14px 18px;border-bottom:1px solid #e3e6e3}.conversation>header small{color:#8a7337;font-size:.58rem;font-weight:850;text-transform:uppercase}.conversation h2{font-size:1.35rem}.conversation>header p{margin:0;color:#78807b;font-size:.64rem}.coordination-status{display:flex;align-items:center;gap:10px;text-align:right}.thread-status{display:inline-flex;padding:5px 8px;border:1px solid #b9d8c1;border-radius:999px;background:#edf8ef;color:#2f6b3b!important;font-size:.58rem!important;font-weight:850}.thread-status.closed{border-color:#d8dcd9;background:#f2f3f1;color:#737b77!important}.coordination-status a{color:#315faf;font-size:.63rem;font-weight:850;text-decoration:none;white-space:nowrap}
    .conversation-body{display:flex;min-height:0;flex:1;flex-direction:column;padding:10px;overflow:hidden}.conversation-body app-host-coordination-conversation{display:block;min-height:0;flex:1;--conversation-height:100%;--conversation-min-height:0}
    .state{padding:40px;text-align:center;color:#747c78}.state.error{color:#a84642}
    @media(max-width:800px){.host-page{height:auto;min-height:0;padding-bottom:40px;overflow:visible}.host-heading{align-items:flex-start;flex-direction:column}.host-grid{height:auto;min-height:0;grid-template-columns:1fr}.host-list{max-height:290px;overflow:auto;border-right:0;border-bottom:1px solid #e2e5e2}.conversation>header{align-items:flex-start;flex-direction:column}.coordination-status{width:100%;justify-content:space-between}.conversation-body{min-height:590px;overflow:visible}.conversation-body app-host-coordination-conversation{--conversation-height:540px;--conversation-min-height:430px}}
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
        catchError(() => of({ isClosed: false, messages: [] as const })),
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
