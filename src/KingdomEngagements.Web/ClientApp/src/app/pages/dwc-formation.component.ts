import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface FormationGroup {
  id: string;
  name: string;
  leader: string;
  cluster: string;
  members: number;
  pace: string;
}

interface FormationSession {
  id: string;
  week: number;
  title: string;
  theme: string;
  scripture: string;
  bigIdea: string;
  teaching: string;
  discussion: string[];
  practice: string;
  prayer: string;
  resource: string;
}

interface FormationMember {
  id: string;
  name: string;
  attendance: string;
  reflections: number;
  practice: string;
  status: 'On pace' | 'Needs follow-up' | 'Emerging leader';
}

type DrawerKind = 'session' | 'practice' | 'member' | 'leader' | 'academy';

@Component({
  selector: 'app-dwc-formation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="formation-page">
      <header class="formation-hero">
        <div>
          <p class="formation-eyebrow">Divine Empowerment Groups · Formation</p>
          <h1>Discipleship has a pathway.</h1>
          <p>Give every DEG a shared formation track while keeping the room relational: Scripture, teaching, discussion, practice, prayer, reflection and measurable next steps lived out together.</p>
        </div>
        <div class="hero-side">
          <span>Spring 2027</span>
          <strong>Transformation Track 2</strong>
          <small>Identity, Calling & Kingdom Life</small>
        </div>
      </header>

      <div class="formation-toolbar">
        <label>
          <span>Viewing group</span>
          <select [ngModel]="selectedGroupId()" (ngModelChange)="selectGroup($event)">
            @for (group of groups; track group.id) {
              <option [value]="group.id">{{ group.name }}</option>
            }
          </select>
        </label>
        <div class="toolbar-actions">
          <button type="button" class="quiet" (click)="openAcademyBoundary()">Academy connection</button>
          <button type="button" (click)="openLeaderPrep()">Leader prep</button>
        </div>
      </div>

      <section class="formation-summary">
        <article><span>Track progress</span><strong>{{ progressPercent() }}%</strong><small>{{ completedCount() }} of {{ sessions.length }} sessions complete</small></article>
        <article><span>Group</span><strong>{{ selectedGroup().name }}</strong><small>{{ selectedGroup().leader }} · {{ selectedGroup().cluster }}</small></article>
        <article><span>Participation</span><strong>{{ selectedGroup().members }}</strong><small>active people in this semester</small></article>
        <article><span>Formation pace</span><strong>{{ selectedGroup().pace }}</strong><small>{{ followupCount() }} people need relational follow-up</small></article>
      </section>

      <div class="formation-layout">
        <article class="track-panel">
          <header class="panel-head">
            <div><p class="formation-eyebrow">Current track</p><h2>Identity, Calling & Kingdom Life</h2></div>
            <span class="track-source">DWCIM curriculum</span>
          </header>
          <p class="track-intro">Eight guided gatherings move the group from identity in Christ into calling, community, service and mission. Leaders can pace the same track differently without losing the shared formation outcomes.</p>

          <div class="session-list">
            @for (session of sessions; track session.id) {
              <button type="button" class="session-row" [class.current]="session.id === currentSession().id" (click)="openSession(session)">
                <span class="session-state" [attr.data-state]="sessionState(session)">{{ sessionStateIcon(session) }}</span>
                <span class="session-copy"><small>Week {{ session.week }}</small><strong>{{ session.title }}</strong><span>{{ session.theme }}</span></span>
                <span class="session-status">{{ sessionState(session) }}</span>
              </button>
            }
          </div>
        </article>

        <aside class="formation-sidebar">
          <article class="current-card">
            <p class="formation-eyebrow">Next gathering</p>
            <span>Week {{ currentSession().week }}</span>
            <h2>{{ currentSession().title }}</h2>
            <p>{{ currentSession().bigIdea }}</p>
            <dl>
              <div><dt>Scripture</dt><dd>{{ currentSession().scripture }}</dd></div>
              <div><dt>Group practice</dt><dd>{{ currentSession().practice }}</dd></div>
            </dl>
            <button type="button" (click)="openSession(currentSession())">Prepare this session</button>
          </article>

          <article class="leader-card">
            <p class="formation-eyebrow">Leader readiness</p>
            <h3>Before the room gathers</h3>
            <div class="prep-line done"><span>✓</span><b>Review leader guide</b></div>
            <div class="prep-line done"><span>✓</span><b>Pray through member list</b></div>
            <div class="prep-line"><span>○</span><b>Assign opening prayer</b></div>
            <div class="prep-line"><span>○</span><b>Review follow-up needs</b></div>
            <button type="button" class="quiet" (click)="openLeaderPrep()">Open leader preparation</button>
          </article>
        </aside>
      </div>

      <section class="formation-grid">
        <article class="people-panel">
          <header class="panel-head"><div><p class="formation-eyebrow">People in formation</p><h2>Group progress</h2></div><span>{{ members().length }} tracked</span></header>
          @for (member of members(); track member.id) {
            <button type="button" class="member-row" (click)="openMember(member)">
              <span><strong>{{ member.name }}</strong><small>{{ member.attendance }} attendance · {{ member.reflections }} reflections</small></span>
              <span><b>{{ member.practice }}</b><em [attr.data-tone]="member.status === 'Needs follow-up' ? 'warn' : member.status === 'Emerging leader' ? 'leader' : 'good'">{{ member.status }}</em></span>
            </button>
          }
        </article>

        <article class="practice-panel">
          <header class="panel-head"><div><p class="formation-eyebrow">Between gatherings</p><h2>Practice & reflection</h2></div><button type="button" class="quiet" (click)="openPractice()">+ Group practice</button></header>
          <div class="practice-card"><span>This week</span><strong>{{ currentSession().practice }}</strong><p>Members can mark the practice complete, add a short reflection, or request a leader conversation without turning discipleship into grading.</p></div>
          @for (practice of practices(); track practice) {
            <div class="practice-history"><span>✓</span><p><strong>{{ practice }}</strong><small>Added to {{ selectedGroup().name }}</small></p></div>
          }
        </article>
      </section>

      <section class="formation-outcomes">
        <header><div><p class="formation-eyebrow">Formation record</p><h2>What are we actually seeing grow?</h2></div><span>Relational, not a report card</span></header>
        <div class="outcome-grid">
          <article><span>Identity</span><strong>Rooted</strong><p>Members can articulate identity in Christ beyond circumstance and performance.</p></article>
          <article><span>Prayer & Scripture</span><strong>Growing</strong><p>Consistent personal rhythms are becoming visible in group reflection and conversation.</p></article>
          <article><span>Community</span><strong>Healthy</strong><p>Members are showing up, carrying one another and responding to relational follow-up.</p></article>
          <article><span>Calling & service</span><strong>Emerging</strong><p>Three people are beginning to identify gifts, service opportunities and leadership potential.</p></article>
        </div>
      </section>

      <a class="back-link" href="/organization/dwc">← Back to Divine Empowerment Groups</a>
    </section>

    <dialog #formationDialog class="formation-drawer" (click)="onDialogClick($event)">
      <div class="drawer-frame">
        <header>
          <div><p class="formation-eyebrow">{{ drawerEyebrow() }}</p><h2>{{ drawerTitle() }}</h2><p>{{ drawerDescription() }}</p></div>
          <button type="button" class="drawer-close" aria-label="Close" (click)="closeDrawer()">×</button>
        </header>
        <div class="drawer-body">
          @switch (drawerKind()) {
            @case ('session') {
              @if (selectedSession(); as session) {
                <div class="session-hero"><span>Week {{ session.week }}</span><h3>{{ session.title }}</h3><p>{{ session.bigIdea }}</p></div>
                <section class="content-block"><small>01 · Scripture</small><h3>Open the Word</h3><p>{{ session.scripture }}</p><p>{{ session.teaching }}</p></section>
                <section class="content-block"><small>02 · Discuss together</small><h3>Make room for the group</h3>@for (question of session.discussion; track question) { <div class="discussion-question"><span>?</span><p>{{ question }}</p></div> }</section>
                <section class="content-block"><small>03 · Practice</small><h3>Live it before next week</h3><p>{{ session.practice }}</p><button type="button" class="secondary-action" (click)="openPractice(session.practice)">Assign this practice</button></section>
                <section class="content-block"><small>04 · Prayer</small><h3>Respond to God together</h3><p>{{ session.prayer }}</p></section>
                <section class="content-block"><small>Leader resource</small><h3>{{ session.resource }}</h3><p>Leader notes can include timing, pastoral cautions, suggested transitions and optional Academy-linked resources.</p></section>
                <div class="drawer-actions"><button type="button" class="secondary-action" (click)="closeDrawer()">Close</button><button type="button" [disabled]="isCompleted(session)" (click)="completeSession(session)">{{ isCompleted(session) ? 'Session complete' : 'Mark session complete' }}</button></div>
              }
            }
            @case ('practice') {
              <label>Practice / assignment<textarea rows="5" [(ngModel)]="practiceDraft" placeholder="What should the group practice before the next gathering?"></textarea></label>
              <label>How should members respond?<select [(ngModel)]="practiceResponse"><option>Mark complete + optional reflection</option><option>Short written reflection</option><option>Discuss at next group</option><option>Leader follow-up</option></select></label>
              <p class="boundary">DEG practice is formation, not grading. Leaders see participation and relational follow-up needs; they do not assign academic scores.</p>
              <button type="button" (click)="savePractice()">Add to group</button>
            }
            @case ('member') {
              @if (selectedMember(); as member) {
                <div class="member-profile"><span class="member-avatar">{{ initials(member.name) }}</span><div><h3>{{ member.name }}</h3><p>{{ selectedGroup().name }}</p></div></div>
                <div class="member-stats"><div><span>Attendance</span><strong>{{ member.attendance }}</strong></div><div><span>Reflections</span><strong>{{ member.reflections }}</strong></div><div><span>Formation</span><strong>{{ member.status }}</strong></div></div>
                <section class="content-block"><small>Current practice</small><h3>{{ member.practice }}</h3><p>Leaders can see participation and next-step context without exposing private pastoral notes.</p></section>
                <section class="content-block"><small>Growth markers</small><div class="marker-line"><span>✓</span><p>Participates consistently in Scripture discussion</p></div><div class="marker-line"><span>✓</span><p>Completed last formation practice</p></div><div class="marker-line"><span>○</span><p>{{ member.status === 'Needs follow-up' ? 'Leader conversation recommended before next gathering' : 'Identify next service or leadership step' }}</p></div></section>
                <div class="drawer-actions"><button type="button" class="secondary-action" (click)="recordReflection(member)">Record reflection</button><button type="button" (click)="recordMilestone(member)">Add growth milestone</button></div>
              }
            }
            @case ('leader') {
              <section class="content-block"><small>Leader preparation</small><h3>{{ selectedGroup().name }} · Week {{ currentSession().week }}</h3><p>The goal is not to deliver a lecture. Prepare enough that the room can encounter Scripture, talk honestly, pray and leave with a concrete next step.</p></section>
              <div class="leader-checks"><label><input type="checkbox" [(ngModel)]="leaderGuideReviewed"> Review the leader guide and session flow</label><label><input type="checkbox" [(ngModel)]="memberListPrayed"> Pray through the member list</label><label><input type="checkbox" [(ngModel)]="discussionPrepared"> Choose the discussion questions most useful for this group</label><label><input type="checkbox" [(ngModel)]="followupsReviewed"> Review attendance and relational follow-ups</label><label><input type="checkbox" [(ngModel)]="assignmentsReady"> Confirm prayer, hospitality and facilitation assignments</label></div>
              <button type="button" (click)="saveLeaderPrep()">Save leader readiness</button>
            }
            @case ('academy') {
              <section class="content-block"><small>Architecture boundary</small><h3>Academy can supply formation content without owning the group.</h3><p>A DEG is a relationship and discipleship environment. Engagements owns the group, semester, roster, gathering, discussion, practice and relational formation record.</p></section>
              <div class="boundary-map"><div><span>Kingdom Academy</span><strong>Programs · curriculum · lessons · media · formal completion</strong></div><b>→</b><div><span>DEG Engagements</span><strong>Group pacing · discussion · practice · attendance · reflection · milestones</strong></div></div>
              <p class="boundary">DWCIM can use its own DEG curriculum now. If Kingdom Academy is activated later, a track can reference Academy-owned lessons rather than copying them into Engagements.</p>
            }
          }
        </div>
      </div>
    </dialog>
  `,
  styles: [`
    :host{display:block}.formation-page{display:grid;gap:1rem;max-width:1480px;margin:0 auto;padding:1.2rem 1.35rem 3rem;color:#20263a}.formation-eyebrow{margin:0;color:#6e4b91;font-size:.62rem;font-weight:850;letter-spacing:.09em;text-transform:uppercase}.formation-hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,.6fr);gap:1rem;padding:1.7rem;border:1px solid #e4ddec;border-radius:14px;background:linear-gradient(120deg,#fbfafc,#f7f2fa)}.formation-hero h1{margin:.35rem 0 .55rem;font-size:clamp(2rem,4vw,3.35rem);letter-spacing:-.05em}.formation-hero>div>p:last-child{max-width:780px;margin:0;color:#687083;line-height:1.65}.hero-side{display:grid;padding:1.1rem 1.2rem;border-left:3px solid #6b4591;align-content:center;background:rgba(255,255,255,.62)}.hero-side span,.hero-side small{color:#777d8c;font-size:.67rem}.hero-side strong{margin:.3rem 0;font-size:1.05rem}.formation-toolbar{display:flex;min-height:62px;padding:.7rem .85rem;border:1px solid #e2e3e8;border-radius:10px;align-items:center;justify-content:space-between;gap:1rem;background:#fff}.formation-toolbar label{display:flex;align-items:center;gap:.7rem}.formation-toolbar label span{font-size:.67rem;font-weight:800}.formation-toolbar select{min-width:245px;padding:.62rem .7rem;border:1px solid #d3d5dc;border-radius:8px;background:#fff}.toolbar-actions{display:flex;gap:.5rem}button{min-height:38px;padding:.55rem .78rem;border:1px solid #583180;border-radius:8px;color:#fff;background:#583180;font-weight:800;cursor:pointer}button.quiet,.secondary-action{color:#4f5667!important;background:#fff!important;border-color:#d4d6dc!important}.formation-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:hidden;border:1px solid #e0e1e6;border-radius:12px;background:#fff}.formation-summary article{display:grid;min-height:92px;padding:1rem;border-right:1px solid #e6e7eb;align-content:center}.formation-summary article:last-child{border-right:0}.formation-summary span,.formation-summary small{color:#7b8190;font-size:.62rem}.formation-summary strong{margin:.2rem 0;font-size:1.25rem;letter-spacing:-.03em}.formation-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(290px,.65fr);gap:1rem}.track-panel,.current-card,.leader-card,.people-panel,.practice-panel,.formation-outcomes{border:1px solid #e1e2e7;border-radius:12px;background:#fff}.track-panel,.people-panel,.practice-panel,.formation-outcomes{padding:1rem}.panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.panel-head h2{margin:.25rem 0 0;font-size:1.05rem}.track-source{padding:.3rem .48rem;border-radius:6px;color:#654181;background:#f3ebf8;font-size:.58rem;font-weight:800}.track-intro{margin:.75rem 0 1rem;color:#687083;font-size:.72rem;line-height:1.55}.session-list{display:grid;border-top:1px solid #e7e8ec}.session-row{display:grid;grid-template-columns:32px minmax(0,1fr) auto;width:100%;min-height:69px;padding:.55rem .3rem;border:0;border-bottom:1px solid #ececf0;align-items:center;gap:.7rem;color:inherit;background:transparent;text-align:left}.session-row:hover{background:#faf8fb}.session-row.current{background:#f7f1fa}.session-state{display:grid;width:27px;height:27px;border-radius:50%;place-items:center;background:#eef0f3;color:#697080}.session-state[data-state='Complete']{background:#e8f5ed;color:#257553}.session-state[data-state='Current']{background:#eee5f5;color:#6a418a}.session-copy{display:flex;min-width:0;flex-direction:column}.session-copy small{color:#8a8f9b;font-size:.55rem;font-weight:800;text-transform:uppercase}.session-copy strong{margin:.12rem 0;font-size:.75rem}.session-copy span{color:#777e8d;font-size:.62rem}.session-status{color:#777e8d;font-size:.6rem;font-weight:800}.formation-sidebar{display:grid;align-content:start;gap:1rem}.current-card,.leader-card{padding:1rem}.current-card>span{display:block;margin-top:.75rem;color:#79509b;font-size:.6rem;font-weight:850;text-transform:uppercase}.current-card h2{margin:.2rem 0}.current-card>p:not(.formation-eyebrow),.leader-card>p:not(.formation-eyebrow){color:#687083;font-size:.7rem;line-height:1.55}.current-card dl{display:grid;margin:.8rem 0}.current-card dl div{padding:.6rem 0;border-top:1px solid #ececf0}.current-card dt{color:#898e99;font-size:.58rem}.current-card dd{margin:.15rem 0 0;font-size:.68rem;font-weight:700}.leader-card h3{margin:.3rem 0 .7rem}.prep-line{display:grid;grid-template-columns:20px 1fr;padding:.48rem 0;gap:.4rem;color:#7a6470;font-size:.66rem}.prep-line.done{color:#39735c}.formation-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(320px,.7fr);gap:1rem}.people-panel .panel-head,.practice-panel .panel-head{margin-bottom:.5rem}.panel-head>span{color:#858a96;font-size:.62rem}.member-row{display:grid;grid-template-columns:minmax(0,1fr) auto;width:100%;min-height:64px;padding:.58rem .2rem;border:0;border-top:1px solid #ececf0;align-items:center;gap:1rem;color:inherit;background:transparent;text-align:left}.member-row>span{display:flex;flex-direction:column}.member-row small{margin-top:.2rem;color:#838895;font-size:.59rem}.member-row>span:last-child{align-items:flex-end}.member-row b{font-size:.61rem}.member-row em{margin-top:.25rem;padding:.2rem .36rem;border-radius:5px;background:#e8f5ed;color:#267052;font-size:.55rem;font-style:normal;font-weight:800}.member-row em[data-tone='warn']{background:#fff1d9;color:#896319}.member-row em[data-tone='leader']{background:#efe7f5;color:#69418a}.practice-card{margin-top:.75rem;padding:.9rem;border-left:3px solid #6b4591;background:#faf8fb}.practice-card span{color:#79509b;font-size:.58rem;font-weight:850;text-transform:uppercase}.practice-card strong{display:block;margin:.25rem 0;font-size:.78rem}.practice-card p{margin:.35rem 0 0;color:#707685;font-size:.65rem;line-height:1.5}.practice-history{display:grid;grid-template-columns:22px 1fr;padding:.65rem .2rem;border-top:1px solid #ececf0;gap:.4rem}.practice-history p{margin:0}.practice-history strong,.practice-history small{display:block;font-size:.62rem}.practice-history small{margin-top:.18rem;color:#888d98}.formation-outcomes header{display:flex;justify-content:space-between;gap:1rem}.formation-outcomes header h2{margin:.25rem 0}.formation-outcomes header>span{color:#8b8f98;font-size:.6rem}.outcome-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:.8rem;border-top:1px solid #e8e9ec}.outcome-grid article{padding:.9rem .8rem .2rem 0}.outcome-grid span{color:#7a4e99;font-size:.57rem;font-weight:850;text-transform:uppercase}.outcome-grid strong{display:block;margin:.22rem 0;font-size:.8rem}.outcome-grid p{margin:0;color:#777d89;font-size:.62rem;line-height:1.5}.back-link{width:max-content;color:#674388;font-size:.67rem;font-weight:800;text-decoration:none}.formation-drawer{width:min(560px,100vw);height:100dvh;max-width:none;max-height:none;margin:0 0 0 auto;padding:0;border:0;background:#fff;box-shadow:-24px 0 70px rgba(17,24,39,.22)}.formation-drawer::backdrop{background:rgba(11,15,27,.48);backdrop-filter:blur(2px)}.drawer-frame{display:grid;grid-template-rows:auto minmax(0,1fr);height:100%}.drawer-frame>header{display:flex;padding:1.05rem 1.1rem;border-bottom:1px solid #e3e4e8;align-items:flex-start;justify-content:space-between;gap:1rem}.drawer-frame>header h2{margin:.25rem 0;font-size:1.25rem}.drawer-frame>header p:last-child{margin:.25rem 0 0;color:#747a88;font-size:.67rem;line-height:1.5}.drawer-close{display:grid;min-width:38px;width:38px;height:38px;padding:0;border-color:#d8d9df;border-radius:9px;place-items:center;color:#505665;background:#fff;font-size:1.15rem}.drawer-body{overflow:auto;padding:1rem 1.1rem 1.5rem}.session-hero{padding:1rem;border-left:3px solid #6b4591;background:#faf7fc}.session-hero span{color:#79509b;font-size:.58rem;font-weight:850;text-transform:uppercase}.session-hero h3{margin:.22rem 0}.session-hero p{margin:0;color:#6d7381;font-size:.68rem;line-height:1.5}.content-block{padding:1rem 0;border-bottom:1px solid #e8e9ec}.content-block small{color:#7a4f98;font-size:.57rem;font-weight:850;text-transform:uppercase}.content-block h3{margin:.25rem 0 .45rem}.content-block p{color:#676e7c;font-size:.69rem;line-height:1.62}.discussion-question{display:grid;grid-template-columns:28px 1fr;padding:.5rem 0;gap:.5rem}.discussion-question span{display:grid;width:25px;height:25px;border-radius:7px;place-items:center;color:#6b4591;background:#f0e8f5;font-weight:900}.discussion-question p{margin:.2rem 0}.drawer-actions{display:flex;justify-content:flex-end;gap:.5rem;padding-top:1rem}.drawer-actions button:disabled{opacity:.55;cursor:default}.drawer-body label{display:grid;gap:.35rem;margin-bottom:.85rem;color:#505665;font-size:.66rem;font-weight:800}.drawer-body textarea,.drawer-body select{width:100%;padding:.65rem;border:1px solid #d1d3da;border-radius:8px;background:#fff;font:inherit;font-size:.72rem}.boundary{padding:.75rem;border-left:3px solid #b68b42;background:#fbf6ec;color:#70634c;font-size:.65rem;line-height:1.55}.member-profile{display:flex;align-items:center;gap:.7rem}.member-avatar{display:grid;width:46px;height:46px;border-radius:12px;place-items:center;color:#684188;background:#eee6f4;font-weight:900}.member-profile h3,.member-profile p{margin:0}.member-profile p{margin-top:.2rem;color:#858995;font-size:.65rem}.member-stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:1rem;border:1px solid #e4e5e9;border-radius:9px}.member-stats div{padding:.7rem;border-right:1px solid #e4e5e9}.member-stats div:last-child{border-right:0}.member-stats span,.member-stats strong{display:block}.member-stats span{color:#898e99;font-size:.55rem}.member-stats strong{margin-top:.18rem;font-size:.7rem}.marker-line{display:grid;grid-template-columns:22px 1fr;gap:.4rem}.marker-line p{margin:.1rem 0}.leader-checks{display:grid;margin:1rem 0}.leader-checks label{display:flex;padding:.65rem 0;border-top:1px solid #e9eaed;align-items:flex-start;gap:.5rem;font-size:.69rem;font-weight:650}.leader-checks input{margin-top:.15rem}.boundary-map{display:grid;grid-template-columns:1fr auto 1fr;gap:.6rem;align-items:center;margin:1rem 0}.boundary-map div{padding:.8rem;border:1px solid #e0e1e5;border-radius:8px}.boundary-map span,.boundary-map strong{display:block}.boundary-map span{color:#765094;font-size:.58rem;font-weight:850;text-transform:uppercase}.boundary-map strong{margin-top:.25rem;font-size:.68rem;line-height:1.45}@media(max-width:1050px){.formation-summary,.outcome-grid{grid-template-columns:1fr 1fr}.formation-summary article:nth-child(2){border-right:0}.formation-layout,.formation-grid{grid-template-columns:1fr}}@media(max-width:700px){.formation-page{padding:.9rem}.formation-hero{grid-template-columns:1fr}.hero-side{border-top:3px solid #6b4591;border-left:0}.formation-toolbar{display:grid}.formation-toolbar label{display:grid}.formation-toolbar select{width:100%;min-width:0}.toolbar-actions{display:grid;grid-template-columns:1fr 1fr}.formation-summary,.outcome-grid{grid-template-columns:1fr}.formation-summary article{border-right:0;border-bottom:1px solid #e6e7eb}.session-row{grid-template-columns:30px minmax(0,1fr)}.session-status{display:none}.formation-drawer{width:100vw}.member-row{grid-template-columns:1fr}.member-row>span:last-child{align-items:flex-start}.member-stats{grid-template-columns:1fr}.member-stats div{border-right:0;border-bottom:1px solid #e4e5e9}.boundary-map{grid-template-columns:1fr}.boundary-map>b{text-align:center;transform:rotate(90deg)}}
  `],
})
export class DwcFormationComponent {
  @ViewChild('formationDialog') formationDialog?: ElementRef<HTMLDialogElement>;

  private readonly storageKey = 'apostolos.engagements.demo.dwc.formation.v1';
  readonly groups: FormationGroup[] = [
    { id: 'young-adults', name: 'Young Adults DEG', leader: 'Alicia Brown', cluster: 'Central Cluster', members: 11, pace: 'On pace' },
    { id: 'marriage-family', name: 'Marriage & Family DEG', leader: 'James Smith', cluster: 'East Cluster', members: 14, pace: 'On pace' },
    { id: 'men-of-valor', name: 'Men of Valor', leader: 'Marcus Hill', cluster: 'South Cluster', members: 9, pace: 'Needs attention' },
    { id: 'women-purpose', name: 'Women of Purpose', leader: 'Jordan Davis', cluster: 'Central Cluster', members: 13, pace: 'Ahead' },
  ];

  readonly sessions: FormationSession[] = [
    { id: 'created', week: 1, title: 'Created & Known', theme: 'Identity begins with the God who formed us.', scripture: 'Psalm 139:13–18 · Genesis 1:26–27', bigIdea: 'Before calling, gifting or achievement, we receive the dignity of being created and known by God.', teaching: 'Explore identity as something received from God rather than assembled from performance, approval or circumstance.', discussion: ['Where do you most often look for identity besides God?', 'What changes when you believe God knows you completely and still draws near?'], practice: 'Begin each morning this week by praying Psalm 139:23–24 and writing one truth God says about you.', prayer: 'Pray for freedom from false labels and fresh confidence in the Father’s knowledge and love.', resource: 'Leader Guide · Created & Known' },
    { id: 'christ', week: 2, title: 'Identity in Christ', theme: 'We learn to live from union, not striving.', scripture: 'Ephesians 1:3–14 · Colossians 3:1–4', bigIdea: 'The gospel gives us a new center: who Christ is and what God has done in Him.', teaching: 'Name the difference between trying to earn spiritual identity and learning to live from what Christ has already secured.', discussion: ['Which truth in Ephesians 1 is hardest for you to receive personally?', 'How would living from belovedness change one area of your week?'], practice: 'Choose one “in Christ” truth and speak it aloud in prayer every day.', prayer: 'Thank Jesus for adoption, redemption and belonging; ask the Spirit to make truth experiential.', resource: 'Leader Guide · Identity in Christ' },
    { id: 'gifts', week: 3, title: 'Gifts, Grace & Calling', theme: 'Grace equips every believer to contribute.', scripture: 'Romans 12:3–8 · 1 Peter 4:10–11', bigIdea: 'Calling is not a platform; it is faithful stewardship of grace for the good of others.', teaching: 'Help members notice spiritual gifts, natural strengths, burdens and recurring fruit without forcing premature labels.', discussion: ['Where have other people consistently seen grace on your life?', 'What need or burden repeatedly moves you toward action?'], practice: 'Ask two mature believers where they see grace on your life and record what you hear.', prayer: 'Ask the Spirit for humility, clarity and courage to steward gifts as service.', resource: 'Gifts & Calling Reflection Guide' },
    { id: 'hear-obey', week: 4, title: 'Hearing & Obeying God', theme: 'Discipleship becomes concrete through responsive obedience.', scripture: 'John 10:27 · James 1:22–25 · Acts 13:1–3', bigIdea: 'We mature by learning to recognize God’s voice through Scripture and the Spirit, then responding faithfully.', teaching: 'Keep discernment anchored in Scripture, community and the character of God while creating room for real testimony and practice.', discussion: ['How do you currently discern whether a prompting is from God?', 'What is one clear act of obedience already in front of you?'], practice: 'Set aside 15 quiet minutes three times this week: read Scripture, listen, write, then obey the clearest biblical next step.', prayer: 'Pray for clean motives, sharpened discernment and grace to obey quickly.', resource: 'Listening Prayer & Discernment Guide' },
    { id: 'community', week: 5, title: 'Covenant Community', theme: 'Formation happens with people, not around them.', scripture: 'Acts 2:42–47 · Hebrews 10:23–25', bigIdea: 'Jesus forms a people who practice presence, honesty, encouragement, generosity and mutual responsibility.', teaching: 'Move beyond attendance toward a biblical vision of people who know, strengthen and carry one another.', discussion: ['What makes it difficult for you to be truly known?', 'What would healthy spiritual responsibility look like in this group?'], practice: 'Make one intentional encouragement or practical act of care for another group member this week.', prayer: 'Pray for trust, reconciliation, courage and durable spiritual friendship.', resource: 'Community Practices Guide' },
    { id: 'service', week: 6, title: 'Serve With Purpose', theme: 'Calling takes shape through faithful service.', scripture: 'Mark 10:42–45 · Ephesians 2:10', bigIdea: 'Kingdom leadership begins with serving what God loves, not building personal importance.', teaching: 'Connect gifts and burdens to tangible service inside the church, neighborhood and everyday vocation.', discussion: ['Where is there a real need your gifts could meet now?', 'What keeps service from becoming performance or burnout?'], practice: 'Take one concrete service step before the next gathering and come ready to share what you learned.', prayer: 'Ask Jesus for His servant heart and wisdom about sustainable obedience.', resource: 'Service & Ministry Next-Step Map' },
    { id: 'mission', week: 7, title: 'Live Sent', theme: 'Every disciple carries the Kingdom into ordinary places.', scripture: 'Matthew 28:18–20 · 2 Corinthians 5:17–20', bigIdea: 'Mission is not an occasional event; it is the posture of people sent by Jesus.', teaching: 'Help the group name the people and places God has already entrusted to them.', discussion: ['Who is already in your life that God may be inviting you to love intentionally?', 'What would good news look like in your workplace, school or neighborhood?'], practice: 'Pray daily for one person and create one natural opportunity to listen, serve or share your story.', prayer: 'Pray for compassion, boldness and sensitivity to the Spirit in everyday mission.', resource: 'Live Sent Conversation Guide' },
    { id: 'commission', week: 8, title: 'Commissioned for the Next Step', theme: 'Formation should move into ongoing obedience.', scripture: 'Philippians 1:3–6 · 2 Timothy 2:1–2', bigIdea: 'A semester ends, but discipleship continues through clear next steps, relationships and multiplication.', teaching: 'Celebrate growth, name remaining formation needs, identify service and leadership steps, and make room for testimony and commissioning prayer.', discussion: ['Where have you seen God change you during this semester?', 'What is the next faithful step you do not want to lose after this group ends?'], practice: 'Write a 90-day formation plan with one rhythm, one relationship and one Kingdom assignment.', prayer: 'Commission one another with thanksgiving, blessing and prayer for endurance.', resource: '90-Day Formation & Commissioning Guide' },
  ];

  readonly selectedGroupId = signal('young-adults');
  readonly completed = signal<string[]>(['created', 'christ', 'gifts']);
  readonly practices = signal<string[]>(['Ask two mature believers where they see grace on your life.']);
  readonly members = signal<FormationMember[]>([
    { id: 'michael', name: 'Michael Davis', attendance: '4/4', reflections: 3, practice: 'Complete', status: 'Emerging leader' },
    { id: 'sarah', name: 'Sarah Jones', attendance: '4/4', reflections: 2, practice: 'Complete', status: 'On pace' },
    { id: 'andre', name: 'Andre Lewis', attendance: '3/4', reflections: 2, practice: 'In progress', status: 'On pace' },
    { id: 'ashley', name: 'Ashley Martin', attendance: '2/4', reflections: 1, practice: 'Not started', status: 'Needs follow-up' },
    { id: 'derrick', name: 'Derrick Lewis', attendance: '4/4', reflections: 3, practice: 'Complete', status: 'On pace' },
  ]);
  readonly selectedSession = signal<FormationSession | null>(null);
  readonly selectedMember = signal<FormationMember | null>(null);
  readonly drawerKind = signal<DrawerKind | null>(null);

  practiceDraft = '';
  practiceResponse = 'Mark complete + optional reflection';
  leaderGuideReviewed = true;
  memberListPrayed = true;
  discussionPrepared = false;
  followupsReviewed = false;
  assignmentsReady = false;

  readonly selectedGroup = computed(() => this.groups.find(group => group.id === this.selectedGroupId()) ?? this.groups[0]);
  readonly completedCount = computed(() => this.completed().length);
  readonly progressPercent = computed(() => Math.round(this.completed().length * 100 / this.sessions.length));
  readonly currentSession = computed(() => this.sessions.find(session => !this.completed().includes(session.id)) ?? this.sessions[this.sessions.length - 1]);
  readonly followupCount = computed(() => this.members().filter(member => member.status === 'Needs follow-up').length);

  constructor() { this.restore(); }

  selectGroup(id: string): void {
    this.selectedGroupId.set(id);
    this.persist();
  }

  sessionState(session: FormationSession): 'Complete' | 'Current' | 'Upcoming' {
    if (this.completed().includes(session.id)) return 'Complete';
    return this.currentSession().id === session.id ? 'Current' : 'Upcoming';
  }

  sessionStateIcon(session: FormationSession): string {
    const state = this.sessionState(session);
    return state === 'Complete' ? '✓' : state === 'Current' ? '→' : String(session.week);
  }

  isCompleted(session: FormationSession): boolean { return this.completed().includes(session.id); }

  openSession(session: FormationSession): void {
    this.selectedSession.set(session);
    this.drawerKind.set('session');
    this.showDrawer();
  }

  openPractice(defaultValue = ''): void {
    this.practiceDraft = defaultValue || this.currentSession().practice;
    this.drawerKind.set('practice');
    this.showDrawer();
  }

  openMember(member: FormationMember): void {
    this.selectedMember.set(member);
    this.drawerKind.set('member');
    this.showDrawer();
  }

  openLeaderPrep(): void {
    this.drawerKind.set('leader');
    this.showDrawer();
  }

  openAcademyBoundary(): void {
    this.drawerKind.set('academy');
    this.showDrawer();
  }

  completeSession(session: FormationSession): void {
    if (!this.completed().includes(session.id)) {
      this.completed.update(items => [...items, session.id]);
      this.persist();
    }
    this.closeDrawer();
  }

  savePractice(): void {
    const value = this.practiceDraft.trim();
    if (!value) return;
    this.practices.update(items => [value, ...items.filter(item => item !== value)]);
    this.persist();
    this.closeDrawer();
  }

  recordReflection(member: FormationMember): void {
    this.members.update(items => items.map(item => item.id === member.id ? { ...item, reflections: item.reflections + 1 } : item));
    this.selectedMember.set({ ...member, reflections: member.reflections + 1 });
    this.persist();
  }

  recordMilestone(member: FormationMember): void {
    this.members.update(items => items.map(item => item.id === member.id ? { ...item, status: 'Emerging leader' as const } : item));
    this.selectedMember.set({ ...member, status: 'Emerging leader' });
    this.persist();
  }

  saveLeaderPrep(): void {
    this.persist();
    this.closeDrawer();
  }

  drawerEyebrow(): string {
    switch (this.drawerKind()) {
      case 'session': return `Formation session · ${this.selectedGroup().name}`;
      case 'practice': return 'Between gatherings';
      case 'member': return 'Formation record';
      case 'leader': return 'Leader preparation';
      case 'academy': return 'ApostolOS architecture';
      default: return 'Divine Empowerment Groups';
    }
  }

  drawerTitle(): string {
    switch (this.drawerKind()) {
      case 'session': return this.selectedSession()?.title ?? 'Session';
      case 'practice': return 'Create group practice';
      case 'member': return this.selectedMember()?.name ?? 'Member formation';
      case 'leader': return `Prepare Week ${this.currentSession().week}`;
      case 'academy': return 'DEG formation + Kingdom Academy';
      default: return 'Formation';
    }
  }

  drawerDescription(): string {
    switch (this.drawerKind()) {
      case 'session': return 'Guide the gathering without turning the group into a classroom.';
      case 'practice': return 'Carry formation into the week with a simple, concrete next step.';
      case 'member': return 'See participation, reflection and relational next steps without reducing a person to a score.';
      case 'leader': return 'Prepare the Scripture, people, assignments and pastoral posture before the room gathers.';
      case 'academy': return 'Reuse Academy-grade curriculum structure while keeping DEG relationships inside Engagements.';
      default: return '';
    }
  }

  closeDrawer(): void {
    this.formationDialog?.nativeElement.close();
    this.drawerKind.set(null);
  }

  onDialogClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeDrawer();
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  }

  private showDrawer(): void {
    queueMicrotask(() => {
      const dialog = this.formationDialog?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        selectedGroupId: this.selectedGroupId(),
        completed: this.completed(),
        practices: this.practices(),
        members: this.members(),
        leader: {
          guide: this.leaderGuideReviewed,
          prayer: this.memberListPrayed,
          discussion: this.discussionPrepared,
          followups: this.followupsReviewed,
          assignments: this.assignmentsReady,
        },
      }));
    } catch { /* Demo persistence is best-effort. */ }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (this.groups.some(group => group.id === state.selectedGroupId)) this.selectedGroupId.set(state.selectedGroupId);
      if (Array.isArray(state.completed)) this.completed.set(state.completed.filter((id: string) => this.sessions.some(session => session.id === id)));
      if (Array.isArray(state.practices)) this.practices.set(state.practices);
      if (Array.isArray(state.members)) this.members.set(state.members);
      if (state.leader) {
        this.leaderGuideReviewed = state.leader.guide ?? true;
        this.memberListPrayed = state.leader.prayer ?? true;
        this.discussionPrepared = state.leader.discussion ?? false;
        this.followupsReviewed = state.leader.followups ?? false;
        this.assignmentsReady = state.leader.assignments ?? false;
      }
    } catch { /* Keep deterministic defaults if stored demo state is invalid. */ }
  }
}
