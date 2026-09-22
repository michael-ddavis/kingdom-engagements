import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  EngagementsApiService,
  MediaAssetInput,
  UpdateFinanceLaneInput,
  UpdateHospitalityLaneInput,
  UpdateHostCoordinationLaneInput,
  UpdateLodgingLaneInput,
  UpdateMediaLaneInput,
  UpdateMinistryPreparationLaneInput,
  UpdateProgramLaneInput,
  UpdateTransportationLaneInput,
  UpdateTravelLaneInput,
} from '../core/engagements-api.service';
import {
  AssignmentWorkspaceDetails,
  DocumentsLaneDetails,
  EngagementDetails,
  FinanceLaneDetails,
  HospitalityLaneDetails,
  HostCoordinationLaneDetails,
  HostCoordinationThread,
  HostScheduleItem,
  LodgingLaneDetails,
  MediaLaneDetails,
  MinistryPreparationLaneDetails,
  ProgramLaneDetails,
  ResponsibilityLaneState,
  TransportationLaneDetails,
  TravelLaneDetails,
} from '../core/models';

type DirectorTab =
  | 'overview'
  | 'responsibilities'
  | 'host-coordination'
  | 'travel'
  | 'lodging'
  | 'transportation'
  | 'media'
  | 'program'
  | 'documents'
  | 'finance'
  | 'ministry-preparation'
  | 'hospitality'
  | 'activity';

interface ResponsibilityDraft {
  laneKey: string;
  displayName: string;
  email: string;
  userSubject: string;
  status: string;
  detail: string;
  dueDate: string;
  isApplicable: boolean;
}

