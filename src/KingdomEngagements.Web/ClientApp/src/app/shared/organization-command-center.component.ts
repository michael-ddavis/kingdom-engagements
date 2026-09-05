import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

type OrgKey = 'dwc' | 'hey-king' | null;
type DrawerKind = 'leader' | 'care' | 'communication' | 'member-preview' | 'fulfillment' | 'mentor' | 'referral' | 'recipient-preview';

interface LeaderReadiness {
  id: string;
  name: string;
  assignment: string;
  group: string;
  status: 'Ready' | 'Needs training' | 'Needs covenant';
  missing: string;
}

interface CareFollowup {
  id: string;
  person: string;
  source: string;
  reason: string;
  owner: string;
  status: 'Open' | 'Assigned' | 'Complete';
}

interface FulfillmentItem {
  id: string;
  person: string;
  stage: string;
  need: string;
  owner: string;
  status: 'Needs action' | 'In progress' | 'Ready' | 'Complete';
}

interface MentorCapacity {
  id: string;
  name: string;
  active: number;
  capacity: number;
  focus: string;
}

interface ReferralFollowup {
  id: string;
  person: string;
  partner: string;
  need: string;
  due: string;
  status: 'New' | 'Contacted' | 'Scheduled' | 'Complete';
}

interface ActivityItem {
  id: string;
  at: string;
  text: string;
}

