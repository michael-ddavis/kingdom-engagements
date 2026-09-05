import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DwcFormationStateService, FormationSession, LeadershipStage } from '../core/dwc-formation-state.service';

type MyGroupTab = 'week' | 'formation' | 'responses' | 'journey';

@Component({
  selector: 'app-dwc-my-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="my-group-page">
      <header class="member-hero">
        <div>
          <p class="eyebrow">Divine Empowerment Groups · My Group</p>
          <span class="welcome">Welcome back, {{ firstName() }}</span>
          <h1>{{ myGroup().name }}</h1>
          <p>{{ myGroup().leader }} · {{ myGroup().meeting }} · {{ myGroup().location }}</p>
          <div class="hero-tags"><span>{{ myGroup().semester }}</span><span>{{ myTrack().title }}</span><span>{{ myGroup().pace }}</span></div>
        </div>
        <aside>
          <span>My formation</span>
          <strong>{{ progressPercent() }}%</strong>
          <div class="progress"><i [style.width.%]="progressPercent()"></i></div>
          <small>{{ myGroup().completedSessionIds.length }} of {{ myTrack().sessions.length }} sessions complete as a group</small>
          <em>{{ member().leadershipStage }}</em>
        </aside>
      </header>

      <nav class="member-tabs" aria-label="My DEG">
        @for (tab of tabs; track tab.key) {
          <button type="button" [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">{{ tab.label }}</button>
        }
      </nav>

      @if (activeTab() === 'week') {
        <div class="week-layout">
          <article class="panel this-week">
            <header><div><p class="eyebrow">This week</p><span>Week {{ currentSession().week }}</span><h2>{{ currentSession().title }}</h2><p>{{ currentSession().bigIdea }}</p></div><b>{{ currentSession().scripture }}</b></header>

            @if (academyMedia(); as media) {
              <section class="academy-resource">
                <div><small>Kingdom Academy resource</small><strong>{{ media.title }}</strong><p>Formal lesson content stays in Academy. Your DEG reflection, discussion, practice and relationships stay here.</p></div>
                @if (media.url) { <video controls preload="metadata" [src]="media.url"></video> }
              </section>
            }

            <section class="practice-card" [class.complete]="member().practice === 'Complete'">
              <div><p class="eyebrow">Practice before next gathering</p><h3>{{ currentSession().practice }}</h3><p>This is not graded. The goal is to practice what the group is learning in ordinary life.</p></div>
              <button type="button" [disabled]="member().practice === 'Complete'" (click)="completePractice()">{{ member().practice === 'Complete' ? 'Practice complete ✓' : 'Mark practice complete' }}</button>
            </section>

            <section class="week-actions">
              <button type="button" (click)="activeTab.set('responses'); responseFocus.set('reflection')">Add reflection</button>
              <button type="button" class="quiet" (click)="activeTab.set('responses'); responseFocus.set('prayer')">Share prayer response</button>
              <button type="button" class="quiet" (click)="activeTab.set('responses'); responseFocus.set('testimony')">Capture testimony</button>
            </section>
          </article>

          <aside class="week-sidebar">
            <article class="panel group-life">
              <p class="eyebrow">Group life</p><h3>You are not taking this track alone.</h3>
              <div class="detail"><span>Leader</span><strong>{{ myGroup().leader }}</strong></div>
              <div class="detail"><span>Cluster</span><strong>{{ myGroup().cluster }}</strong></div>
              <div class="detail"><span>People</span><strong>{{ myGroup().members }} active</strong></div>
              <div class="detail"><span>Childcare</span><strong>{{ myGroup().childcare ? 'Available' : 'Not listed' }}</strong></div>
            </article>

            <article class="panel next-step">
              <p class="eyebrow">My next step</p><h3>{{ member().nextStep }}</h3><p>Your leader can adjust this as the group discerns growth, service and leadership together.</p>
              <span>{{ member().serviceArea }}</span>
            </article>
          </aside>
        </div>

        @if (member().missedSessionIds.length) {
          <article class="panel catchup-panel">
            <header><div><p class="eyebrow">Catch-up</p><h2>Stay connected to the formation story.</h2><p>Catch-up helps you re-enter the group’s conversation. It does not pretend watching or reading alone is the same as being in the room.</p></div></header>
            @for (sessionId of member().missedSessionIds; track sessionId) {
              @if (findSession(sessionId); as missed) {
                <div class="catchup-row"><span><small>Week {{ missed.week }}</small><strong>{{ missed.title }}</strong><p>{{ missed.catchUp }}</p></span><button type="button" [disabled]="!member().catchUpAssignedIds.includes(sessionId)" (click)="completeCatchUp(sessionId)">{{ member().catchUpAssignedIds.includes(sessionId) ? 'Complete catch-up' : 'Waiting for leader assignment' }}</button></div>
              }
            }
          </article>
        }
      }

      @if (activeTab() === 'formation') {
        <section class="formation-heading"><div><p class="eyebrow">My formation pathway</p><h2>{{ myTrack().title }}</h2><p>{{ myTrack().description }}</p></div><span>{{ myTrack().source }}</span></section>
        <div class="formation-layout">
          <article class="panel session-timeline">
            @for (session of myTrack().sessions; track session.id) {
              <div class="timeline-row" [attr.data-state]="sessionState(session)">
                <span class="timeline-mark">{{ sessionIcon(session) }}</span>
                <div><small>Week {{ session.week }} · {{ sessionState(session) }}</small><strong>{{ session.title }}</strong><p>{{ session.theme }}</p></div>
                <b>{{ session.scripture }}</b>
              </div>
            }
          </article>

          <aside class="formation-side">
            <article class="panel"><p class="eyebrow">What this track is forming</p><h3>Formation outcomes</h3>@for (outcome of myTrack().outcomes; track outcome) { <div class="outcome"><span>✓</span><strong>{{ outcome }}</strong></div> }</article>
            <article class="panel"><p class="eyebrow">What could come next</p><h3>Recommended continuation</h3>@for (next of myTrack().suggestedNext; track next) { <div class="outcome next"><span>→</span><strong>{{ next }}</strong></div> }</article>
          </aside>
        </div>
      }

      @if (activeTab() === 'responses') {
        <section class="formation-heading"><div><p class="eyebrow">Respond to God</p><h2>Reflection, prayer & testimony</h2><p>Your responses belong to your formation story. DEG leaders can use them for encouragement and next-step discernment without turning them into academic assignments.</p></div></section>

        <div class="response-grid">
          <article class="panel composer" [class.focused]="responseFocus() === 'reflection'">
            <span>Reflection</span><h3>What are you noticing?</h3><textarea rows="6" [(ngModel)]="reflectionDraft" placeholder="What is God showing you? What truth are you receiving? What are you practicing?"></textarea><button type="button" (click)="saveReflection()">Save reflection</button>
          </article>
          <article class="panel composer" [class.focused]="responseFocus() === 'prayer'">
            <span>Prayer response</span><h3>How are you responding to God?</h3><textarea rows="6" [(ngModel)]="prayerDraft" placeholder="A prayer, request, commitment or response from this week..."></textarea><button type="button" (click)="savePrayer()">Save prayer response</button>
          </article>
          <article class="panel composer" [class.focused]="responseFocus() === 'testimony'">
            <span>Testimony</span><h3>What has God done?</h3><textarea rows="6" [(ngModel)]="testimonyDraft" placeholder="Capture a change, answered prayer, act of obedience or story you want to remember..."></textarea><button type="button" (click)="saveTestimony()">Save testimony</button>
          </article>
        </div>

        <div class="response-history">
          <article class="panel">
            <header><p class="eyebrow">Recent reflections</p><strong>{{ member().reflections.length }}</strong></header>@for (item of member().reflections; track item) { <p>{{ item }}</p> }
          </article>
          <article class="panel">
            <header><p class="eyebrow">Prayer responses</p><strong>{{ member().prayerResponses.length }}</strong></header>@for (item of member().prayerResponses; track item) { <p>{{ item }}</p> }
          </article>
          <article class="panel">
            <header><p class="eyebrow">Testimonies</p><strong>{{ member().testimonies.length }}</strong></header>@for (item of member().testimonies; track item) { <p>{{ item }}</p> }
          </article>
        </div>
      }

      @if (activeTab() === 'journey') {
        <section class="formation-heading"><div><p class="eyebrow">My discipleship journey</p><h2>Formation should lead somewhere.</h2><p>Service and leadership are not badges. They are ways formed disciples begin carrying responsibility for people, ministry and multiplication.</p></div></section>

        <article class="panel leadership-path">
          @for (stage of state.leadershipStages(); track stage; let index = $index) {
            <div [class.reached]="stageReached(stage)" [class.current]="member().leadershipStage === stage"><span>{{ stageReached(stage) ? '✓' : index + 1 }}</span><strong>{{ stage }}</strong></div>
          }
        </article>

        <div class="journey-grid">
          <article class="panel journey-card"><p class="eyebrow">Current service</p><h3>{{ member().serviceArea }}</h3><p>Service gives your gifts somewhere concrete to become faithful stewardship.</p></article>
          <article class="panel journey-card"><p class="eyebrow">Current development step</p><h3>{{ member().nextStep }}</h3><p>Formation leaders and ministry leaders can coordinate this next step without duplicating your person record.</p></article>
          <article class="panel journey-card"><p class="eyebrow">Semester commissioning</p><h3>{{ member().commissioned ? 'Commissioned ✓' : 'Still ahead' }}</h3><p>Commissioning names growth, blesses your next faithful step and keeps discipleship moving beyond the semester.</p></article>
        </div>

        <article class="panel story-timeline">
          <header><div><p class="eyebrow">Cross-semester formation</p><h2>Your story stays connected.</h2></div></header>
          @for (entry of member().history; track entry.semester + entry.group) {
            <div class="story-row"><span>{{ entry.semester }}</span><strong>{{ entry.group }}</strong><p>{{ entry.track }}</p><b>{{ entry.outcome }}</b></div>
          }
          @for (milestone of member().milestones; track milestone) {
            <div class="story-row milestone"><span>Current</span><strong>Growth milestone</strong><p>{{ milestone }}</p><b>Formation evidence</b></div>
          }
        </article>
      }

      <a class="back-link" href="/organization/dwc/formation">Leader Formation view →</a>
    </section>
  `,
  styles: [`
    :host{display:block}.my-group-page{display:grid;gap:14px;max-width:1420px;margin:0 auto;padding:20px 22px 52px;color:#202637}.eyebrow{margin:0;color:#704897;font-size:.61rem;font-weight:850;letter-spacing:.095em;text-transform:uppercase}.member-hero{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.55fr);gap:20px;padding:30px 32px;border:1px solid #e6e0e9;border-radius:18px;background:linear-gradient(125deg,#fffefd,#faf8fb 60%,#f4edf8);box-shadow:0 18px 48px rgba(40,28,52,.045)}.welcome{display:block;margin-top:9px;color:#7d7882;font-size:.7rem}.member-hero h1{margin:4px 0 5px;font-size:clamp(2.3rem,5vw,3.8rem);letter-spacing:-.055em}.member-hero>div>p:not(.eyebrow){margin:0;color:#6f7480;font-size:.79rem}.hero-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}.hero-tags span{padding:5px 8px;border-radius:7px;background:#fff;color:#746d77;font-size:.61rem;box-shadow:0 0 0 1px #ece7ed}.member-hero aside{display:grid;padding:18px;border-left:4px solid #704897;border-radius:7px 12px 12px 7px;align-content:center;background:rgba(255,255,255,.7)}.member-hero aside>span,.member-hero aside>small{color:#84818a;font-size:.62rem}.member-hero aside>strong{margin:6px 0 4px;font-size:2rem;letter-spacing:-.04em}.member-hero aside>em{width:max-content;margin-top:12px;padding:5px 8px;border-radius:7px;background:#eee5f4;color:#704897;font-size:.62rem;font-style:normal;font-weight:800}.progress{height:6px;margin:6px 0 7px;border-radius:10px;background:#eeeaf0;overflow:hidden}.progress i{display:block;height:100%;background:#704897}.member-tabs{display:flex;gap:3px;padding:5px;border:1px solid #e2dfe5;border-radius:12px;background:#fff;overflow:auto}.member-tabs button{padding:9px 13px;border:0;border-radius:8px;background:transparent;color:#777983;font-size:.7rem;font-weight:760;white-space:nowrap;cursor:pointer}.member-tabs button.active{background:#2b3141;color:#fff}.panel{border:1px solid #e2e2e5;border-radius:13px;background:#fff;box-shadow:0 8px 24px rgba(27,33,47,.025)}.week-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.55fr);gap:12px}.this-week{padding:20px}.this-week>header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:start}.this-week header>div>span{display:block;margin-top:10px;color:#8b7e91;font-size:.63rem}.this-week h2,.formation-heading h2,.story-timeline h2{margin:4px 0 5px;font-size:1.5rem;letter-spacing:-.04em}.this-week header p:not(.eyebrow),.formation-heading p:not(.eyebrow),.story-timeline header p:not(.eyebrow){max-width:760px;margin:0;color:#727784;font-size:.72rem;line-height:1.55}.this-week header>b{max-width:260px;padding:9px;border-radius:8px;background:#f6f3f7;color:#624c70;font-size:.64rem;line-height:1.45}.academy-resource{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.7fr);gap:14px;margin-top:18px;padding:15px;border:1px solid #eee6dc;border-radius:11px;background:#fffcf7;align-items:center}.academy-resource small{color:#9a733e;font-size:.58rem;font-weight:800;text-transform:uppercase}.academy-resource strong{display:block;margin:4px 0;font-size:.78rem}.academy-resource p{margin:0;color:#7c776f;font-size:.65rem;line-height:1.5}.academy-resource video{width:100%;max-height:180px;border-radius:8px;background:#111}.practice-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;margin-top:14px;padding:16px;border-left:4px solid #704897;border-radius:8px;background:#faf7fb;align-items:center}.practice-card.complete{border-left-color:#397255;background:#f6faf7}.practice-card h3{margin:5px 0;font-size:.88rem}.practice-card p:not(.eyebrow){margin:0;color:#777b86;font-size:.66rem;line-height:1.5}.practice-card button,.week-actions button,.catchup-row button,.composer button{min-height:39px;padding:0 12px;border:0;border-radius:8px;background:#27344e;color:#fff;font-size:.67rem;font-weight:780;cursor:pointer}.practice-card button:disabled,.catchup-row button:disabled{background:#edf4ef;color:#397255;cursor:default}.week-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.week-actions .quiet{border:1px solid #ded9e4;background:#fff;color:#5d4274}.week-sidebar{display:grid;gap:12px}.week-sidebar>.panel{padding:18px}.week-sidebar h3{margin:6px 0 12px;font-size:1rem}.detail{display:flex;padding:9px 0;border-top:1px solid #eeecef;justify-content:space-between;gap:12px}.detail span{color:#898991;font-size:.6rem}.detail strong{font-size:.65rem}.next-step p{color:#767b86;font-size:.67rem;line-height:1.5}.next-step>span{display:inline-block;margin-top:6px;padding:5px 7px;border-radius:6px;background:#eee7f2;color:#704897;font-size:.58rem;font-weight:800}.catchup-panel{padding:19px}.catchup-panel header p:not(.eyebrow){max-width:760px;margin:4px 0;color:#747985;font-size:.69rem;line-height:1.5}.catchup-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:15px;padding:13px 2px;border-top:1px solid #ececef;align-items:center}.catchup-row>span{display:grid;gap:3px}.catchup-row small{color:#8a8b92;font-size:.58rem}.catchup-row strong{font-size:.75rem}.catchup-row p{margin:0;color:#747984;font-size:.65rem;line-height:1.5}.formation-heading{display:flex;padding:8px 2px 2px;justify-content:space-between;gap:20px;align-items:flex-end}.formation-heading>span{padding:5px 8px;border-radius:7px;background:#f4f0f5;color:#795990;font-size:.62rem;font-weight:800}.formation-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,.55fr);gap:12px}.session-timeline{padding:18px}.timeline-row{display:grid;grid-template-columns:34px minmax(0,1fr) minmax(180px,.55fr);gap:11px;min-height:78px;padding:11px 2px;border-top:1px solid #ececef;align-items:center}.timeline-row:first-child{border-top:0}.timeline-mark{display:grid;width:29px;height:29px;border-radius:8px;place-items:center;background:#f1edf2;color:#827688;font-size:.61rem;font-weight:850}.timeline-row[data-state='Complete'] .timeline-mark{background:#edf6f0;color:#397255}.timeline-row[data-state='Current'] .timeline-mark{background:#eee5f4;color:#704897}.timeline-row>div{display:grid;gap:2px}.timeline-row small{color:#8a8b92;font-size:.57rem}.timeline-row strong{font-size:.75rem}.timeline-row p{margin:0;color:#777b86;font-size:.63rem}.timeline-row>b{color:#6f6574;font-size:.61rem;line-height:1.45}.formation-side{display:grid;gap:12px;align-content:start}.formation-side>.panel{padding:18px}.formation-side h3{margin:5px 0 10px}.outcome{display:flex;gap:8px;padding:9px 0;border-top:1px solid #eeecef}.outcome span{color:#397255}.outcome strong{font-size:.67rem}.outcome.next span{color:#704897}.response-grid,.response-history,.journey-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.composer{display:grid;gap:8px;padding:18px}.composer.focused{border-color:#bba7ca;box-shadow:inset 0 3px 0 #704897}.composer>span{color:#704897;font-size:.58rem;font-weight:850;text-transform:uppercase}.composer h3{margin:0}.composer textarea{width:100%;padding:10px;border:1px solid #dcd9df;border-radius:8px;resize:vertical;color:#292f40;font:inherit;font-size:.7rem}.response-history>.panel{padding:17px}.response-history header{display:flex;justify-content:space-between}.response-history header>strong{font-size:1.1rem}.response-history>.panel>p{padding:10px 0;margin:0;border-top:1px solid #eeecef;color:#666c78;font-size:.66rem;line-height:1.55}.leadership-path{display:grid;grid-template-columns:repeat(8,minmax(100px,1fr));gap:5px;padding:14px;overflow:auto}.leadership-path>div{display:grid;min-height:92px;padding:10px;border:1px solid #e7e4e8;border-radius:8px;align-content:start;background:#fbfafb}.leadership-path>div span{display:grid;width:26px;height:26px;border-radius:7px;place-items:center;background:#efedf0;color:#8a8590;font-size:.58rem;font-weight:850}.leadership-path>div strong{margin-top:auto;color:#777983;font-size:.6rem}.leadership-path>div.reached{border-color:#d8cbe0;background:#faf7fb}.leadership-path>div.reached span{background:#eee5f4;color:#704897}.leadership-path>div.current{box-shadow:inset 0 3px 0 #704897}.journey-card{padding:18px}.journey-card h3{margin:7px 0 5px;font-size:.9rem}.journey-card p{margin:0;color:#777b86;font-size:.67rem;line-height:1.5}.story-timeline{padding:19px}.story-row{display:grid;grid-template-columns:90px minmax(150px,.8fr) minmax(220px,1.2fr) minmax(120px,.7fr);gap:12px;padding:12px 2px;border-top:1px solid #ececef;align-items:center}.story-row>span{color:#8b8c93;font-size:.6rem}.story-row>strong,.story-row>b{font-size:.67rem}.story-row>p{margin:0;color:#747984;font-size:.64rem}.story-row.milestone>span{color:#704897;font-weight:800}.back-link{width:max-content;margin-top:3px;color:#704897;font-size:.67rem;font-weight:760;text-decoration:none}@media(max-width:1050px){.member-hero,.week-layout,.formation-layout{grid-template-columns:1fr}.member-hero aside{border-left:0;border-top:4px solid #704897}.response-grid,.response-history,.journey-grid{grid-template-columns:1fr}.academy-resource{grid-template-columns:1fr}}@media(max-width:700px){.my-group-page{padding:12px 10px 36px}.member-hero{padding:22px 18px}.member-hero h1{font-size:2.35rem}.this-week>header,.practice-card,.catchup-row,.timeline-row,.story-row{grid-template-columns:1fr}.this-week header>b{max-width:none}.leadership-path{grid-template-columns:repeat(8,120px)}}
  `],
})
export class DwcMyGroupComponent {
  readonly tabs: { key: MyGroupTab; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'formation', label: 'My Formation' },
    { key: 'responses', label: 'Reflections & Prayer' },
    { key: 'journey', label: 'My Journey' },
  ];
  readonly activeTab = signal<MyGroupTab>('week');
  readonly responseFocus = signal<'reflection' | 'prayer' | 'testimony' | null>(null);
  reflectionDraft = '';
  prayerDraft = '';
  testimonyDraft = '';

  readonly member = computed(() => this.state.myMember());
  readonly myGroup = computed(() => this.state.groups().find(group => group.memberIds.includes(this.member().id)) ?? this.state.groups()[0]);
  readonly myTrack = computed(() => this.state.trackById(this.myGroup().trackId) ?? this.state.tracks()[0]);
  readonly currentSession = computed(() => this.myTrack().sessions.find(session => !this.myGroup().completedSessionIds.includes(session.id)) ?? this.myTrack().sessions[this.myTrack().sessions.length - 1]);
  readonly progressPercent = computed(() => Math.round(this.myGroup().completedSessionIds.length * 100 / Math.max(1, this.myTrack().sessions.length)));
  readonly academyMedia = computed(() => this.currentSession().media.find(media => media.source === 'Kingdom Academy' && media.type === 'video'));

  constructor(readonly state: DwcFormationStateService) {}

  firstName(): string {
    return this.member().name.split(/\s+/)[0] || 'there';
  }

  sessionState(session: FormationSession): 'Complete' | 'Current' | 'Upcoming' {
    if (this.myGroup().completedSessionIds.includes(session.id)) return 'Complete';
    return this.currentSession().id === session.id ? 'Current' : 'Upcoming';
  }

  sessionIcon(session: FormationSession): string {
    const state = this.sessionState(session);
    return state === 'Complete' ? '✓' : state === 'Current' ? '→' : String(session.week);
  }

  completePractice(): void {
    this.state.completeMemberPractice(this.member().id);
  }

  saveReflection(): void {
    this.state.addReflection(this.member().id, this.reflectionDraft);
    this.reflectionDraft = '';
    this.responseFocus.set(null);
  }

  savePrayer(): void {
    this.state.addPrayerResponse(this.member().id, this.prayerDraft);
    this.prayerDraft = '';
    this.responseFocus.set(null);
  }

  saveTestimony(): void {
    this.state.addTestimony(this.member().id, this.testimonyDraft);
    this.testimonyDraft = '';
    this.responseFocus.set(null);
  }

  findSession(sessionId: string): FormationSession | undefined {
    for (const track of this.state.tracks()) {
      const session = track.sessions.find(item => item.id === sessionId);
      if (session) return session;
    }
    return undefined;
  }

  completeCatchUp(sessionId: string): void {
    this.state.completeCatchUp(this.member().id, sessionId);
  }

  stageReached(stage: LeadershipStage): boolean {
    const stages = this.state.leadershipStages();
    return stages.indexOf(stage) <= stages.indexOf(this.member().leadershipStage);
  }
}
