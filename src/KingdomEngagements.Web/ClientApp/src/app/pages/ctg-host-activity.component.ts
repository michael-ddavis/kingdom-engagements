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
  imports: [RouterLink],
  template: `
    <section class="host-page">
      <header class="host-heading">
        <h1>Host Activity</h1>
        <a routerLink="/organization/ctg/command-center">← Command Center</a>
      </header>

      @if (loading()) {
        <div class="state">Loading host conversations…</div>
      } @else if (error()) {
        <div class="state error">{{ error() }}</div>
      } @else {
        <section class="host-summary">
          <article><small>Active hosts</small><strong>{{ threads().length }}</strong><span>Upcoming engagements</span></article>
          <article><small>Open conversations</small><strong>{{ openThreads() }}</strong><span>Coordination still active</span></article>
          <article><small>Closed conversations</small><strong>{{ closedThreads() }}</strong><span>Coordination submitted</span></article>
          <article><small>Messages</small><strong>{{ totalMessages() }}</strong><span>Retained in engagement history</span></article>
        </section>

        <section class="host-grid">
          <aside class="host-list">
            <header><strong>Engagement hosts</strong><span>{{ threads().length }}</span></header>
            @for (item of threads(); track item.snapshot.assignment.id) {
              <button
                type="button"
                [class.selected]="selectedId() === item.snapshot.assignment.id"
                (click)="selectedId.set(item.snapshot.assignment.id)">
                <div>
                  <strong>{{ item.snapshot.assignment.hostOrganization }}</strong>
                  <span>{{ item.snapshot.assignment.title }}</span>
                </div>
                <small>{{ item.snapshot.hostCoordinationPercent }}%</small>
                @if (item.thread.messages.length > 0) {
                  <p>{{ lastMessage(item)?.senderName }} · {{ relativeDate(lastMessage(item)!.createdAtUtc) }}</p>
                } @else {
                  <p>No messages yet</p>
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
                  <strong>{{ item.snapshot.hostCoordinationPercent }}%</strong>
                  <span>{{ item.thread.isClosed ? 'Coordination complete' : 'Coordination open' }}</span>
                  <a [routerLink]="['/organization/ctg/engagements', item.snapshot.assignment.id]" [queryParams]="{ lane: 'host-coordination' }">Open engagement →</a>
                </div>
              </header>

              <div class="message-thread">
                @if (item.thread.messages.length === 0) {
                  <div class="thread-empty">No conversation has started yet. Courtney can send the first coordination message below.</div>
                } @else {
                  @for (message of item.thread.messages; track message.id) {
                    <article [class.host]="message.senderType === 'host'" [class.ministry]="message.senderType === 'ministry'">
                      <header><strong>{{ message.senderName }}</strong><span>{{ relativeDate(message.createdAtUtc) }}</span></header>
                      <p>{{ message.message }}</p>
                    </article>
                  }
                }
              </div>

              @if (item.thread.isClosed) {
                <footer class="closed-thread">
                  <strong>Coordination complete</strong>
                  <span>This conversation is read-only and remains attached to the engagement history.</span>
                </footer>
              } @else {
                <footer class="message-composer">
                  <label>
                    <span>Message host</span>
                    <textarea
                      rows="4"
                      [value]="draftMessage()"
                      (input)="draftMessage.set($any($event.target).value)"
                      placeholder="Ask for missing information or confirm the next coordination step."></textarea>
                  </label>
                  <div>
                    @if (sendError()) { <span class="send-error">{{ sendError() }}</span> }
                    @if (sendMessage()) { <span class="send-success">{{ sendMessage() }}</span> }
                    <button type="button" [disabled]="sending() || !draftMessage().trim()" (click)="send()">Send message</button>
                  </div>
                </footer>
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
    :host{display:block}.host-page{width:min(1240px,calc(100% - 38px));margin:0 auto;padding:28px 0 60px;color:#17202b}.host-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:22px;margin-bottom:18px}.host-heading h1,.conversation h2{margin:4px 0 7px;font:500 clamp(1.8rem,3vw,2.7rem)/1.08 Georgia,'Times New Roman',serif;color:#17243a}.host-heading p{margin:0;color:#6f7773}.host-heading>a{color:#315faf;font-size:.72rem;font-weight:850;text-decoration:none}.eyebrow{margin:0!important;color:#876f33!important;font:850 .65rem/1.2 system-ui,sans-serif!important;letter-spacing:.1em;text-transform:uppercase}
    .host-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.host-summary article{padding:15px 17px;border:1px solid #dfe3e0;border-radius:12px;background:#fffdfa}.host-summary small{display:block;color:#7a827d;font-size:.62rem;font-weight:850;text-transform:uppercase}.host-summary strong{display:block;margin:5px 0 2px;font-size:1.45rem}.host-summary span{font-size:.64rem;color:#858b87}
    .host-grid{display:grid;grid-template-columns:330px 1fr;min-height:650px;border:1px solid #dfe3e0;border-radius:16px;background:#fffdfa;overflow:hidden;box-shadow:0 10px 30px rgba(18,26,44,.04)}.host-list{border-right:1px solid #e2e5e2;background:#f8f7f3}.host-list>header{display:flex;justify-content:space-between;padding:16px;border-bottom:1px solid #e2e5e2;font-size:.74rem}.host-list button{display:grid;width:100%;grid-template-columns:1fr auto;gap:4px;padding:14px 15px;border:0;border-bottom:1px solid #e5e7e5;background:transparent;text-align:left;color:inherit;cursor:pointer}.host-list button.selected{background:#fffdfa;box-shadow:inset 3px 0 #9d7438}.host-list button strong,.host-list button span{display:block}.host-list button strong{font-size:.75rem}.host-list button span{margin-top:2px;color:#777f7a;font-size:.62rem}.host-list button>small{align-self:start;padding:4px 6px;border-radius:999px;background:#eef6f1;color:#2d6d52;font-size:.57rem;font-weight:900}.host-list button p{grid-column:1/-1;margin:4px 0 0;color:#858b87;font-size:.59rem}
    .conversation{display:flex;min-width:0;flex-direction:column}.conversation>header{display:flex;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid #e3e6e3}.conversation>header small{color:#8a7337;font-size:.61rem;font-weight:850;text-transform:uppercase}.conversation h2{font-size:1.55rem}.conversation>header p{margin:0;color:#78807b;font-size:.68rem}.coordination-status{text-align:right}.coordination-status strong,.coordination-status span,.coordination-status a{display:block}.coordination-status strong{font-size:1.35rem}.coordination-status span{color:#75807a;font-size:.61rem}.coordination-status a{margin-top:7px;color:#315faf;font-size:.65rem;font-weight:850;text-decoration:none}
    .message-thread{display:flex;flex:1;flex-direction:column;gap:10px;overflow:auto;padding:20px;background:#fbfaf7}.message-thread article{max-width:78%;padding:11px 13px;border:1px solid #dde2df;border-radius:12px;background:#fff}.message-thread article.ministry{align-self:flex-end;background:#eef3f8;border-color:#d3dce8}.message-thread article.host{align-self:flex-start}.message-thread article header{display:flex;justify-content:space-between;gap:14px}.message-thread article header strong{font-size:.66rem}.message-thread article header span{color:#8a918d;font-size:.57rem}.message-thread article p{margin:6px 0 0;color:#4f5954;font-size:.72rem;line-height:1.5}.thread-empty{margin:auto;color:#7a827d;text-align:center;font-size:.72rem}
    .message-composer{padding:15px 18px;border-top:1px solid #e1e4e1;background:#fffdfa}.message-composer label>span{display:block;margin-bottom:5px;font-size:.65rem;font-weight:850}.message-composer textarea{box-sizing:border-box;width:100%;padding:10px;border:1px solid #d5dad7;border-radius:9px;resize:vertical;font:inherit}.message-composer>div{display:flex;justify-content:flex-end;align-items:center;gap:9px;margin-top:8px}.message-composer button{padding:9px 14px;border:0;border-radius:8px;background:#172a46;color:#fff;font-size:.66rem;font-weight:850;cursor:pointer}.message-composer button:disabled{opacity:.4}.send-error{color:#a84642;font-size:.64rem}.send-success{color:#2d6d52;font-size:.64rem}.closed-thread{padding:16px 18px;border-top:1px solid #d8e5dc;background:#eef6f1;color:#2d6d52}.closed-thread strong,.closed-thread span{display:block}.closed-thread span{margin-top:3px;font-size:.65rem}.state{padding:40px;text-align:center;color:#747c78}.state.error{color:#a84642}
    @media(max-width:800px){.host-summary{grid-template-columns:1fr 1fr}.host-grid{grid-template-columns:1fr}.host-list{max-height:290px;overflow:auto;border-right:0;border-bottom:1px solid #e2e5e2}.host-heading{flex-direction:column}.message-thread{min-height:400px}}
  `],
})
export class CtgHostActivityComponent implements OnInit {
  readonly threads = signal<readonly HostThreadView[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly draftMessage = signal('');
  readonly sending = signal(false);
  readonly sendError = signal<string | null>(null);
  readonly sendMessage = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly selected = computed(() =>
    this.threads().find(item => item.snapshot.assignment.id === this.selectedId()) ?? this.threads()[0] ?? null,
  );
  readonly openThreads = computed(() => this.threads().filter(item => !item.thread.isClosed).length);
  readonly closedThreads = computed(() => this.threads().filter(item => item.thread.isClosed).length);
  readonly totalMessages = computed(() => this.threads().reduce((sum, item) => sum + item.thread.messages.length, 0));

  constructor(private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    this.api.getCommandCenter().subscribe({
      next: snapshots => this.loadThreads(snapshots),
      error: () => {
        this.error.set('Host activity could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  lastMessage(item: HostThreadView): HostCoordinationMessage | null {
    return item.thread.messages[item.thread.messages.length - 1] ?? null;
  }

  send(): void {
    const item = this.selected();
    const message = this.draftMessage().trim();
    if (!item || !message || item.thread.isClosed) return;

    this.sending.set(true);
    this.sendError.set(null);
    this.sendMessage.set(null);

    this.api.sendHostCoordinationMessage(item.snapshot.assignment.id, message).subscribe({
      next: thread => {
        this.threads.update(items => items.map(current =>
          current.snapshot.assignment.id === item.snapshot.assignment.id
            ? { ...current, thread }
            : current,
        ));
        this.draftMessage.set('');
        this.sending.set(false);
        this.sendMessage.set('Message added to the host coordination thread.');
        window.setTimeout(() => this.sendMessage.set(null), 2200);
      },
      error: () => {
        this.sending.set(false);
        this.sendError.set('The host message could not be sent.');
      },
    });
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
        this.selectedId.set(views[0]?.snapshot.assignment.id ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Host activity could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  private dateValue(value: string | null): number {
    return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
  }
}