@Component({
  selector: 'app-organization-command-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (org()) {
      <section class="depth-shell" [class.depth-shell--hey]="org() === 'hey-king'">
        <div class="depth-head">
          <div>
            <p class="depth-eyebrow">Operational depth</p>
            <h2>{{ org() === 'dwc' ? 'Ministry command center' : 'Relationship command center' }}</h2>
            <p>{{ org() === 'dwc'
              ? 'See the work behind healthy groups: leader readiness, pastoral follow-up, communication and the member experience.'
              : 'See the work beyond clothing distribution: fulfillment, mentor capacity, referral follow-up and the young man’s experience.' }}</p>
          </div>
          <span class="depth-live"><i></i> Demo state live</span>
        </div>

        @if (org() === 'dwc') {
          <div class="depth-metrics">
            <article><span>Leaders ready</span><strong>{{ readyLeaderCount() }}/{{ leaders().length }}</strong><small>2 require action</small></article>
            <article><span>Care follow-ups</span><strong>{{ openCareCount() }}</strong><small>scoped handoffs</small></article>
            <article><span>Messages sent</span><strong>{{ dwcMessagesSent() }}</strong><small>this demo session</small></article>
            <article><span>Member experience</span><strong>Live</strong><small>group-scoped preview</small></article>
          </div>

          <div class="depth-grid">
            <article class="depth-panel">
              <header><div><p class="depth-eyebrow">Academy connection</p><h3>Leader readiness</h3></div><button type="button" (click)="openCommunication('DEG Leaders')">Message leaders</button></header>
              @for (leader of leaders(); track leader.id) {
                <button class="depth-row" type="button" (click)="openLeader(leader)">
                  <span><strong>{{ leader.name }}</strong><small>{{ leader.assignment }} · {{ leader.group }}</small></span>
                  <span class="depth-status" [attr.data-tone]="leader.status === 'Ready' ? 'good' : 'warn'">{{ leader.status }}</span>
                </button>
              }
            </article>

            <article class="depth-panel">
              <header><div><p class="depth-eyebrow">Care connection</p><h3>Follow-up queue</h3></div><button type="button" class="quiet" (click)="openCare(care()[0])">Open next</button></header>
              @for (item of care(); track item.id) {
                <button class="depth-row" type="button" (click)="openCare(item)">
                  <span><strong>{{ item.person }}</strong><small>{{ item.reason }} · {{ item.source }}</small></span>
                  <span class="depth-status" [attr.data-tone]="item.status === 'Complete' ? 'good' : 'warn'">{{ item.status }}</span>
                </button>
              }
            </article>

            <article class="depth-panel depth-panel--wide">
              <header><div><p class="depth-eyebrow">Member-facing</p><h3>What a group member sees</h3></div><button type="button" (click)="openMemberPreview()">Open member view</button></header>
              <div class="member-snapshot">
                <div><span>My group</span><strong>Young Adults DEG</strong><small>Wednesday · 6:30 PM · Richmond West</small></div>
                <div><span>My assignment</span><strong>Opening prayer</strong><small>This Wednesday</small></div>
                <div><span>Current resource</span><strong>Transformation Track 2</strong><small>Week 4 · Identity & Calling</small></div>
                <div><span>Next action</span><strong>Confirm attendance</strong><small>Leader sees response, not private Care data</small></div>
              </div>
            </article>
          </div>
        } @else {
          <div class="depth-metrics">
            <article><span>Fulfillment action</span><strong>{{ openFulfillmentCount() }}</strong><small>appointments / alterations</small></article>
            <article><span>Mentor capacity</span><strong>{{ availableMentorSeats() }}</strong><small>open relationships</small></article>
            <article><span>Referral follow-up</span><strong>{{ openReferralCount() }}</strong><small>partner referrals</small></article>
            <article><span>Messages sent</span><strong>{{ heyMessagesSent() }}</strong><small>this demo session</small></article>
          </div>

          <div class="depth-grid">
            <article class="depth-panel">
              <header><div><p class="depth-eyebrow">Operations connection</p><h3>Fulfillment work</h3></div><button type="button" (click)="openFulfillment(fulfillment()[0])">Work next</button></header>
              @for (item of fulfillment(); track item.id) {
                <button class="depth-row" type="button" (click)="openFulfillment(item)">
                  <span><strong>{{ item.person }}</strong><small>{{ item.stage }} · {{ item.need }}</small></span>
                  <span class="depth-status" [attr.data-tone]="item.status === 'Complete' || item.status === 'Ready' ? 'good' : 'warn'">{{ item.status }}</span>
                </button>
              }
            </article>

            <article class="depth-panel">
              <header><div><p class="depth-eyebrow">Mentorship</p><h3>Mentor capacity</h3></div><button type="button" class="quiet" (click)="openMentor(mentors()[0])">Match a young man</button></header>
              @for (mentor of mentors(); track mentor.id) {
                <button class="depth-row" type="button" (click)="openMentor(mentor)">
                  <span><strong>{{ mentor.name }}</strong><small>{{ mentor.focus }}</small></span>
                  <span class="depth-capacity">{{ mentor.active }}/{{ mentor.capacity }}</span>
                </button>
              }
            </article>

            <article class="depth-panel">
              <header><div><p class="depth-eyebrow">Partner network</p><h3>Referral follow-up</h3></div><button type="button" class="quiet" (click)="openReferral(referrals()[0])">Open next</button></header>
              @for (item of referrals(); track item.id) {
                <button class="depth-row" type="button" (click)="openReferral(item)">
                  <span><strong>{{ item.person }}</strong><small>{{ item.partner }} · {{ item.need }}</small></span>
                  <span class="depth-status" [attr.data-tone]="item.status === 'Complete' ? 'good' : 'warn'">{{ item.status }}</span>
                </button>
              }
            </article>

            <article class="depth-panel">
              <header><div><p class="depth-eyebrow">Young man-facing</p><h3>My Heyy King</h3></div><button type="button" (click)="openRecipientPreview()">Open recipient view</button></header>
              <div class="recipient-card"><span>Marcus Johnson</span><strong>Your outfit is ready.</strong><small>Pickup · Friday 4:30 PM</small><div><b>Mentor</b><span>Pastor Hickman</span></div><div><b>Current goal</b><span>Complete interview preparation</span></div></div>
            </article>
          </div>
        }

        @if (activity().length) {
          <article class="depth-activity">
            <p class="depth-eyebrow">Recent demo activity</p>
            @for (item of activity().slice(0, 4); track item.id) { <div><time>{{ item.at }}</time><span>{{ item.text }}</span></div> }
          </article>
        }
      </section>
    }

    <dialog #drawerDialog class="depth-drawer" (click)="onDialogClick($event)">
      <div class="drawer-frame">
        <header class="drawer-head">
          <div><p class="depth-eyebrow">{{ drawerEyebrow() }}</p><h2>{{ drawerTitle() }}</h2><p>{{ drawerDescription() }}</p></div>
          <button type="button" class="drawer-close" aria-label="Close" (click)="closeDrawer()">×</button>
        </header>
        <div class="drawer-body">
          @switch (drawerKind()) {
            @case ('leader') {
              @if (selectedLeader()) {
                <div class="drawer-stat-grid"><div><span>Assignment</span><strong>{{ selectedLeader()!.assignment }}</strong></div><div><span>Group</span><strong>{{ selectedLeader()!.group }}</strong></div><div><span>Readiness</span><strong>{{ selectedLeader()!.status }}</strong></div></div>
                <section><h3>Training requirements</h3><div class="check-row done">✓ DEG Leader Orientation</div><div class="check-row done">✓ Transformation Track 1</div><div class="check-row" [class.done]="selectedLeader()!.missing === 'None'">{{ selectedLeader()!.missing === 'None' ? '✓' : '○' }} {{ selectedLeader()!.missing === 'None' ? 'Annual leader covenant' : selectedLeader()!.missing }}</div></section>
                @if (selectedLeader()!.status !== 'Ready') { <button class="primary" type="button" (click)="markLeaderReady()">Mark requirements complete</button> }
              }
            }
            @case ('care') {
              @if (selectedCare()) {
                <div class="drawer-stat-grid"><div><span>Source</span><strong>{{ selectedCare()!.source }}</strong></div><div><span>Owner</span><strong>{{ selectedCare()!.owner }}</strong></div><div><span>Status</span><strong>{{ selectedCare()!.status }}</strong></div></div>
                <section><h3>Safe handoff</h3><p>{{ selectedCare()!.reason }}</p><p class="boundary">Engagements records that follow-up is needed. Sensitive pastoral notes belong in Care and are not exposed here.</p></section>
                <label>Assign follow-up to<select [(ngModel)]="careOwner"><option>Cluster Leader</option><option>Pastoral Care Team</option><option>Group Leader</option></select></label>
                <div class="drawer-actions"><button class="secondary" type="button" (click)="assignCare()">Assign</button><button class="primary" type="button" (click)="completeCare()">Mark complete</button></div>
              }
            }
            @case ('communication') {
              <label>Audience<input [(ngModel)]="messageAudience" /></label>
              <label>Message<textarea rows="7" [(ngModel)]="messageBody"></textarea></label>
              <p class="boundary">Demo communications update this operating space only; production delivery will route through the platform communication service.</p>
              <button class="primary" type="button" (click)="sendMessage()">Send message</button>
            }
            @case ('member-preview') {
              <div class="portal-preview"><p class="portal-brand">Divine World Changers</p><h3>My Group</h3><strong>Young Adults DEG</strong><span>Wednesday · 6:30 PM</span><hr><small>NEXT MEETING</small><b>Identity & Calling · Week 4</b><small>YOUR ASSIGNMENT</small><b>Opening prayer</b><small>RESOURCES</small><b>Transformation Track 2</b><button type="button">Confirm attendance</button><button type="button" class="outline">Request prayer / follow-up</button></div>
            }
            @case ('fulfillment') {
              @if (selectedFulfillment()) {
                <div class="drawer-stat-grid"><div><span>Stage</span><strong>{{ selectedFulfillment()!.stage }}</strong></div><div><span>Owner</span><strong>{{ selectedFulfillment()!.owner }}</strong></div><div><span>Status</span><strong>{{ selectedFulfillment()!.status }}</strong></div></div>
                <section><h3>Next work</h3><p>{{ selectedFulfillment()!.need }}</p></section>
                <label>Status<select [(ngModel)]="fulfillmentStatus"><option>Needs action</option><option>In progress</option><option>Ready</option><option>Complete</option></select></label>
                <button class="primary" type="button" (click)="saveFulfillment()">Save fulfillment status</button>
              }
            }
            @case ('mentor') {
              @if (selectedMentor()) {
                <div class="drawer-stat-grid"><div><span>Active</span><strong>{{ selectedMentor()!.active }}</strong></div><div><span>Capacity</span><strong>{{ selectedMentor()!.capacity }}</strong></div><div><span>Available</span><strong>{{ selectedMentor()!.capacity - selectedMentor()!.active }}</strong></div></div>
                <section><h3>Mentoring focus</h3><p>{{ selectedMentor()!.focus }}</p></section>
                <label>Young man<input [(ngModel)]="menteeName" placeholder="Name" /></label>
                <label>First focus<select [(ngModel)]="menteeFocus"><option>Employment</option><option>Spiritual growth</option><option>Life skills</option><option>Leadership</option></select></label>
                <button class="primary" type="button" [disabled]="selectedMentor()!.active >= selectedMentor()!.capacity" (click)="createMentorMatch()">Create mentorship match</button>
              }
            }
            @case ('referral') {
              @if (selectedReferral()) {
                <div class="drawer-stat-grid"><div><span>Partner</span><strong>{{ selectedReferral()!.partner }}</strong></div><div><span>Need</span><strong>{{ selectedReferral()!.need }}</strong></div><div><span>Due</span><strong>{{ selectedReferral()!.due }}</strong></div></div>
                <label>Status<select [(ngModel)]="referralStatus"><option>New</option><option>Contacted</option><option>Scheduled</option><option>Complete</option></select></label>
                <label>Follow-up note<textarea rows="5" [(ngModel)]="referralNote"></textarea></label>
                <button class="primary" type="button" (click)="saveReferral()">Save follow-up</button>
              }
            }
            @case ('recipient-preview') {
              <div class="portal-preview hey"><p class="portal-brand">Heyy King</p><h3>Welcome, Marcus.</h3><strong>Your outfit is ready for pickup.</strong><span>Friday · 4:30 PM</span><hr><small>YOUR OUTFIT</small><b>Navy suit · White shirt · Blue tie · Black shoes</b><small>MENTORSHIP</small><b>Pastor Hickman · Next meeting Sep 25</b><small>CURRENT GOAL</small><b>Complete interview preparation</b><button type="button">View pickup details</button><button type="button" class="outline">Contact Heyy King</button></div>
            }
          }
        </div>
      </div>
    </dialog>
  `,
  styles: [`
    :host{display:block}.depth-shell{--accent:#64359a;width:min(1510px,calc(100% - 3rem));margin:0 auto 5rem;padding-top:1.5rem;color:#152035}.depth-shell--hey{--accent:#9b742f}.depth-head{display:flex;justify-content:space-between;gap:2rem;align-items:flex-end;padding:1.4rem 0 1rem;border-top:1px solid rgba(21,32,53,.12)}.depth-head h2{margin:.2rem 0 .4rem;font-size:clamp(1.7rem,3vw,2.5rem);letter-spacing:-.035em}.depth-head>div>p:last-child{max-width:850px;margin:0;color:#687388;line-height:1.55}.depth-eyebrow{margin:0;color:var(--accent);font-size:.68rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.depth-live{display:flex;align-items:center;gap:.5rem;color:#5e687a;font-size:.72rem;font-weight:800;white-space:nowrap}.depth-live i{width:8px;height:8px;border-radius:50%;background:#34795e;box-shadow:0 0 0 4px rgba(52,121,94,.1)}.depth-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:1rem 0}.depth-metrics article{display:flex;min-height:110px;flex-direction:column;padding:18px;border:1px solid #dfe3e8;border-radius:16px;background:#fffdf9;box-shadow:0 8px 22px rgba(17,28,45,.04)}.depth-metrics span{color:#687388;font-size:.72rem;font-weight:800}.depth-metrics strong{margin-top:auto;font-size:1.65rem}.depth-metrics small{margin-top:5px;color:#7c8491}.depth-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.depth-panel{overflow:hidden;border:1px solid #dfe3e8;border-radius:16px;background:#fffdf9}.depth-panel--wide{grid-column:1/-1}.depth-panel header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:18px 20px;border-bottom:1px solid #e4e7eb}.depth-panel h3{margin:.2rem 0 0;font-size:1.15rem}.depth-panel header button,.portal-preview button,.drawer-actions button,.drawer-body>button{min-height:38px;padding:0 13px;border:1px solid transparent;border-radius:9px;color:#fff;background:var(--accent);font-weight:850;cursor:pointer}.depth-panel header button.quiet{color:#28354b;border-color:#dfe3e8;background:#fff}.depth-row{display:flex;width:100%;min-height:67px;align-items:center;justify-content:space-between;gap:1rem;padding:13px 20px;border:0;border-bottom:1px solid #eceef1;color:inherit;background:transparent;text-align:left;cursor:pointer}.depth-row:last-child{border-bottom:0}.depth-row:hover{background:#faf8f4}.depth-row span:first-child{display:grid;gap:4px}.depth-row small{color:#747d8b}.depth-status{padding:5px 8px;border-radius:999px;background:#f5ead4;color:#8c6427;font-size:.66rem;font-weight:900}.depth-status[data-tone=good]{background:#e8f4ed;color:#34795e}.depth-capacity{font-weight:900}.member-snapshot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:#e4e7eb}.member-snapshot>div{display:flex;min-height:130px;flex-direction:column;padding:18px;background:#fffdf9}.member-snapshot span,.member-snapshot small{color:#747d8b;font-size:.69rem}.member-snapshot strong{margin:auto 0 7px;font-size:1rem}.recipient-card{display:grid;gap:8px;padding:22px}.recipient-card>span{color:#747d8b}.recipient-card>strong{font-size:1.35rem}.recipient-card>div{display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid #e4e7eb}.depth-activity{margin-top:14px;padding:18px 20px;border:1px solid #dfe3e8;border-radius:16px;background:#fffdf9}.depth-activity>div{display:flex;gap:1rem;padding:9px 0;border-bottom:1px solid #eceef1}.depth-activity>div:last-child{border-bottom:0}.depth-activity time{width:68px;color:#7c8491;font-size:.7rem;font-weight:800}.depth-drawer{width:min(560px,100vw);height:100dvh;max-width:none;max-height:none;margin:0 0 0 auto;padding:0;border:0;background:#fff;box-shadow:-24px 0 64px rgba(7,11,18,.24);transform:translateX(22px);opacity:.7;animation:depth-in 180ms cubic-bezier(.16,1,.3,1) forwards}.depth-drawer::backdrop{background:rgba(7,11,18,.44);animation:depth-fade 180ms ease-out}.drawer-frame{display:grid;height:100%;grid-template-rows:auto minmax(0,1fr)}.drawer-head{display:flex;justify-content:space-between;gap:1.5rem;padding:26px 28px 20px;border-bottom:1px solid #e2e6ec}.drawer-head h2{margin:.35rem 0 .5rem;font-size:1.55rem}.drawer-head p:last-child{margin:0;color:#687388;line-height:1.5}.drawer-close{display:grid;width:38px;height:38px;flex:0 0 38px;place-items:center;border:1px solid #d8dde7;border-radius:10px;background:#fafafa;color:#25324a;font-size:1.4rem;cursor:pointer}.drawer-body{overflow-y:auto;padding:24px 28px 40px}.drawer-body section{margin:20px 0;padding:18px;border:1px solid #e2e6ec;border-radius:13px;background:#fcfbf8}.drawer-body h3{margin:0 0 9px}.drawer-body label{display:grid;gap:7px;margin:16px 0;color:#4e5a70;font-size:.72rem;font-weight:850}.drawer-body input,.drawer-body select,.drawer-body textarea{width:100%;padding:11px 12px;border:1px solid #d6dce5;border-radius:9px;background:#fff;font:inherit}.drawer-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.drawer-stat-grid div{display:grid;gap:5px;padding:13px;border-radius:11px;background:#f6f5f1}.drawer-stat-grid span{color:#747d8b;font-size:.66rem}.check-row{margin:8px 0;color:#896321}.check-row.done{color:#34795e}.boundary{padding:12px;border-left:3px solid var(--accent);background:#faf8f4;color:#687388;line-height:1.55}.drawer-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.drawer-actions .secondary{color:#26344a;border-color:#d8dde7;background:#fff}.drawer-body button.primary{width:100%;min-height:44px;margin-top:14px;border:0;border-radius:9px;color:#fff;background:var(--accent);font-weight:900;cursor:pointer}.drawer-body button.primary:disabled{opacity:.45;cursor:not-allowed}.portal-preview{display:grid;gap:9px;padding:24px;border:1px solid #e1e4e9;border-radius:18px;background:#fbfaf6}.portal-brand{margin:0;color:var(--accent);font-weight:900;text-transform:uppercase;letter-spacing:.1em}.portal-preview h3{margin:3px 0 0;font-size:1.8rem}.portal-preview>strong{font-size:1.15rem}.portal-preview>small{margin-top:14px;color:#7b8390;font-weight:900;letter-spacing:.09em}.portal-preview hr{width:100%;border:0;border-top:1px solid #e1e4e9}.portal-preview button{margin-top:10px}.portal-preview button.outline{margin-top:0;color:#26344a;border-color:#d8dde7;background:#fff}@keyframes depth-in{to{transform:translateX(0);opacity:1}}@keyframes depth-fade{from{opacity:0}to{opacity:1}}@media(max-width:900px){.depth-metrics{grid-template-columns:repeat(2,1fr)}.member-snapshot{grid-template-columns:repeat(2,1fr)}}@media(max-width:680px){.depth-shell{width:min(100% - 1.5rem,1510px)}.depth-head{align-items:flex-start;flex-direction:column}.depth-grid{grid-template-columns:1fr}.depth-panel--wide{grid-column:auto}.depth-metrics{grid-template-columns:1fr 1fr}.member-snapshot{grid-template-columns:1fr}.drawer-head,.drawer-body{padding-left:20px;padding-right:20px}}@media(prefers-reduced-motion:reduce){.depth-drawer,.depth-drawer::backdrop{animation-duration:1ms}}
  `]
})
export class OrganizationCommandCenterComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dwcKey = 'apostolos.engagements.depth.dwc.v1';
  private readonly heyKey = 'apostolos.engagements.depth.heyyking.v1';

  @ViewChild('drawerDialog') drawerDialog?: ElementRef<HTMLDialogElement>;

  readonly org = signal<OrgKey>(this.resolveOrg());
  readonly drawerKind = signal<DrawerKind | null>(null);
  readonly drawerEyebrow = signal('');
  readonly drawerTitle = signal('');
  readonly drawerDescription = signal('');
  readonly selectedLeader = signal<LeaderReadiness | null>(null);
  readonly selectedCare = signal<CareFollowup | null>(null);
  readonly selectedFulfillment = signal<FulfillmentItem | null>(null);
  readonly selectedMentor = signal<MentorCapacity | null>(null);
  readonly selectedReferral = signal<ReferralFollowup | null>(null);
  readonly activity = signal<ActivityItem[]>([]);

  readonly leaders = signal<LeaderReadiness[]>([
    { id:'ldr-1', name:'Alicia Brown', assignment:'Group Leader', group:'Young Adults DEG', status:'Ready', missing:'None' },
    { id:'ldr-2', name:'James Smith', assignment:'Group Leader', group:'Marriage & Family DEG', status:'Needs training', missing:'Facilitation Training' },
    { id:'ldr-3', name:'Marcus Hill', assignment:'Group Leader', group:'Men of Valor', status:'Ready', missing:'None' },
    { id:'ldr-4', name:'Jordan Davis', assignment:'Group Leader', group:'Women of Purpose', status:'Needs covenant', missing:'Annual Leader Covenant' },
  ]);
  readonly care = signal<CareFollowup[]>([
    { id:'care-1', person:'Andre Lewis', source:'Men of Valor', reason:'Two consecutive absences; leader requested a check-in.', owner:'Cluster Leader', status:'Open' },
    { id:'care-2', person:'Sarah Jones', source:'Young Adults DEG', reason:'Requested prayer and a pastoral follow-up after group.', owner:'Pastoral Care Team', status:'Assigned' },
    { id:'care-3', person:'Ashley Martin', source:'Marriage & Family DEG', reason:'Transitioning groups after a schedule change.', owner:'Group Leader', status:'Complete' },
  ]);
  readonly fulfillment = signal<FulfillmentItem[]>([
    { id:'ful-1', person:'Marcus Johnson', stage:'Pickup', need:'Confirm Friday pickup and final garment check.', owner:'Alicia', status:'Ready' },
    { id:'ful-2', person:'James Carter', stage:'Alterations', need:'Tailor returned jacket; verify sleeve and hem.', owner:'Suit Operations', status:'Needs action' },
    { id:'ful-3', person:'Andre Lewis', stage:'Measurements', need:'Transportation request noted; appointment Sep 8.', owner:'Marcus', status:'In progress' },
  ]);
  readonly mentors = signal<MentorCapacity[]>([
    { id:'men-1', name:'Pastor Hickman', active:8, capacity:10, focus:'Identity · spiritual growth · leadership' },
    { id:'men-2', name:'Marcus Hill', active:4, capacity:6, focus:'Employment · discipline · life skills' },
    { id:'men-3', name:'James Brown', active:5, capacity:5, focus:'Career transition · accountability' },
  ]);
  readonly referrals = signal<ReferralFollowup[]>([
    { id:'ref-1', person:'Andre Lewis', partner:'ABC Workforce Center', need:'Interview attire', due:'Today', status:'New' },
    { id:'ref-2', person:'Derrick Thomas', partner:'Richmond Reentry Network', need:'Employment wardrobe', due:'Sep 4', status:'Contacted' },
    { id:'ref-3', person:'Malik Carter', partner:'Community referral', need:'Career fair attire', due:'Sep 7', status:'Scheduled' },
  ]);

  readonly dwcMessagesSent = signal(0);
  readonly heyMessagesSent = signal(0);

  careOwner = 'Cluster Leader';
  messageAudience = '';
  messageBody = '';
  fulfillmentStatus: FulfillmentItem['status'] = 'In progress';
  menteeName = '';
  menteeFocus = 'Employment';
  referralStatus: ReferralFollowup['status'] = 'Contacted';
  referralNote = '';

  constructor() {
    this.restore();
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.org.set(this.resolveOrg()));
  }

  readyLeaderCount(): number { return this.leaders().filter(x => x.status === 'Ready').length; }
  openCareCount(): number { return this.care().filter(x => x.status !== 'Complete').length; }
  openFulfillmentCount(): number { return this.fulfillment().filter(x => x.status !== 'Complete').length; }
  availableMentorSeats(): number { return this.mentors().reduce((sum, x) => sum + Math.max(0, x.capacity - x.active), 0); }
  openReferralCount(): number { return this.referrals().filter(x => x.status !== 'Complete').length; }

  openLeader(item: LeaderReadiness): void { this.selectedLeader.set(item); this.openDrawer('leader','Academy readiness',item.name,'Review the training and covenant requirements attached to this DEG leader.'); }
  openCare(item?: CareFollowup): void { if (!item) return; this.selectedCare.set(item); this.careOwner = item.owner; this.openDrawer('care','Care handoff',item.person,'Track the handoff without exposing sensitive pastoral-care documentation.'); }
  openCommunication(audience = ''): void { this.messageAudience = audience; this.messageBody = ''; this.openDrawer('communication','Communication','Send ministry update','Reach the right ministry audience without leaving the operating space.'); }
  openMemberPreview(): void { this.openDrawer('member-preview','Member experience','My Group','Preview the simple, permission-scoped experience a DEG member receives.'); }
  openFulfillment(item?: FulfillmentItem): void { if (!item) return; this.selectedFulfillment.set(item); this.fulfillmentStatus = item.status; this.openDrawer('fulfillment','Suit Operations',item.person,'Move the physical fulfillment work forward while preserving one connected recipient journey.'); }
  openMentor(item?: MentorCapacity): void { if (!item) return; this.selectedMentor.set(item); this.menteeName=''; this.openDrawer('mentor','Mentorship capacity',item.name,'Match a young man intentionally while respecting the mentor’s actual capacity.'); }
  openReferral(item?: ReferralFollowup): void { if (!item) return; this.selectedReferral.set(item); this.referralStatus=item.status; this.referralNote=''; this.openDrawer('referral','Partner referral',item.person,'Track referral follow-up without giving the referring partner access to private internal information.'); }
  openRecipientPreview(): void { this.openDrawer('recipient-preview','Recipient experience','My Heyy King','Preview the young man-facing experience after application, fitting and mentorship connection.'); }

  markLeaderReady(): void { const item=this.selectedLeader(); if(!item)return; this.leaders.set(this.leaders().map(x=>x.id===item.id?{...x,status:'Ready',missing:'None'}:x)); this.record(`${item.name} completed DEG leader readiness.`); this.persist(); this.closeDrawer(); }
  assignCare(): void { const item=this.selectedCare(); if(!item)return; this.care.set(this.care().map(x=>x.id===item.id?{...x,owner:this.careOwner,status:'Assigned'}:x)); this.record(`${item.person} follow-up assigned to ${this.careOwner}.`); this.persist(); this.closeDrawer(); }
  completeCare(): void { const item=this.selectedCare(); if(!item)return; this.care.set(this.care().map(x=>x.id===item.id?{...x,status:'Complete'}:x)); this.record(`${item.person} care follow-up marked complete.`); this.persist(); this.closeDrawer(); }
  sendMessage(): void { if(!this.messageBody.trim())return; if(this.org()==='dwc')this.dwcMessagesSent.update(x=>x+1); else this.heyMessagesSent.update(x=>x+1); this.record(`Message sent to ${this.messageAudience || 'selected audience'}: ${this.messageBody.trim().slice(0,72)}${this.messageBody.trim().length>72?'…':''}`); this.persist(); this.closeDrawer(); }
  saveFulfillment(): void { const item=this.selectedFulfillment(); if(!item)return; this.fulfillment.set(this.fulfillment().map(x=>x.id===item.id?{...x,status:this.fulfillmentStatus}:x)); this.record(`${item.person} fulfillment moved to ${this.fulfillmentStatus}.`); this.persist(); this.closeDrawer(); }
  createMentorMatch(): void { const mentor=this.selectedMentor(); if(!mentor||!this.menteeName.trim()||mentor.active>=mentor.capacity)return; this.mentors.set(this.mentors().map(x=>x.id===mentor.id?{...x,active:x.active+1}:x)); this.record(`${this.menteeName.trim()} matched with ${mentor.name} for ${this.menteeFocus.toLowerCase()}.`); this.persist(); this.closeDrawer(); }
  saveReferral(): void { const item=this.selectedReferral(); if(!item)return; this.referrals.set(this.referrals().map(x=>x.id===item.id?{...x,status:this.referralStatus}:x)); this.record(`${item.person} referral updated to ${this.referralStatus}${this.referralNote.trim()?`: ${this.referralNote.trim()}`:''}.`); this.persist(); this.closeDrawer(); }

  closeDrawer(): void { const dialog=this.drawerDialog?.nativeElement; if(dialog?.open)dialog.close(); this.drawerKind.set(null); this.selectedLeader.set(null); this.selectedCare.set(null); this.selectedFulfillment.set(null); this.selectedMentor.set(null); this.selectedReferral.set(null); }
  onDialogClick(event: MouseEvent): void { if(event.target===this.drawerDialog?.nativeElement)this.closeDrawer(); }

  private openDrawer(kind: DrawerKind, eyebrow: string, title: string, description: string): void {
    this.drawerKind.set(kind); this.drawerEyebrow.set(eyebrow); this.drawerTitle.set(title); this.drawerDescription.set(description);
    queueMicrotask(()=>{ const dialog=this.drawerDialog?.nativeElement; if(dialog&&!dialog.open)dialog.showModal(); });
  }
  private resolveOrg(): OrgKey { const path=this.router.url || window.location.pathname; if(path.includes('/organization/dwc'))return 'dwc'; if(path.includes('/organization/hey-king'))return 'hey-king'; return null; }
  private record(text:string):void { const now=new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); this.activity.set([{id:`act-${Date.now()}`,at:now,text},...this.activity()].slice(0,12)); }
  private persist(): void { try { const key=this.org()==='dwc'?this.dwcKey:this.heyKey; localStorage.setItem(key,JSON.stringify({leaders:this.leaders(),care:this.care(),fulfillment:this.fulfillment(),mentors:this.mentors(),referrals:this.referrals(),activity:this.activity(),dwcMessagesSent:this.dwcMessagesSent(),heyMessagesSent:this.heyMessagesSent()})); } catch {} }
  private restore(): void { try { const dwc=localStorage.getItem(this.dwcKey); const hey=localStorage.getItem(this.heyKey); if(dwc){const s=JSON.parse(dwc); if(s.leaders)this.leaders.set(s.leaders); if(s.care)this.care.set(s.care); if(s.dwcMessagesSent!=null)this.dwcMessagesSent.set(s.dwcMessagesSent);} if(hey){const s=JSON.parse(hey); if(s.fulfillment)this.fulfillment.set(s.fulfillment); if(s.mentors)this.mentors.set(s.mentors); if(s.referrals)this.referrals.set(s.referrals); if(s.heyMessagesSent!=null)this.heyMessagesSent.set(s.heyMessagesSent);} const active=this.resolveOrg(); const src=active==='dwc'?dwc:hey; if(src){const s=JSON.parse(src); if(s.activity)this.activity.set(s.activity);} } catch {} }
}
