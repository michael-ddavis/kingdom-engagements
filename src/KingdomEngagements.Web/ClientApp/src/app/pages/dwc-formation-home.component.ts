import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DwcFormationStateService, FormationMember } from '../core/dwc-formation-state.service';

@Component({
  selector: 'app-dwc-formation-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="formation-home">
      <header class="welcome-hero">
        <div>
          <p class="eyebrow">Divine Empowerment Groups · Leader view</p>
          <span class="welcome-line">{{ state.selectedGroup().semester }} · {{ state.selectedGroup().name }}</span>
          <h1>Lead the people in front of you.</h1>
          <p class="hero-copy">Everything you need for this week is here. Prepare the gathering, notice the people, and keep formation moving without managing the whole ministry at once.</p>
        </div>
        <aside class="group-card">
          <small>Led by</small>
          <strong>{{ state.selectedGroup().leader }}</strong>
          <span>{{ state.selectedGroup().meeting }}</span>
          <span>{{ state.selectedGroup().location }}</span>
          <div class="group-meta">
            <b>{{ state.selectedGroup().members }} people</b>
            <b>{{ state.selectedGroup().pace }}</b>
          </div>
        </aside>
      </header>

      <section class="group-switcher">
        <label>
          <span>Viewing group</span>
          <select [ngModel]="state.selectedGroupId()" (ngModelChange)="state.selectGroup($event)">
            @for (group of state.groups(); track group.id) {
              <option [value]="group.id">{{ group.name }}</option>
            }
          </select>
        </label>
        <div class="view-links">
          <a href="/organization/dwc/my-group">See the member experience</a>
          <a class="quiet-link" href="/organization/dwc/formation/tools">Ministry tools</a>
        </div>
      </section>

      <section class="focus-grid">
        <article class="focus-card this-week">
          <p class="eyebrow">This week</p>
          <span class="week-number">Week {{ state.currentSession().week }}</span>
          <h2>{{ state.currentSession().title }}</h2>
          <p>{{ state.currentSession().bigIdea }}</p>
          <div class="scripture-line">
            <span>Scripture</span>
            <strong>{{ state.currentSession().scripture }}</strong>
          </div>
          <a class="primary-action" href="/organization/dwc/formation/tools">Prepare this gathering</a>
        </article>

        <article class="focus-card people-card">
          <p class="eyebrow">Your people</p>
          <h2>{{ state.selectedMembers().length }} people to shepherd</h2>
          <p>Start with the people who may need encouragement, conversation, or an intentional next step.</p>
          <div class="people-summary">
            <span><strong>{{ state.followupCount() }}</strong><small>need follow-up</small></span>
            <span><strong>{{ emergingInGroup().length }}</strong><small>showing leadership</small></span>
          </div>
          <a href="/organization/dwc/formation/tools">See formation records</a>
        </article>

        <article class="focus-card journey-card">
          <p class="eyebrow">The journey</p>
          <h2>{{ state.selectedTrack().title }}</h2>
          <p>{{ state.selectedTrack().subtitle }}</p>
          <div class="journey-progress" aria-label="Group formation progress">
            <i [style.width.%]="state.progressPercent()"></i>
          </div>
          <span class="progress-copy">{{ state.completedCount() }} of {{ state.selectedTrack().sessions.length }} gatherings complete</span>
          <a href="/organization/dwc/formation/tools">View the full pathway</a>
        </article>
      </section>

      <section class="weekly-rhythm">
        <header>
          <div>
            <p class="eyebrow">A simple rhythm</p>
            <h2>Prepare. Gather. Practice. Follow up.</h2>
            <p>The system can be deep. The weekly experience should stay simple.</p>
          </div>
        </header>
        <div class="rhythm-grid">
          <article><span>01</span><strong>Prepare</strong><p>Pray through the people, review Scripture, and choose the questions that fit this room.</p></article>
          <article><span>02</span><strong>Gather</strong><p>Open Scripture, make room for honest conversation, and respond to God together.</p></article>
          <article><span>03</span><strong>Practice</strong><p>Give the group one concrete way to live what they are learning before the next meeting.</p></article>
          <article><span>04</span><strong>Follow up</strong><p>Notice absences, prayer needs, emerging leaders, and people who need a personal conversation.</p></article>
        </div>
      </section>

      <div class="relational-grid">
        <section class="warm-panel people-to-notice">
          <header>
            <div><p class="eyebrow">People to notice</p><h2>Who deserves a little more attention this week?</h2></div>
            <a href="/organization/dwc/formation/tools">All people</a>
          </header>
          @if (peopleToNotice().length) {
            @for (member of peopleToNotice(); track member.id) {
              <article class="person-line">
                <span class="avatar">{{ initials(member.name) }}</span>
                <div>
                  <strong>{{ member.name }}</strong>
                  <p>{{ memberNotice(member) }}</p>
                </div>
                <b>{{ member.status }}</b>
              </article>
            }
          } @else {
            <p class="empty-copy">No one is currently flagged for extra follow-up. Keep listening and stay relational.</p>
          }
        </section>

        <section class="warm-panel story-panel">
          <p class="eyebrow">What God is doing</p>
          <h2>Formation is more than attendance.</h2>
          <blockquote>“We are looking for obedience, spiritual friendship, service, testimony, and people beginning to carry others.”</blockquote>
          <div class="story-notes">
            <span>{{ reflectionCount() }} reflections captured</span>
            <span>{{ testimonyCount() }} testimonies remembered</span>
            <span>{{ milestoneCount() }} growth milestones</span>
          </div>
          <a href="/organization/dwc/formation/tools">Open deeper ministry tools</a>
        </section>
      </div>

      <section class="tools-note">
        <div>
          <p class="eyebrow">When you need more</p>
          <h2>The deeper system is still here.</h2>
          <p>Curriculum tracks, semester review, catch-up, commissioning, leadership pipeline and discipleship reporting live in Ministry Tools. They do not need to be part of the leader's normal weekly view.</p>
        </div>
        <a href="/organization/dwc/formation/tools">Open Ministry Tools →</a>
      </section>
    </section>
  `,
  styles: [`
    :host{display:block}.formation-home{--ink:#302b2b;--muted:#786f6d;--line:rgba(76,56,52,.12);--paper:#fffdf8;--cream:#f7f1e6;--plum:#6f4a73;--plum-soft:#efe5ee;--gold:#a47b45;display:grid;gap:16px;max-width:1380px;margin:0 auto;padding:24px 26px 60px;color:var(--ink)}.eyebrow{margin:0;color:var(--plum);font-size:.62rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.welcome-hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(270px,.5fr);gap:28px;padding:36px 38px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(125deg,#fffdf8 0%,#fbf5ea 60%,#f2e7ed 100%);box-shadow:0 22px 60px rgba(65,45,43,.06)}.welcome-line{display:block;margin-top:12px;color:#8a7876;font-size:.72rem}.welcome-hero h1{max-width:760px;margin:7px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2.4rem,5vw,4.6rem);font-weight:500;line-height:.98;letter-spacing:-.045em}.hero-copy{max-width:760px;margin:0;color:var(--muted);font-size:.93rem;line-height:1.7}.group-card{display:grid;padding:22px;border-left:3px solid #b39074;border-radius:10px 18px 18px 10px;align-content:center;background:rgba(255,255,255,.6)}.group-card small{color:#93837f;font-size:.63rem;text-transform:uppercase;letter-spacing:.08em}.group-card strong{margin:5px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:1.5rem;font-weight:500}.group-card>span{margin-top:4px;color:#766e6b;font-size:.72rem}.group-meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.group-meta b{padding:6px 9px;border-radius:999px;background:#fff;color:#695e5b;font-size:.62rem;font-weight:750;box-shadow:0 0 0 1px rgba(76,56,52,.08)}.group-switcher{display:flex;min-height:64px;padding:10px 12px;border-bottom:1px solid var(--line);align-items:center;justify-content:space-between;gap:16px}.group-switcher label{display:flex;align-items:center;gap:10px}.group-switcher label>span{color:#8a7f7b;font-size:.64rem;font-weight:750}.group-switcher select{min-width:220px;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink);font-weight:700}.view-links{display:flex;align-items:center;gap:8px}.view-links a,.focus-card a,.warm-panel a,.tools-note a{color:var(--plum);font-size:.7rem;font-weight:800;text-decoration:none}.view-links .quiet-link{color:#807671}.focus-grid{display:grid;grid-template-columns:1.15fr .9fr .9fr;gap:14px}.focus-card{min-height:270px;padding:24px;border:1px solid var(--line);border-radius:18px;background:var(--paper);box-shadow:0 10px 30px rgba(62,45,42,.035)}.focus-card h2{margin:7px 0 9px;font-family:Georgia,'Times New Roman',serif;font-size:1.7rem;font-weight:500;line-height:1.08}.focus-card>p:not(.eyebrow){margin:0;color:var(--muted);font-size:.76rem;line-height:1.6}.this-week{background:linear-gradient(155deg,#fffdf8,#faf1e6)}.week-number{display:block;margin-top:16px;color:#9a806b;font-size:.66rem;font-weight:800}.scripture-line{display:grid;gap:3px;margin:19px 0;padding:13px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.scripture-line span{color:#9a8a84;font-size:.59rem;text-transform:uppercase;letter-spacing:.08em}.scripture-line strong{font-size:.72rem;line-height:1.45}.primary-action{display:inline-flex;min-height:40px;padding:0 14px;border-radius:9px;align-items:center;color:#fff!important;background:var(--plum)}.people-summary{display:flex;gap:22px;margin:25px 0}.people-summary span{display:grid}.people-summary strong{font-family:Georgia,'Times New Roman',serif;font-size:2.2rem;font-weight:500}.people-summary small{color:#8e837f;font-size:.62rem}.journey-progress{height:7px;margin:27px 0 8px;border-radius:999px;background:#eee7df;overflow:hidden}.journey-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#a37b58,var(--plum))}.progress-copy{display:block;margin-bottom:22px;color:#8b7f79;font-size:.64rem}.weekly-rhythm{padding:30px 32px;border-radius:22px;background:#342e2d;color:#fff}.weekly-rhythm header h2{margin:5px 0;font-family:Georgia,'Times New Roman',serif;font-size:1.8rem;font-weight:500}.weekly-rhythm header p:not(.eyebrow){margin:0;color:#cfc5c1;font-size:.76rem}.weekly-rhythm .eyebrow{color:#d6b896}.rhythm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:24px}.rhythm-grid article{display:grid;gap:7px;padding-top:14px;border-top:1px solid rgba(255,255,255,.16)}.rhythm-grid article>span{color:#d6b896;font-size:.64rem;font-weight:850}.rhythm-grid strong{font-family:Georgia,'Times New Roman',serif;font-size:1.22rem;font-weight:500}.rhythm-grid p{margin:0;color:#d7cfcb;font-size:.7rem;line-height:1.55}.relational-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.warm-panel{padding:25px;border:1px solid var(--line);border-radius:18px;background:var(--paper)}.warm-panel>header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:10px}.warm-panel h2{margin:5px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:1.55rem;font-weight:500;line-height:1.15}.person-line{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px 0;border-top:1px solid var(--line)}.avatar{display:grid;width:38px;height:38px;border-radius:50%;place-items:center;background:#eee3df;color:#715d58;font-size:.66rem;font-weight:850}.person-line strong{font-size:.76rem}.person-line p{margin:3px 0 0;color:var(--muted);font-size:.68rem;line-height:1.45}.person-line>b{padding:5px 8px;border-radius:999px;background:#f3ebe3;color:#836750;font-size:.58rem}.empty-copy{color:var(--muted);font-size:.75rem;line-height:1.6}.story-panel{background:linear-gradient(150deg,#fffdf8,#f7eee6)}.story-panel blockquote{margin:18px 0;padding:0 0 0 18px;border-left:2px solid #b39074;color:#5e514e;font-family:Georgia,'Times New Roman',serif;font-size:1.08rem;line-height:1.55}.story-notes{display:grid;gap:7px;margin:18px 0 22px}.story-notes span{color:#776b67;font-size:.69rem}.tools-note{display:flex;padding:24px 26px;border-top:1px solid var(--line);align-items:center;justify-content:space-between;gap:24px}.tools-note h2{margin:5px 0;font-family:Georgia,'Times New Roman',serif;font-size:1.4rem;font-weight:500}.tools-note p:not(.eyebrow){max-width:820px;margin:0;color:var(--muted);font-size:.72rem;line-height:1.55}.tools-note>a{flex:0 0 auto}@media(max-width:1050px){.focus-grid{grid-template-columns:1fr 1fr}.this-week{grid-column:1/-1}.rhythm-grid{grid-template-columns:1fr 1fr}.relational-grid{grid-template-columns:1fr}}@media(max-width:760px){.formation-home{padding:14px 12px 44px}.welcome-hero{grid-template-columns:1fr;padding:25px 22px}.group-card{border-left:0;border-top:3px solid #b39074}.group-switcher,.tools-note{align-items:stretch;flex-direction:column}.group-switcher label{align-items:stretch;flex-direction:column}.group-switcher select{width:100%}.view-links{justify-content:space-between}.focus-grid,.rhythm-grid{grid-template-columns:1fr}.this-week{grid-column:auto}.weekly-rhythm{padding:24px 21px}.person-line{grid-template-columns:auto 1fr}.person-line>b{grid-column:2}.tools-note{display:grid}}
  `],
})
export class DwcFormationHomeComponent {
  readonly emergingInGroup = computed(() =>
    this.state.selectedMembers().filter(member =>
      member.status === 'Emerging leader' ||
      ['Apprentice leader', 'Co-leader', 'Group leader', 'Multiplying leader', 'Cluster leader'].includes(member.leadershipStage),
    ),
  );

  readonly peopleToNotice = computed(() => {
    const members = this.state.selectedMembers();
    const priority = members.filter(member => member.status === 'Needs follow-up');
    const emerging = members.filter(member => member.status === 'Emerging leader' && !priority.some(item => item.id === member.id));
    return [...priority, ...emerging].slice(0, 4);
  });

  readonly reflectionCount = computed(() =>
    this.state.selectedMembers().reduce((total, member) => total + member.reflections.length, 0),
  );
  readonly testimonyCount = computed(() =>
    this.state.selectedMembers().reduce((total, member) => total + member.testimonies.length, 0),
  );
  readonly milestoneCount = computed(() =>
    this.state.selectedMembers().reduce((total, member) => total + member.milestones.length, 0),
  );

  constructor(readonly state: DwcFormationStateService) {}

  memberNotice(member: FormationMember): string {
    if (member.status === 'Needs follow-up') {
      if (member.missedSessionIds.length) return `Missed ${member.missedSessionIds.length} gathering${member.missedSessionIds.length === 1 ? '' : 's'} · a personal check-in would help.`;
      return 'A personal leader conversation would help before the next gathering.';
    }
    return `${member.leadershipStage} · ${member.nextStep}`;
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  }
}