@Component({
  selector: 'app-ctg-director-engagement',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="director-engagement">
      <a class="back-link" routerLink="/organization/ctg/command-center">← Back to Command Center</a>

      @if (loading()) {
        <div class="state">Loading engagement operation…</div>
      } @else if (error()) {
        <div class="state error">{{ error() }}</div>
      } @else if (assignment(); as item) {
        <header class="engagement-heading">
          <div>
            <p class="eyebrow">Engagement Director Workspace</p>
            <h1>{{ item.summary.title }}</h1>
            <p>{{ item.summary.hostOrganization }} · {{ item.summary.location || 'Location pending' }}</p>
            <span>{{ dateRange(item.summary.startsAtUtc, item.endsAtUtc) }}</span>
          </div>
          <div class="heading-actions">
            <a [routerLink]="['/assignments', item.summary.id]" [queryParams]="{ legacy: 1 }">Open ministry record</a>
            <div class="readiness">
              <strong>{{ readinessPercent() }}%</strong>
              <span>responsibilities complete</span>
            </div>
          </div>
        </header>

        <section class="engagement-alerts">
          <article><small>Overdue</small><strong>{{ overdueCount() }}</strong></article>
          <article><small>Unassigned</small><strong>{{ unassignedCount() }}</strong></article>
          <article><small>Waiting on host</small><strong>{{ waitingHostCount() }}</strong></article>
          <article><small>Host preparation</small><strong>{{ workspace()?.readiness?.overallPercent ?? 0 }}%</strong></article>
        </section>

        <nav class="workspace-tabs" aria-label="Engagement director sections">
          @for (tabItem of tabs; track tabItem.key) {
            <button
              type="button"
              [class.active]="tab() === tabItem.key"
              (click)="tab.set(tabItem.key)">
              {{ tabItem.label }}
              @if (tabItem.lane && lane(tabItem.lane); as laneItem) {
                <span [class.alert]="laneItem.isOverdue || !laneItem.owner">{{ laneBadge(laneItem) }}</span>
              }
            </button>
          }
        </nav>

        <section class="workspace-body">
          @switch (tab()) {
            @case ('overview') {
              <section class="overview-grid">
                <article class="overview-card overview-card--wide">
                  <header><div><p class="eyebrow">Responsibility health</p><h2>Every piece of this engagement</h2></div><button type="button" (click)="tab.set('responsibilities')">Manage owners →</button></header>
                  <div class="responsibility-grid">
                    @for (laneItem of responsibilities(); track laneItem.key) {
                      <button
                        type="button"
                        [class.complete]="laneItem.status === 'complete'"
                        [class.waiting]="laneItem.status === 'waiting-on-host'"
                        [class.danger]="laneItem.isOverdue || laneItem.status === 'blocked'"
                        [class.na]="!laneItem.isApplicable"
                        (click)="openLane(laneItem.key)">
                        <span><strong>{{ laneItem.label }}</strong><small>{{ laneItem.owner?.displayName || 'Unassigned' }}</small></span>
                        <b>{{ laneStatus(laneItem) }}</b>
                        <small>{{ laneItem.dueAtUtc ? 'Due ' + dateLabel(laneItem.dueAtUtc) : laneItem.detail || 'No due date' }}</small>
                      </button>
                    }
                  </div>
                </article>

                <article class="overview-card">
                  <header><div><p class="eyebrow">Host coordination</p><h2>{{ host()?.coordinationStatus ? label(host()!.coordinationStatus) : 'Not started' }}</h2></div><button type="button" (click)="tab.set('host-coordination')">Open →</button></header>
                  <div class="host-meter">
                    <strong>{{ workspace()?.readiness?.overallPercent ?? 0 }}%</strong>
                    <div><i [style.width.%]="workspace()?.readiness?.overallPercent ?? 0"></i></div>
                    <span>{{ thread()?.isClosed ? 'Conversation closed after coordination completion.' : 'Host conversation is active.' }}</span>
                  </div>
                </article>

                <article class="overview-card">
                  <header><div><p class="eyebrow">Next movement</p><h2>Attention items</h2></div></header>
                  @if ((workspace()?.readiness?.attentionItems?.length ?? 0) === 0 && attentionLanes().length === 0) {
                    <p class="empty-copy">Nothing is currently blocked.</p>
                  } @else {
                    <ul class="attention-items">
                      @for (text of workspace()?.readiness?.attentionItems ?? []; track text) { <li>{{ text }}</li> }
                      @for (laneItem of attentionLanes(); track laneItem.key) {
                        <li><strong>{{ laneItem.label }}:</strong> {{ laneAttention(laneItem) }}</li>
                      }
                    </ul>
                  }
                </article>

                <article class="overview-card overview-card--wide">
                  <header><div><p class="eyebrow">Recent activity</p><h2>Who moved what</h2></div><button type="button" (click)="tab.set('activity')">Full activity →</button></header>
                  <div class="activity-list">
                    @for (activity of (workspace()?.activity ?? []).slice(0, 6); track activity.occurredAtUtc + activity.title) {
                      <div><span></span><p><strong>{{ activity.title }}</strong><small>{{ activity.detail }}</small></p><b>{{ activity.actor }} · {{ relativeDate(activity.occurredAtUtc) }}</b></div>
                    }
                  </div>
                </article>
              </section>
            }

            @case ('responsibilities') {
              <section class="panel">
                <header><div><p class="eyebrow">Traffic control</p><h2>Responsibility ownership & accountability</h2><p>Standing owners are inherited automatically. Override them here only when this engagement needs someone different.</p></div></header>
                <div class="responsibility-list">
                  @for (laneItem of responsibilities(); track laneItem.key) {
                    <article [class.na]="!laneItem.isApplicable">
                      <div>
                        <strong>{{ laneItem.label }}</strong>
                        <p>{{ laneItem.description }}</p>
                      </div>
                      <div class="responsibility-owner">
                        <small>Owner</small>
                        <strong>{{ laneItem.owner?.displayName || 'Unassigned' }}</strong>
                        <span>{{ laneItem.owner?.source === 'engagement' ? 'Engagement override' : laneItem.owner ? 'Standing assignment' : 'Needs assignment' }}</span>
                      </div>
                      <div class="responsibility-state">
                        <small>Status</small>
                        <strong>{{ laneStatus(laneItem) }}</strong>
                        <span>{{ laneItem.dueAtUtc ? 'Due ' + dateLabel(laneItem.dueAtUtc) : 'No due date' }}</span>
                      </div>
                      <div class="responsibility-audit">
                        <small>Last movement</small>
                        <strong>{{ laneItem.updatedByName || 'No updates yet' }}</strong>
                        <span>{{ laneItem.updatedAtUtc ? relativeDate(laneItem.updatedAtUtc) : '—' }}</span>
                      </div>
                      <button type="button" (click)="editResponsibility(laneItem)">Manage</button>
                    </article>
                  }
                </div>
              </section>
            }

            @case ('host-coordination') {
              @if (host(); as record) {
                <section class="two-column">
                  <article class="panel">
                    <header><div><p class="eyebrow">Host coordination</p><h2>Host notes & contacts</h2></div><span>{{ label(record.coordinationStatus) }}</span></header>
                    <label class="field"><span>Internal host coordination notes</span><textarea rows="8" [(ngModel)]="hostDraft.hostNotes"></textarea></label>
                    <div class="contact-list">
                      <h3>Relevant contacts</h3>
                      @for (contact of record.contacts; track contact.type + contact.name) {
                        <div><strong>{{ contact.name }}</strong><span>{{ label(contact.type) }}</span><small>{{ contact.email || 'No email' }} · {{ contact.phone || 'No phone' }}</small></div>
                      }
                    </div>
                    <footer class="panel-actions"><button type="button" [disabled]="saving()" (click)="saveHost()">Save host coordination</button></footer>
                  </article>

                  <article class="panel conversation-panel">
                    <header><div><p class="eyebrow">Host conversation</p><h2>Coordination thread</h2></div><span>{{ thread()?.isClosed ? 'Closed' : 'Open' }}</span></header>
                    <div class="thread">
                      @for (message of thread()?.messages ?? []; track message.id) {
                        <div [class.host-message]="message.senderType === 'host'" [class.team-message]="message.senderType === 'ministry'">
                          <header><strong>{{ message.senderName }}</strong><span>{{ relativeDate(message.createdAtUtc) }}</span></header>
                          <p>{{ message.message }}</p>
                        </div>
                      }
                      @if ((thread()?.messages?.length ?? 0) === 0) { <p class="empty-copy">No messages yet.</p> }
                    </div>
                    @if (!thread()?.isClosed) {
                      <div class="composer">
                        <textarea rows="3" [(ngModel)]="hostMessageDraft" placeholder="Message the host about missing information or next steps."></textarea>
                        <button type="button" [disabled]="saving() || !hostMessageDraft.trim()" (click)="sendHostMessage()">Send message</button>
                      </div>
                    }
                  </article>
                </section>
              }
            }

            @case ('travel') {
              @if (travel(); as record) {
                <section class="panel">
                  <header><div><p class="eyebrow">Travel lane</p><h2>Flights & itinerary</h2></div><span>{{ ownerLabel(record.lane) }}</span></header>
                  <div class="form-grid">
                    <h3 class="full">Outbound</h3>
                    <label class="field"><span>Airline</span><input [(ngModel)]="travelDraft.outboundAirline"></label>
                    <label class="field"><span>Flight number</span><input [(ngModel)]="travelDraft.outboundFlightNumber"></label>
                    <label class="field"><span>Confirmation</span><input [(ngModel)]="travelDraft.outboundConfirmationNumber"></label>
                    <label class="field"><span>Departure airport</span><input [(ngModel)]="travelDraft.outboundDepartureAirport"></label>
                    <label class="field"><span>Arrival airport</span><input [(ngModel)]="travelDraft.outboundArrivalAirport"></label>
                    <label class="field"><span>Departs</span><input type="datetime-local" [(ngModel)]="travelDraft.outboundDepartsAtUtc"></label>
                    <label class="field"><span>Arrives</span><input type="datetime-local" [(ngModel)]="travelDraft.outboundArrivesAtUtc"></label>
                    <h3 class="full">Return</h3>
                    <label class="field"><span>Airline</span><input [(ngModel)]="travelDraft.returnAirline"></label>
                    <label class="field"><span>Flight number</span><input [(ngModel)]="travelDraft.returnFlightNumber"></label>
                    <label class="field"><span>Confirmation</span><input [(ngModel)]="travelDraft.returnConfirmationNumber"></label>
                    <label class="field"><span>Departure airport</span><input [(ngModel)]="travelDraft.returnDepartureAirport"></label>
                    <label class="field"><span>Arrival airport</span><input [(ngModel)]="travelDraft.returnArrivalAirport"></label>
                    <label class="field"><span>Departs</span><input type="datetime-local" [(ngModel)]="travelDraft.returnDepartsAtUtc"></label>
                    <label class="field"><span>Arrives</span><input type="datetime-local" [(ngModel)]="travelDraft.returnArrivesAtUtc"></label>
                  </div>
                  <footer class="panel-actions"><button type="button" [disabled]="saving()" (click)="saveTravel()">Save travel</button></footer>
                </section>
              }
            }

            @case ('lodging') {
              @if (lodging(); as record) {
                <section class="panel">
                  <header><div><p class="eyebrow">Lodging lane</p><h2>Hotel & stay</h2></div><span>{{ ownerLabel(record.lane) }}</span></header>
                  <div class="form-grid">
                    <label class="field"><span>Hotel name</span><input [(ngModel)]="lodgingDraft.hotelName"></label>
                    <label class="field"><span>Confirmation</span><input [(ngModel)]="lodgingDraft.hotelConfirmationNumber"></label>
                    <label class="field full"><span>Hotel address</span><input [(ngModel)]="lodgingDraft.hotelAddress"></label>
                    <label class="field"><span>Check in</span><input type="datetime-local" [(ngModel)]="lodgingDraft.hotelCheckInAtUtc"></label>
                    <label class="field"><span>Check out</span><input type="datetime-local" [(ngModel)]="lodgingDraft.hotelCheckOutAtUtc"></label>
                  </div>
                  <footer class="panel-actions"><button type="button" [disabled]="saving()" (click)="saveLodging()">Save lodging</button></footer>
                </section>
              }
            }

            @case ('transportation') {
              @if (transportation(); as record) {
                <section class="panel">
                  <header><div><p class="eyebrow">Ground transportation</p><h2>Local movement & pickup</h2></div><span>{{ ownerLabel(record.lane) }}</span></header>
                  <div class="form-grid">
                    <label class="field full"><span>Transportation plan</span><textarea rows="6" [(ngModel)]="transportDraft.transportationPlan"></textarea></label>
                    <label class="field"><span>Pickup contact</span><input [(ngModel)]="transportDraft.pickupContactName"></label>
                    <label class="field"><span>Pickup phone</span><input [(ngModel)]="transportDraft.pickupContactPhone"></label>
                  </div>
                  <footer class="panel-actions"><button type="button" [disabled]="saving()" (click)="saveTransportation()">Save transportation</button></footer>
                </section>
              }
            }

            @case ('media') {
              @if (media(); as record) {
                <section class="two-column">
                  <article class="panel">
                    <header><div><p class="eyebrow">Media & Creative</p><h2>Media preparation</h2></div><span>{{ ownerLabel(record.lane) }}</span></header>
                    <label class="field"><span>Promotion / media requirements</span><textarea rows="8" [(ngModel)]="mediaDraft.promotionRequirements"></textarea></label>
                    <div class="contact-list">
                      <h3>Media contacts</h3>
                      @for (contact of record.contacts; track contact.type + contact.name) {
                        <div><strong>{{ contact.name }}</strong><span>{{ label(contact.type) }}</span><small>{{ contact.email || 'No email' }} · {{ contact.phone || 'No phone' }}</small></div>
                      }
                    </div>
                    <footer class="panel-actions"><button type="button" [disabled]="saving()" (click)="saveMedia()">Save media preparation</button></footer>
                  </article>

                  <article class="panel">
                    <header><div><p class="eyebrow">Assets</p><h2>Images, video & creative files</h2></div></header>
                    <div class="asset-list">
                      @for (asset of record.assets; track asset.id) {
                        <div>
                          <span class="asset-type">{{ label(asset.assetType) }}</span>
                          <p><strong>{{ asset.name }}</strong><small>{{ asset.purpose }} · {{ label(asset.status) }} · {{ label(asset.source) }}</small></p>
                          @if (asset.externalUrl) { <a [href]="asset.externalUrl" target="_blank" rel="noopener">Open ↗</a> }
                          <button type="button" (click)="deleteAsset(asset.id)">×</button>
                        </div>
                      }
                      @if (record.assets.length === 0) { <p class="empty-copy">No media assets have been added.</p> }
                    </div>
                    <div class="asset-editor">
                      <h3>Add media asset</h3>
                      <input placeholder="Asset name" [(ngModel)]="assetDraft.name">
                      <select [(ngModel)]="assetDraft.assetType"><option value="image">Image</option><option value="video">Video</option><option value="audio">Audio</option><option value="document">Document</option><option value="link">Link</option><option value="other">Other</option></select>
                      <input placeholder="Purpose" [(ngModel)]="assetDraft.purpose">
                      <select [(ngModel)]="assetDraft.status"><option value="requested">Requested</option><option value="waiting-on-host">Waiting on host</option><option value="received">Received</option><option value="in-review">In review</option><option value="approved">Approved</option><option value="ready">Ready</option></select>
                      <select [(ngModel)]="assetDraft.source"><option value="host">Host</option><option value="ministry">Ministry</option><option value="third-party">Third party</option></select>
                      <input class="wide" placeholder="External URL or storage link" [(ngModel)]="assetDraft.externalUrl">
                      <textarea class="wide" rows="3" placeholder="Notes" [(ngModel)]="assetDraft.notes"></textarea>
                      <button class="wide" type="button" [disabled]="saving() || !assetDraft.name.trim() || !assetDraft.purpose.trim()" (click)="addAsset()">Add asset</button>
                    </div>
                  </article>
                </section>
              }
            }

            @case ('program') {
              @if (program(); as record) {
                <section class="panel">
                  <header><div><p class="eyebrow">Program & Schedule</p><h2>Engagement itinerary</h2></div><span>{{ ownerLabel(record.lane) }}</span></header>
                  <div class="schedule-list">
                    @for (scheduleItem of programDraft.schedule; track $index) {
                      <div class="schedule-row">
                        <input placeholder="Title" [(ngModel)]="scheduleItem.title">
                        <input type="date" [(ngModel)]="scheduleItem.date">
                        <input type="time" [(ngModel)]="scheduleItem.startsAt">
                        <input type="time" [(ngModel)]="scheduleItem.endsAt">
                        <input placeholder="Location" [(ngModel)]="scheduleItem.location">
                        <button type="button" (click)="removeSchedule($index)">×</button>
                      </div>
                    }
                    @if (programDraft.schedule.length === 0) { <p class="empty-copy">No program items yet.</p> }
                  </div>
                  <div class="panel-actions split"><button type="button" class="secondary" (click)="addSchedule()">+ Add schedule item</button><button type="button" [disabled]="saving()" (click)="saveProgram()">Save program</button></div>
                </section>
              }
            }

            @case ('documents') {
              @if (documents(); as record) {
                <section class="panel">
                  <header><div><p class="eyebrow">Documents & Agreements</p><h2>Engagement records</h2></div><span>{{ ownerLabel(record.lane) }}</span></header>
                  <div class="document-list">
                    @for (document of record.documents; track document.id) {
                      <div><span>{{ label(document.category) }}</span><p><strong>{{ document.name }}</strong><small>{{ label(document.status) }} · {{ dateLabel(document.updatedAtUtc) }}</small></p></div>
                    }
                  </div>
                  <div class="document-editor">
                    <input placeholder="Document name" [(ngModel)]="documentDraft.name">
                    <select [(ngModel)]="documentDraft.status"><option value="requested">Requested</option><option value="waiting-on-host">Waiting on host</option><option value="received">Received</option><option value="in-review">In review</option><option value="approved">Approved</option><option value="complete">Complete</option></select>
                    <input placeholder="Storage reference / URL" [(ngModel)]="documentDraft.storageReference">
                    <button type="button" [disabled]="saving() || !documentDraft.name.trim()" (click)="addDocument()">Add document record</button>
                  </div>
                </section>
              }
            }

            @case ('finance') {
              @if (finance(); as record) {
                <section class="panel">
                  <header><div><p class="eyebrow">Finance & Honorarium</p><h2>Terms and payment preparation</h2></div><span>{{ ownerLabel(record.lane) }}</span></header>
                  <div class="form-grid">
                    <label class="field"><span>Travel coverage</span><input [(ngModel)]="financeDraft.travelCoverageStatus"></label>
                    <label class="field"><span>Lodging coverage</span><input [(ngModel)]="financeDraft.lodgingCoverageStatus"></label>
                    <label class="field"><span>Travel booked by</span><input [(ngModel)]="financeDraft.travelBookedBy"></label>
                    <label class="field"><span>Honorarium status</span><input [(ngModel)]="financeDraft.honorariumStatus"></label>
                    <label class="field"><span>Honorarium amount</span><input type="number" [(ngModel)]="financeDraft.honorariumAmount"></label>
                    <label class="field"><span>Currency</span><input [(ngModel)]="financeDraft.honorariumCurrency"></label>
                    <label class="field"><span>Payment status</span><input [(ngModel)]="financeDraft.paymentStatus"></label>
                  </div>
                  <footer class="panel-actions"><button type="button" [disabled]="saving()" (click)="saveFinance()">Save finance</button></footer>
                </section>
              }
            }

            @case ('ministry-preparation') {
              @if (ministry(); as record) {
                <section class="panel">
                  <header><div><p class="eyebrow">Ministry Preparation</p><h2>Spiritual & ministry brief</h2></div><span>{{ ownerLabel(record.lane) }}</span></header>
                  <label class="field"><span>Prayer focus</span><textarea rows="5" [(ngModel)]="ministryDraft.prayerFocus"></textarea></label>
                  <label class="field"><span>Ministry preparation notes</span><textarea rows="9" [(ngModel)]="ministryDraft.ministryPreparationNotes"></textarea></label>
                  <footer class="panel-actions"><button type="button" [disabled]="saving()" (click)="saveMinistry()">Save ministry preparation</button></footer>
                </section>
              }
            }

            @case ('hospitality') {
              @if (hospitality(); as record) {
                <section class="panel">
                  <header><div><p class="eyebrow">Hospitality</p><h2>Meals, green room & care</h2></div><span>{{ ownerLabel(record.lane) }}</span></header>
                  <label class="field"><span>Hospitality notes</span><textarea rows="10" [(ngModel)]="hospitalityDraft.hospitalityNotes"></textarea></label>
                  <div class="contact-list">
                    <h3>Hospitality contacts</h3>
                    @for (contact of record.contacts; track contact.type + contact.name) {
                      <div><strong>{{ contact.name }}</strong><span>{{ label(contact.type) }}</span><small>{{ contact.email || 'No email' }} · {{ contact.phone || 'No phone' }}</small></div>
                    }
                  </div>
                  <footer class="panel-actions"><button type="button" [disabled]="saving()" (click)="saveHospitality()">Save hospitality</button></footer>
                </section>
              }
            }

            @case ('activity') {
              <section class="panel">
                <header><div><p class="eyebrow">Audit trail</p><h2>Engagement activity</h2></div></header>
                <div class="activity-list activity-list--full">
                  @for (activity of workspace()?.activity ?? []; track activity.occurredAtUtc + activity.title) {
                    <div><span></span><p><strong>{{ activity.title }}</strong><small>{{ activity.detail }}</small></p><b>{{ activity.actor }} · {{ dateTimeLabel(activity.occurredAtUtc) }}</b></div>
                  }
                </div>
              </section>
            }
          }

          @if (saveMessage()) { <div class="save-toast">{{ saveMessage() }}</div> }
          @if (saveError()) { <div class="save-toast save-toast--error">{{ saveError() }}</div> }
        </section>
      }

      @if (responsibilityDraft(); as form) {
        <div class="drawer-backdrop" (click)="closeResponsibility()"></div>
        <aside class="responsibility-drawer">
          <header><div><small>Engagement responsibility</small><h2>{{ laneLabel(form.laneKey) }}</h2></div><button type="button" (click)="closeResponsibility()">×</button></header>
          <label class="toggle"><input type="checkbox" [(ngModel)]="form.isApplicable"><span>This lane applies to this engagement</span></label>
          <label class="field"><span>Owner name</span><input [(ngModel)]="form.displayName"></label>
          <label class="field"><span>Owner email</span><input type="email" [(ngModel)]="form.email"></label>
          <label class="field"><span>ApostolOS account ID</span><input [(ngModel)]="form.userSubject"></label>
          <label class="field"><span>Status</span>
            <select [(ngModel)]="form.status">
              <option value="not-started">Not started</option>
              <option value="in-progress">In progress</option>
              <option value="waiting-on-host">Waiting on host</option>
              <option value="blocked">Blocked</option>
              <option value="ready-for-review">Ready for review</option>
              <option value="complete">Complete</option>
            </select>
          </label>
          <label class="field"><span>Due date</span><input type="date" [(ngModel)]="form.dueDate"></label>
          <label class="field"><span>Status detail</span><textarea rows="5" [(ngModel)]="form.detail"></textarea></label>
          <footer><button class="secondary" type="button" (click)="closeResponsibility()">Cancel</button><button type="button" [disabled]="saving()" (click)="saveResponsibility()">Save responsibility</button></footer>
        </aside>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.director-engagement{width:min(1320px,calc(100% - 40px));margin:0 auto;padding:20px 0 60px;color:#17202b}.back-link{display:inline-block;margin:0 0 12px;color:#52647f;font-size:.7rem;font-weight:800;text-decoration:none}
    .engagement-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:26px;padding:22px 24px;border:1px solid #dfe3e0;border-radius:16px;background:#fffdfa}.engagement-heading h1,.panel h2,.overview-card h2,.responsibility-drawer h2{margin:4px 0 6px;font:500 clamp(1.8rem,3vw,2.7rem)/1.08 Georgia,'Times New Roman',serif;color:#17243a}.engagement-heading p{margin:0;color:#68716d}.engagement-heading>div>span{display:block;margin-top:6px;color:#858b87;font-size:.66rem}.eyebrow{margin:0!important;color:#876f33!important;font:850 .64rem/1.2 system-ui,sans-serif!important;letter-spacing:.1em;text-transform:uppercase}.heading-actions{display:flex;align-items:center;gap:12px}.heading-actions>a{padding:9px 12px;border:1px solid #d9ddda;border-radius:8px;color:#172a46;font-size:.65rem;font-weight:850;text-decoration:none}.readiness{text-align:right}.readiness strong{display:block;font-size:2rem}.readiness span{font-size:.62rem;color:#7b827e}
    .engagement-alerts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.engagement-alerts article{padding:11px 14px;border:1px solid #e1e4e1;border-radius:10px;background:#fff}.engagement-alerts small{display:block;color:#808783;font-size:.56rem;font-weight:850;text-transform:uppercase}.engagement-alerts strong{display:block;margin-top:3px;font-size:1.05rem}
    .workspace-tabs{display:flex;gap:3px;margin:16px 0 12px;overflow:auto;padding:4px;border:1px solid #dfe3e0;border-radius:11px;background:#f7f5f0;scrollbar-width:thin}.workspace-tabs button{display:flex;align-items:center;gap:6px;min-height:36px;padding:0 10px;border:0;border-radius:7px;background:transparent;color:#66706a;font-size:.65rem;font-weight:850;white-space:nowrap;cursor:pointer}.workspace-tabs button.active{background:#172a46;color:#fff}.workspace-tabs button span{padding:2px 5px;border-radius:999px;background:rgba(255,255,255,.18);font-size:.52rem}.workspace-tabs button:not(.active) span.alert{background:#f8e8e5;color:#a84642}
    .workspace-body{position:relative}.overview-grid,.two-column{display:grid;grid-template-columns:1fr 1fr;gap:12px}.overview-card,.panel{border:1px solid #dfe3e0;border-radius:14px;background:#fffdfa;box-shadow:0 8px 25px rgba(18,26,44,.035)}.overview-card{padding:17px}.overview-card--wide{grid-column:1/-1}.overview-card>header,.panel>header{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.overview-card h2,.panel h2{font-size:1.2rem}.overview-card header button,.panel header button{border:0;background:transparent;color:#315faf;font-size:.64rem;font-weight:850;cursor:pointer}
    .responsibility-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.responsibility-grid>button{min-height:105px;padding:11px;border:1px solid #e1e4e1;border-radius:9px;background:#f8f7f3;text-align:left;color:inherit;cursor:pointer}.responsibility-grid button>span{display:flex;justify-content:space-between;gap:7px}.responsibility-grid button strong{font-size:.7rem}.responsibility-grid button span small{color:#79817d;font-size:.55rem;text-align:right}.responsibility-grid button b{display:block;margin:11px 0 4px;font-size:.67rem}.responsibility-grid button>small{color:#808783;font-size:.57rem}.responsibility-grid button.complete{background:#eef6f1}.responsibility-grid button.waiting{background:#fbf5e8}.responsibility-grid button.danger{background:#fbefed;border-color:#e8cecb}.responsibility-grid button.na{opacity:.55}
    .host-meter strong{display:block;margin:8px 0;font-size:1.8rem}.host-meter>div{height:6px;border-radius:999px;background:#e4e6e3;overflow:hidden}.host-meter i{display:block;height:100%;background:#9d7438}.host-meter span{display:block;margin-top:8px;color:#777f7a;font-size:.65rem}
    .attention-items{margin:10px 0 0;padding-left:18px;color:#5e6863;font-size:.7rem;line-height:1.6}.empty-copy{color:#808783;font-size:.7rem}
    .activity-list{display:flex;flex-direction:column;margin-top:10px}.activity-list>div{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:flex-start;padding:9px 0;border-top:1px solid #eceeec}.activity-list>div:first-child{border-top:0}.activity-list>div>span{width:8px;height:8px;margin-top:5px;border-radius:50%;background:#9d7438}.activity-list p{margin:0}.activity-list p strong,.activity-list p small{display:block}.activity-list p strong{font-size:.68rem}.activity-list p small{margin-top:2px;color:#79817d;font-size:.6rem}.activity-list b{color:#7d8480;font-size:.58rem;font-weight:700}.activity-list--full{padding:0 18px 14px}
    .panel{padding:18px}.panel>header{padding-bottom:14px;border-bottom:1px solid #e6e8e6}.panel>header>span{color:#747c78;font-size:.63rem;font-weight:800}.panel>header p:not(.eyebrow){margin:4px 0 0;color:#727a76;font-size:.68rem}.panel-actions{display:flex;justify-content:flex-end;margin-top:16px;padding-top:13px;border-top:1px solid #e5e7e5}.panel-actions.split{justify-content:space-between}.panel-actions button,.responsibility-drawer footer button,.asset-editor button,.document-editor button,.composer button{padding:9px 13px;border:0;border-radius:8px;background:#172a46;color:#fff;font-size:.65rem;font-weight:850;cursor:pointer}.panel-actions .secondary,.responsibility-drawer .secondary{border:1px solid #d6dbd8;background:#fff;color:#172a46}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.form-grid .full,.field.full{grid-column:1/-1}.form-grid h3{margin:5px 0 0;color:#5e6863;font-size:.72rem}.field{display:block;margin-top:12px}.field>span{display:block;margin-bottom:5px;font-size:.62rem;font-weight:850;color:#59635e}.field input,.field textarea,.field select,.asset-editor input,.asset-editor textarea,.asset-editor select,.document-editor input,.document-editor select,.composer textarea,.schedule-row input{box-sizing:border-box;width:100%;padding:9px 10px;border:1px solid #d5dad7;border-radius:8px;background:#fff;font:inherit;font-size:.72rem}.field textarea{resize:vertical}
    .responsibility-list{display:flex;flex-direction:column;margin-top:8px}.responsibility-list article{display:grid;grid-template-columns:1.3fr .9fr .7fr .8fr auto;gap:14px;align-items:center;padding:13px 2px;border-top:1px solid #eceeec}.responsibility-list article.na{opacity:.58}.responsibility-list article>div:first-child strong{font-size:.72rem}.responsibility-list article>div:first-child p{margin:3px 0 0;color:#7b827e;font-size:.61rem}.responsibility-owner small,.responsibility-state small,.responsibility-audit small{display:block;color:#858b87;font-size:.53rem;text-transform:uppercase}.responsibility-owner strong,.responsibility-state strong,.responsibility-audit strong{display:block;margin-top:2px;font-size:.66rem}.responsibility-owner span,.responsibility-state span,.responsibility-audit span{font-size:.57rem;color:#858b87}.responsibility-list article>button{padding:8px 10px;border:1px solid #d6dbd8;border-radius:7px;background:#fff;color:#172a46;font-size:.6rem;font-weight:850;cursor:pointer}
    .contact-list{margin-top:17px}.contact-list h3,.asset-editor h3{font-size:.7rem}.contact-list>div{display:grid;grid-template-columns:1fr auto;gap:3px;padding:8px 0;border-top:1px solid #eceeec}.contact-list strong{font-size:.68rem}.contact-list span{font-size:.56rem;color:#876f33;text-transform:uppercase}.contact-list small{grid-column:1/-1;color:#7d8480;font-size:.58rem}
    .conversation-panel{display:flex;flex-direction:column}.thread{display:flex;flex:1;flex-direction:column;gap:8px;min-height:340px;max-height:520px;overflow:auto;padding:12px 0}.thread>div{max-width:80%;padding:9px 11px;border-radius:10px;background:#f4f2ed}.thread>div.team-message{align-self:flex-end;background:#eef3f8}.thread>div.host-message{align-self:flex-start}.thread header{display:flex;justify-content:space-between;gap:12px}.thread header strong{font-size:.61rem}.thread header span{color:#8a918d;font-size:.54rem}.thread p{margin:5px 0 0;font-size:.67rem;line-height:1.45}.composer{border-top:1px solid #e4e6e4;padding-top:12px}.composer button{float:right;margin-top:7px}
    .asset-list>div,.document-list>div{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;padding:9px 0;border-top:1px solid #eceeec}.asset-type,.document-list>div>span{padding:3px 6px;border-radius:999px;background:#f1eee4;color:#7b6630;font-size:.54rem;font-weight:850;text-transform:uppercase}.asset-list p,.document-list p{margin:0}.asset-list strong,.document-list strong{display:block;font-size:.67rem}.asset-list small,.document-list small{display:block;margin-top:2px;color:#7d8480;font-size:.57rem}.asset-list a{color:#315faf;font-size:.59rem;font-weight:800;text-decoration:none}.asset-list button{border:0;background:transparent;color:#a84642;cursor:pointer}
    .asset-editor,.document-editor{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:14px;padding:12px;border-radius:9px;background:#f7f5f0}.asset-editor h3{grid-column:1/-1;margin:0}.asset-editor .wide{grid-column:1/-1}.document-editor{grid-template-columns:1fr 150px 1fr auto}.schedule-list{margin-top:12px}.schedule-row{display:grid;grid-template-columns:1.4fr 140px 110px 110px 1fr auto;gap:6px;margin-bottom:7px}.schedule-row button{border:0;background:transparent;color:#a84642;font-weight:900;cursor:pointer}
    .save-toast{position:fixed;right:20px;bottom:20px;z-index:100;padding:11px 14px;border-radius:9px;background:#2d6d52;color:#fff;font-size:.68rem;font-weight:800;box-shadow:0 10px 30px rgba(18,26,44,.2)}.save-toast--error{background:#a84642}
    .drawer-backdrop{position:fixed;inset:0;z-index:90;background:rgba(16,24,35,.38)}.responsibility-drawer{position:fixed;z-index:91;top:0;right:0;width:min(460px,94vw);height:100vh;box-sizing:border-box;padding:20px;overflow:auto;background:#fffdfa;box-shadow:-20px 0 50px rgba(18,26,44,.17)}.responsibility-drawer>header{display:flex;justify-content:space-between}.responsibility-drawer>header small{color:#876f33;font-size:.59rem;font-weight:850;text-transform:uppercase}.responsibility-drawer h2{font-size:1.5rem}.responsibility-drawer>header button{width:34px;height:34px;border:0;border-radius:50%;background:#f0eee8;cursor:pointer}.toggle{display:flex;gap:8px;align-items:center;margin:13px 0;padding:10px;border-radius:8px;background:#f5f3ed;font-size:.67rem;font-weight:800}.responsibility-drawer footer{display:flex;justify-content:flex-end;gap:7px;margin-top:18px;padding-top:14px;border-top:1px solid #e4e6e4}
    .state{padding:40px;border:1px solid #dfe3e0;border-radius:14px;background:#fff;text-align:center;color:#747c78}.state.error{color:#a84642}
    @media(max-width:1000px){.responsibility-grid{grid-template-columns:repeat(3,1fr)}.responsibility-list article{grid-template-columns:1fr 1fr}.responsibility-list article>button{justify-self:start}.schedule-row{grid-template-columns:1fr 1fr 1fr}.document-editor{grid-template-columns:1fr 1fr}.document-editor button{grid-column:1/-1}}
    @media(max-width:760px){.director-engagement{width:min(100% - 24px,1320px)}.engagement-heading{flex-direction:column}.engagement-alerts{grid-template-columns:1fr 1fr}.overview-grid,.two-column{grid-template-columns:1fr}.overview-card--wide{grid-column:auto}.responsibility-grid{grid-template-columns:1fr 1fr}.form-grid{grid-template-columns:1fr}.form-grid .full{grid-column:auto}.schedule-row{grid-template-columns:1fr 1fr}.asset-editor{grid-template-columns:1fr}.asset-editor .wide{grid-column:auto}}
  `],
})
export class CtgDirectorEngagementComponent implements OnInit {
  readonly tabs: readonly { key: DirectorTab; label: string; lane?: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'responsibilities', label: 'Responsibilities' },
    { key: 'host-coordination', label: 'Host', lane: 'host-coordination' },
    { key: 'travel', label: 'Travel', lane: 'travel' },
    { key: 'lodging', label: 'Lodging', lane: 'lodging' },
    { key: 'transportation', label: 'Transportation', lane: 'transportation' },
    { key: 'media', label: 'Media', lane: 'media' },
    { key: 'program', label: 'Program', lane: 'program' },
    { key: 'documents', label: 'Documents', lane: 'documents' },
    { key: 'finance', label: 'Finance', lane: 'finance' },
    { key: 'ministry-preparation', label: 'Ministry', lane: 'ministry-preparation' },
    { key: 'hospitality', label: 'Hospitality', lane: 'hospitality' },
    { key: 'activity', label: 'Activity' },
  ];

  readonly assignment = signal<EngagementDetails | null>(null);
  readonly workspace = signal<AssignmentWorkspaceDetails | null>(null);
  readonly responsibilities = signal<readonly ResponsibilityLaneState[]>([]);
  readonly host = signal<HostCoordinationLaneDetails | null>(null);
  readonly thread = signal<HostCoordinationThread | null>(null);
  readonly travel = signal<TravelLaneDetails | null>(null);
  readonly lodging = signal<LodgingLaneDetails | null>(null);
  readonly transportation = signal<TransportationLaneDetails | null>(null);
  readonly media = signal<MediaLaneDetails | null>(null);
  readonly program = signal<ProgramLaneDetails | null>(null);
  readonly documents = signal<DocumentsLaneDetails | null>(null);
  readonly finance = signal<FinanceLaneDetails | null>(null);
  readonly ministry = signal<MinistryPreparationLaneDetails | null>(null);
  readonly hospitality = signal<HospitalityLaneDetails | null>(null);
  readonly tab = signal<DirectorTab>('overview');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveMessage = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly responsibilityDraft = signal<ResponsibilityDraft | null>(null);

  assignmentId = '';
  hostMessageDraft = '';

  travelDraft: UpdateTravelLaneInput = this.emptyTravel();
  lodgingDraft: UpdateLodgingLaneInput = this.emptyLodging();
  transportDraft: UpdateTransportationLaneInput = this.emptyTransportation();
  mediaDraft: UpdateMediaLaneInput = { promotionRequirements: null, contacts: [] };
  programDraft: UpdateProgramLaneInput = { schedule: [], contacts: [] };
  financeDraft: UpdateFinanceLaneInput = {
    travelCoverageStatus: 'not-determined',
    lodgingCoverageStatus: 'not-determined',
    travelBookedBy: 'not-determined',
    honorariumStatus: 'not-determined',
    honorariumAmount: 0,
    honorariumCurrency: 'USD',
    paymentStatus: 'not-due',
  };
  ministryDraft: UpdateMinistryPreparationLaneInput = { prayerFocus: null, ministryPreparationNotes: null };
  hospitalityDraft: UpdateHospitalityLaneInput = { hospitalityNotes: null, contacts: [] };
  hostDraft: UpdateHostCoordinationLaneInput = { hostNotes: null, contacts: [] };
  assetDraft: MediaAssetInput = {
    name: '',
    assetType: 'image',
    purpose: '',
    status: 'requested',
    source: 'host',
    storageReference: null,
    externalUrl: null,
    notes: null,
  };
  documentDraft = { name: '', status: 'requested', storageReference: '' };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: EngagementsApiService,
  ) {}

  ngOnInit(): void {
    this.assignmentId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.assignmentId) {
      this.error.set('An engagement ID is required.');
      this.loading.set(false);
      return;
    }

    const requestedLane = this.route.snapshot.queryParamMap.get('lane');
    if (requestedLane && this.isTab(requestedLane)) this.tab.set(requestedLane as DirectorTab);

    forkJoin({
      assignment: this.api.getAssignment(this.assignmentId),
      workspace: this.api.getWorkspace(this.assignmentId),
      responsibilities: this.api.getAssignmentResponsibilities(this.assignmentId),
      host: this.api.getHostCoordinationLane(this.assignmentId),
      thread: this.api.getHostCoordinationMessages(this.assignmentId),
      travel: this.api.getTravelLane(this.assignmentId),
      lodging: this.api.getLodgingLane(this.assignmentId),
      transportation: this.api.getTransportationLane(this.assignmentId),
      media: this.api.getMediaLane(this.assignmentId),
      program: this.api.getProgramLane(this.assignmentId),
      documents: this.api.getDocumentsLane(this.assignmentId),
      finance: this.api.getFinanceLane(this.assignmentId),
      ministry: this.api.getMinistryPreparationLane(this.assignmentId),
      hospitality: this.api.getHospitalityLane(this.assignmentId),
    }).subscribe({
      next: result => {
        this.assignment.set(result.assignment);
        this.workspace.set(result.workspace.workspace);
        this.responsibilities.set(result.responsibilities);
        this.host.set(result.host);
        this.thread.set(result.thread);
        this.travel.set(result.travel);
        this.lodging.set(result.lodging);
        this.transportation.set(result.transportation);
        this.media.set(result.media);
        this.program.set(result.program);
        this.documents.set(result.documents);
        this.finance.set(result.finance);
        this.ministry.set(result.ministry);
        this.hospitality.set(result.hospitality);
        this.syncDrafts();
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The director engagement workspace could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  lane(key: string): ResponsibilityLaneState | null {
    return this.responsibilities().find(item => item.key === key) ?? null;
  }

  openLane(key: string): void {
    const matched = this.tabs.find(item => item.lane === key);
    this.tab.set(matched?.key ?? 'responsibilities');
  }

  readinessPercent(): number {
    const applicable = this.responsibilities().filter(item => item.isApplicable);
    if (applicable.length === 0) return 100;
    return Math.round(applicable.filter(item => item.status === 'complete').length / applicable.length * 100);
  }

  overdueCount(): number {
    return this.responsibilities().filter(item => item.isApplicable && (item.isOverdue || item.status === 'overdue')).length;
  }

  unassignedCount(): number {
    return this.responsibilities().filter(item => item.isApplicable && !item.owner).length;
  }

  waitingHostCount(): number {
    return this.responsibilities().filter(item => item.isApplicable && item.status === 'waiting-on-host').length;
  }

  attentionLanes(): readonly ResponsibilityLaneState[] {
    return this.responsibilities().filter(item =>
      item.isApplicable && (!item.owner || item.isOverdue || ['blocked', 'overdue'].includes(item.status)),
    );
  }

  laneAttention(item: ResponsibilityLaneState): string {
    if (!item.owner) return 'No owner assigned.';
    if (item.isOverdue || item.status === 'overdue') return 'This responsibility is overdue.';
    return item.detail || this.label(item.status);
  }

  laneStatus(item: ResponsibilityLaneState): string {
    if (!item.isApplicable) return 'Not applicable';
    if (item.isOverdue) return 'Overdue';
    return this.label(item.status);
  }

  laneBadge(item: ResponsibilityLaneState): string {
    if (!item.isApplicable) return 'N/A';
    if (item.isOverdue) return '!';
    if (!item.owner) return '?';
    if (item.status === 'complete') return '✓';
    if (item.status === 'waiting-on-host') return 'Host';
    return '•';
  }

  ownerLabel(item: ResponsibilityLaneState): string {
    return item.owner?.displayName ?? 'Unassigned';
  }

  editResponsibility(item: ResponsibilityLaneState): void {
    this.responsibilityDraft.set({
      laneKey: item.key,
      displayName: item.owner?.displayName ?? '',
      email: item.owner?.email ?? '',
      userSubject: item.owner?.userSubject ?? '',
      status: item.status === 'overdue' ? 'in-progress' : item.status,
      detail: item.detail ?? '',
      dueDate: item.dueAtUtc ? item.dueAtUtc.slice(0, 10) : '',
      isApplicable: item.isApplicable,
    });
  }

  closeResponsibility(): void {
    if (!this.saving()) this.responsibilityDraft.set(null);
  }

  saveResponsibility(): void {
    const draft = this.responsibilityDraft();
    if (!draft) return;
    this.beginSave();

    const configure = this.api.configureEngagementLane(
      this.assignmentId,
      draft.laneKey,
      draft.isApplicable,
      draft.dueDate ? new Date(`${draft.dueDate}T12:00:00Z`).toISOString() : null,
    );

    configure.subscribe({
      next: () => {
        const ownerRequest = draft.userSubject.trim() && draft.displayName.trim()
          ? this.api.setEngagementResponsibilityOwner(
              this.assignmentId,
              draft.laneKey,
              draft.userSubject.trim(),
              draft.displayName.trim(),
              draft.email.trim() || null,
            )
          : this.api.clearEngagementResponsibilityOwner(this.assignmentId, draft.laneKey);

        ownerRequest.subscribe({
          next: () => {
            if (!draft.isApplicable) {
              this.finishResponsibilitySave();
              return;
            }

            this.api.updateEngagementLaneProgress(
              this.assignmentId,
              draft.laneKey,
              draft.status,
              draft.detail.trim() || null,
            ).subscribe({
              next: () => this.finishResponsibilitySave(),
              error: () => this.failSave('The responsibility status could not be saved.'),
            });
          },
          error: () => this.failSave('The responsibility owner could not be saved.'),
        });
      },
      error: () => this.failSave('The responsibility configuration could not be saved.'),
    });
  }

  saveHost(): void {
    this.saveLane(
      this.api.updateHostCoordinationLane(this.assignmentId, this.hostDraft),
      value => this.host.set(value),
      'Host coordination saved.',
    );
  }

  sendHostMessage(): void {
    const text = this.hostMessageDraft.trim();
    if (!text) return;
    this.saveLane(
      this.api.sendHostCoordinationMessage(this.assignmentId, text),
      value => {
        this.thread.set(value);
        this.hostMessageDraft = '';
      },
      'Host message sent.',
    );
  }

  saveTravel(): void {
    this.travelDraft = { ...this.travelDraft, ...this.normalizeTravelDates(this.travelDraft) };
    this.saveLane(this.api.updateTravelLane(this.assignmentId, this.travelDraft), value => this.travel.set(value), 'Travel saved.');
  }

  saveLodging(): void {
    const input = {
      ...this.lodgingDraft,
      hotelCheckInAtUtc: this.toIso(this.lodgingDraft.hotelCheckInAtUtc),
      hotelCheckOutAtUtc: this.toIso(this.lodgingDraft.hotelCheckOutAtUtc),
    };
    this.saveLane(this.api.updateLodgingLane(this.assignmentId, input), value => this.lodging.set(value), 'Lodging saved.');
  }

  saveTransportation(): void {
    this.saveLane(this.api.updateTransportationLane(this.assignmentId, this.transportDraft), value => this.transportation.set(value), 'Transportation saved.');
  }

  saveMedia(): void {
    this.saveLane(this.api.updateMediaLane(this.assignmentId, this.mediaDraft), value => this.media.set(value), 'Media preparation saved.');
  }

  addAsset(): void {
    const input: MediaAssetInput = {
      ...this.assetDraft,
      name: this.assetDraft.name.trim(),
      purpose: this.assetDraft.purpose.trim(),
      externalUrl: this.assetDraft.externalUrl?.trim() || null,
      storageReference: this.assetDraft.storageReference?.trim() || null,
      notes: this.assetDraft.notes?.trim() || null,
    };
    this.beginSave();
    this.api.createMediaAsset(this.assignmentId, input).subscribe({
      next: () => {
        this.assetDraft = { name: '', assetType: 'image', purpose: '', status: 'requested', source: 'host', storageReference: null, externalUrl: null, notes: null };
        this.refreshMedia('Media asset added.');
      },
      error: () => this.failSave('The media asset could not be added.'),
    });
  }

  deleteAsset(assetId: string): void {
    this.beginSave();
    this.api.deleteMediaAsset(this.assignmentId, assetId).subscribe({
      next: () => this.refreshMedia('Media asset removed.'),
      error: () => this.failSave('The media asset could not be removed.'),
    });
  }

  addSchedule(): void {
    this.programDraft.schedule = [
      ...this.programDraft.schedule,
      { title: '', date: '', startsAt: null, endsAt: null, location: null, notes: null },
    ];
  }

  removeSchedule(index: number): void {
    this.programDraft.schedule = this.programDraft.schedule.filter((_, itemIndex) => itemIndex !== index);
  }

  saveProgram(): void {
    this.saveLane(this.api.updateProgramLane(this.assignmentId, this.programDraft), value => this.program.set(value), 'Program saved.');
  }

  addDocument(): void {
    const name = this.documentDraft.name.trim();
    if (!name) return;
    this.beginSave();
    this.api.createLaneDocument(this.assignmentId, 'documents', {
      name,
      status: this.documentDraft.status,
      storageReference: this.documentDraft.storageReference.trim() || null,
    }).subscribe({
      next: () => {
        this.documentDraft = { name: '', status: 'requested', storageReference: '' };
        this.api.getDocumentsLane(this.assignmentId).subscribe({
          next: record => {
            this.documents.set(record);
            this.finishSave('Document record added.');
          },
          error: () => this.failSave('The document list could not be refreshed.'),
        });
      },
      error: () => this.failSave('The document record could not be added.'),
    });
  }

  saveFinance(): void {
    this.saveLane(this.api.updateFinanceLane(this.assignmentId, this.financeDraft), value => this.finance.set(value), 'Finance saved.');
  }

  saveMinistry(): void {
    this.saveLane(this.api.updateMinistryPreparationLane(this.assignmentId, this.ministryDraft), value => this.ministry.set(value), 'Ministry preparation saved.');
  }

  saveHospitality(): void {
    this.saveLane(this.api.updateHospitalityLane(this.assignmentId, this.hospitalityDraft), value => this.hospitality.set(value), 'Hospitality saved.');
  }

  dateLabel(value: string | null): string {
    if (!value) return 'Date pending';
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  dateTimeLabel(value: string): string {
    return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  dateRange(start: string | null, end: string | null): string {
    if (!start) return 'Date pending';
    const startLabel = this.dateLabel(start);
    if (!end || start.slice(0, 10) === end.slice(0, 10)) return startLabel;
    return `${startLabel} – ${this.dateLabel(end)}`;
  }

  relativeDate(value: string): string {
    const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }

  label(value: string): string {
    return value.replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase());
  }

  laneLabel(key: string): string {
    return this.lane(key)?.label ?? this.label(key);
  }

  private syncDrafts(): void {
    if (this.travel()) {
      const record = this.travel()!;
      this.travelDraft = {
        outboundAirline: record.outboundAirline,
        outboundFlightNumber: record.outboundFlightNumber,
        outboundConfirmationNumber: record.outboundConfirmationNumber,
        outboundDepartureAirport: record.outboundDepartureAirport,
        outboundArrivalAirport: record.outboundArrivalAirport,
        outboundDepartsAtUtc: this.localDateTime(record.outboundDepartsAtUtc),
        outboundArrivesAtUtc: this.localDateTime(record.outboundArrivesAtUtc),
        returnAirline: record.returnAirline,
        returnFlightNumber: record.returnFlightNumber,
        returnConfirmationNumber: record.returnConfirmationNumber,
        returnDepartureAirport: record.returnDepartureAirport,
        returnArrivalAirport: record.returnArrivalAirport,
        returnDepartsAtUtc: this.localDateTime(record.returnDepartsAtUtc),
        returnArrivesAtUtc: this.localDateTime(record.returnArrivesAtUtc),
        contacts: record.contacts.map(item => ({ type: item.type, name: item.name, email: item.email, phone: item.phone })),
      };
    }
    if (this.lodging()) {
      const record = this.lodging()!;
      this.lodgingDraft = {
        hotelName: record.hotelName,
        hotelAddress: record.hotelAddress,
        hotelConfirmationNumber: record.hotelConfirmationNumber,
        hotelCheckInAtUtc: this.localDateTime(record.hotelCheckInAtUtc),
        hotelCheckOutAtUtc: this.localDateTime(record.hotelCheckOutAtUtc),
        contacts: record.contacts.map(item => ({ type: item.type, name: item.name, email: item.email, phone: item.phone })),
      };
    }
    if (this.transportation()) {
      const record = this.transportation()!;
      this.transportDraft = {
        transportationPlan: record.transportationPlan,
        pickupContactName: record.pickupContactName,
        pickupContactPhone: record.pickupContactPhone,
        contacts: record.contacts.map(item => ({ type: item.type, name: item.name, email: item.email, phone: item.phone })),
      };
    }
    if (this.media()) {
      const record = this.media()!;
      this.mediaDraft = {
        promotionRequirements: record.promotionRequirements,
        contacts: record.contacts.map(item => ({ type: item.type, name: item.name, email: item.email, phone: item.phone })),
      };
    }
    if (this.program()) {
      const record = this.program()!;
      this.programDraft = {
        schedule: record.schedule.map(item => ({ ...item })),
        contacts: record.contacts.map(item => ({ type: item.type, name: item.name, email: item.email, phone: item.phone })),
      };
    }
    if (this.finance()) {
      const record = this.finance()!;
      this.financeDraft = {
        travelCoverageStatus: record.travelCoverageStatus,
        lodgingCoverageStatus: record.lodgingCoverageStatus,
        travelBookedBy: record.travelBookedBy,
        honorariumStatus: record.honorariumStatus,
        honorariumAmount: record.honorariumAmount,
        honorariumCurrency: record.honorariumCurrency,
        paymentStatus: record.paymentStatus,
      };
    }
    if (this.ministry()) {
      this.ministryDraft = {
        prayerFocus: this.ministry()!.prayerFocus,
        ministryPreparationNotes: this.ministry()!.ministryPreparationNotes,
      };
    }
    if (this.hospitality()) {
      const record = this.hospitality()!;
      this.hospitalityDraft = {
        hospitalityNotes: record.hospitalityNotes,
        contacts: record.contacts.map(item => ({ type: item.type, name: item.name, email: item.email, phone: item.phone })),
      };
    }
    if (this.host()) {
      const record = this.host()!;
      this.hostDraft = {
        hostNotes: record.hostNotes,
        contacts: record.contacts.filter(item => item.editable).map(item => ({ type: item.type, name: item.name, email: item.email, phone: item.phone })),
      };
    }
  }

  private finishResponsibilitySave(): void {
    this.api.getAssignmentResponsibilities(this.assignmentId).subscribe({
      next: items => {
        this.responsibilities.set(items);
        this.responsibilityDraft.set(null);
        this.finishSave('Responsibility updated.');
      },
      error: () => this.failSave('The responsibility list could not be refreshed.'),
    });
  }

  private refreshMedia(message: string): void {
    this.api.getMediaLane(this.assignmentId).subscribe({
      next: value => {
        this.media.set(value);
        this.finishSave(message);
      },
      error: () => this.failSave('The media lane could not be refreshed.'),
    });
  }

  private saveLane<T>(observable: { subscribe: Function }, apply: (value: T) => void, message: string): void {
    this.beginSave();
    observable.subscribe({
      next: (value: T) => {
        apply(value);
        this.finishSave(message);
      },
      error: () => this.failSave('The change could not be saved.'),
    });
  }

  private beginSave(): void {
    this.saving.set(true);
    this.saveMessage.set(null);
    this.saveError.set(null);
  }

  private finishSave(message: string): void {
    this.saving.set(false);
    this.saveMessage.set(message);
    window.setTimeout(() => this.saveMessage.set(null), 2200);
  }

  private failSave(message: string): void {
    this.saving.set(false);
    this.saveError.set(message);
    window.setTimeout(() => this.saveError.set(null), 3000);
  }

  private isTab(value: string): boolean {
    return this.tabs.some(item => item.key === value);
  }

  private localDateTime(value: string | null): string | null {
    return value ? value.slice(0, 16) : null;
  }

  private toIso(value: string | null): string | null {
    if (!value) return null;
    return new Date(value).toISOString();
  }

  private normalizeTravelDates(input: UpdateTravelLaneInput): Partial<UpdateTravelLaneInput> {
    return {
      outboundDepartsAtUtc: this.toIso(input.outboundDepartsAtUtc),
      outboundArrivesAtUtc: this.toIso(input.outboundArrivesAtUtc),
      returnDepartsAtUtc: this.toIso(input.returnDepartsAtUtc),
      returnArrivesAtUtc: this.toIso(input.returnArrivesAtUtc),
    };
  }

  private emptyTravel(): UpdateTravelLaneInput {
    return {
      outboundAirline: null, outboundFlightNumber: null, outboundConfirmationNumber: null,
      outboundDepartureAirport: null, outboundArrivalAirport: null, outboundDepartsAtUtc: null, outboundArrivesAtUtc: null,
      returnAirline: null, returnFlightNumber: null, returnConfirmationNumber: null,
      returnDepartureAirport: null, returnArrivalAirport: null, returnDepartsAtUtc: null, returnArrivesAtUtc: null,
      contacts: [],
    };
  }

  private emptyLodging(): UpdateLodgingLaneInput {
    return { hotelName: null, hotelAddress: null, hotelConfirmationNumber: null, hotelCheckInAtUtc: null, hotelCheckOutAtUtc: null, contacts: [] };
  }

  private emptyTransportation(): UpdateTransportationLaneInput {
    return { transportationPlan: null, pickupContactName: null, pickupContactPhone: null, contacts: [] };
  }
}
