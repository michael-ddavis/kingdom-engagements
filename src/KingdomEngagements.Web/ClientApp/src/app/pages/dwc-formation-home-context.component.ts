import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DwcFormationStateService, FormationMember } from '../core/dwc-formation-state.service';

@Component({
  selector: 'app-dwc-formation-home-context',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="formation-home">
      <header class="welcome-hero">
        <div>
          <p class="eyebrow">Divine Empowerment Groups · Leader View</p>
          <span class="welcome-line">{{ state.selectedGroup().semester }} · {{ state.selectedGroup().name }}</span>
          <h1>Lead the people in front of you.</h1>
          <p>Prepare this week's gathering, notice the people, and keep the journey moving. Deeper ministry tools stay one click away when you need them.</p>
        </div>
        <aside>
          <small>Led by</small><strong>{{ state.selectedGroup().leader }}</strong><span>{{ state.selectedGroup().meeting }}</span><span>{{ state.selectedGroup().location }}</span>
          <div><b>{{ state.selectedGroup().members }} people</b><b>{{ state.selectedGroup().pace }}</b></div>
        </aside>
      </header>

      <section class="group-bar">
        <label><span>Working in</span><select [ngModel]="state.selectedGroupId()" (ngModelChange)="changeGroup($event)">@for (group of state.groups(); track group.id) { <option [value]="group.id">{{ group.name }}</option> }</select></label>
        <div class="group-links"><a [href]="memberHref()">Member preview</a><a class="quiet" [href]="toolsHref('curriculum')">Ministry Tools</a></div>
      </section>

      <section class="focus-grid">
        <article class="focus-card this-week">
          <p class="eyebrow">This week</p><span class="week">Week {{ state.currentSession().week }}</span><h2>{{ state.currentSession().title }}</h2><p>{{ state.currentSession().bigIdea }}</p>
          <div class="scripture"><span>Scripture</span><strong>{{ state.currentSession().scripture }}</strong></div>
          <a class="primary" [href]="toolsHref('curriculum')">Prepare this gathering</a>
        </article>

        <article class="focus-card">
          <p class="eyebrow">Your people</p><h2>{{ state.selectedMembers().length }} people to shepherd</h2><p>Start with whoever needs encouragement, conversation, catch-up, or a clear next step.</p>
          <div class="people-summary"><span><strong>{{ state.followupCount() }}</strong><small>need follow-up</small></span><span><strong>{{ emergingInGroup().length }}</strong><small>showing leadership</small></span></div>
          <a [href]="toolsHref('people')">See formation records</a>
        </article>

        <article class="focus-card">
          <p class="eyebrow">The journey</p><h2>{{ state.selectedTrack().title }}</h2><p>{{ state.selectedTrack().subtitle }}</p>
          <div class="progress"><i [style.width.%]="state.progressPercent()"></i></div><span class="progress-copy">{{ state.completedCount() }} of {{ state.selectedTrack().sessions.length }} gatherings complete</span>
          <a [href]="toolsHref('curriculum')">View the pathway</a>
        </article>
      </section>

      <section class="weekly-rhythm">
        <div><p class="eyebrow">A simple rhythm</p><h2>Prepare. Gather. Practice. Follow up.</h2><p>The system can be deep. Leading your group should still feel simple.</p></div>
        <div class="rhythm"><article><span>01</span><strong>Prepare</strong><p>Pray through the people and prepare Scripture and questions.</p></article><article><span>02</span><strong>Gather</strong><p>Open the Word, talk honestly, and respond to God together.</p></article><article><span>03</span><strong>Practice</strong><p>Carry one concrete act of formation into ordinary life.</p></article><article><span>04</span><strong>Follow up</strong><p>Notice absences, prayer needs, and people who need a conversation.</p></article></div>
      </section>

      <div class="relational-grid">
        <section class="warm-panel">
          <header><div><p class="eyebrow">People to notice</p><h2>Who deserves a little more attention?</h2></div><a [href]="toolsHref('people')">All people</a></header>
          @if (peopleToNotice().length) { @for (member of peopleToNotice(); track member.id) { <article class="person"><span class="avatar">{{ initials(member.name) }}</span><div><strong>{{ member.name }}</strong><p>{{ memberNotice(member) }}</p></div><b>{{ member.status }}</b></article> } } @else { <p class="empty">No one is currently flagged for extra follow-up.</p> }
        </section>

        <section class="warm-panel story-panel">
          <p class="eyebrow">What God is doing</p><h2>Formation is more than attendance.</h2><blockquote>“Look for obedience, spiritual friendship, service, testimony, and people beginning to carry others.”</blockquote>
          <div class="story-notes"><span>{{ reflectionCount() }} reflections</span><span>{{ testimonyCount() }} testimonies</span><span>{{ milestoneCount() }} growth milestones</span></div>
          <div class="story-links"><a [href]="toolsHref('leaders')">Leadership development</a><a [href]="toolsHref('semester')">Semester & insights</a></div>
        </section>
      </div>
    </section>
  `,
  styles: [`
    :host{display:block}.formation-home{--ink:#302b2b;--muted:#786f6d;--line:rgba(76,56,52,.12);--paper:#fffdf8;--plum:#6f4a73;display:grid;gap:16px;max-width:1380px;margin:0 auto;padding:24px 26px 60px;color:var(--ink)}.eyebrow{margin:0;color:var(--plum);font-size:.61rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.welcome-hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(270px,.5fr);gap:28px;padding:36px 38px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(125deg,#fffdf8,#fbf5ea 60%,#f2e7ed);box-shadow:0 22px 60px rgba(65,45,43,.05)}.welcome-line{display:block;margin-top:12px;color:#8a7876;font-size:.72rem}.welcome-hero h1{margin:7px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2.4rem,5vw,4.5rem);font-weight:500;line-height:.98;letter-spacing:-.045em}.welcome-hero>div>p:last-child{max-width:760px;margin:0;color:var(--muted);font-size:.88rem;line-height:1.7}.welcome-hero aside{display:grid;padding:22px;border-left:3px solid #b39074;align-content:center;background:rgba(255,255,255,.55)}.welcome-hero aside small{color:#93837f;font-size:.6rem;text-transform:uppercase}.welcome-hero aside strong{margin:5px 0 9px;font-family:Georgia,'Times New Roman',serif;font-size:1.45rem;font-weight:500}.welcome-hero aside>span{margin-top:3px;color:#766e6b;font-size:.69rem}.welcome-hero aside>div{display:flex;gap:7px;margin-top:15px}.welcome-hero aside b{padding:5px 8px;border-radius:999px;background:#fff;font-size:.59rem}.group-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 12px;border-bottom:1px solid var(--line)}.group-bar label{display:flex;align-items:center;gap:10px}.group-bar label span{color:#8a7f7b;font-size:.62rem;font-weight:800}.group-bar select{min-width:220px;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:var(--paper);font-weight:700}.group-links{display:flex;gap:12px}.group-links a,.focus-card a,.warm-panel a{color:var(--plum);font-size:.68rem;font-weight:800;text-decoration:none}.group-links .quiet{color:#807671}.focus-grid{display:grid;grid-template-columns:1.15fr .9fr .9fr;gap:14px}.focus-card{min-height:260px;padding:24px;border:1px solid var(--line);border-radius:18px;background:var(--paper);box-shadow:0 10px 30px rgba(62,45,42,.03)}.focus-card h2,.warm-panel h2{margin:7px 0 9px;font-family:Georgia,'Times New Roman',serif;font-size:1.65rem;font-weight:500;line-height:1.1}.focus-card>p:not(.eyebrow){margin:0;color:var(--muted);font-size:.74rem;line-height:1.58}.this-week{background:linear-gradient(155deg,#fffdf8,#faf1e6)}.week{display:block;margin-top:16px;color:#9a806b;font-size:.64rem;font-weight:800}.scripture{display:grid;gap:3px;margin:18px 0;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.scripture span{color:#9a8a84;font-size:.57rem;text-transform:uppercase}.scripture strong{font-size:.7rem}.primary{display:inline-flex;min-height:39px;padding:0 13px;border-radius:8px;align-items:center;color:#fff!important;background:var(--plum)}.people-summary{display:flex;gap:24px;margin:24px 0}.people-summary span{display:grid}.people-summary strong{font-family:Georgia,'Times New Roman',serif;font-size:2rem;font-weight:500}.people-summary small{color:#8e837f;font-size:.59rem}.progress{height:7px;margin:27px 0 8px;border-radius:999px;background:#eee7df;overflow:hidden}.progress i{display:block;height:100%;background:linear-gradient(90deg,#a37b58,var(--plum))}.progress-copy{display:block;margin-bottom:22px;color:#8b7f79;font-size:.61rem}.weekly-rhythm{padding:28px 30px;border-radius:22px;background:#342e2d;color:#fff}.weekly-rhythm h2{margin:5px 0;font-family:Georgia,'Times New Roman',serif;font-size:1.75rem;font-weight:500}.weekly-rhythm>div:first-child>p:not(.eyebrow){margin:0;color:#cfc5c1;font-size:.72rem}.weekly-rhythm .eyebrow{color:#d6b896}.rhythm{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:22px}.rhythm article{display:grid;gap:6px;padding-top:13px;border-top:1px solid rgba(255,255,255,.16)}.rhythm span{color:#d6b896;font-size:.61rem;font-weight:850}.rhythm strong{font-family:Georgia,'Times New Roman',serif;font-size:1.12rem;font-weight:500}.rhythm p{margin:0;color:#d7cfcb;font-size:.67rem;line-height:1.5}.relational-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.warm-panel{padding:24px;border:1px solid var(--line);border-radius:18px;background:var(--paper)}.warm-panel>header{display:flex;justify-content:space-between;gap:14px}.person{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:13px 0;border-top:1px solid var(--line)}.avatar{display:grid;width:38px;height:38px;border-radius:50%;place-items:center;background:#eee3df;color:#715d58;font-size:.63rem;font-weight:850}.person strong{font-size:.73rem}.person p{margin:3px 0 0;color:var(--muted);font-size:.65rem}.person>b{padding:5px 8px;border-radius:999px;background:#f3ebe3;color:#836750;font-size:.56rem}.empty{color:var(--muted);font-size:.72rem}.story-panel{background:linear-gradient(150deg,#fffdf8,#f7eee6)}.story-panel blockquote{margin:18px 0;padding-left:17px;border-left:2px solid #b39074;color:#5e514e;font-family:Georgia,'Times New Roman',serif;font-size:1.05rem;line-height:1.5}.story-notes{display:flex;flex-wrap:wrap;gap:7px;margin:18px 0}.story-notes span{padding:5px 8px;border-radius:999px;background:#fff;color:#776b67;font-size:.61rem}.story-links{display:flex;gap:14px}@media(max-width:1000px){.focus-grid{grid-template-columns:1fr 1fr}.this-week{grid-column:1/-1}.rhythm{grid-template-columns:1fr 1fr}.relational-grid{grid-template-columns:1fr}}@media(max-width:720px){.formation-home{padding:14px 12px 44px}.welcome-hero{grid-template-columns:1fr;padding:24px 21px}.welcome-hero aside{border-left:0;border-top:3px solid #b39074}.group-bar{align-items:stretch;flex-direction:column}.group-bar label{align-items:stretch;flex-direction:column}.group-bar select{width:100%}.group-links{justify-content:space-between}.focus-grid,.rhythm{grid-template-columns:1fr}.this-week{grid-column:auto}.person{grid-template-columns:auto 1fr}.person>b{grid-column:2}}
  `],
})
export class DwcFormationHomeContextComponent {
  readonly emergingInGroup = computed(() => this.state.selectedMembers().filter(member => member.status === 'Emerging leader' || ['Apprentice leader','Co-leader','Group leader','Multiplying leader','Cluster leader'].includes(member.leadershipStage)));
  readonly peopleToNotice = computed(() => { const members = this.state.selectedMembers(); const priority = members.filter(member => member.status === 'Needs follow-up'); const emerging = members.filter(member => member.status === 'Emerging leader' && !priority.some(item => item.id === member.id)); return [...priority, ...emerging].slice(0, 4); });
  readonly reflectionCount = computed(() => this.state.selectedMembers().reduce((total, member) => total + member.reflections.length, 0));
  readonly testimonyCount = computed(() => this.state.selectedMembers().reduce((total, member) => total + member.testimonies.length, 0));
  readonly milestoneCount = computed(() => this.state.selectedMembers().reduce((total, member) => total + member.milestones.length, 0));

  constructor(readonly state: DwcFormationStateService, private readonly route: ActivatedRoute, private readonly router: Router) {
    this.route.queryParamMap.subscribe(params => { const groupId = params.get('group'); if (groupId && this.state.groups().some(group => group.id === groupId)) this.state.selectGroup(groupId); });
  }
  changeGroup(groupId: string): void { this.state.selectGroup(groupId); this.router.navigate([], { relativeTo: this.route, queryParams: { group: groupId }, queryParamsHandling: 'merge', replaceUrl: true }); }
  memberHref(): string { return `/organization/dwc/my-group?group=${encodeURIComponent(this.state.selectedGroupId())}`; }
  toolsHref(tab: 'curriculum'|'people'|'leaders'|'semester'): string { return `/organization/dwc/formation/tools?group=${encodeURIComponent(this.state.selectedGroupId())}&tab=${tab}`; }
  memberNotice(member: FormationMember): string { if (member.status === 'Needs follow-up') return member.missedSessionIds.length ? `Missed ${member.missedSessionIds.length} gathering${member.missedSessionIds.length === 1 ? '' : 's'} · a personal check-in would help.` : 'A personal leader conversation would help before the next gathering.'; return `${member.leadershipStage} · ${member.nextStep}`; }
  initials(name: string): string { return name.split(/\s+/).slice(0,2).map(part => part.charAt(0)).join('').toUpperCase(); }
}
