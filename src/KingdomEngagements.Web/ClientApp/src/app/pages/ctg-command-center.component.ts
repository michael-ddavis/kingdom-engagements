import { Component, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import {
  EngagementResponsibilitySnapshot,
  EngagementSummary,
  HostCoordinationMessage,
  ResponsibilityLaneState,
} from '../core/models';

type CommandWindow = 7 | 30 | 60 | 0;

interface HostActivityPreview {
  assignmentId: string;
  assignmentTitle: string;
  hostOrganization: string;
  message: HostCoordinationMessage;
}

@Component({
  selector: 'app-ctg-command-center',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="director-page">
      <header class="director-heading">
        <div>
          <h1>Command Center</h1>
          <p>See what needs attention across every engagement, then jump directly into the next piece of work.</p>
        </div>
        <div class="director-heading-actions">
          <a class="secondary-action" routerLink="/organization/ctg/team">Team</a>
          <a class="primary-action" routerLink="/organization/ctg/stand-up">Stand-up →</a>
        </div>
      </header>

      <nav class="start-actions" aria-label="Start here">
        <div><strong>What do you need to do?</strong><p>Start an invitation, review requests, or prepare an approved engagement.</p></div>
        <a routerLink="/organization/ctg/start-invitation">Start an invitation <span>Enter a name and email, then share the host link.</span></a>
        <a routerLink="/organization/ctg/bookings">Review invitations <span>Follow up with hosts and review incoming requests.</span></a>
        <a routerLink="/organization/ctg/engagements">Prepare an engagement <span>Find the team, travel plans, and host details.</span></a>
      </nav>

      @if (loading()) {
        <div class="director-state">Loading the engagement operation…</div>
      } @else if (error()) {
        <div class="director-state director-state--error">{{ error() }}</div>
      } @else {
        <section class="command-focus" aria-label="At a glance">
          <button type="button" (click)="attentionOnly.set(false)">
            <small>Active engagements</small>
            <strong>{{ visibleSnapshots().length }}</strong>
            <span>{{ windowLabel() }}</span>
          </button>
          <button type="button" [class.selected]="attentionOnly()" (click)="attentionOnly.set(true)">
            <small>Need your attention</small>
            <strong>{{ needsAttention().length }}</strong>
            <span>Open the work that is blocked, overdue, or missing an owner.</span>
          </button>
        </section>

        <details class="operational-details">
          <summary>
            <span><strong>Operational details</strong><small>For a deeper look at workload and statuses.</small></span>
            <span>{{ overdueCount() }} overdue · {{ unassignedCount() }} unassigned · {{ waitingOnHostCount() }} waiting on host</span>
          </summary>
          <section class="director-summary director-summary--secondary" aria-label="Operational detail">
            <article>
              <small>Overdue responsibilities</small>
              <strong>{{ overdueCount() }}</strong>
              <span>Across visible engagements</span>
            </article>
            <article>
              <small>Unassigned responsibilities</small>
              <strong>{{ unassignedCount() }}</strong>
              <span>Need an owner</span>
            </article>
            <article>
              <small>Waiting on host</small>
              <strong>{{ waitingOnHostCount() }}</strong>
              <span>External dependencies</span>
            </article>
          </section>

          <div class="status-legend" aria-label="Status color legend">
            <span><i class="legend-swatch complete"></i>Complete</span>
            <span><i class="legend-swatch progress"></i>In Progress</span>
            <span><i class="legend-swatch waiting"></i>Waiting on Host</span>
            <span><i class="legend-swatch warning"></i>Unassigned</span>
            <span><i class="legend-swatch danger"></i>Blocked / Overdue</span>
            <span><i class="legend-swatch neutral"></i>Not Started</span>
          </div>
        </details>

        <div class="director-toolbar">
          <div class="window-switcher" aria-label="Command Center time window">
            @for (option of windows; track option.value) {
              <button
                type="button"
                [class.selected]="window() === option.value"
                (click)="setWindow(option.value)">
                {{ option.label }}
              </button>
            }
          </div>
          @if (attentionOnly()) {
            <button class="clear-filter" type="button" (click)="attentionOnly.set(false)">Show all engagements</button>
          }
        </div>

        @if (responsibilityDataUnavailable()) {
          <div class="director-state director-state--warning">
            <strong>Some responsibility details are temporarily unavailable.</strong>
            <span>You can still open engagements and continue working. Refresh later to try loading the missing details again.</span>
          </div>
        }

        <section class="command-board">
          <header>
            <h2>{{ attentionOnly() ? 'Needs attention' : 'Upcoming engagements' }}</h2>
            <span>{{ boardSnapshots().length }}</span>
          </header>

          @if (boardSnapshots().length === 0) {
            <div class="director-empty">Nothing in this view needs attention.</div>
          } @else {
            <div class="brief-list">
              @for (snapshot of boardSnapshots(); track snapshot.assignment.id) {
                <article
                  class="brief-row"
                  role="link"
                  tabindex="0"
                  (click)="openEngagement(snapshot.assignment.id, $event)"
                  (keydown.enter)="openEngagement(snapshot.assignment.id, $event)">
                  <a class="brief-identity" [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]">
                    <strong>{{ snapshot.assignment.title }}</strong>
                    <span>{{ snapshot.assignment.hostOrganization }}</span>
                    <small>{{ dateLabel(snapshot.assignment.startsAtUtc) }} · {{ snapshot.assignment.location || 'Location pending' }}</small>
                  </a>

                  <div class="brief-readiness">
                    <div class="brief-readiness-copy">
                      <strong>{{ snapshot.responsibilityReadinessPercent }}%</strong>
                      <span>{{ snapshot.completedLaneCount }}/{{ snapshot.applicableLaneCount }} complete</span>
                    </div>
                    <div class="brief-progress" aria-hidden="true">
                      <i [style.width.%]="snapshot.responsibilityReadinessPercent"></i>
                    </div>
                    <details class="lane-details">
                      <summary>View preparation areas</summary>
                      <div class="lane-strip" aria-label="Responsibility status by preparation area">
                        @for (column of laneColumns; track column.key) {
                          @if (lane(snapshot, column.key); as laneItem) {
                            <a
                              [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]"
                              [queryParams]="{ lane: column.key }"
                              [class.complete]="laneItem.status === 'complete'"
                              [class.progress]="laneItem.status === 'in-progress' || laneItem.status === 'ready-for-review'"
                              [class.waiting]="laneItem.status === 'waiting-on-host'"
                              [class.danger]="laneItem.isOverdue || laneItem.status === 'blocked'"
                              [class.unassigned]="!laneItem.owner"
                              [title]="column.shortLabel + ': ' + laneStatusLabel(laneItem)">
                              <span>{{ column.shortLabel }}</span>
                            </a>
                          } @else {
                            <span class="na" [title]="column.shortLabel + ': not applicable'">{{ column.shortLabel }}</span>
                          }
                        }
                      </div>
                    </details>
                  </div>

                  <div class="brief-attention">
                    @if (snapshot.overdueLaneCount > 0) {
                      <a
                        class="attention-chip danger"
                        [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]"
                        [queryParams]="{ lane: firstLaneKey(snapshot, 'overdue') }">
                        {{ snapshot.overdueLaneCount }} overdue
                      </a>
                    }
                    @if (blockedCount(snapshot) > 0) {
                      <a
                        class="attention-chip danger"
                        [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]"
                        [queryParams]="{ lane: firstLaneKey(snapshot, 'blocked') }">
                        {{ blockedCount(snapshot) }} blocked
                      </a>
                    }
                    @if (waitingCount(snapshot) > 0) {
                      <a
                        class="attention-chip waiting"
                        [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]"
                        [queryParams]="{ lane: firstLaneKey(snapshot, 'waiting-on-host') }">
                        {{ waitingCount(snapshot) }} waiting on host
                      </a>
                    }
                    @if (snapshot.unassignedLaneCount > 0) {
                      <a
                        class="attention-chip warning"
                        [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]"
                        [queryParams]="{ lane: firstUnassignedLaneKey(snapshot) }">
                        {{ snapshot.unassignedLaneCount }} unassigned
                      </a>
                    }
                    @if (
                      snapshot.overdueLaneCount === 0 &&
                      blockedCount(snapshot) === 0 &&
                      waitingCount(snapshot) === 0 &&
                      snapshot.unassignedLaneCount === 0
                    ) {
                      <span class="attention-chip good">On track</span>
                    }

                    @if (topAttention(snapshot); as item) {
                      <small>
                        <strong>{{ item.label }}</strong>
                        {{ topAttentionDetail(item) }}
                      </small>
                    }
                  </div>

                  <a class="brief-open" [routerLink]="['/organization/ctg/engagements', snapshot.assignment.id]" aria-label="Open engagement">
                    <span>Open</span>
                    <b aria-hidden="true">→</b>
                  </a>
                </article>
              }
            </div>
          }
        </section>

        <section class="director-lower-grid">
          <article class="director-panel">
            <header>
              <div><h2>Needs Attention</h2></div>
              <strong>{{ attentionItems().length }}</strong>
            </header>
            @if (attentionItems().length === 0) {
              <div class="panel-empty">No blockers, overdue work, or unassigned responsibilities in this window.</div>
            } @else {
              <div class="attention-list">
                @for (item of attentionItems().slice(0, 10); track item.assignmentId + item.lane.key) {
                  <a [routerLink]="['/organization/ctg/engagements', item.assignmentId]" [queryParams]="{ lane: item.lane.key }">
                    <span class="attention-status" [class.danger]="item.lane.isOverdue || item.lane.status === 'blocked'">!</span>
                    <span>
                      <strong>{{ item.assignmentTitle }} · {{ item.lane.label }}</strong>
                      <small>{{ attentionReason(item.lane) }}</small>
                    </span>
                    <b>{{ item.lane.owner?.displayName || 'Unassigned' }}</b>
                  </a>
                }
              </div>
            }
          </article>

          <article class="director-panel">
            <header>
              <div><h2>Host Activity</h2></div>
              <a routerLink="/organization/ctg/hosts">Open host activity →</a>
            </header>
            @if (hostActivity().length === 0) {
              <div class="panel-empty">No recent host messages are available yet.</div>
            } @else {
              <div class="host-preview-list">
                @for (item of hostActivity().slice(0, 6); track item.message.id) {
                  <a [routerLink]="['/organization/ctg/engagements', item.assignmentId]" [queryParams]="{ lane: 'host-coordination' }">
                    <div>
                      <strong>{{ item.hostOrganization }}</strong>
                      <small>{{ item.assignmentTitle }} · {{ relativeDate(item.message.createdAtUtc) }}</small>
                    </div>
                    <p>“{{ truncate(item.message.message, 118) }}”</p>
                    <span>{{ item.message.senderName }}</span>
                  </a>
                }
              </div>
            }
          </article>
        </section>

        <section class="director-panel team-accountability">
          <header>
            <div><h2>Team Workload</h2></div>
            <a routerLink="/organization/ctg/team">Manage standing responsibilities →</a>
          </header>
          @if (teamAccountability().length === 0) {
            <div class="panel-empty">Assign standing responsibility owners to begin team accountability tracking.</div>
          } @else {
            <div class="team-grid">
              @for (member of teamAccountability(); track member.subject) {
                <article>
                  <strong>{{ member.name }}</strong>
                  <span>{{ member.lanes.join(', ') }}</span>
                  <dl>
                    <div><dt>Active</dt><dd>{{ member.active }}</dd></div>
                    <div><dt>Complete</dt><dd>{{ member.complete }}</dd></div>
                    <div><dt>Waiting</dt><dd>{{ member.waiting }}</dd></div>
                    <div><dt>Overdue</dt><dd [class.danger-text]="member.overdue > 0">{{ member.overdue }}</dd></div>
                  </dl>
                </article>
              }
            </div>
          }
        </section>
      }
    </section>
  `,
  styles: [`
    .start-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0 24px}.start-actions>div{grid-column:1/-1}.start-actions p{margin:6px 0;color:#59665f;line-height:1.5}.start-actions>a{display:grid;gap:8px;padding:16px;border:1px solid #d8ded9;border-radius:10px;background:#fffdfa;color:#234b78;text-decoration:none;font-weight:750}.start-actions a span{font-size:.85rem;font-weight:400;line-height:1.5;color:#59665f}.start-actions a:hover{border-color:#315faf}.start-actions a:focus-visible{outline:3px solid #315faf;outline-offset:3px}@media(max-width:700px){.start-actions{grid-template-columns:1fr}}

    :host{
      display:block;
      --status-complete-bg:#e9f5ed;
      --status-complete-border:#5f8f73;
      --status-complete-text:#24563c;
      --status-progress-bg:#edf3fb;
      --status-progress-border:#6f89b5;
      --status-progress-text:#31537f;
      --status-waiting-bg:#fbf2df;
      --status-waiting-border:#c79836;
      --status-waiting-text:#845b13;
      --status-warning-bg:#fff6e5;
      --status-warning-border:#d4a148;
      --status-warning-text:#946414;
      --status-danger-bg:#fbeceb;
      --status-danger-border:#c56a63;
      --status-danger-text:#873832;
      --status-neutral-bg:#f5f5f2;
      --status-neutral-border:#d6dad6;
      --status-neutral-text:#69716d;
    }
    .director-page{width:min(1500px,calc(100% - 42px));margin:0 auto;padding:28px 0 60px;color:#17202b}
    .director-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px;padding:4px 0 14px;border-bottom:1px solid #dde1df}
    .director-heading h1,.command-board h2,.director-panel h2{margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:500;color:#17243a}
    .director-heading h1{font-size:clamp(1.8rem,2.6vw,2.5rem)}.director-heading p{max-width:720px;margin:7px 0 0;color:#69736e;font-size:.74rem;line-height:1.5}
    .director-eyebrow{margin:0!important;color:#7c6b38!important;font:800 .67rem/1.2 system-ui,sans-serif!important;letter-spacing:.11em;text-transform:uppercase}
    .director-heading-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .primary-action,.secondary-action{display:inline-flex;min-height:38px;align-items:center;padding:0 13px;border-radius:8px;font-size:.72rem;font-weight:850;text-decoration:none}
    .primary-action{color:#fff;background:#172a46}.secondary-action{color:#172a46;border:1px solid #d6dbe0;background:#fff}
    .command-focus{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:10px}
    .command-focus button{appearance:none;text-align:left;padding:17px 18px;border:1px solid #dde1df;border-radius:12px;background:#fffdfa;color:inherit;font:inherit;cursor:pointer}
    .command-focus button.selected{border-color:#9d7438;box-shadow:0 0 0 2px rgba(157,116,56,.12)}
    .command-focus small{display:block;color:#737b78;font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .command-focus strong{display:block;margin:5px 0 3px;font-size:1.55rem;color:#17243a}.command-focus span{display:block;max-width:520px;color:#6f7773;font-size:.68rem;line-height:1.45}
    .operational-details{margin:0 0 14px;border:1px solid #e0e4e1;border-radius:11px;background:#faf9f5}
    .operational-details>summary{display:flex;justify-content:space-between;gap:18px;align-items:center;min-height:46px;padding:0 14px;cursor:pointer;color:#56615c;font-size:.66rem;list-style:none}.operational-details>summary::-webkit-details-marker{display:none}.operational-details>summary span:first-child{display:grid;gap:2px}.operational-details>summary strong{color:#17243a;font-size:.72rem}.operational-details>summary small{color:#7b827e;font-size:.61rem;font-weight:500}.operational-details>summary span:last-child{font-weight:750;text-align:right}
    .director-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0;padding:12px 14px 8px;border-top:1px solid #e4e7e4}
    .director-summary article,.director-summary button{appearance:none;text-align:left;padding:15px 16px;border:1px solid #dde1df;border-radius:11px;background:#fffdfa;color:inherit;font:inherit;cursor:default}
    .director-summary button{cursor:pointer}.director-summary button.selected{border-color:#9d7438;box-shadow:0 0 0 2px rgba(157,116,56,.12)}
    .director-summary small{display:block;color:#737b78;font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .director-summary strong{display:block;margin:5px 0 2px;font-size:1.45rem;color:#17243a}.director-summary span{font-size:.66rem;color:#7b817e}
    .director-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0}
    .window-switcher{display:flex;gap:4px;padding:4px;border:1px solid #dde1df;border-radius:9px;background:#fff}
    .window-switcher button,.clear-filter{border:0;border-radius:6px;padding:7px 10px;background:transparent;color:#68716d;font-weight:800;font-size:.68rem;cursor:pointer}
    .window-switcher button.selected{color:#fff;background:#172a46}.clear-filter{border:1px solid #dde1df;background:#fff}
    .status-legend{display:flex;align-items:center;justify-content:flex-end;gap:10px 14px;flex-wrap:wrap;margin:0;padding:4px 14px 12px;color:#6e7672;font-size:.56rem;font-weight:750}
    .status-legend>span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
    .legend-swatch{display:inline-block;width:9px;height:9px;border:1px solid var(--status-neutral-border);border-radius:3px;background:var(--status-neutral-bg)}
    .legend-swatch.complete{border-color:var(--status-complete-border);background:var(--status-complete-bg)}
    .legend-swatch.progress{border-color:var(--status-progress-border);background:var(--status-progress-bg)}
    .legend-swatch.waiting{border-color:var(--status-waiting-border);background:var(--status-waiting-bg)}
    .legend-swatch.warning{border-color:var(--status-warning-border);background:var(--status-warning-bg)}
    .legend-swatch.danger{border-color:var(--status-danger-border);background:var(--status-danger-bg)}
    .legend-swatch.neutral{border-color:var(--status-neutral-border);background:var(--status-neutral-bg)}

    .command-board,.director-panel{border:1px solid #dde1df;border-radius:14px;background:#fffdfa;box-shadow:0 8px 24px rgba(18,26,44,.03)}
    .command-board>header,.director-panel>header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 18px;border-bottom:1px solid #e4e6e4}
    .command-board h2,.director-panel h2{font-size:1.12rem}.command-board>header>span{display:grid;min-width:28px;height:28px;place-items:center;border-radius:999px;background:#f0f2f0;color:#5f6763;font-size:.68rem;font-weight:900}.director-panel header>a{color:#315faf;font-size:.7rem;font-weight:800;text-decoration:none}
    .brief-list{display:flex;flex-direction:column}
    .brief-row{display:grid;grid-template-columns:minmax(245px,1.1fr) minmax(360px,1.55fr) minmax(220px,.9fr) 62px;gap:22px;align-items:center;padding:16px 18px;border-bottom:1px solid #eceeeb}
    .brief-row:last-child{border-bottom:0}.brief-row{cursor:pointer}.brief-row:hover{background:#fdfcf8}.brief-row:focus-visible{outline:3px solid #315faf;outline-offset:-3px}
    .brief-identity{display:flex;min-width:0;flex-direction:column;gap:3px;color:inherit;text-decoration:none}
    .brief-identity strong{overflow:hidden;text-overflow:ellipsis;color:#17243a;font-size:.82rem;white-space:nowrap}.brief-identity span,.brief-identity small{overflow:hidden;text-overflow:ellipsis;color:#747c78;font-size:.64rem;white-space:nowrap}
    .brief-readiness{display:grid;grid-template-columns:auto 1fr;gap:7px 12px;align-items:center;min-width:0}.brief-readiness-copy{display:flex;min-width:86px;flex-direction:column}.brief-readiness-copy strong{font-size:1.28rem;color:#17243a}.brief-readiness-copy span{color:#7a817d;font-size:.59rem}
    .brief-progress{height:6px;border-radius:999px;background:#e8ebe8;overflow:hidden}.brief-progress i{display:block;height:100%;border-radius:inherit;background:#5f8f73}
    .lane-details{grid-column:1/-1}.lane-details>summary{display:inline-flex;min-height:30px;align-items:center;color:#53647a;font-size:.58rem;font-weight:800;cursor:pointer}.lane-strip{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;margin-top:4px}.lane-strip>a,.lane-strip>span{display:grid;min-height:27px;place-items:center;border:1px solid var(--status-neutral-border);border-radius:6px;background:var(--status-neutral-bg);color:var(--status-neutral-text);font-size:.49rem;font-weight:900;letter-spacing:.04em;text-decoration:none;text-transform:uppercase}
    .lane-strip>a.complete{border-color:var(--status-complete-border);background:var(--status-complete-bg);color:var(--status-complete-text)}
    .lane-strip>a.progress{border-color:var(--status-progress-border);background:var(--status-progress-bg);color:var(--status-progress-text)}
    .lane-strip>a.waiting{border-color:var(--status-waiting-border);background:var(--status-waiting-bg);color:var(--status-waiting-text)}
    .lane-strip>a.danger{border-color:var(--status-danger-border);background:var(--status-danger-bg);color:var(--status-danger-text)}
    .lane-strip>a.unassigned:not(.danger):not(.complete):not(.progress):not(.waiting){border-color:var(--status-warning-border);background:var(--status-warning-bg);color:var(--status-warning-text)}.lane-strip>span.na{opacity:.4}
    .brief-attention{display:flex;align-items:flex-start;align-content:flex-start;gap:5px;flex-wrap:wrap}.attention-chip{display:inline-flex;min-height:25px;align-items:center;padding:0 8px;border:1px solid var(--status-neutral-border);border-radius:999px;background:var(--status-neutral-bg);color:var(--status-neutral-text);font-size:.58rem;font-weight:850;text-decoration:none;white-space:nowrap}
    .attention-chip.danger{border-color:var(--status-danger-border);background:var(--status-danger-bg);color:var(--status-danger-text)}
    .attention-chip.waiting{border-color:var(--status-waiting-border);background:var(--status-waiting-bg);color:var(--status-waiting-text)}
    .attention-chip.warning{border-color:var(--status-warning-border);background:var(--status-warning-bg);color:var(--status-warning-text)}
    .attention-chip.good{border-color:var(--status-complete-border);background:var(--status-complete-bg);color:var(--status-complete-text)}.brief-attention>small{display:block;flex-basis:100%;margin-top:3px;color:#7b827e;font-size:.58rem;line-height:1.4}.brief-attention>small strong{color:#59625e}
    .brief-open{display:flex;align-items:center;justify-content:flex-end;gap:5px;color:#315faf;font-size:.64rem;font-weight:850;text-decoration:none;white-space:nowrap}.brief-open b{font-size:.9rem}
    .director-lower-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px;margin-top:14px}.director-panel{overflow:hidden}.director-panel>header strong{font-size:1.2rem}
    .attention-list,.host-preview-list{display:flex;flex-direction:column}.attention-list>a,.host-preview-list>a{display:grid;gap:10px;padding:13px 18px;border-bottom:1px solid #eceeeb;color:inherit;text-decoration:none}.attention-list>a{grid-template-columns:auto 1fr auto;align-items:center}
    .attention-list>a:last-child,.host-preview-list>a:last-child{border-bottom:0}.attention-status{display:grid;width:25px;height:25px;place-items:center;border-radius:50%;background:#fbf5e8;color:#8a641e;font-weight:900}.attention-status.danger{background:#fbefed;color:#9a433f}
    .attention-list strong,.host-preview-list strong{font-size:.76rem}.attention-list small,.host-preview-list small{display:block;margin-top:2px;color:#7a817e;font-size:.65rem}.attention-list b{font-size:.66rem;color:#5e6863}
    .host-preview-list>a{grid-template-columns:1fr auto}.host-preview-list p{grid-column:1/-1;margin:0;color:#535e58;font-size:.73rem;line-height:1.45}.host-preview-list>a>span{font-size:.65rem;color:#7c827f}
    .team-accountability{margin-top:14px}.team-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding:14px}.team-grid article{padding:15px;border:1px solid #e2e5e2;border-radius:11px;background:#f9f8f4}.team-grid article>strong{display:block}.team-grid article>span{display:block;margin:3px 0 12px;color:#757c78;font-size:.65rem}.team-grid dl{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:0}.team-grid dl div{padding:7px;border-radius:7px;background:#fff}.team-grid dt{font-size:.57rem;color:#858b87;text-transform:uppercase}.team-grid dd{margin:2px 0 0;font-weight:850}
    .panel-empty,.director-empty,.director-state{padding:28px;color:#747c78;text-align:center}.director-state{margin:40px auto;border:1px solid #dde1df;border-radius:14px;background:#fff}.director-state--error{color:#9a433f}.danger-text{color:#a84642!important}.warning-text{color:#956d25!important}
    @media(max-width:1050px){.director-lower-grid{grid-template-columns:1fr}.team-grid{grid-template-columns:repeat(2,1fr)}.brief-row{grid-template-columns:minmax(220px,1fr) minmax(330px,1.35fr) minmax(200px,.9fr) 54px;gap:14px}}
    @media(max-width:720px){.director-page{width:min(100% - 24px,1500px)}.director-heading{flex-direction:column;align-items:flex-start}.command-focus,.director-summary{grid-template-columns:1fr}.operational-details>summary{align-items:flex-start;flex-direction:column;padding:12px 14px}.operational-details>summary span:last-child{text-align:left}.team-grid{grid-template-columns:1fr}.director-toolbar{align-items:flex-start;flex-direction:column}.brief-row{grid-template-columns:1fr}.brief-readiness{grid-template-columns:auto 1fr}.brief-open{justify-content:flex-start}.brief-attention{margin-top:-4px}}
  `],
})
export class CtgCommandCenterComponent implements OnInit {
  readonly windows = [
    { value: 7 as CommandWindow, label: '7 Days' },
    { value: 30 as CommandWindow, label: '30 Days' },
    { value: 60 as CommandWindow, label: '60 Days' },
    { value: 0 as CommandWindow, label: 'All Active' },
  ];
  readonly laneColumns = [
    { key: 'host-coordination', shortLabel: 'Host' },
    { key: 'travel', shortLabel: 'Travel' },
    { key: 'lodging', shortLabel: 'Stay' },
    { key: 'transportation', shortLabel: 'Transport' },
    { key: 'media', shortLabel: 'Media' },
    { key: 'program', shortLabel: 'Program' },
    { key: 'documents', shortLabel: 'Docs' },
    { key: 'finance', shortLabel: 'Finance' },
  ];

  readonly snapshots = signal<readonly EngagementResponsibilitySnapshot[]>([]);
  readonly hostActivity = signal<readonly HostActivityPreview[]>([]);
  readonly window = signal<CommandWindow>(30);
  readonly attentionOnly = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly responsibilityDataUnavailable = signal(false);

  readonly visibleSnapshots = computed(() => {
    const days = this.window();
    const items = [...this.snapshots()].sort((a, b) => this.dateValue(a.assignment.startsAtUtc) - this.dateValue(b.assignment.startsAtUtc));
    if (days === 0) return items;
    const now = Date.now();
    const upper = now + days * 86_400_000;
    return items.filter(item => {
      if (!item.assignment.startsAtUtc) return true;
      const value = new Date(item.assignment.startsAtUtc).getTime();
      return value >= now - 86_400_000 && value <= upper;
    });
  });

  readonly needsAttention = computed(() =>
    this.visibleSnapshots().filter(item =>
      item.overdueLaneCount > 0 ||
      item.unassignedLaneCount > 0 ||
      item.lanes.some(lane => lane.isApplicable && ['blocked', 'overdue'].includes(lane.status)),
    ),
  );

  readonly boardSnapshots = computed(() =>
    this.attentionOnly() ? this.needsAttention() : this.visibleSnapshots(),
  );

  readonly overdueCount = computed(() =>
    this.visibleSnapshots().reduce((sum, item) => sum + item.overdueLaneCount, 0),
  );
  readonly unassignedCount = computed(() =>
    this.visibleSnapshots().reduce((sum, item) => sum + item.unassignedLaneCount, 0),
  );
  readonly waitingOnHostCount = computed(() =>
    this.visibleSnapshots().reduce(
      (sum, item) => sum + item.lanes.filter(lane => lane.isApplicable && lane.status === 'waiting-on-host').length,
      0,
    ),
  );

  readonly attentionItems = computed(() =>
    this.visibleSnapshots()
      .flatMap(snapshot => snapshot.lanes
        .filter(lane =>
          lane.isApplicable &&
          (lane.isOverdue || lane.owner === null || ['blocked', 'overdue'].includes(lane.status)),
        )
        .map(lane => ({
          assignmentId: snapshot.assignment.id,
          assignmentTitle: snapshot.assignment.title,
          lane,
        })))
      .sort((a, b) => Number(b.lane.isOverdue) - Number(a.lane.isOverdue)),
  );

  readonly teamAccountability = computed(() => {
    const members = new Map<string, {
      subject: string;
      name: string;
      lanes: Set<string>;
      active: number;
      complete: number;
      waiting: number;
      overdue: number;
    }>();

    for (const snapshot of this.visibleSnapshots()) {
      for (const lane of snapshot.lanes) {
        if (!lane.isApplicable || !lane.owner) continue;
        const key = lane.owner.userSubject;
        const member = members.get(key) ?? {
          subject: key,
          name: lane.owner.displayName,
          lanes: new Set<string>(),
          active: 0,
          complete: 0,
          waiting: 0,
          overdue: 0,
        };
        member.lanes.add(lane.label);
        member.active += 1;
        if (lane.status === 'complete') member.complete += 1;
        if (lane.status === 'waiting-on-host') member.waiting += 1;
        if (lane.isOverdue || lane.status === 'overdue') member.overdue += 1;
        members.set(key, member);
      }
    }

    return [...members.values()]
      .map(member => ({ ...member, lanes: [...member.lanes] }))
      .sort((a, b) => b.overdue - a.overdue || b.active - a.active || a.name.localeCompare(b.name));
  });

  constructor(private readonly api: EngagementsApiService, private readonly router: Router) {}

  ngOnInit(): void {
    this.api.getCommandCenter().subscribe({
      next: snapshots => {
        this.snapshots.set(snapshots);
        this.loading.set(false);
        this.loadHostActivity(snapshots);
      },
      error: () => this.loadAssignmentFallback(),
    });
  }

  setWindow(value: CommandWindow): void {
    this.window.set(value);
    this.attentionOnly.set(false);
  }

  openEngagement(id: string, event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('a, button, details, summary, input, select, textarea')) return;
    void this.router.navigate(['/organization/ctg/engagements', id]);
  }

  lane(snapshot: EngagementResponsibilitySnapshot, key: string): ResponsibilityLaneState | null {
    return snapshot.lanes.find(item => item.key === key && item.isApplicable) ?? null;
  }

  laneStatusLabel(lane: ResponsibilityLaneState): string {
    if (!lane.owner) return 'Needs an owner';
    if (lane.isOverdue || lane.status === 'overdue') return 'Overdue';
    if (lane.status === 'blocked') return 'Needs help';
    if (lane.status === 'ready-for-review') return 'Ready to review';
    if (lane.status === 'waiting-on-host') return 'Waiting for host';
    if (lane.status === 'not-started') return 'Not started yet';
    if (lane.status === 'in-progress') return 'In progress';
    if (lane.status === 'complete') return 'Complete';
    return this.statusLabel(lane.status);
  }

  laneDetail(lane: ResponsibilityLaneState): string {
    if (lane.dueAtUtc) return `Due ${this.dateLabel(lane.dueAtUtc)}`;
    if (lane.updatedAtUtc) return `Updated ${this.relativeDate(lane.updatedAtUtc)}`;
    return lane.detail || 'No due date';
  }

  blockedCount(snapshot: EngagementResponsibilitySnapshot): number {
    return snapshot.lanes.filter(lane =>
      lane.isApplicable && lane.status === 'blocked',
    ).length;
  }

  waitingCount(snapshot: EngagementResponsibilitySnapshot): number {
    return snapshot.lanes.filter(lane =>
      lane.isApplicable && lane.status === 'waiting-on-host',
    ).length;
  }

  firstUnassignedLaneKey(snapshot: EngagementResponsibilitySnapshot): string {
    return snapshot.lanes.find(lane => lane.isApplicable && !lane.owner)?.key ?? 'responsibilities';
  }

  firstLaneKey(snapshot: EngagementResponsibilitySnapshot, status: string): string {
    if (status === 'overdue') {
      return snapshot.lanes.find(lane =>
        lane.isApplicable && (lane.isOverdue || lane.status === 'overdue'),
      )?.key ?? 'responsibilities';
    }

    return snapshot.lanes.find(lane =>
      lane.isApplicable && lane.status === status,
    )?.key ?? 'responsibilities';
  }

  topAttention(snapshot: EngagementResponsibilitySnapshot): ResponsibilityLaneState | null {
    const applicable = snapshot.lanes.filter(lane => lane.isApplicable);

    return applicable.find(lane => lane.isOverdue || lane.status === 'overdue') ??
      applicable.find(lane => lane.status === 'blocked') ??
      applicable.find(lane => lane.status === 'waiting-on-host') ??
      applicable.find(lane => !lane.owner) ??
      applicable.find(lane => lane.status !== 'complete') ??
      null;
  }

  topAttentionDetail(lane: ResponsibilityLaneState): string {
    if (lane.isOverdue || lane.status === 'overdue') return 'is overdue';
    if (lane.status === 'blocked') return 'is blocked';
    if (lane.status === 'waiting-on-host') return 'is waiting on the host';
    if (!lane.owner) return 'needs an owner';
    return this.statusLabel(lane.status).toLowerCase();
  }

  attentionReason(lane: ResponsibilityLaneState): string {
    if (lane.owner === null) return 'No owner assigned.';
    if (lane.isOverdue || lane.status === 'overdue') return `Overdue${lane.dueAtUtc ? ` · due ${this.dateLabel(lane.dueAtUtc)}` : ''}.`;
    if (lane.status === 'blocked') return lane.detail || 'Work is blocked.';
    return lane.detail || this.statusLabel(lane.status);
  }

  windowLabel(): string {
    return this.window() === 0 ? 'All active ministry work' : `Next ${this.window()} days`;
  }

  dateLabel(value: string | null): string {
    if (!value) return 'Date pending';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  relativeDate(value: string): string {
    const difference = Date.now() - new Date(value).getTime();
    const hours = Math.max(0, Math.floor(difference / 3_600_000));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }

  truncate(value: string, length: number): string {
    return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
  }

  private loadAssignmentFallback(): void {
    this.responsibilityDataUnavailable.set(true);
    this.api.getAssignments().subscribe({
      next: assignments => {
        const snapshots = assignments
          .filter(assignment => !['complete', 'completed', 'archived', 'cancelled'].includes(assignment.status))
          .map(assignment => this.fallbackSnapshot(assignment));
        this.snapshots.set(snapshots);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The Command Center could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  private fallbackSnapshot(assignment: EngagementSummary): EngagementResponsibilitySnapshot {
    return {
      assignment,
      lanes: [],
      responsibilityReadinessPercent: assignment.readinessPercent,
      hostCoordinationPercent: assignment.hostStatus === 'confirmed' ? 100 : 0,
      completedLaneCount: 0,
      applicableLaneCount: 0,
      overdueLaneCount: 0,
      unassignedLaneCount: 0,
    };
  }

  private loadHostActivity(snapshots: readonly EngagementResponsibilitySnapshot[]): void {
    if (snapshots.length === 0) return;
    const requests = snapshots.slice(0, 20).map(snapshot =>
      this.api.getHostCoordinationMessages(snapshot.assignment.id).pipe(
        catchError(() => of({ isClosed: false, messages: [] as const })),
      ),
    );

    forkJoin(requests).subscribe(threads => {
      const activity: HostActivityPreview[] = [];
      threads.forEach((thread, index) => {
        const snapshot = snapshots[index];
        for (const message of thread.messages) {
          activity.push({
            assignmentId: snapshot.assignment.id,
            assignmentTitle: snapshot.assignment.title,
            hostOrganization: snapshot.assignment.hostOrganization,
            message,
          });
        }
      });
      activity.sort((a, b) => new Date(b.message.createdAtUtc).getTime() - new Date(a.message.createdAtUtc).getTime());
      this.hostActivity.set(activity);
    });
  }

  private statusLabel(value: string): string {
    return value.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  private dateValue(value: string | null): number {
    return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
  }
}
