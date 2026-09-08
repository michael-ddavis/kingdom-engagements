import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  DwcFormationStateService,
  FormationMember,
  FormationSession,
  FormationSource,
  FormationTrack,
  LeadershipStage,
} from '../core/dwc-formation-state.service';

type FormationTab = 'overview' | 'tracks' | 'people' | 'leadership' | 'review' | 'reports';
type DrawerKind = 'session' | 'practice' | 'member' | 'leader' | 'track' | 'academy';

@Component({
  selector: 'app-dwc-formation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="formation-page">
      <header class="formation-hero">
        <div class="formation-hero__copy">
          <p class="eyebrow">Divine World Changers · Divine Empowerment Groups</p>
          <h1>Formation that keeps moving.</h1>
          <p>Build discipleship pathways that connect curriculum to people, practice, service, leadership and multiplication without turning a DEG into a classroom.</p>
          <div class="hero-actions">
            <button type="button" (click)="openSession(state.currentSession())">Prepare next session</button>
            <a class="secondary" href="/organization/dwc/my-group">Preview member experience</a>
          </div>
        </div>
        <aside class="hero-track">
          <span>{{ state.selectedGroup().semester }}</span>
          <small>Current pathway</small>
          <strong>{{ state.selectedTrack().title }}</strong>
          <p>{{ state.selectedTrack().subtitle }}</p>
          <div class="source-line"><b>{{ state.selectedTrack().source }}</b><span>{{ state.progressPercent() }}% complete</span></div>
        </aside>
      </header>

      <nav class="formation-nav" aria-label="DEG formation areas">
        @for (tab of tabs; track tab.key) {
          <button type="button" [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">{{ tab.label }}</button>
        }
      </nav>

      <section class="context-bar">
        <label>
          <span>Viewing group</span>
          <select [ngModel]="state.selectedGroupId()" (ngModelChange)="state.selectGroup($event)">
            @for (group of state.groups(); track group.id) {
              <option [value]="group.id">{{ group.name }}</option>
            }
          </select>
        </label>
        <label>
          <span>Formation pace</span>
          <select [ngModel]="state.selectedGroup().pace" (ngModelChange)="setPace($event)">
            <option value="Weekly">Weekly</option>
            <option value="Every other week">Every other week</option>
            <option value="Flexible">Flexible</option>
          </select>
        </label>
        <div class="context-meta">
          <span>{{ state.selectedGroup().meeting }}</span>
          <span>{{ state.selectedGroup().location }}</span>
          <span>{{ state.selectedGroup().childcare ? 'Childcare available' : 'No childcare listed' }}</span>
        </div>
        <button type="button" class="quiet" (click)="openAcademyBoundary()">Academy connection</button>
      </section>

      @if (activeTab() === 'overview') {
        <section class="metric-grid">
          <article><span>Track progress</span><strong>{{ state.progressPercent() }}%</strong><small>{{ state.completedCount() }} of {{ state.selectedTrack().sessions.length }} sessions</small></article>
          <article><span>Active people</span><strong>{{ state.selectedGroup().members }}</strong><small>{{ state.selectedMembers().length }} demo records shown</small></article>
          <article><span>Relational follow-up</span><strong>{{ state.followupCount() }}</strong><small>people need leader attention</small></article>
          <article><span>Leadership pipeline</span><strong>{{ state.emergingLeaders().length }}</strong><small>emerging or active leaders across DEGs</small></article>
        </section>

        <div class="overview-layout">
          <article class="panel track-panel">
            <header class="panel-head">
              <div><p class="eyebrow">Current track</p><h2>{{ state.selectedTrack().subtitle }}</h2><p>{{ state.selectedTrack().description }}</p></div>
              <span class="source-badge" [attr.data-source]="state.selectedTrack().source">{{ state.selectedTrack().source }}</span>
            </header>
            <div class="progress-line"><span [style.width.%]="state.progressPercent()"></span></div>
            <div class="session-list">
              @for (session of state.selectedTrack().sessions; track session.id) {
                <button type="button" class="session-row" [class.current]="session.id === state.currentSession().id" (click)="openSession(session)">
                  <span class="session-state" [attr.data-state]="sessionState(session)">{{ sessionStateIcon(session) }}</span>
                  <span class="session-copy"><small>Week {{ session.week }}</small><strong>{{ session.title }}</strong><span>{{ session.theme }}</span></span>
                  <span class="session-source">{{ session.media[0]?.source || state.selectedTrack().source }}</span>
                  <span class="session-status">{{ sessionState(session) }}</span>
                </button>
              }
            </div>
          </article>

          <aside class="overview-sidebar">
            <article class="panel next-card">
              <p class="eyebrow">Next gathering</p>
              <span>Week {{ state.currentSession().week }}</span>
              <h2>{{ state.currentSession().title }}</h2>
              <p>{{ state.currentSession().bigIdea }}</p>
              <div class="mini-detail"><span>Scripture</span><strong>{{ state.currentSession().scripture }}</strong></div>
              <div class="mini-detail"><span>Practice</span><strong>{{ state.currentSession().practice }}</strong></div>
              <button type="button" (click)="openSession(state.currentSession())">Open session workspace</button>
            </article>

            <article class="panel readiness-card">
              <p class="eyebrow">Leader preparation</p>
              <h3>Prepare the people and the content.</h3>
              @for (item of leaderReadiness; track item.label) {
                <div class="readiness-line"><span [class.done]="item.done">{{ item.done ? '✓' : '○' }}</span><b>{{ item.label }}</b></div>
              }
              <button type="button" class="quiet" (click)="openLeaderPrep()">Leader prep checklist</button>
            </article>
          </aside>
        </div>

        <div class="two-col">
          <article class="panel">
            <header class="panel-head"><div><p class="eyebrow">Between gatherings</p><h2>Practice, reflection & prayer</h2><p>Formation continues during the week without academic scores.</p></div><button type="button" class="quiet" (click)="openPractice()">+ Add practice</button></header>
            <div class="practice-feature"><span>This week</span><strong>{{ state.currentSession().practice }}</strong><p>Members can complete the practice, reflect, share testimony or request a leader conversation.</p></div>
            @for (practice of groupPractices(); track practice) {
              <div class="simple-line"><span>✓</span><div><strong>{{ practice }}</strong><small>Assigned to {{ state.selectedGroup().name }}</small></div></div>
            }
          </article>

          <article class="panel">
            <header class="panel-head"><div><p class="eyebrow">Formation pulse</p><h2>What is becoming visible?</h2><p>Track evidence of growth rather than reducing people to grades.</p></div><button type="button" class="quiet" (click)="activeTab.set('reports')">View reports</button></header>
            <div class="outcome-list">
              @for (outcome of outcomePulse; track outcome.label) {
                <div><span>{{ outcome.label }}</span><div class="outcome-bar"><i [style.width.%]="outcome.percent"></i></div><strong>{{ outcome.state }}</strong></div>
              }
            </div>
          </article>
        </div>
      }

      @if (activeTab() === 'tracks') {
        <section class="page-heading">
          <div><p class="eyebrow">Curriculum pathways</p><h2>Transformation Tracks</h2><p>Use DWCIM-owned curriculum, link Academy-owned lessons, or create a leader-developed pathway without copying formal course content into Engagements.</p></div>
          <button type="button" (click)="openCreateTrack()">+ Create DEG track</button>
        </section>

        <div class="track-grid">
          @for (track of state.tracks(); track track.id) {
            <article class="track-card" [class.selected]="track.id === state.selectedTrack().id">
              <header><span>Track {{ track.number }}</span><b [attr.data-source]="track.source">{{ track.source }}</b></header>
              <h3>{{ track.title }}</h3>
              <strong>{{ track.subtitle }}</strong>
              <p>{{ track.description }}</p>
              <div class="track-meta"><span>{{ track.sessions.length }} sessions</span><span>{{ track.outcomes.length }} formation outcomes</span></div>
              <section><small>Prerequisites</small>@for (item of track.prerequisites; track item) { <p class="bullet">{{ item }}</p> }</section>
              <section><small>Suggested next</small>@for (item of track.suggestedNext; track item) { <p class="bullet next">{{ item }}</p> }</section>
              <footer>
                @if (track.id === state.selectedTrack().id) { <span class="assigned">Assigned to this group</span> }
                @else { <button type="button" class="quiet" (click)="assignTrack(track)">Assign to {{ state.selectedGroup().name }}</button> }
              </footer>
            </article>
          }
        </div>

        <article class="panel architecture-card">
          <div><p class="eyebrow">Academy boundary</p><h2>Content can travel. Ownership does not.</h2><p>Academy remains the source of formal programs, lessons, media and formal completion. Engagements owns the DEG, semester, pacing, discussion, practice, attendance, reflection, testimony, formation milestones and leadership journey.</p></div>
          <div class="architecture-map"><span>Kingdom Academy<br><b>Programs · curriculum · media · completion</b></span><i>→</i><span>DEG Engagements<br><b>People · group pacing · formation · multiplication</b></span></div>
        </article>
      }

      @if (activeTab() === 'people') {
        <section class="page-heading">
          <div><p class="eyebrow">Person-in-community</p><h2>Formation records</h2><p>Attendance matters, but the record goes further: practice, reflection, testimony, prayer response, household context, service and discerned next steps.</p></div>
          <a class="secondary-link" href="/organization/dwc/my-group">Open member-facing My Group →</a>
        </section>

        <article class="panel people-table">
          <div class="table-head"><span>Person</span><span>Formation</span><span>Leadership</span><span>Next step</span><span></span></div>
          @for (member of state.selectedMembers(); track member.id) {
            <button type="button" class="person-row" (click)="openMember(member)">
              <span class="person-cell"><i>{{ initials(member.name) }}</i><span><strong>{{ member.name }}</strong><small>{{ member.attendance }} attendance · {{ member.reflections.length }} reflections</small></span></span>
              <span><em [attr.data-tone]="member.status === 'Needs follow-up' ? 'warn' : member.status === 'Emerging leader' ? 'leader' : 'good'">{{ member.status }}</em><small>{{ member.practice }} practice</small></span>
              <span><strong>{{ member.leadershipStage }}</strong><small>{{ member.serviceArea }}</small></span>
              <span><strong>{{ member.nextStep }}</strong>@if (member.missedSessionIds.length) { <small class="warning">{{ member.missedSessionIds.length }} missed session{{ member.missedSessionIds.length === 1 ? '' : 's' }}</small> }</span>
              <span class="open-arrow">→</span>
            </button>
          }
        </article>

        <div class="two-col">
          <article class="panel">
            <p class="eyebrow">Household-aware formation</p><h2>People do not disciple in a vacuum.</h2><p class="body-copy">Household data stays owned by People, but DEG leaders can see only the practical context they need: linked household, childcare, transportation or scheduling considerations. Sensitive household or care notes do not become general DEG notes.</p>
          </article>
          <article class="panel">
            <p class="eyebrow">Catch-up without shame</p><h2>{{ missedSessionTotal() }} missed formation sessions</h2><p class="body-copy">Leaders can assign a concise catch-up path with Scripture, lesson/resource and practice. Completing catch-up removes the missed-session marker without pretending it was the same as being formed in the room.</p>
          </article>
        </div>
      }

      @if (activeTab() === 'leadership') {
        <section class="page-heading">
          <div><p class="eyebrow">Multiplication pathway</p><h2>From member to multiplying leader</h2><p>ApostolOS should make leadership emergence visible early, then turn it into intentional apprenticeship rather than accidental promotion.</p></div>
          <button type="button" class="quiet" (click)="openLeaderPrep()">Leader development standards</button>
        </section>

        <div class="pipeline-strip">
          @for (stage of state.leadershipStages(); track stage) {
            <article [class.current-stage]="stageCount(stage) > 0"><strong>{{ stageCount(stage) }}</strong><span>{{ stage }}</span></article>
          }
        </div>

        <article class="panel leadership-list">
          <header class="panel-head"><div><p class="eyebrow">Emerging & active leaders</p><h2>Development pipeline</h2></div><span>{{ state.emergingLeaders().length }} people</span></header>
          @for (member of state.emergingLeaders(); track member.id) {
            <div class="leadership-row">
              <span class="person-cell"><i>{{ initials(member.name) }}</i><span><strong>{{ member.name }}</strong><small>{{ member.serviceArea }}</small></span></span>
              <span><small>Current stage</small><strong>{{ member.leadershipStage }}</strong></span>
              <span><small>Development step</small><strong>{{ member.nextStep }}</strong></span>
              <button type="button" class="quiet" [disabled]="member.leadershipStage === 'Cluster leader'" (click)="advanceLeadership(member)">Advance to {{ state.nextLeadershipStage(member.leadershipStage) }}</button>
            </div>
          }
        </article>

        <div class="three-col">
          <article class="panel development-card"><span>01</span><h3>Observe</h3><p>Surface consistency, service, relational health, teachability, gifts and fruit.</p></article>
          <article class="panel development-card"><span>02</span><h3>Apprentice</h3><p>Give real responsibility: facilitate, follow up, pray, lead portions of gatherings and receive feedback.</p></article>
          <article class="panel development-card"><span>03</span><h3>Multiply</h3><p>Commission leaders who can form people, develop others and eventually reproduce healthy groups.</p></article>
        </div>
      }

      @if (activeTab() === 'review') {
        <section class="page-heading">
          <div><p class="eyebrow">Semester closeout</p><h2>Review, commission, continue.</h2><p>A semester ending should produce testimony, next steps and multiplication—not a dead-end “course completed” state.</p></div>
          <span class="semester-pill">{{ state.selectedGroup().semester }}</span>
        </section>

        <div class="review-layout">
          <article class="panel closeout-card">
            <header class="panel-head"><div><p class="eyebrow">Leader closeout</p><h2>{{ state.selectedGroup().name }}</h2></div><strong>{{ reviewPercent() }}%</strong></header>
            @for (item of reviewChecklist; track item.field) {
              <label class="check-row"><input type="checkbox" [ngModel]="reviewValue(item.field)" (ngModelChange)="toggleReview(item.field, $event)"><span><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span></label>
            }
          </article>

          <article class="panel next-steps-card">
            <p class="eyebrow">Recommended continuation</p><h2>What comes after this track?</h2>
            @for (next of state.selectedTrack().suggestedNext; track next) {
              <div class="recommendation"><span>→</span><strong>{{ next }}</strong></div>
            }
            <p class="body-copy">Recommendations can point to another DEG, a ministry service assignment, an Academy course, apprenticeship or a pastoral conversation.</p>
          </article>
        </div>

        <article class="panel commissioning-table">
          <header class="panel-head"><div><p class="eyebrow">Commissioning</p><h2>Name the growth. Bless the next step.</h2><p>Commissioning is a relational closeout, not a graduation ceremony requirement.</p></div></header>
          @for (member of state.selectedMembers(); track member.id) {
            <div class="commission-row">
              <span><strong>{{ member.name }}</strong><small>{{ member.milestones[0] || 'Growth review still needed' }}</small></span>
              <span><small>Next step</small><strong>{{ member.nextStep }}</strong></span>
              <span><small>Leadership</small><strong>{{ member.leadershipStage }}</strong></span>
              <button type="button" [class.done]="member.commissioned" (click)="commission(member)">{{ member.commissioned ? 'Commissioned ✓' : 'Mark commissioned' }}</button>
            </div>
          }
        </article>
      }

      @if (activeTab() === 'reports') {
        <section class="page-heading">
          <div><p class="eyebrow">DWCIM discipleship health</p><h2>See formation without flattening people.</h2><p>Reporting combines participation, practices, follow-up, testimonies, service and leadership movement. It should guide ministry decisions—not create spiritual scores.</p></div>
        </section>

        <section class="metric-grid report-metrics">
          <article><span>DEGs on tracks</span><strong>{{ state.groups().length }}</strong><small>100% of demo groups</small></article>
          <article><span>Visible formation records</span><strong>{{ state.members().length }}</strong><small>across current demo groups</small></article>
          <article><span>Testimonies captured</span><strong>{{ testimonyTotal() }}</strong><small>qualitative evidence of change</small></article>
          <article><span>In leadership pathway</span><strong>{{ leadershipPipelineTotal() }}</strong><small>serving through cluster leadership</small></article>
        </section>

        <div class="report-layout">
          <article class="panel">
            <header class="panel-head"><div><p class="eyebrow">Formation domains</p><h2>Aggregate pulse</h2></div><span>DWCIM demo</span></header>
            <div class="outcome-list report-outcomes">
              @for (outcome of reportOutcomes; track outcome.label) {
                <div><span>{{ outcome.label }}</span><div class="outcome-bar"><i [style.width.%]="outcome.percent"></i></div><strong>{{ outcome.percent }}%</strong></div>
              }
            </div>
          </article>

          <article class="panel">
            <header class="panel-head"><div><p class="eyebrow">Track adoption</p><h2>Where groups are forming</h2></div></header>
            @for (track of state.tracks(); track track.id) {
              <div class="report-line"><span><strong>{{ track.title }}</strong><small>{{ track.subtitle }}</small></span><b>{{ groupCountForTrack(track.id) }} groups</b></div>
            }
          </article>
        </div>

        <article class="panel history-panel">
          <header class="panel-head"><div><p class="eyebrow">Cross-semester history</p><h2>Formation should accumulate over time.</h2><p>A person’s story should survive the semester and remain connected as they move through groups, tracks, service and leadership.</p></div></header>
          @for (member of state.members(); track member.id) {
            @if (member.history.length) {
              <div class="history-row"><strong>{{ member.name }}</strong><span>{{ member.history[0].semester }}</span><span>{{ member.history[0].group }}</span><span>{{ member.history[0].track }}</span><b>{{ member.history[0].outcome }}</b></div>
            }
          }
        </article>
      }

      <a class="back-link" href="/organization/dwc">← Back to Divine Empowerment Groups</a>
    </section>

    <dialog #formationDialog class="formation-drawer" (click)="onDialogClick($event)">
      <div class="drawer-frame">
        <header class="drawer-header">
          <div><p class="eyebrow">{{ drawerEyebrow() }}</p><h2>{{ drawerTitle() }}</h2><p>{{ drawerDescription() }}</p></div>
          <button type="button" class="drawer-close" aria-label="Close" (click)="closeDrawer()">×</button>
        </header>

        <div class="drawer-body">
          @switch (drawerKind()) {
            @case ('session') {
              @if (selectedSession(); as session) {
                <div class="session-hero"><span>Week {{ session.week }}</span><h3>{{ session.title }}</h3><p>{{ session.bigIdea }}</p><small>{{ state.selectedTrack().title }} · {{ state.selectedTrack().source }}</small></div>

                @if (session.media.length) {
                  <section class="content-block media-block">
                    <small>Linked resources</small><h3>Teach from the source without copying it.</h3>
                    @for (media of session.media; track media.title) {
                      <article class="media-resource"><span [attr.data-type]="media.type">{{ media.type }}</span><div><strong>{{ media.title }}</strong><small>{{ media.source }}{{ media.duration ? ' · ' + media.duration : '' }}</small></div></article>
                      @if (media.type === 'video' && media.url) {
                        <video controls preload="metadata" [src]="media.url"><p>Open the lesson in Kingdom Academy.</p></video>
                      }
                    }
                  </section>
                }

                <section class="content-block"><small>01 · Scripture</small><h3>Open the Word</h3><p class="scripture">{{ session.scripture }}</p><p>{{ session.teaching }}</p></section>

                <section class="content-block"><small>02 · Discussion</small><h3>Make room for the group.</h3>
                  @for (question of session.discussion; track question) { <div class="question"><span>?</span><p>{{ question }}</p></div> }
                  <div class="question-library"><strong>Question library</strong>@for (question of state.questionLibrary().slice(0, 3); track question) { <button type="button" class="question-chip" (click)="copyQuestion(question)">{{ question }}</button> }</div>
                  <label>Add leader question<textarea rows="2" [(ngModel)]="questionDraft" placeholder="Add a reusable discussion question"></textarea></label>
                  <button type="button" class="secondary-action" (click)="saveQuestion()">Add to question library</button>
                </section>

                <section class="content-block"><small>03 · Practice</small><h3>Live it before next week.</h3><p>{{ session.practice }}</p><button type="button" class="secondary-action" (click)="openPractice(session.practice)">Assign this practice</button></section>
                <section class="content-block"><small>04 · Prayer response</small><h3>Respond to God together.</h3><p>{{ session.prayer }}</p></section>
                <section class="content-block"><small>Missed-session catch-up</small><h3>Concise, not punitive.</h3><p>{{ session.catchUp }}</p></section>

                <section class="content-block"><small>Leader annotation</small><h3>Notes for this group</h3><label>Private facilitation note<textarea rows="4" [(ngModel)]="sessionNoteDraft" placeholder="Timing, group dynamics, pastoral cautions, follow-up..."></textarea></label><button type="button" class="secondary-action" (click)="saveSessionNote(session)">Save annotation</button></section>

                <div class="drawer-actions">
                  <button type="button" class="secondary-action" (click)="toggleSessionComplete(session)">{{ isCompleted(session) ? 'Reopen session' : 'Mark session complete' }}</button>
                  <button type="button" (click)="closeDrawer()">Done</button>
                </div>
              }
            }

            @case ('practice') {
              <section class="content-block"><small>Between gatherings</small><h3>Create a concrete formation practice.</h3><p>Practices can be Scripture, prayer, service, relationship, reflection or obedience. They are not graded.</p></section>
              <label>Practice / assignment<textarea rows="5" [(ngModel)]="practiceDraft" placeholder="What should the group practice before the next gathering?"></textarea></label>
              <label>How should members respond?<select [(ngModel)]="practiceResponse"><option>Mark complete + optional reflection</option><option>Short written reflection</option><option>Discuss at next group</option><option>Prayer response</option><option>Leader follow-up</option></select></label>
              <button type="button" (click)="savePractice()">Add to {{ state.selectedGroup().name }}</button>
            }

            @case ('member') {
              @if (selectedMember(); as member) {
                <div class="member-profile"><i>{{ initials(member.name) }}</i><div><h3>{{ member.name }}</h3><p>{{ state.selectedGroup().name }} · {{ member.leadershipStage }}</p></div></div>
                <div class="member-stats"><div><span>Attendance</span><strong>{{ member.attendance }}</strong></div><div><span>Reflections</span><strong>{{ member.reflections.length }}</strong></div><div><span>Testimonies</span><strong>{{ member.testimonies.length }}</strong></div><div><span>Formation</span><strong>{{ member.status }}</strong></div></div>

                <section class="content-block"><small>Household context</small><h3>{{ member.household }}</h3><p>{{ member.householdNote }}</p><p class="boundary">Only practical context is shown here. People and Care remain the systems of record for household and sensitive pastoral information.</p></section>

                <section class="content-block"><small>Current next step</small><h3>{{ member.nextStep }}</h3><label>Update next step<textarea rows="3" [(ngModel)]="nextStepDraft"></textarea></label><button type="button" class="secondary-action" (click)="saveNextStep(member)">Save next step</button></section>

                @if (member.missedSessionIds.length) {
                  <section class="content-block"><small>Catch-up</small><h3>{{ member.missedSessionIds.length }} missed session{{ member.missedSessionIds.length === 1 ? '' : 's' }}</h3>
                    @for (sessionId of member.missedSessionIds; track sessionId) {
                      <div class="catchup-row"><span><strong>{{ sessionTitle(sessionId) }}</strong><small>{{ member.catchUpAssignedIds.includes(sessionId) ? 'Catch-up assigned' : 'No catch-up assigned yet' }}</small></span><button type="button" class="secondary-action" (click)="assignCatchUp(member, sessionId)">{{ member.catchUpAssignedIds.includes(sessionId) ? 'Assigned ✓' : 'Assign catch-up' }}</button></div>
                    }
                  </section>
                }

                <section class="content-block"><small>Growth markers</small><h3>What has become visible?</h3>@for (milestone of member.milestones; track milestone) { <div class="marker-line"><span>✓</span><p>{{ milestone }}</p></div> }</section>

                <section class="content-block"><small>Cross-semester history</small>@if (member.history.length) { @for (entry of member.history; track entry.semester + entry.group) { <div class="history-mini"><strong>{{ entry.semester }} · {{ entry.group }}</strong><span>{{ entry.track }}</span><small>{{ entry.outcome }}</small></div> } } @else { <p>No prior DEG formation history yet.</p> }</section>

                <section class="content-block composer-stack"><small>Capture formation evidence</small><label>Reflection<textarea rows="3" [(ngModel)]="reflectionDraft" placeholder="What is this person recognizing, receiving or practicing?"></textarea></label><button type="button" class="secondary-action" (click)="saveReflection(member)">Record reflection</button><label>Testimony<textarea rows="3" [(ngModel)]="testimonyDraft" placeholder="What changed? What did God do?"></textarea></label><button type="button" class="secondary-action" (click)="saveTestimony(member)">Capture testimony</button><label>Prayer response<textarea rows="3" [(ngModel)]="prayerDraft" placeholder="What did they ask God for or respond to in prayer?"></textarea></label><button type="button" class="secondary-action" (click)="savePrayerResponse(member)">Record prayer response</button><label>Growth milestone<textarea rows="3" [(ngModel)]="milestoneDraft" placeholder="Served, led, reconciled, shared testimony, built a rhythm..."></textarea></label><button type="button" (click)="saveMilestone(member)">Add milestone</button></section>
              }
            }

            @case ('leader') {
              <section class="content-block"><small>Leader development standard</small><h3>Prepare content, people and multiplication.</h3><p>DEG leadership is more than facilitation. Leaders steward Scripture, room health, follow-up, apprentice development and next-step discernment.</p></section>
              <div class="leader-checks"><label><input type="checkbox" [(ngModel)]="leaderGuideReviewed"> Review Scripture, Academy/DWCIM resource and session flow</label><label><input type="checkbox" [(ngModel)]="memberListPrayed"> Pray through the member list</label><label><input type="checkbox" [(ngModel)]="discussionPrepared"> Select discussion questions for this group</label><label><input type="checkbox" [(ngModel)]="followupsReviewed"> Review attendance, household context and relational follow-ups</label><label><input type="checkbox" [(ngModel)]="assignmentsReady"> Confirm prayer, hospitality and facilitation assignments</label><label><input type="checkbox" [(ngModel)]="apprenticePrepared"> Give an apprentice or emerging leader a real development responsibility</label></div>
              <section class="content-block"><small>Academy readiness</small><h3>Formal leader learning can stay in Academy.</h3><p>Examples: Facilitation Foundations, Safeguarding, Pastoral Boundaries, Scripture Handling. Engagements only needs readiness/completion signals and the leader’s actual group apprenticeship.</p></section>
              <button type="button" (click)="closeDrawer()">Save leader readiness</button>
            }

            @case ('track') {
              <section class="content-block"><small>Leader-created curriculum</small><h3>Create the DEG pathway here; link formal Academy lessons when appropriate.</h3><p>Leader-created tracks are useful for seasonal or ministry-specific formation. They can later be reviewed and promoted into formal Academy curriculum without changing the DEG relationship record.</p></section>
              <label>Track title<input [(ngModel)]="trackTitle" placeholder="e.g. Freedom & Wholeness"></label>
              <label>Subtitle<input [(ngModel)]="trackSubtitle" placeholder="Short formation focus"></label>
              <label>Content source<select [(ngModel)]="trackSource"><option value="DWCIM">DWCIM</option><option value="Kingdom Academy">Kingdom Academy</option></select></label>
              <button type="button" (click)="createTrack()">Create track</button>
            }

            @case ('academy') {
              <section class="content-block"><small>Architecture boundary</small><h3>Academy supplies formal learning. Engagements carries formation in community.</h3><p>A DEG can reference Academy programs, lessons, videos, guides and formal completion without becoming a duplicate LMS.</p></section>
              <div class="boundary-map"><div><span>Kingdom Academy</span><strong>Programs<br>Curriculum<br>Lessons<br>Video / audio<br>Formal learning<br>Formal completion</strong></div><b>→</b><div><span>DEG Engagements</span><strong>Group<br>Semester<br>Pacing<br>Discussion<br>Practice<br>Attendance<br>Reflection<br>Relationships<br>Formation milestones<br>Leadership journey</strong></div></div>
              <section class="content-block"><small>Example</small><h3>Transformation Track 2 · Week 4</h3><p><strong>Teaching resource:</strong> Hearing & Obeying God · Source: Kingdom Academy</p><p><strong>DEG owns:</strong> Alicia’s group pacing, Wednesday gathering, discussion, Michael’s practice/reflection, Ashley’s catch-up, testimony, next steps and apprentice identification.</p></section>
            }
          }
        </div>
      </div>
    </dialog>
  `,
  styles: [`
    :host{display:block}.formation-page{display:grid;gap:14px;max-width:1500px;margin:0 auto;padding:20px 22px 52px;color:#202637}.eyebrow{margin:0;color:#704897;font-size:.62rem;font-weight:850;letter-spacing:.095em;text-transform:uppercase}.formation-hero{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(300px,.62fr);gap:20px;padding:30px 32px;border:1px solid #e5dfeb;border-radius:18px;background:linear-gradient(120deg,#fffefd,#faf7fb 58%,#f5eef8);box-shadow:0 18px 50px rgba(43,28,57,.05)}.formation-hero h1{margin:7px 0 9px;font-size:clamp(2.4rem,5vw,4.1rem);line-height:.98;letter-spacing:-.06em}.formation-hero__copy>p:last-of-type{max-width:820px;margin:0;color:#687080;font-size:.86rem;line-height:1.65}.hero-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}.hero-actions button,.hero-actions a,.context-bar button,.panel button,.page-heading button,.secondary-link,.drawer-body button{min-height:39px;padding:0 13px;border:0;border-radius:8px;background:#27344e;color:#fff;font-size:.7rem;font-weight:780;text-decoration:none;cursor:pointer}.hero-actions .secondary,.secondary-link,.quiet,.secondary-action{border:1px solid #ded9e4!important;background:#fff!important;color:#5d4274!important}.hero-track{display:grid;padding:18px 20px;border-left:4px solid #734d97;border-radius:6px 12px 12px 6px;align-content:center;background:rgba(255,255,255,.68)}.hero-track>span,.hero-track>small{color:#85808a;font-size:.65rem}.hero-track>strong{margin:8px 0 3px;font-size:1.18rem}.hero-track>p{margin:0;color:#5e6572;font-size:.77rem}.source-line{display:flex;margin-top:17px;padding-top:12px;border-top:1px solid #ece7ef;justify-content:space-between;gap:10px;color:#74647c;font-size:.65rem}.formation-nav{display:flex;gap:3px;padding:5px;border:1px solid #e2dfe5;border-radius:12px;background:#fff;overflow:auto}.formation-nav button{padding:9px 13px;border:0;border-radius:8px;background:transparent;color:#747581;font-size:.7rem;font-weight:760;white-space:nowrap;cursor:pointer}.formation-nav button.active{background:#2b3141;color:#fff}.context-bar{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;gap:10px;padding:10px 12px;border:1px solid #e2e2e6;border-radius:11px;align-items:end;background:#fff}.context-bar label,.drawer-body label{display:grid;gap:5px;color:#777986;font-size:.62rem;font-weight:720}.context-bar select,.drawer-body input,.drawer-body select,.drawer-body textarea{min-height:38px;padding:8px 10px;border:1px solid #d9d8df;border-radius:8px;background:#fff;color:#202637;font:inherit;font-size:.72rem}.context-bar select{min-width:185px}.context-meta{display:flex;flex-wrap:wrap;gap:6px;align-self:center}.context-meta span,.semester-pill{padding:5px 8px;border-radius:7px;background:#f5f2f6;color:#716b75;font-size:.62rem}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.metric-grid article{display:grid;min-height:104px;padding:15px 16px;border:1px solid #e2e2e5;border-radius:11px;background:#fff}.metric-grid span{color:#797b84;font-size:.63rem;font-weight:720}.metric-grid strong{margin:auto 0 0;font-size:1.7rem;letter-spacing:-.04em}.metric-grid small{color:#8c8d94;font-size:.61rem}.overview-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(310px,.55fr);gap:12px}.panel{border:1px solid #e2e2e5;border-radius:13px;background:#fff;box-shadow:0 8px 24px rgba(27,33,47,.025)}.track-panel,.people-table,.leadership-list,.commissioning-table,.history-panel{padding:19px}.panel-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.panel-head h2,.page-heading h2{margin:4px 0 5px;font-size:1.25rem;letter-spacing:-.035em}.panel-head p:not(.eyebrow),.page-heading p:not(.eyebrow),.body-copy{max-width:760px;margin:0;color:#747887;font-size:.72rem;line-height:1.55}.source-badge{padding:5px 8px;border-radius:7px;background:#f3eef6;color:#69438a;font-size:.6rem;font-weight:800;white-space:nowrap}.source-badge[data-source='Kingdom Academy'],[data-source='Kingdom Academy']{color:#8b642d!important}.progress-line{height:5px;margin:15px 0 5px;border-radius:10px;background:#f0edf2;overflow:hidden}.progress-line span{display:block;height:100%;border-radius:inherit;background:#704897}.session-list{display:grid}.session-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;min-height:72px;padding:10px 4px;border:0;border-top:1px solid #ececef;align-items:center;gap:11px;background:transparent;color:inherit;text-align:left;cursor:pointer}.session-row:first-child{border-top:0}.session-row:hover,.session-row.current{background:#fbf8fc}.session-state{display:grid;width:28px;height:28px;border-radius:8px;place-items:center;background:#f4f1f5;color:#8a7c91;font-size:.64rem;font-weight:830}.session-state[data-state='Complete']{background:#edf6f0;color:#367152}.session-state[data-state='Current']{background:#eee5f4;color:#704897}.session-copy{display:grid}.session-copy small,.session-source,.session-status{color:#8a8b92;font-size:.58rem}.session-copy strong{margin:2px 0;font-size:.78rem}.session-copy span{color:#777b87;font-size:.65rem}.session-source{padding:4px 6px;border-radius:6px;background:#f7f5f2;white-space:nowrap}.session-status{font-weight:800}.overview-sidebar{display:grid;gap:12px}.next-card,.readiness-card{padding:18px}.next-card>span{display:block;margin-top:11px;color:#8a7f91;font-size:.63rem}.next-card h2{margin:4px 0;font-size:1.4rem}.next-card>p,.readiness-card>p:not(.eyebrow){color:#727783;font-size:.72rem;line-height:1.55}.mini-detail{display:grid;gap:3px;margin-top:11px;padding-top:11px;border-top:1px solid #ececef}.mini-detail span{color:#8d8d94;font-size:.58rem;text-transform:uppercase;letter-spacing:.06em}.mini-detail strong{font-size:.7rem;line-height:1.45}.next-card button,.readiness-card button{width:100%;margin-top:14px}.readiness-card h3{margin:5px 0 12px;font-size:.95rem}.readiness-line{display:flex;gap:8px;padding:7px 0;border-top:1px solid #f0eef1;align-items:center}.readiness-line span{color:#aaa2ad}.readiness-line span.done{color:#3d7c5c}.readiness-line b{font-size:.68rem}.two-col,.review-layout,.report-layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.two-col>.panel,.review-layout>.panel,.report-layout>.panel{padding:18px}.practice-feature{display:grid;gap:5px;margin:14px 0;padding:14px;border-left:3px solid #704897;background:#faf7fb}.practice-feature span{color:#8b7c93;font-size:.58rem;text-transform:uppercase}.practice-feature strong{font-size:.78rem}.practice-feature p{margin:0;color:#777b86;font-size:.68rem;line-height:1.5}.simple-line,.marker-line{display:flex;gap:9px;padding:10px 0;border-top:1px solid #efedf0}.simple-line>span,.marker-line>span{color:#397255}.simple-line div{display:grid}.simple-line strong{font-size:.7rem}.simple-line small{color:#898a91;font-size:.6rem}.outcome-list{display:grid;margin-top:13px}.outcome-list>div{display:grid;grid-template-columns:130px minmax(0,1fr) 70px;gap:10px;padding:10px 0;border-top:1px solid #efedf0;align-items:center}.outcome-list>div>span,.outcome-list>div>strong{font-size:.65rem}.outcome-list>div>strong{text-align:right}.outcome-bar{height:6px;border-radius:10px;background:#f0edf1;overflow:hidden}.outcome-bar i{display:block;height:100%;background:#735096}.page-heading{display:flex;padding:8px 2px 2px;align-items:flex-end;justify-content:space-between;gap:20px}.track-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.track-card{display:flex;min-height:420px;padding:18px;border:1px solid #e2e1e5;border-radius:13px;flex-direction:column;background:#fff}.track-card.selected{border-color:#bba7ca;box-shadow:inset 0 3px 0 #704897}.track-card header{display:flex;justify-content:space-between;color:#888991;font-size:.61rem}.track-card header b{font-size:.58rem}.track-card h3{margin:15px 0 2px;font-size:1.08rem}.track-card>strong{font-size:.72rem}.track-card>p{color:#777c87;font-size:.69rem;line-height:1.52}.track-meta{display:flex;gap:6px;margin:9px 0}.track-meta span{padding:4px 6px;border-radius:6px;background:#f6f4f6;color:#77727b;font-size:.58rem}.track-card section{margin-top:10px;padding-top:10px;border-top:1px solid #efedf0}.track-card section small{color:#8c8790;font-size:.58rem;font-weight:800;text-transform:uppercase}.bullet{position:relative;margin:6px 0 0;padding-left:13px;color:#606572!important;font-size:.64rem!important}.bullet:before{position:absolute;left:2px;content:'•';color:#704897}.bullet.next:before{content:'→'}.track-card footer{display:flex;margin-top:auto;padding-top:14px;align-items:center;justify-content:flex-end}.assigned{color:#397255;font-size:.62rem;font-weight:800}.architecture-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.8fr);gap:20px;padding:20px;align-items:center}.architecture-map,.boundary-map{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center}.architecture-map span,.boundary-map>div{padding:14px;border:1px solid #e8e3e8;border-radius:9px;background:#faf8fa;color:#7b7480;font-size:.64rem}.architecture-map b,.boundary-map strong{display:block;margin-top:5px;color:#343746;font-size:.69rem;line-height:1.5}.architecture-map i{font-style:normal;color:#704897}.people-table{overflow:auto}.table-head,.person-row{display:grid;grid-template-columns:minmax(210px,1.1fr) minmax(140px,.7fr) minmax(150px,.7fr) minmax(250px,1.2fr) 24px;gap:13px;align-items:center}.table-head{padding:5px 4px 9px;color:#92929a;font-size:.58rem;font-weight:800;text-transform:uppercase}.person-row{width:100%;min-height:78px;padding:11px 4px;border:0;border-top:1px solid #ececef;background:transparent;color:inherit;text-align:left;cursor:pointer}.person-row:hover{background:#fbfafc}.person-cell{display:flex;gap:10px;align-items:center}.person-cell>i,.member-profile>i{display:grid;width:38px;height:38px;border-radius:10px;place-items:center;background:#f0e9f4;color:#704897;font-size:.62rem;font-style:normal;font-weight:850}.person-cell>span,.person-row>span:not(.person-cell){display:grid;gap:3px}.person-cell strong,.person-row strong{font-size:.69rem}.person-cell small,.person-row small{color:#898a91;font-size:.59rem;line-height:1.4}.person-row em{width:max-content;padding:4px 6px;border-radius:6px;background:#edf6f0;color:#397255;font-size:.57rem;font-style:normal;font-weight:800}.person-row em[data-tone='warn']{background:#fff4e8;color:#9a6424}.person-row em[data-tone='leader']{background:#f1e9f6;color:#704897}.warning{color:#a26627!important}.open-arrow{color:#8a7a91!important;font-size:1rem}.pipeline-strip{display:grid;grid-template-columns:repeat(8,minmax(110px,1fr));gap:6px;overflow:auto}.pipeline-strip article{display:grid;min-height:82px;padding:11px;border:1px solid #e6e4e7;border-radius:9px;background:#fff}.pipeline-strip article.current-stage{border-top:3px solid #704897}.pipeline-strip strong{font-size:1.2rem}.pipeline-strip span{margin-top:auto;color:#777984;font-size:.6rem}.leadership-row,.commission-row{display:grid;grid-template-columns:minmax(200px,1fr) minmax(140px,.55fr) minmax(240px,1.2fr) auto;gap:14px;padding:12px 2px;border-top:1px solid #ececef;align-items:center}.leadership-row>span,.commission-row>span{display:grid;gap:3px}.leadership-row small,.commission-row small{color:#8b8b92;font-size:.58rem}.leadership-row strong,.commission-row strong{font-size:.68rem}.leadership-row button:disabled{opacity:.45}.three-col{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.development-card{padding:18px}.development-card>span{color:#8f779f;font-size:.63rem;font-weight:850}.development-card h3{margin:8px 0 5px}.development-card p{margin:0;color:#777b86;font-size:.69rem;line-height:1.52}.closeout-card,.next-steps-card{padding:18px}.check-row{display:flex!important;grid-template-columns:auto 1fr!important;gap:10px!important;padding:12px 0;border-top:1px solid #eeecef;align-items:flex-start}.check-row input{min-height:auto!important;margin-top:3px}.check-row span{display:grid;gap:3px}.check-row strong{font-size:.7rem}.check-row small{color:#888991;font-size:.61rem}.recommendation{display:flex;gap:9px;padding:12px 0;border-top:1px solid #eeecef}.recommendation span{color:#704897}.recommendation strong{font-size:.7rem}.commission-row button.done{background:#edf6f0;color:#397255}.report-metrics article strong{font-size:1.55rem}.report-line{display:flex;padding:12px 0;border-top:1px solid #eeecef;justify-content:space-between;gap:15px;align-items:center}.report-line>span{display:grid;gap:3px}.report-line strong,.report-line b{font-size:.7rem}.report-line small{color:#8b8c93;font-size:.6rem}.report-outcomes>div{grid-template-columns:150px minmax(0,1fr) 50px}.history-row{display:grid;grid-template-columns:minmax(140px,.8fr) 90px minmax(140px,1fr) minmax(180px,1.2fr) minmax(120px,.7fr);gap:12px;padding:11px 2px;border-top:1px solid #ececef;align-items:center;font-size:.64rem}.history-row span{color:#747884}.back-link{width:max-content;margin-top:4px;color:#704897;font-size:.67rem;font-weight:760;text-decoration:none}.formation-drawer{width:min(760px,calc(100vw - 24px));height:100dvh;max-width:none;max-height:none;margin:0 0 0 auto;padding:0;border:0;background:transparent}.formation-drawer::backdrop{background:rgba(18,20,29,.4);backdrop-filter:blur(2px)}.drawer-frame{display:grid;height:100%;grid-template-rows:auto 1fr;background:#fff;box-shadow:-24px 0 70px rgba(20,20,30,.18)}.drawer-header{display:flex;padding:23px 24px 18px;border-bottom:1px solid #ece9ed;justify-content:space-between;gap:18px}.drawer-header h2{margin:5px 0;font-size:1.65rem;letter-spacing:-.04em}.drawer-header p:not(.eyebrow){max-width:570px;margin:0;color:#767986;font-size:.7rem;line-height:1.5}.drawer-close{width:38px;height:38px;padding:0!important;border:1px solid #e3e0e5!important;border-radius:9px!important;background:#fff!important;color:#6e6e78!important;font-size:1.3rem!important}.drawer-body{display:grid;align-content:start;gap:15px;padding:20px 24px 48px;overflow:auto}.session-hero{padding:19px;border-radius:12px;background:linear-gradient(125deg,#2b3141,#473854);color:#fff}.session-hero span,.session-hero small{font-size:.61rem;opacity:.7}.session-hero h3{margin:7px 0 4px;font-size:1.45rem}.session-hero p{margin:0 0 8px;font-size:.74rem;line-height:1.5;opacity:.86}.content-block{display:grid;gap:8px;padding:15px;border:1px solid #e7e4e8;border-radius:11px;background:#fff}.content-block>small{color:#795797;font-size:.58rem;font-weight:850;text-transform:uppercase;letter-spacing:.07em}.content-block h3{margin:0;font-size:.9rem}.content-block p{margin:0;color:#696e7a;font-size:.7rem;line-height:1.6}.scripture{color:#333848!important;font-weight:760}.media-resource{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;padding:9px 0;border-top:1px solid #eeecef;align-items:center}.media-resource>span{padding:4px 6px;border-radius:6px;background:#f0e9f4;color:#704897;font-size:.55rem;font-weight:800;text-transform:uppercase}.media-resource>div{display:grid;gap:2px}.media-resource strong{font-size:.69rem}.media-resource small{color:#8c8c93;font-size:.58rem}.media-block video{width:100%;max-height:300px;margin-top:5px;border-radius:9px;background:#111}.question{display:grid;grid-template-columns:26px 1fr;gap:8px;padding:9px 0;border-top:1px solid #eeecef;align-items:start}.question>span{display:grid;width:24px;height:24px;border-radius:7px;place-items:center;background:#f0e9f4;color:#704897;font-size:.65rem;font-weight:850}.question-library{display:flex;flex-wrap:wrap;gap:5px;padding-top:8px;border-top:1px solid #eeecef}.question-library>strong{width:100%;font-size:.62rem}.question-chip{min-height:32px!important;padding:6px 8px!important;border:1px solid #e6e1e7!important;background:#faf8fa!important;color:#6b6170!important;font-size:.59rem!important;text-align:left}.boundary{padding:9px;border-left:3px solid #9d80b2;background:#faf7fb!important;color:#6d6571!important}.drawer-actions{display:flex;justify-content:flex-end;gap:8px}.member-profile{display:flex;gap:11px;align-items:center}.member-profile>i{width:46px;height:46px}.member-profile h3{margin:0;font-size:1rem}.member-profile p{margin:3px 0 0;color:#7e8089;font-size:.65rem}.member-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.member-stats div{display:grid;padding:10px;border-radius:8px;background:#f7f5f7}.member-stats span{color:#8c8c93;font-size:.55rem}.member-stats strong{margin-top:4px;font-size:.69rem}.catchup-row{display:flex;padding:9px 0;border-top:1px solid #ece9ed;justify-content:space-between;gap:10px;align-items:center}.catchup-row>span{display:grid;gap:2px}.catchup-row strong{font-size:.67rem}.catchup-row small{color:#8b8b93;font-size:.57rem}.marker-line p{font-size:.68rem!important}.history-mini{display:grid;gap:3px;padding:9px 0;border-top:1px solid #ece9ed}.history-mini strong{font-size:.67rem}.history-mini span,.history-mini small{color:#85868f;font-size:.59rem}.composer-stack{gap:10px}.leader-checks{display:grid;border:1px solid #e7e4e8;border-radius:11px;overflow:hidden}.leader-checks label{display:flex!important;grid-template-columns:auto 1fr!important;min-height:48px;padding:11px!important;border-top:1px solid #eeecef;align-items:flex-start!important;gap:9px!important;color:#494e5b!important;font-size:.68rem!important}.leader-checks label:first-child{border-top:0}.leader-checks input{min-height:auto!important}.boundary-map{grid-template-columns:1fr auto 1fr}.boundary-map>div{min-height:180px}.boundary-map>div>span{color:#76508f;font-size:.62rem;font-weight:850;text-transform:uppercase}.boundary-map>div>strong{margin-top:10px;line-height:1.75}.boundary-map>b{color:#704897}.formation-drawer button:disabled{opacity:.45;cursor:default}@media(max-width:1100px){.formation-hero,.overview-layout,.architecture-card{grid-template-columns:1fr}.hero-track{border-left:0;border-top:4px solid #734d97}.track-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.context-bar{grid-template-columns:1fr 1fr}.context-meta{grid-column:1/-1}.people-table{overflow:auto}.table-head,.person-row{min-width:920px}}@media(max-width:780px){.formation-page{padding:12px 10px 36px}.formation-hero{padding:22px 18px}.formation-hero h1{font-size:2.45rem}.two-col,.review-layout,.report-layout,.three-col,.track-grid{grid-template-columns:1fr}.page-heading{align-items:flex-start;flex-direction:column}.context-bar{grid-template-columns:1fr}.context-bar select{width:100%}.context-meta{grid-column:auto}.metric-grid{grid-template-columns:1fr 1fr}.member-stats{grid-template-columns:1fr 1fr}.leadership-row,.commission-row,.history-row{grid-template-columns:1fr}.leadership-row button{width:100%}.architecture-map,.boundary-map{grid-template-columns:1fr}.architecture-map i,.boundary-map>b{transform:rotate(90deg);justify-self:center}.formation-drawer{width:100vw}.drawer-header,.drawer-body{padding-left:17px;padding-right:17px}}@media(max-width:480px){.metric-grid{grid-template-columns:1fr}.session-row{grid-template-columns:32px minmax(0,1fr) auto}.session-source{display:none}.context-bar button{width:100%}.member-stats{grid-template-columns:1fr}}
  `],
})
export class DwcFormationComponent {
  @ViewChild('formationDialog') formationDialog?: ElementRef<HTMLDialogElement>;

  readonly tabs: { key: FormationTab; label: string }[] = [
    { key: 'overview', label: 'Formation' },
    { key: 'tracks', label: 'Tracks & Curriculum' },
    { key: 'people', label: 'People' },
    { key: 'leadership', label: 'Leadership Pipeline' },
    { key: 'review', label: 'Semester Review' },
    { key: 'reports', label: 'Discipleship Health' },
  ];
  readonly activeTab = signal<FormationTab>('overview');
  readonly selectedSession = signal<FormationSession | null>(null);
  readonly selectedMember = signal<FormationMember | null>(null);
  readonly drawerKind = signal<DrawerKind | null>(null);

  practiceDraft = '';
  practiceResponse = 'Mark complete + optional reflection';
  questionDraft = '';
  sessionNoteDraft = '';
  nextStepDraft = '';
  reflectionDraft = '';
  testimonyDraft = '';
  prayerDraft = '';
  milestoneDraft = '';
  trackTitle = '';
  trackSubtitle = '';
  trackSource: FormationSource = 'DWCIM';

  leaderGuideReviewed = true;
  memberListPrayed = true;
  discussionPrepared = false;
  followupsReviewed = false;
  assignmentsReady = false;
  apprenticePrepared = false;

  readonly leaderReadiness = [
    { label: 'Review session resource', done: true },
    { label: 'Pray through the people', done: true },
    { label: 'Choose discussion prompts', done: false },
    { label: 'Review follow-up needs', done: false },
    { label: 'Prepare apprentice role', done: false },
  ];

  readonly outcomePulse = [
    { label: 'Identity', percent: 82, state: 'Rooted' },
    { label: 'Prayer & Scripture', percent: 68, state: 'Growing' },
    { label: 'Community', percent: 78, state: 'Healthy' },
    { label: 'Calling & service', percent: 61, state: 'Emerging' },
  ];

  readonly reportOutcomes = [
    { label: 'Scripture engagement', percent: 78 },
    { label: 'Prayer rhythm', percent: 71 },
    { label: 'Relational health', percent: 74 },
    { label: 'Service activation', percent: 63 },
    { label: 'Leadership emergence', percent: 42 },
    { label: 'Missional practice', percent: 57 },
  ];

  readonly reviewChecklist = [
    { field: 'leaderReview' as const, label: 'Leader formation review', detail: 'Name group-level growth, tension and lessons from the semester.' },
    { field: 'memberNextSteps' as const, label: 'Member next steps', detail: 'Every person has a relational next step, not just a completion status.' },
    { field: 'testimoniesCaptured' as const, label: 'Testimonies captured', detail: 'Preserve stories of change as qualitative formation evidence.' },
    { field: 'commissioningPlanned' as const, label: 'Commissioning prepared', detail: 'Create room to bless, pray and send people into continued obedience.' },
    { field: 'rolloverReady' as const, label: 'Next semester ready', detail: 'Recommend next track, group, service, Academy learning or apprenticeship.' },
  ];

  readonly groupPractices = computed(() => this.state.practices()[this.state.selectedGroupId()] ?? []);

  constructor(readonly state: DwcFormationStateService) {}

  setPace(pace: 'Weekly' | 'Every other week' | 'Flexible'): void {
    this.state.setGroupPace(this.state.selectedGroupId(), pace);
  }

  sessionState(session: FormationSession): 'Complete' | 'Current' | 'Upcoming' {
    if (this.isCompleted(session)) return 'Complete';
    return session.id === this.state.currentSession().id ? 'Current' : 'Upcoming';
  }

  sessionStateIcon(session: FormationSession): string {
    const status = this.sessionState(session);
    return status === 'Complete' ? '✓' : status === 'Current' ? '→' : String(session.week);
  }

  isCompleted(session: FormationSession): boolean {
    return this.state.selectedGroup().completedSessionIds.includes(session.id);
  }

  openSession(session: FormationSession): void {
    this.selectedSession.set(session);
    this.sessionNoteDraft = this.state.sessionNote(this.state.selectedGroupId(), session.id);
    this.questionDraft = '';
    this.drawerKind.set('session');
    this.showDrawer();
  }

  toggleSessionComplete(session: FormationSession): void {
    if (this.isCompleted(session)) this.state.reopenSession(this.state.selectedGroupId(), session.id);
    else this.state.completeSession(this.state.selectedGroupId(), session.id);
  }

  openPractice(defaultValue = ''): void {
    this.practiceDraft = defaultValue || this.state.currentSession().practice;
    this.drawerKind.set('practice');
    this.showDrawer();
  }

  savePractice(): void {
    this.state.addPractice(this.state.selectedGroupId(), this.practiceDraft);
    this.closeDrawer();
  }

  openMember(member: FormationMember): void {
    this.selectedMember.set(member);
    this.nextStepDraft = member.nextStep;
    this.reflectionDraft = '';
    this.testimonyDraft = '';
    this.prayerDraft = '';
    this.milestoneDraft = '';
    this.drawerKind.set('member');
    this.showDrawer();
  }

  saveNextStep(member: FormationMember): void {
    this.state.setMemberNextStep(member.id, this.nextStepDraft.trim());
    this.refreshMember(member.id);
  }

  saveReflection(member: FormationMember): void {
    this.state.addReflection(member.id, this.reflectionDraft);
    this.reflectionDraft = '';
    this.refreshMember(member.id);
  }

  saveTestimony(member: FormationMember): void {
    this.state.addTestimony(member.id, this.testimonyDraft);
    this.testimonyDraft = '';
    this.refreshMember(member.id);
  }

  savePrayerResponse(member: FormationMember): void {
    this.state.addPrayerResponse(member.id, this.prayerDraft);
    this.prayerDraft = '';
    this.refreshMember(member.id);
  }

  saveMilestone(member: FormationMember): void {
    this.state.addMilestone(member.id, this.milestoneDraft);
    this.milestoneDraft = '';
    this.refreshMember(member.id);
  }

  assignCatchUp(member: FormationMember, sessionId: string): void {
    this.state.assignCatchUp(member.id, sessionId);
    this.refreshMember(member.id);
  }

  sessionTitle(sessionId: string): string {
    for (const track of this.state.tracks()) {
      const match = track.sessions.find(session => session.id === sessionId);
      if (match) return match.title;
    }
    return 'Formation session';
  }

  openLeaderPrep(): void {
    this.drawerKind.set('leader');
    this.showDrawer();
  }

  openCreateTrack(): void {
    this.trackTitle = '';
    this.trackSubtitle = '';
    this.trackSource = 'DWCIM';
    this.drawerKind.set('track');
    this.showDrawer();
  }

  createTrack(): void {
    const created = this.state.createTrack(this.trackTitle, this.trackSubtitle, this.trackSource);
    if (!created) return;
    this.state.assignTrack(this.state.selectedGroupId(), created.id);
    this.closeDrawer();
  }

  assignTrack(track: FormationTrack): void {
    this.state.assignTrack(this.state.selectedGroupId(), track.id);
  }

  openAcademyBoundary(): void {
    this.drawerKind.set('academy');
    this.showDrawer();
  }

  saveSessionNote(session: FormationSession): void {
    this.state.saveSessionNote(this.state.selectedGroupId(), session.id, this.sessionNoteDraft);
  }

  copyQuestion(question: string): void {
    this.questionDraft = question;
  }

  saveQuestion(): void {
    this.state.addQuestion(this.questionDraft);
    this.questionDraft = '';
  }

  advanceLeadership(member: FormationMember): void {
    this.state.moveLeadership(member.id, this.state.nextLeadershipStage(member.leadershipStage));
  }

  stageCount(stage: LeadershipStage): number {
    return this.state.members().filter(member => member.leadershipStage === stage).length;
  }

  leadershipPipelineTotal(): number {
    const memberIndex = this.state.leadershipStages().indexOf('Serving');
    return this.state.members().filter(member => this.state.leadershipStages().indexOf(member.leadershipStage) >= memberIndex).length;
  }

  groupCountForTrack(trackId: string): number {
    return this.state.groups().filter(group => group.trackId === trackId).length;
  }

  missedSessionTotal(): number {
    return this.state.selectedMembers().reduce((total, member) => total + member.missedSessionIds.length, 0);
  }

  testimonyTotal(): number {
    return this.state.members().reduce((total, member) => total + member.testimonies.length, 0);
  }

  reviewValue(field: 'leaderReview' | 'memberNextSteps' | 'testimoniesCaptured' | 'commissioningPlanned' | 'rolloverReady'): boolean {
    return this.state.reviewFor(this.state.selectedGroupId())[field];
  }

  toggleReview(field: 'leaderReview' | 'memberNextSteps' | 'testimoniesCaptured' | 'commissioningPlanned' | 'rolloverReady', value: boolean): void {
    this.state.updateSemesterReview(this.state.selectedGroupId(), field, value);
  }

  reviewPercent(): number {
    const review = this.state.reviewFor(this.state.selectedGroupId());
    const values = [review.leaderReview, review.memberNextSteps, review.testimoniesCaptured, review.commissioningPlanned, review.rolloverReady];
    return Math.round(values.filter(Boolean).length * 100 / values.length);
  }

  commission(member: FormationMember): void {
    if (!member.commissioned) this.state.commissionMember(member.id);
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  }

  drawerEyebrow(): string {
    switch (this.drawerKind()) {
      case 'session': return `Formation session · ${this.state.selectedGroup().name}`;
      case 'practice': return 'Between gatherings';
      case 'member': return 'Person-in-community formation';
      case 'leader': return 'Leader development';
      case 'track': return 'Curriculum builder';
      case 'academy': return 'ApostolOS architecture';
      default: return 'Divine Empowerment Groups';
    }
  }

  drawerTitle(): string {
    switch (this.drawerKind()) {
      case 'session': return this.selectedSession()?.title ?? 'Formation session';
      case 'practice': return 'Create group practice';
      case 'member': return this.selectedMember()?.name ?? 'Member formation';
      case 'leader': return 'Prepare leaders who multiply';
      case 'track': return 'Create DEG formation track';
      case 'academy': return 'DEG formation + Kingdom Academy';
      default: return 'Formation';
    }
  }

  drawerDescription(): string {
    switch (this.drawerKind()) {
      case 'session': return 'Teach from Scripture and trusted curriculum, then move the group into discussion, practice, prayer and relational follow-up.';
      case 'practice': return 'Carry formation into ordinary life with one concrete next step.';
      case 'member': return 'See the person across participation, household context, growth, testimony, service and leadership—not as a spiritual score.';
      case 'leader': return 'Formation leaders prepare both the content and the people, while developing the next leader in the room.';
      case 'track': return 'Create a DWCIM pathway or link Academy-owned content while Engagements keeps ownership of the DEG journey.';
      case 'academy': return 'Share curriculum across modules without duplicating system ownership.';
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

  private refreshMember(memberId: string): void {
    this.selectedMember.set(this.state.members().find(member => member.id === memberId) ?? null);
  }

  private showDrawer(): void {
    queueMicrotask(() => {
      const dialog = this.formationDialog?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }
}
