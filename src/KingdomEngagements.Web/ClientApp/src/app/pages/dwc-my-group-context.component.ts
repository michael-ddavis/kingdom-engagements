import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DwcFormationStateService, FormationSession, LeadershipStage } from '../core/dwc-formation-state.service';

type MemberTab = 'week' | 'formation' | 'responses' | 'journey';

@Component({
  selector: 'app-dwc-my-group-context',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="member-page">
      <header class="member-hero">
        <div>
          <p class="eyebrow">Divine Empowerment Groups · Member Preview</p>
          <span class="welcome">Welcome back, {{ firstName() }}</span>
          <h1>{{ group().name }}</h1>
          <p>{{ group().leader }} · {{ group().meeting }} · {{ group().location }}</p>
          <div class="hero-tags"><span>{{ group().semester }}</span><span>{{ track().title }}</span><span>{{ group().pace }}</span></div>
        </div>
        <aside>
          <small>Your group is on</small>
          <strong>Week {{ currentSession().week }}</strong>
          <span>{{ currentSession().title }}</span>
          <div class="progress"><i [style.width.%]="progressPercent()"></i></div>
          <p>{{ group().completedSessionIds.length }} of {{ track().sessions.length }} gatherings complete</p>
        </aside>
      </header>

      <nav class="member-tabs" aria-label="Member group experience">
        @for (tab of tabs; track tab.key) {
          <button type="button" [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">{{ tab.label }}</button>
        }
      </nav>

      @if (activeTab() === 'week') {
        <section class="week-layout">
          <article class="paper main-week">
            <p class="eyebrow">This week together</p>
            <h2>{{ currentSession().title }}</h2>
            <p class="big-idea">{{ currentSession().bigIdea }}</p>
            <blockquote>{{ currentSession().scripture }}</blockquote>
            @if (academyMedia(); as media) {
              <div class="resource"><span>Kingdom Academy</span><strong>{{ media.title }}</strong><small>Optional lesson resource connected to this week's group conversation.</small></div>
            }
            <section class="practice" [class.complete]="member().practice === 'Complete'">
              <div><span>Carry it into the week</span><strong>{{ currentSession().practice }}</strong><p>No grade. Just one concrete way to practice what the group is receiving.</p></div>
              <button type="button" [disabled]="member().practice === 'Complete'" (click)="completePractice()">{{ member().practice === 'Complete' ? 'Done ✓' : 'Mark complete' }}</button>
            </section>
            <div class="response-actions">
              <button type="button" (click)="openResponse('reflection')">Reflect</button>
              <button type="button" class="quiet" (click)="openResponse('prayer')">Respond in prayer</button>
              <button type="button" class="quiet" (click)="openResponse('testimony')">Share a testimony</button>
            </div>
          </article>

          <aside class="side-stack">
            <article class="paper group-life"><p class="eyebrow">Your group</p><h3>You are doing this with people.</h3><div><span>Leader</span><strong>{{ group().leader }}</strong></div><div><span>Cluster</span><strong>{{ group().cluster }}</strong></div><div><span>Group size</span><strong>{{ group().members }} people</strong></div></article>
            <article class="paper next-step"><p class="eyebrow">Your next step</p><h3>{{ member().nextStep }}</h3><p>{{ member().serviceArea }}</p></article>
          </aside>
        </section>

        @if (member().missedSessionIds.length) {
          <article class="paper catchup"><p class="eyebrow">Reconnect</p><h3>You missed part of the group's story.</h3><p>Catch-up helps you return to the conversation without pretending a resource replaces being in the room.</p>@for (sessionId of member().missedSessionIds; track sessionId) { @if (findSession(sessionId); as missed) { <div><span><strong>{{ missed.title }}</strong><small>{{ missed.catchUp }}</small></span><button type="button" [disabled]="!member().catchUpAssignedIds.includes(sessionId)" (click)="completeCatchUp(sessionId)">{{ member().catchUpAssignedIds.includes(sessionId) ? 'Complete catch-up' : 'Leader will send catch-up' }}</button></div> } }</article>
        }
      }

      @if (activeTab() === 'formation') {
        <section class="section-heading"><p class="eyebrow">Your formation pathway</p><h2>{{ track().title }}</h2><p>{{ track().description }}</p></section>
        <div class="formation-layout">
          <article class="paper timeline">
            @for (session of track().sessions; track session.id) {
              <div [attr.data-state]="sessionState(session)"><span>{{ sessionIcon(session) }}</span><section><small>Week {{ session.week }} · {{ sessionState(session) }}</small><strong>{{ session.title }}</strong><p>{{ session.theme }}</p></section><b>{{ session.scripture }}</b></div>
            }
          </article>
          <aside class="side-stack"><article class="paper outcomes"><p class="eyebrow">What this is forming</p>@for (outcome of track().outcomes; track outcome) { <div><span>✓</span><strong>{{ outcome }}</strong></div> }</article><article class="paper outcomes"><p class="eyebrow">Where this could lead</p>@for (next of track().suggestedNext; track next) { <div><span>→</span><strong>{{ next }}</strong></div> }</article></aside>
        </div>
      }

      @if (activeTab() === 'responses') {
        <section class="section-heading"><p class="eyebrow">Respond to God</p><h2>Reflection, prayer & testimony</h2><p>Keep what God is doing connected to your formation story without turning it into homework.</p></section>
        <div class="response-grid">
          <article class="paper composer" [class.focused]="responseFocus() === 'reflection'"><span>Reflection</span><h3>What are you noticing?</h3><textarea rows="6" [(ngModel)]="reflectionDraft"></textarea><button type="button" (click)="saveReflection()">Save reflection</button></article>
          <article class="paper composer" [class.focused]="responseFocus() === 'prayer'"><span>Prayer</span><h3>How are you responding?</h3><textarea rows="6" [(ngModel)]="prayerDraft"></textarea><button type="button" (click)="savePrayer()">Save prayer</button></article>
          <article class="paper composer" [class.focused]="responseFocus() === 'testimony'"><span>Testimony</span><h3>What has God done?</h3><textarea rows="6" [(ngModel)]="testimonyDraft"></textarea><button type="button" (click)="saveTestimony()">Save testimony</button></article>
        </div>
        <div class="stories"><article class="paper"><span>Reflections</span><strong>{{ member().reflections.length }}</strong>@for (item of member().reflections.slice(0,3); track item) { <p>{{ item }}</p> }</article><article class="paper"><span>Prayer responses</span><strong>{{ member().prayerResponses.length }}</strong>@for (item of member().prayerResponses.slice(0,3); track item) { <p>{{ item }}</p> }</article><article class="paper"><span>Testimonies</span><strong>{{ member().testimonies.length }}</strong>@for (item of member().testimonies.slice(0,3); track item) { <p>{{ item }}</p> }</article></div>
      }

      @if (activeTab() === 'journey') {
        <section class="section-heading"><p class="eyebrow">Your journey</p><h2>Formation keeps moving into service and leadership.</h2><p>This is not a badge system. It simply helps you and your leaders name where responsibility may be growing.</p></section>
        <article class="paper leadership-path">@for (stage of state.leadershipStages(); track stage; let index = $index) { <div [class.reached]="stageReached(stage)" [class.current]="member().leadershipStage === stage"><span>{{ stageReached(stage) ? '✓' : index + 1 }}</span><strong>{{ stage }}</strong></div> }</article>
        <div class="journey-grid"><article class="paper"><p class="eyebrow">Serving</p><h3>{{ member().serviceArea }}</h3></article><article class="paper"><p class="eyebrow">Growing toward</p><h3>{{ member().nextStep }}</h3></article><article class="paper"><p class="eyebrow">Commissioning</p><h3>{{ member().commissioned ? 'Commissioned ✓' : 'Still ahead' }}</h3></article></div>
        <article class="paper history"><p class="eyebrow">Your connected story</p>@for (entry of member().history; track entry.semester + entry.group) { <div><span>{{ entry.semester }}</span><strong>{{ entry.group }}</strong><p>{{ entry.track }}</p><b>{{ entry.outcome }}</b></div> }@for (milestone of member().milestones; track milestone) { <div><span>Current</span><strong>Growth milestone</strong><p>{{ milestone }}</p><b>Formation evidence</b></div> }</article>
      }

      <a class="exit-link" [href]="groupHref('/organization/dwc/formation')">← Exit member preview</a>
    </section>
  `,
  styles: [`
    :host{display:block}.member-page{--ink:#332d2c;--muted:#7d716d;--line:rgba(78,57,52,.12);--paper:#fffdf8;--plum:#714d73;--cream:#f7f0e5;display:grid;gap:15px;max-width:1380px;margin:0 auto;padding:24px 26px 60px;color:var(--ink)}.eyebrow{margin:0;color:var(--plum);font-size:.61rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.member-hero{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.55fr);gap:28px;padding:34px 36px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(125deg,#fffdf8,#fbf4e9 62%,#f1e6ed);box-shadow:0 20px 58px rgba(62,45,42,.05)}.welcome{display:block;margin-top:10px;color:#8f7e78;font-size:.72rem}.member-hero h1{margin:6px 0 7px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2.5rem,5vw,4.4rem);font-weight:500;letter-spacing:-.05em}.member-hero>div>p:not(.eyebrow){margin:0;color:var(--muted);font-size:.78rem}.hero-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.hero-tags span{padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.74);font-size:.59rem;box-shadow:0 0 0 1px var(--line)}.member-hero aside{display:grid;align-content:center;padding:20px;border-left:3px solid #b28f70;background:rgba(255,255,255,.55)}.member-hero aside small{color:#95837c;font-size:.59rem;text-transform:uppercase}.member-hero aside strong{margin:7px 0 2px;font-family:Georgia,'Times New Roman',serif;font-size:1.7rem;font-weight:500}.member-hero aside>span{font-size:.72rem}.member-hero aside p{margin:6px 0 0;color:var(--muted);font-size:.6rem}.progress{height:6px;margin-top:14px;border-radius:999px;background:#e9dfd8;overflow:hidden}.progress i{display:block;height:100%;background:linear-gradient(90deg,#b18a66,var(--plum))}.member-tabs{display:flex;gap:4px;padding:5px;border-bottom:1px solid var(--line);overflow:auto}.member-tabs button{padding:10px 13px;border:0;border-radius:9px;background:transparent;color:#7c716d;font-size:.68rem;font-weight:780;cursor:pointer;white-space:nowrap}.member-tabs button.active{background:#372f2e;color:#fff}.paper{border:1px solid var(--line);border-radius:18px;background:var(--paper);box-shadow:0 8px 26px rgba(65,45,42,.025)}.week-layout,.formation-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(290px,.55fr);gap:13px}.main-week{padding:26px}.main-week h2,.section-heading h2{margin:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:1.8rem;font-weight:500}.big-idea{max-width:740px;margin:0;color:var(--muted);font-size:.76rem;line-height:1.6}.main-week blockquote{margin:20px 0;padding:15px 18px;border-left:3px solid #b28f70;background:#faf4ea;color:#5e514c;font-family:Georgia,'Times New Roman',serif;font-size:1rem;line-height:1.5}.resource{display:grid;gap:3px;margin:14px 0;padding:13px;border-radius:10px;background:#f8f2e8}.resource span{color:#98733f;font-size:.56rem;font-weight:850;text-transform:uppercase}.resource strong{font-size:.72rem}.resource small{color:var(--muted);font-size:.6rem}.practice{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;margin-top:16px;padding:17px;border-radius:12px;background:#f5ebf3}.practice.complete{background:#edf4ee}.practice>div{display:grid;gap:4px}.practice span{color:var(--plum);font-size:.57rem;font-weight:850;text-transform:uppercase}.practice strong{font-size:.74rem;line-height:1.45}.practice p{margin:0;color:var(--muted);font-size:.62rem}.practice button,.response-actions button,.composer button,.catchup button{min-height:38px;padding:0 12px;border:0;border-radius:8px;background:var(--plum);color:#fff;font-size:.63rem;font-weight:800;cursor:pointer}.practice button:disabled{background:#dfeae2;color:#447054}.response-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.response-actions .quiet{border:1px solid var(--line);background:#fff;color:var(--plum)}.side-stack{display:grid;gap:13px;align-content:start}.side-stack>.paper{padding:20px}.side-stack h3{margin:7px 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:1.15rem;font-weight:500}.group-life>div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--line)}.group-life span{color:#958985;font-size:.58rem}.group-life strong{font-size:.64rem}.next-step p{margin:5px 0 0;color:var(--muted);font-size:.65rem}.catchup{padding:20px}.catchup>h3{font-family:Georgia,'Times New Roman',serif;font-weight:500}.catchup>p{color:var(--muted);font-size:.68rem}.catchup>div{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:12px 0;border-top:1px solid var(--line)}.catchup>div>span{display:grid;gap:3px}.catchup small{color:var(--muted);font-size:.59rem}.section-heading{padding:12px 2px 3px}.section-heading p:not(.eyebrow){max-width:760px;margin:0;color:var(--muted);font-size:.72rem;line-height:1.55}.timeline{padding:19px}.timeline>div{display:grid;grid-template-columns:34px minmax(0,1fr) minmax(180px,.5fr);gap:11px;align-items:center;padding:12px 0;border-top:1px solid var(--line)}.timeline>div:first-child{border-top:0}.timeline>div>span{display:grid;width:29px;height:29px;border-radius:50%;place-items:center;background:#eee6df;color:#7f6d66;font-size:.58rem;font-weight:850}.timeline>div[data-state='Complete']>span{background:#e8f2ea;color:#47725a}.timeline>div[data-state='Current']>span{background:#eee4ed;color:var(--plum)}.timeline section{display:grid;gap:2px}.timeline small{color:#958a86;font-size:.56rem}.timeline strong{font-size:.71rem}.timeline p{margin:0;color:var(--muted);font-size:.61rem}.timeline b{font-size:.59rem;color:#756966;line-height:1.4}.outcomes>div{display:flex;gap:8px;padding:9px 0;border-top:1px solid var(--line)}.outcomes>div span{color:var(--plum)}.outcomes>div strong{font-size:.64rem}.response-grid,.stories,.journey-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.composer{display:grid;gap:8px;padding:20px}.composer.focused{box-shadow:inset 0 3px 0 var(--plum)}.composer>span{color:var(--plum);font-size:.56rem;font-weight:850;text-transform:uppercase}.composer h3{margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:500}.composer textarea{padding:10px;border:1px solid var(--line);border-radius:8px;resize:vertical}.stories>.paper{padding:17px}.stories>.paper>span{color:#958985;font-size:.58rem;text-transform:uppercase}.stories>.paper>strong{display:block;margin:5px 0;font-family:Georgia,'Times New Roman',serif;font-size:1.5rem;font-weight:500}.stories>.paper>p{padding:9px 0;margin:0;border-top:1px solid var(--line);color:var(--muted);font-size:.61rem;line-height:1.5}.leadership-path{display:grid;grid-template-columns:repeat(8,minmax(100px,1fr));gap:5px;padding:14px;overflow:auto}.leadership-path>div{display:grid;min-height:90px;padding:10px;border:1px solid var(--line);border-radius:10px;background:#faf7f2}.leadership-path>div span{display:grid;width:27px;height:27px;border-radius:50%;place-items:center;background:#e9e1db;color:#87756d;font-size:.57rem;font-weight:850}.leadership-path>div strong{margin-top:auto;color:#776d69;font-size:.59rem}.leadership-path>div.reached{background:#f8f0f6}.leadership-path>div.reached span{background:var(--plum);color:#fff}.leadership-path>div.current{box-shadow:inset 0 3px 0 var(--plum)}.journey-grid>.paper{padding:20px}.journey-grid h3{margin:7px 0;font-family:Georgia,'Times New Roman',serif;font-size:1rem;font-weight:500}.history{padding:20px}.history>div{display:grid;grid-template-columns:90px minmax(160px,.8fr) minmax(220px,1.2fr) 150px;gap:12px;align-items:center;padding:11px 0;border-top:1px solid var(--line)}.history span,.history p{margin:0;color:var(--muted);font-size:.6rem}.history strong,.history b{font-size:.63rem}.exit-link{width:max-content;color:var(--plum);font-size:.67rem;font-weight:800;text-decoration:none}@media(max-width:1000px){.member-hero,.week-layout,.formation-layout{grid-template-columns:1fr}.member-hero aside{border-left:0;border-top:3px solid #b28f70}.response-grid,.stories,.journey-grid{grid-template-columns:1fr}}@media(max-width:700px){.member-page{padding:14px 11px 44px}.member-hero{padding:24px 20px}.practice,.timeline>div,.history>div{grid-template-columns:1fr}.catchup>div{align-items:stretch;flex-direction:column}.leadership-path{grid-template-columns:repeat(8,120px)}}
  `],
})
export class DwcMyGroupContextComponent {
  readonly tabs = [
    { key: 'week' as const, label: 'This Week' },
    { key: 'formation' as const, label: 'My Formation' },
    { key: 'responses' as const, label: 'Reflection & Prayer' },
    { key: 'journey' as const, label: 'My Journey' },
  ];
  readonly activeTab = signal<MemberTab>('week');
  readonly responseFocus = signal<'reflection' | 'prayer' | 'testimony' | null>(null);
  reflectionDraft = '';
  prayerDraft = '';
  testimonyDraft = '';

  readonly group = computed(() => this.state.selectedGroup());
  readonly member = computed(() => {
    const members = this.state.selectedMembers();
    return members.find(item => item.id === 'michael')
      ?? members.find(item => item.name !== this.group().leader)
      ?? members[0]
      ?? this.state.myMember();
  });
  readonly track = computed(() => this.state.trackById(this.group().trackId) ?? this.state.tracks()[0]);
  readonly currentSession = computed(() => this.track().sessions.find(session => !this.group().completedSessionIds.includes(session.id)) ?? this.track().sessions[this.track().sessions.length - 1]);
  readonly progressPercent = computed(() => Math.round(this.group().completedSessionIds.length * 100 / Math.max(1, this.track().sessions.length)));
  readonly academyMedia = computed(() => this.currentSession().media.find(media => media.source === 'Kingdom Academy' && media.type === 'video'));

  constructor(readonly state: DwcFormationStateService, route: ActivatedRoute) {
    route.queryParamMap.subscribe(params => {
      const groupId = params.get('group');
      if (groupId && this.state.groups().some(group => group.id === groupId)) this.state.selectGroup(groupId);
    });
  }

  firstName(): string { return this.member().name.split(/\s+/)[0] || 'there'; }
  groupHref(path: string): string { return `${path}?group=${encodeURIComponent(this.state.selectedGroupId())}`; }
  sessionState(session: FormationSession): 'Complete' | 'Current' | 'Upcoming' { if (this.group().completedSessionIds.includes(session.id)) return 'Complete'; return this.currentSession().id === session.id ? 'Current' : 'Upcoming'; }
  sessionIcon(session: FormationSession): string { const value = this.sessionState(session); return value === 'Complete' ? '✓' : value === 'Current' ? '→' : String(session.week); }
  openResponse(kind: 'reflection' | 'prayer' | 'testimony'): void { this.responseFocus.set(kind); this.activeTab.set('responses'); }
  completePractice(): void { this.state.completeMemberPractice(this.member().id); }
  saveReflection(): void { this.state.addReflection(this.member().id, this.reflectionDraft); this.reflectionDraft = ''; this.responseFocus.set(null); }
  savePrayer(): void { this.state.addPrayerResponse(this.member().id, this.prayerDraft); this.prayerDraft = ''; this.responseFocus.set(null); }
  saveTestimony(): void { this.state.addTestimony(this.member().id, this.testimonyDraft); this.testimonyDraft = ''; this.responseFocus.set(null); }
  findSession(sessionId: string): FormationSession | undefined { for (const track of this.state.tracks()) { const session = track.sessions.find(item => item.id === sessionId); if (session) return session; } return undefined; }
  completeCatchUp(sessionId: string): void { this.state.completeCatchUp(this.member().id, sessionId); }
  stageReached(stage: LeadershipStage): boolean { const stages = this.state.leadershipStages(); return stages.indexOf(stage) <= stages.indexOf(this.member().leadershipStage); }
}
