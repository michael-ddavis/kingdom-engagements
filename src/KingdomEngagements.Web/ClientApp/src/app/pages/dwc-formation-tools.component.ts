import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DwcFormationStateService,
  FormationMember,
  FormationSession,
  FormationTrack,
  LeadershipStage,
} from '../core/dwc-formation-state.service';

type ToolsTab = 'curriculum' | 'people' | 'leaders' | 'semester';

@Component({
  selector: 'app-dwc-formation-tools',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="tools-page">
      <header class="tools-hero">
        <div>
          <p class="eyebrow">Divine Empowerment Groups · Ministry Tools</p>
          <h1>Go deeper when you need to.</h1>
          <p>Curriculum, people development, leadership, and semester closeout live here. The weekly Formation view stays intentionally simple.</p>
        </div>
        <a class="back-home" [href]="groupHref('/organization/dwc/formation')">← Back to Formation</a>
      </header>

      <section class="group-context">
        <div class="group-identity">
          <span>Working in</span>
          <strong>{{ state.selectedGroup().name }}</strong>
          <small>{{ state.selectedGroup().leader }} · {{ state.selectedGroup().semester }}</small>
        </div>
        <label>
          <span>Change group</span>
          <select [ngModel]="state.selectedGroupId()" (ngModelChange)="changeGroup($event)">
            @for (group of state.groups(); track group.id) {
              <option [value]="group.id">{{ group.name }}</option>
            }
          </select>
        </label>
        <nav class="context-links" aria-label="Current group destinations">
          <a [href]="groupHref('/organization/dwc/formation')">Formation home</a>
          <a [href]="groupHref('/organization/dwc/my-group')">Member preview</a>
        </nav>
      </section>

      <nav class="tools-tabs" aria-label="Formation ministry tools">
        @for (tab of tabs; track tab.key) {
          <button type="button" [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">
            <span>{{ tab.number }}</span>
            <b>{{ tab.label }}</b>
            <small>{{ tab.description }}</small>
          </button>
        }
      </nav>

      @if (activeTab() === 'curriculum') {
        <section class="workspace-heading">
          <div><p class="eyebrow">Curriculum</p><h2>Shape the pathway for this group.</h2><p>See the current track first. Other tracks stay secondary until you intentionally change the group's formation pathway.</p></div>
        </section>

        <article class="primary-workspace">
          <header class="workspace-card-head">
            <div>
              <span class="status-label">Current track</span>
              <h3>{{ state.selectedTrack().title }}</h3>
              <p>{{ state.selectedTrack().subtitle }}</p>
            </div>
            <div class="progress-summary"><strong>{{ state.completedCount() }}/{{ state.selectedTrack().sessions.length }}</strong><span>gatherings complete</span></div>
          </header>
          <div class="session-worklist">
            @for (session of state.selectedTrack().sessions; track session.id) {
              <div class="session-workrow" [class.current]="session.id === state.currentSession().id">
                <span class="session-number">{{ session.week }}</span>
                <div><small>{{ sessionState(session) }}</small><strong>{{ session.title }}</strong><p>{{ session.theme }}</p></div>
                <span class="source">{{ session.media[0]?.source || state.selectedTrack().source }}</span>
                <button type="button" class="text-action" (click)="toggleSession(session)">{{ sessionState(session) === 'Complete' ? 'Reopen' : session.id === state.currentSession().id ? 'Mark complete' : 'Open when ready' }}</button>
              </div>
            }
          </div>
        </article>

        <section class="secondary-section">
          <header><div><p class="eyebrow">Available pathways</p><h3>Other Transformation Tracks</h3></div><span>Changing tracks resets this group's session progress.</span></header>
          <div class="simple-track-list">
            @for (track of otherTracks(); track track.id) {
              <article>
                <div><span>Track {{ track.number }} · {{ track.source }}</span><strong>{{ track.title }}</strong><p>{{ track.subtitle }}</p></div>
                <div class="track-outcomes"><small>{{ track.sessions.length }} gatherings</small><small>{{ track.outcomes.length }} outcomes</small></div>
                <button type="button" class="secondary-button" (click)="assignTrack(track)">Use this track</button>
              </article>
            }
          </div>
        </section>

        <aside class="calm-note"><strong>Academy connection</strong><p>Kingdom Academy may own formal lessons, video, and completion. This DEG still owns the people, gathering, discussion, practice, prayer, and formation journey.</p></aside>
      }

      @if (activeTab() === 'people') {
        <section class="workspace-heading">
          <div><p class="eyebrow">People</p><h2>Know who needs what next.</h2><p>Keep the view relational: participation, follow-up, formation, and one clear next step.</p></div>
          <span class="heading-count">{{ state.selectedMembers().length }} people</span>
        </section>

        <article class="primary-workspace people-workspace">
          @for (member of state.selectedMembers(); track member.id) {
            <div class="person-row" [class.selected]="selectedMemberId() === member.id">
              <button type="button" class="person-main" (click)="selectMember(member)">
                <span class="avatar">{{ initials(member.name) }}</span>
                <span><strong>{{ member.name }}</strong><small>{{ member.attendance }} attendance · {{ member.practice }} practice</small></span>
              </button>
              <span class="person-status" [attr.data-tone]="member.status">{{ member.status }}</span>
              <span class="person-next"><small>Next step</small><strong>{{ member.nextStep }}</strong></span>
              <button type="button" class="text-action" (click)="selectMember(member)">View</button>
            </div>
          }
        </article>

        @if (selectedMember(); as member) {
          <section class="detail-workspace">
            <header><div><p class="eyebrow">Formation record</p><h3>{{ member.name }}</h3><p>{{ member.household }} · {{ member.serviceArea }}</p></div><button type="button" class="close-detail" (click)="selectedMemberId.set(null)">Close</button></header>
            <div class="detail-grid">
              <article><span>Formation</span><strong>{{ member.status }}</strong><small>{{ member.reflections.length }} reflections · {{ member.testimonies.length }} testimonies</small></article>
              <article><span>Leadership</span><strong>{{ member.leadershipStage }}</strong><small>{{ member.serviceArea }}</small></article>
              <article><span>Missed sessions</span><strong>{{ member.missedSessionIds.length }}</strong><small>{{ member.catchUpAssignedIds.length }} catch-up assignments open</small></article>
            </div>
            <label class="next-step-editor"><span>Next relational step</span><input [ngModel]="member.nextStep" (ngModelChange)="updateNextStep(member, $event)"></label>
            <div class="detail-actions">
              <button type="button" class="secondary-button" (click)="markOnPace(member)">Mark on pace</button>
              @if (member.missedSessionIds.length) { <button type="button" class="secondary-button" (click)="assignFirstCatchUp(member)">Assign catch-up</button> }
              <button type="button" class="primary-button" (click)="addMilestone(member)">Add growth milestone</button>
            </div>
            <p class="privacy-note">Household context: {{ member.householdNote }}</p>
          </section>
        }
      }

      @if (activeTab() === 'leaders') {
        <section class="workspace-heading">
          <div><p class="eyebrow">Leaders</p><h2>Develop people before you need positions filled.</h2><p>Use one pathway from serving to apprenticeship, leadership, multiplication, and cluster responsibility.</p></div>
        </section>

        <section class="leadership-path">
          @for (stage of state.leadershipStages(); track stage) {
            <article><strong>{{ stageCount(stage) }}</strong><span>{{ stage }}</span></article>
          }
        </section>

        <article class="primary-workspace leader-workspace">
          <header class="list-heading"><span>Person</span><span>Current stage</span><span>Development step</span><span></span></header>
          @for (member of leadersInSelectedGroup(); track member.id) {
            <div class="leader-row">
              <span class="person-main static"><span class="avatar">{{ initials(member.name) }}</span><span><strong>{{ member.name }}</strong><small>{{ member.serviceArea }}</small></span></span>
              <strong>{{ member.leadershipStage }}</strong>
              <span>{{ member.nextStep }}</span>
              <button type="button" class="secondary-button" [disabled]="member.leadershipStage === 'Cluster leader'" (click)="advance(member)">Advance</button>
            </div>
          }
        </article>

        <div class="principle-grid">
          <article><span>1</span><strong>Notice</strong><p>Look for fruit, consistency, humility, service, and relational health.</p></article>
          <article><span>2</span><strong>Apprentice</strong><p>Give real responsibility with feedback before handing over a group.</p></article>
          <article><span>3</span><strong>Multiply</strong><p>Commission leaders who can form people and develop others.</p></article>
        </div>
      }

      @if (activeTab() === 'semester') {
        <section class="workspace-heading">
          <div><p class="eyebrow">Semester & Insights</p><h2>Close the semester with clarity, not paperwork.</h2><p>Review the people, capture testimony, commission next steps, then use a small set of health signals to see where ministry needs attention.</p></div>
        </section>

        <div class="semester-grid">
          <article class="primary-workspace closeout-workspace">
            <header><div><span class="status-label">Closeout</span><h3>{{ state.selectedGroup().semester }}</h3></div><strong>{{ reviewCompletion() }}/5 ready</strong></header>
            @for (item of reviewItems(); track item.field) {
              <label class="review-line"><input type="checkbox" [ngModel]="item.value" (ngModelChange)="setReview(item.field, $event)"><span><strong>{{ item.label }}</strong><small>{{ item.help }}</small></span></label>
            }
          </article>

          <aside class="insight-column">
            <article class="insight-card"><span>People needing follow-up</span><strong>{{ state.followupCount() }}</strong><small>within {{ state.selectedGroup().name }}</small></article>
            <article class="insight-card"><span>Emerging / active leaders</span><strong>{{ leadersInSelectedGroup().length }}</strong><small>serving through cluster leadership</small></article>
            <article class="insight-card"><span>Testimonies captured</span><strong>{{ testimonyCount() }}</strong><small>this demo formation record</small></article>
            <article class="insight-card"><span>Formation progress</span><strong>{{ state.progressPercent() }}%</strong><small>{{ state.completedCount() }} of {{ state.selectedTrack().sessions.length }} gatherings</small></article>
          </aside>
        </div>

        <section class="secondary-section">
          <header><div><p class="eyebrow">Connected story</p><h3>Cross-semester formation</h3></div><span>Keep history useful, not noisy.</span></header>
          <div class="history-list">
            @for (member of state.selectedMembers(); track member.id) {
              @if (member.history.length) {
                <article><strong>{{ member.name }}</strong><span>{{ member.history[0].semester }}</span><p>{{ member.history[0].group }} · {{ member.history[0].track }}</p><b>{{ member.history[0].outcome }}</b></article>
              }
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.tools-page{--ink:#302c2c;--muted:#7a7270;--line:rgba(71,55,51,.13);--paper:#fffdf9;--cream:#f6f0e7;--plum:#6f4a73;--plum-soft:#f0e6ef;--gold:#a37a49;display:grid;gap:16px;max-width:1420px;margin:0 auto;padding:24px 26px 64px;color:var(--ink)}.eyebrow{margin:0;color:var(--plum);font-size:.61rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.tools-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:14px 2px 8px}.tools-hero h1{margin:6px 0 7px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2.2rem,4vw,3.5rem);font-weight:500;letter-spacing:-.04em}.tools-hero p:not(.eyebrow){max-width:760px;margin:0;color:var(--muted);line-height:1.6}.back-home,.context-links a{color:var(--plum);font-size:.7rem;font-weight:800;text-decoration:none}.group-context{display:grid;grid-template-columns:minmax(240px,1fr) auto auto;gap:18px;align-items:center;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(120deg,#fffdf9,#faf5ed)}.group-identity{display:grid;gap:2px}.group-identity span,.group-context label>span{color:#938783;font-size:.58rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.group-identity strong{font-family:Georgia,'Times New Roman',serif;font-size:1.2rem;font-weight:500}.group-identity small{color:var(--muted);font-size:.65rem}.group-context label{display:grid;gap:5px}.group-context select{min-width:220px;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink);font-weight:700}.context-links{display:flex;gap:12px}.tools-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.tools-tabs button{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;gap:1px 10px;padding:15px 16px;border:1px solid var(--line);border-radius:12px;background:var(--paper);color:var(--ink);text-align:left;cursor:pointer}.tools-tabs button>span{grid-row:1/3;display:grid;width:28px;height:28px;border-radius:50%;place-items:center;background:#eee6df;color:#806e67;font-size:.6rem;font-weight:850}.tools-tabs b{font-size:.75rem}.tools-tabs small{color:var(--muted);font-size:.59rem;line-height:1.35}.tools-tabs button.active{border-color:#bca4bc;background:linear-gradient(135deg,#fffdf9,#f4eaf3);box-shadow:inset 0 3px 0 var(--plum)}.tools-tabs button.active>span{background:var(--plum);color:#fff}.workspace-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;padding:12px 2px 0}.workspace-heading h2{margin:5px 0;font-family:Georgia,'Times New Roman',serif;font-size:1.8rem;font-weight:500}.workspace-heading p:not(.eyebrow){max-width:760px;margin:0;color:var(--muted);font-size:.73rem;line-height:1.55}.heading-count{color:#8c817d;font-size:.68rem;font-weight:750}.primary-workspace,.secondary-section,.detail-workspace{border:1px solid var(--line);border-radius:16px;background:var(--paper);box-shadow:0 9px 28px rgba(62,45,42,.025)}.workspace-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px;border-bottom:1px solid var(--line)}.workspace-card-head h3,.detail-workspace h3,.secondary-section h3,.closeout-workspace h3{margin:5px 0;font-family:Georgia,'Times New Roman',serif;font-size:1.45rem;font-weight:500}.workspace-card-head p,.detail-workspace header p{margin:0;color:var(--muted);font-size:.68rem}.status-label{color:var(--plum);font-size:.58rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.progress-summary{display:grid;text-align:right}.progress-summary strong{font-family:Georgia,'Times New Roman',serif;font-size:1.8rem;font-weight:500}.progress-summary span{color:var(--muted);font-size:.59rem}.session-worklist{display:grid}.session-workrow{display:grid;grid-template-columns:34px minmax(0,1fr) 150px 120px;gap:12px;align-items:center;padding:13px 18px;border-top:1px solid var(--line)}.session-workrow:first-child{border-top:0}.session-workrow.current{background:#fbf5ed}.session-number{display:grid;width:28px;height:28px;border-radius:8px;place-items:center;background:#efe8e1;color:#77665f;font-size:.6rem;font-weight:850}.session-workrow>div{display:grid;gap:2px}.session-workrow small,.source{color:#938986;font-size:.57rem}.session-workrow strong{font-size:.73rem}.session-workrow p{margin:0;color:var(--muted);font-size:.62rem}.text-action{padding:0;border:0;background:transparent;color:var(--plum);font-size:.64rem;font-weight:800;cursor:pointer}.secondary-section{padding:20px}.secondary-section>header{display:flex;justify-content:space-between;gap:16px;margin-bottom:10px}.secondary-section>header>span{color:var(--muted);font-size:.62rem}.simple-track-list{display:grid}.simple-track-list article{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:18px;align-items:center;padding:14px 0;border-top:1px solid var(--line)}.simple-track-list article>div:first-child{display:grid;gap:2px}.simple-track-list article span{color:#97877d;font-size:.57rem}.simple-track-list article strong{font-size:.76rem}.simple-track-list article p{margin:0;color:var(--muted);font-size:.63rem}.track-outcomes{display:flex;gap:10px}.track-outcomes small{color:#8d837f;font-size:.6rem}.secondary-button,.primary-button{min-height:36px;padding:0 11px;border-radius:8px;font-size:.63rem;font-weight:800;cursor:pointer}.secondary-button{border:1px solid var(--line);background:#fff;color:var(--plum)}.primary-button{border:0;background:var(--plum);color:#fff}.calm-note{padding:16px 18px;border-left:3px solid #b18c64;border-radius:9px;background:#faf4ea}.calm-note strong{font-size:.69rem}.calm-note p{margin:4px 0 0;color:#756c68;font-size:.66rem;line-height:1.55}.people-workspace{overflow:hidden}.person-row{display:grid;grid-template-columns:minmax(220px,1fr) 130px minmax(260px,1fr) 55px;gap:14px;align-items:center;padding:13px 16px;border-top:1px solid var(--line)}.person-row:first-child{border-top:0}.person-row.selected{background:#fbf5ed}.person-main{display:flex;align-items:center;gap:10px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.person-main.static{cursor:default}.person-main>span:last-child{display:grid;gap:2px}.person-main strong{font-size:.73rem}.person-main small{color:var(--muted);font-size:.59rem}.avatar{display:grid;width:36px;height:36px;flex:0 0 36px;border-radius:50%;place-items:center;background:#eee4df;color:#725d58;font-size:.61rem;font-weight:850}.person-status{width:max-content;padding:5px 7px;border-radius:999px;background:#eef4ef;color:#46715a;font-size:.57rem;font-weight:800}.person-status[data-tone='Needs follow-up']{background:#faeee3;color:#9a6535}.person-status[data-tone='Emerging leader']{background:var(--plum-soft);color:var(--plum)}.person-next{display:grid;gap:2px}.person-next small{color:#968b87;font-size:.55rem;text-transform:uppercase}.person-next strong{font-size:.64rem;line-height:1.4}.detail-workspace{padding:20px}.detail-workspace>header{display:flex;justify-content:space-between;gap:18px}.close-detail{border:0;background:transparent;color:var(--muted);cursor:pointer}.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}.detail-grid article,.insight-card{display:grid;gap:3px;padding:14px;border-radius:10px;background:#faf6f0}.detail-grid span,.insight-card span{color:#948884;font-size:.57rem;text-transform:uppercase}.detail-grid strong,.insight-card strong{font-family:Georgia,'Times New Roman',serif;font-size:1.2rem;font-weight:500}.detail-grid small,.insight-card small{color:var(--muted);font-size:.58rem}.next-step-editor{display:grid;gap:6px}.next-step-editor span{font-size:.62rem;font-weight:800}.next-step-editor input{padding:10px;border:1px solid var(--line);border-radius:8px;background:#fff}.detail-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.privacy-note{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--line);color:#877c78;font-size:.62rem;line-height:1.5}.leadership-path{display:grid;grid-template-columns:repeat(8,minmax(100px,1fr));gap:6px;overflow:auto}.leadership-path article{display:grid;gap:5px;min-height:84px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--paper)}.leadership-path strong{font-family:Georgia,'Times New Roman',serif;font-size:1.45rem;font-weight:500}.leadership-path span{margin-top:auto;color:var(--muted);font-size:.59rem}.leader-workspace{overflow:hidden}.list-heading,.leader-row{display:grid;grid-template-columns:minmax(220px,1fr) 150px minmax(260px,1fr) 90px;gap:14px;align-items:center}.list-heading{padding:10px 16px;background:#faf6f0;color:#8c817d;font-size:.57rem;font-weight:800;text-transform:uppercase}.leader-row{padding:13px 16px;border-top:1px solid var(--line)}.leader-row>strong,.leader-row>span:not(.person-main){font-size:.64rem;line-height:1.4}.principle-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.principle-grid article{display:grid;gap:5px;padding:16px;border-top:2px solid #b18c64;background:#faf6f0}.principle-grid span{color:#a27e58;font-size:.6rem;font-weight:850}.principle-grid strong{font-family:Georgia,'Times New Roman',serif;font-size:1.05rem;font-weight:500}.principle-grid p{margin:0;color:var(--muted);font-size:.64rem;line-height:1.5}.semester-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.55fr);gap:12px}.closeout-workspace{padding:20px}.closeout-workspace>header{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:8px}.closeout-workspace>header>strong{color:var(--plum);font-size:.67rem}.review-line{display:flex;gap:11px;padding:13px 0;border-top:1px solid var(--line);align-items:flex-start}.review-line input{margin-top:3px}.review-line span{display:grid;gap:2px}.review-line strong{font-size:.7rem}.review-line small{color:var(--muted);font-size:.6rem;line-height:1.45}.insight-column{display:grid;grid-template-columns:1fr 1fr;gap:10px}.insight-card strong{font-size:1.8rem}.history-list{display:grid}.history-list article{display:grid;grid-template-columns:150px 90px minmax(0,1fr) 140px;gap:12px;padding:11px 0;border-top:1px solid var(--line);align-items:center}.history-list strong,.history-list b{font-size:.65rem}.history-list span,.history-list p{margin:0;color:var(--muted);font-size:.61rem}@media(max-width:1050px){.tools-tabs{grid-template-columns:1fr 1fr}.group-context{grid-template-columns:1fr 1fr}.context-links{grid-column:1/-1}.session-workrow,.person-row,.leader-row,.list-heading{grid-template-columns:40px minmax(0,1fr) auto}.session-workrow .source,.person-next,.leader-row>span:nth-child(3),.list-heading>span:nth-child(3){grid-column:2/3}.semester-grid{grid-template-columns:1fr}}@media(max-width:720px){.tools-page{padding:16px 12px 44px}.tools-hero,.workspace-heading,.secondary-section>header{align-items:flex-start;flex-direction:column}.group-context,.tools-tabs,.detail-grid,.principle-grid{grid-template-columns:1fr}.context-links{grid-column:auto}.group-context select{width:100%}.session-workrow,.person-row,.leader-row,.list-heading,.simple-track-list article,.history-list article{grid-template-columns:1fr}.session-number{display:none}.track-outcomes{justify-content:flex-start}.insight-column{grid-template-columns:1fr 1fr}}
  `],
})
export class DwcFormationToolsComponent {
  readonly tabs = [
    { key: 'curriculum' as const, number: '01', label: 'Curriculum', description: 'Tracks, sessions, and Academy links' },
    { key: 'people' as const, number: '02', label: 'People', description: 'Formation records and follow-up' },
    { key: 'leaders' as const, number: '03', label: 'Leaders', description: 'Apprenticeship and multiplication' },
    { key: 'semester' as const, number: '04', label: 'Semester & Insights', description: 'Closeout and ministry health' },
  ];
  readonly activeTab = signal<ToolsTab>('curriculum');
  readonly selectedMemberId = signal<string | null>(null);
  readonly selectedMember = computed(() => this.state.members().find(member => member.id === this.selectedMemberId()) ?? null);

  constructor(
    readonly state: DwcFormationStateService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.route.queryParamMap.subscribe(params => {
      const groupId = params.get('group');
      if (groupId && this.state.groups().some(group => group.id === groupId)) this.state.selectGroup(groupId);
      const tab = params.get('tab') as ToolsTab | null;
      if (tab && this.tabs.some(item => item.key === tab)) this.activeTab.set(tab);
    });
  }

  changeGroup(groupId: string): void {
    this.state.selectGroup(groupId);
    this.selectedMemberId.set(null);
    this.router.navigate([], { relativeTo: this.route, queryParams: { group: groupId }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  groupHref(path: string): string {
    return `${path}?group=${encodeURIComponent(this.state.selectedGroupId())}`;
  }

  otherTracks(): FormationTrack[] { return this.state.tracks().filter(track => track.id !== this.state.selectedTrack().id); }
  sessionState(session: FormationSession): 'Complete' | 'Current' | 'Upcoming' {
    if (this.state.selectedGroup().completedSessionIds.includes(session.id)) return 'Complete';
    return session.id === this.state.currentSession().id ? 'Current' : 'Upcoming';
  }
  toggleSession(session: FormationSession): void {
    if (this.sessionState(session) === 'Complete') this.state.reopenSession(this.state.selectedGroup().id, session.id);
    else if (session.id === this.state.currentSession().id) this.state.completeSession(this.state.selectedGroup().id, session.id);
  }
  assignTrack(track: FormationTrack): void { this.state.assignTrack(this.state.selectedGroup().id, track.id); }
  selectMember(member: FormationMember): void { this.selectedMemberId.set(member.id); }
  updateNextStep(member: FormationMember, value: string): void { this.state.setMemberNextStep(member.id, value); }
  markOnPace(member: FormationMember): void { this.state.setMemberStatus(member.id, 'On pace'); }
  assignFirstCatchUp(member: FormationMember): void {
    const sessionId = member.missedSessionIds.find(id => !member.catchUpAssignedIds.includes(id));
    if (sessionId) this.state.assignCatchUp(member.id, sessionId);
  }
  addMilestone(member: FormationMember): void { this.state.addMilestone(member.id, 'Growth milestone recorded by DEG leader'); }
  leadersInSelectedGroup(): FormationMember[] {
    return this.state.selectedMembers().filter(member => member.status === 'Emerging leader' || this.state.leadershipStages().indexOf(member.leadershipStage) >= this.state.leadershipStages().indexOf('Serving'));
  }
  stageCount(stage: LeadershipStage): number { return this.state.selectedMembers().filter(member => member.leadershipStage === stage).length; }
  advance(member: FormationMember): void { this.state.moveLeadership(member.id, this.state.nextLeadershipStage(member.leadershipStage)); }
  reviewItems() {
    const review = this.state.reviewFor(this.state.selectedGroup().id);
    return [
      { field: 'leaderReview' as const, label: 'Leader review complete', help: 'Name what grew, what remained difficult, and what needs pastoral attention.', value: review.leaderReview },
      { field: 'memberNextSteps' as const, label: 'Member next steps named', help: 'Every person leaves with one clear relational or formation next step.', value: review.memberNextSteps },
      { field: 'testimoniesCaptured' as const, label: 'Testimonies captured', help: 'Remember what God did instead of only recording attendance.', value: review.testimoniesCaptured },
      { field: 'commissioningPlanned' as const, label: 'Commissioning prepared', help: 'Bless service, leadership, and continued formation intentionally.', value: review.commissioningPlanned },
      { field: 'rolloverReady' as const, label: 'Next semester ready', help: 'Confirm continuation, next track, placement, or leadership development.', value: review.rolloverReady },
    ];
  }
  setReview(field: 'leaderReview' | 'memberNextSteps' | 'testimoniesCaptured' | 'commissioningPlanned' | 'rolloverReady', value: boolean): void { this.state.updateSemesterReview(this.state.selectedGroup().id, field, value); }
  reviewCompletion(): number { return this.reviewItems().filter(item => item.value).length; }
  testimonyCount(): number { return this.state.selectedMembers().reduce((sum, member) => sum + member.testimonies.length, 0); }
  initials(name: string): string { return name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase(); }
}
