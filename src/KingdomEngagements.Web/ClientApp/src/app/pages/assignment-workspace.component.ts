import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CareNetworkStoreService } from '../core/care-network-store.service';
import { EngagementsApiService } from '../core/engagements-api.service';
import {
  CareNetworkState,
  CarePartner,
  CareReferral,
  EngagementCompletion,
  EngagementDetails,
  MinistryResponse,
} from '../core/models';

type WorkspaceTab = 'overview' | 'checklist' | 'travel' | 'contacts' | 'care' | 'documents' | 'closeout';

@Component({
  selector: 'app-assignment-workspace',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="eng-page workspace-page">
      <a class="back-link" routerLink="/">← Assignments</a>

      @if (loading()) {
        <div class="loading-state">Loading assignment workspace…</div>
      } @else if (error()) {
        <div class="loading-state loading-state--error">{{ error() }}</div>
      } @else if (assignment(); as item) {
        <header class="workspace-header">
          <div>
            <p class="eng-eyebrow">{{ item.summary.externalAssignmentId }}</p>
            <h1>{{ item.summary.title }}</h1>
            <p>{{ item.summary.hostOrganization }} · {{ item.summary.location || 'Location pending' }}</p>
          </div>
          <div class="workspace-header__status">
            <strong>{{ item.summary.readinessPercent }}%</strong>
            <span>readiness</span>
            <small>{{ item.summary.openTasks }} open tasks</small>
          </div>
        </header>

        <nav class="assignment-tabs" aria-label="Assignment workspace">
          <section class="tab-group">
            <span>Preparation</span>
            <div>
              <button [class.active]="tab() === 'overview'" (click)="tab.set('overview')"><strong>Overview</strong><small>Assignment brief</small></button>
              <button [class.active]="tab() === 'checklist'" (click)="tab.set('checklist')"><strong>Checklist</strong><small>Readiness work</small></button>
              <button [class.active]="tab() === 'travel'" (click)="tab.set('travel')"><strong>Travel</strong><small>Flights and lodging</small></button>
              <button [class.active]="tab() === 'contacts'" (click)="tab.set('contacts')"><strong>Contacts</strong><small>People and hosts</small></button>
            </div>
          </section>
          <section class="tab-group tab-group--ministry">
            <span>Ministry</span>
            <div>
              <button [class.active]="tab() === 'care'" (click)="tab.set('care')">
                <strong>Care Network</strong>
                <small>Responses, referrals and handoffs</small>
              </button>
            </div>
          </section>
          <section class="tab-group">
            <span>Record</span>
            <div>
              <button [class.active]="tab() === 'documents'" (click)="tab.set('documents')"><strong>Documents</strong><small>Files and resources</small></button>
              <button [class.active]="tab() === 'closeout'" (click)="tab.set('closeout')"><strong>Closeout</strong><small>Outcome and completion</small></button>
            </div>
          </section>
        </nav>

        @switch (tab()) {
          @case ('overview') {
            <section class="overview-grid">
              <article class="eng-section overview-card">
                <p class="eng-eyebrow">Assignment brief</p>
                <h2>{{ item.summary.title }}</h2>
                <dl>
                  <div><dt>Speaker</dt><dd>{{ item.summary.speakerName }}</dd></div>
                  <div><dt>Host</dt><dd>{{ item.summary.hostOrganization }}</dd></div>
                  <div><dt>Date</dt><dd>{{ dateLabel(item.summary.startsAtUtc) }}</dd></div>
                  <div><dt>Location</dt><dd>{{ item.summary.location || 'Pending' }}</dd></div>
                </dl>
              </article>
              <article class="eng-section overview-card">
                <p class="eng-eyebrow">Readiness by work area</p>
                <div class="readiness-list">
                  <span><b>Travel</b><em>{{ item.summary.travelStatus }}</em></span>
                  <span><b>Lodging</b><em>{{ item.summary.lodgingStatus }}</em></span>
                  <span><b>Transportation</b><em>{{ item.summary.transportationStatus }}</em></span>
                  <span><b>Host coordination</b><em>{{ item.summary.hostStatus }}</em></span>
                  <span><b>Documents</b><em>{{ item.summary.documentsStatus }}</em></span>
                </div>
              </article>
            </section>
          }
          @case ('care') {
            <section class="care-network">
              <header class="care-network__header">
                <div>
                  <p class="eng-eyebrow">Ministry · Care Network</p>
                  <h2>Responses, referrals and handoffs</h2>
                  <p>
                    Move each response from documented consent to a trusted local church,
                    then confirm that a real connection was made.
                  </p>
                </div>
                <span class="network-summary">{{ completion()?.responses?.length || 0 }} responses</span>
              </header>

              <section class="care-metrics">
                <article><span>Needs action</span><strong>{{ needsActionCount() }}</strong><small>Consent or referral needed</small></article>
                <article><span>Awaiting church</span><strong>{{ awaitingCount() }}</strong><small>Sent or under review</small></article>
                <article><span>Accepted</span><strong>{{ acceptedCount() }}</strong><small>Church owns next step</small></article>
                <article><span>Connected</span><strong>{{ connectedCount() }}</strong><small>Connection confirmed</small></article>
              </section>

              <div class="care-layout">
                <aside class="response-queue">
                  <header>
                    <div><strong>Response queue</strong><small>People needing accountable follow-up</small></div>
                  </header>
                  @if ((completion()?.responses?.length || 0) === 0) {
                    <p class="empty-copy">No individual ministry responses are recorded for this assignment yet.</p>
                  } @else {
                    @for (response of completion()?.responses || []; track response.id) {
                      <button
                        type="button"
                        class="response-row"
                        [class.active]="selectedResponseId() === response.id"
                        (click)="selectResponse(response.id)">
                        <span class="response-avatar">{{ initials(response.personName || response.type) }}</span>
                        <span>
                          <strong>{{ response.personName || response.typeLabel || response.type }}</strong>
                          <small>{{ responseTypeLabel(response) }} · {{ response.followUpStatus.replace('-', ' ') }}</small>
                        </span>
                        <em>{{ responseStatus(response) }}</em>
                      </button>
                    }
                  }
                </aside>

                <main class="care-workspace">
                  @if (selectedResponse(); as response) {
                    <section class="response-detail">
                      <div class="response-detail__heading">
                        <div>
                          <p class="eng-eyebrow">Ministry response</p>
                          <h3>{{ response.personName || responseTypeLabel(response) }}</h3>
                          <p>{{ response.notes || 'Individual follow-up requested from this assignment.' }}</p>
                        </div>
                        <span class="priority-chip">{{ response.requiresFollowUp ? 'Follow-up required' : 'Recorded' }}</span>
                      </div>

                      <dl class="person-facts">
                        <div><dt>Email</dt><dd>{{ response.email || 'Not provided' }}</dd></div>
                        <div><dt>Phone</dt><dd>{{ response.phone || 'Not provided' }}</dd></div>
                        <div><dt>Owner</dt><dd>{{ response.followUpOwner || 'Michael Davis' }}</dd></div>
                        <div><dt>Received</dt><dd>{{ dateLabel(response.createdAtUtc) }}</dd></div>
                      </dl>
                    </section>

                    @if (!consentConfirmed(response)) {
                      <section class="consent-card">
                        <span class="consent-card__icon">!</span>
                        <div>
                          <p class="eng-eyebrow">Consent required</p>
                          <h3>Verify documented permission before referral.</h3>
                          <p>
                            Confirm that this person gave permission for their contact details and
                            request to be shared with a local Care Network church.
                          </p>
                        </div>
                        <button type="button" class="eng-button" (click)="verifyConsent(response.id)">Verify documented consent</button>
                      </section>
                    } @else if (!activeReferral()) {
                      <section class="partner-section">
                        <header>
                          <div>
                            <p class="eng-eyebrow">Trusted church directory</p>
                            <h3>Choose the best local care partner.</h3>
                          </div>
                          <span class="consent-ok">✓ Consent verified</span>
                        </header>

                        <div class="partner-grid">
                          @for (partner of network()?.partners || []; track partner.id) {
                            <button
                              type="button"
                              class="partner-card"
                              [class.selected]="selectedPartner()?.id === partner.id"
                              (click)="selectPartner(response.id, partner.id)">
                              <span class="partner-card__top">
                                <strong>{{ partner.name }}</strong>
                                <em>{{ partner.distanceMiles }} mi</em>
                              </span>
                              <small>{{ partner.city }}, {{ partner.state }} · {{ partner.relationship.replace('-', ' ') }}</small>
                              <p>{{ partner.notes }}</p>
                              <span class="partner-tags">
                                @for (ministry of partner.ministries; track ministry) { <i>{{ ministry }}</i> }
                              </span>
                              <b [attr.data-availability]="partner.availability">{{ partner.availability }}</b>
                            </button>
                          }
                        </div>

                        @if (selectedPartner(); as partner) {
                          <section class="referral-composer">
                            <div>
                              <p class="eng-eyebrow">Referral to {{ partner.name }}</p>
                              <h3>Send only what the receiving church needs.</h3>
                              <p>{{ partner.contactName }} · {{ partner.contactRole }} · response target {{ partner.responseSlaHours }} hours</p>
                            </div>
                            <label>
                              <span>Personal message</span>
                              <textarea #referralMessage rows="4">{{ defaultReferralMessage(response, partner) }}</textarea>
                            </label>
                            <button
                              type="button"
                              class="eng-button"
                              (click)="sendReferral(response.id, referralMessage.value)">
                              Send church referral
                            </button>
                          </section>
                        }
                      </section>
                    } @else if (activeReferral(); as referral) {
                      <section class="referral-status">
                        <header>
                          <div>
                            <p class="eng-eyebrow">Church handoff</p>
                            <h3>{{ partnerFor(referral)?.name }}</h3>
                            <p>{{ networkStore.statusLabel(referral.status) }}</p>
                          </div>
                          <span class="eng-status" [attr.data-status]="referral.status">{{ networkStore.statusLabel(referral.status) }}</span>
                        </header>

                        <div class="handoff-track">
                          <span class="done"><b>1</b><small>Referral sent</small></span>
                          <span [class.done]="referral.status !== 'sent'"><b>2</b><small>Church reviewed</small></span>
                          <span [class.done]="['accepted','connected'].includes(referral.status)"><b>3</b><small>Responsibility accepted</small></span>
                          <span [class.done]="referral.status === 'connected'"><b>4</b><small>Person connected</small></span>
                        </div>

                        <div class="referral-actions">
                          @if (referral.status === 'sent') {
                            <button type="button" class="eng-button secondary" (click)="openChurchResponse(referral.id)">Open church response</button>
                            <button type="button" class="eng-button secondary" (click)="sendReminder(referral.id)">Send reminder</button>
                          }
                          @if (referral.status === 'viewed') {
                            <button type="button" class="eng-button secondary" (click)="openChurchResponse(referral.id)">Continue church response</button>
                          }
                          @if (referral.status === 'accepted') {
                            <button type="button" class="eng-button" (click)="confirmConnection(referral.id)">Confirm person connected</button>
                          }
                          @if (referral.status === 'connected') {
                            <span class="connection-complete">✓ Connection confirmed. Care responsibility is complete for this assignment.</span>
                          }
                        </div>

                        @if (churchResponseReferralId() === referral.id && ['sent','viewed'].includes(referral.status)) {
                          <section class="church-response">
                            <p class="eng-eyebrow">Receiving church view</p>
                            <h3>{{ partnerFor(referral)?.name }} received this referral.</h3>
                            <p>
                              The receiving church sees the consented referral, the requested support,
                              and the sender contact—not the private Engagements record.
                            </p>
                            <div>
                              <button type="button" class="eng-button accept" (click)="respondFromChurch(referral.id, 'accepted')">Accept care responsibility</button>
                              <button type="button" class="eng-button decline" (click)="respondFromChurch(referral.id, 'declined')">Unable to accept</button>
                            </div>
                          </section>
                        }
                      </section>
                    }
                  } @else {
                    <div class="empty-workspace">
                      <strong>Select a ministry response.</strong>
                      <p>The Care Network workspace will open here.</p>
                    </div>
                  }
                </main>
              </div>
            </section>
          }
          @default {
            <section class="eng-section migration-placeholder">
              <p class="eng-eyebrow">Angular migration</p>
              <h2>{{ tabLabel(tab()) }}</h2>
              <p>
                This tab is still served by the legacy client while we port it component-for-component.
                The assignment shell and Care Network are already Angular.
              </p>
              <a class="eng-button secondary" href="/#assignments">Open this assignment in the current client</a>
            </section>
          }
        }
      }
    </section>
  `,
  styles: [`
    .workspace-page { padding-top:1.25rem; }
    .back-link { display:inline-block; margin:.35rem 0 1rem; color:#526178; font-size:.8rem; font-weight:800; text-decoration:none; }
    .workspace-header { display:flex; align-items:flex-end; justify-content:space-between; gap:2rem; padding-bottom:1.35rem; border-bottom:1px solid var(--eng-line); }
    .workspace-header h1 { margin:0; font-size:clamp(2rem,4vw,3.5rem); line-height:1; letter-spacing:-.04em; }
    .workspace-header p:last-child { margin:.55rem 0 0; color:var(--eng-muted); }
    .workspace-header__status { display:grid; min-width:130px; justify-items:end; }
    .workspace-header__status strong { font-size:2rem; }
    .workspace-header__status span,.workspace-header__status small { color:var(--eng-muted); font-size:.75rem; }
    .assignment-tabs { display:flex; gap:0; margin-top:1rem; overflow:auto; border:1px solid var(--eng-line); border-radius:10px; background:rgba(255,255,255,.72); }
    .tab-group { display:flex; min-width:max-content; align-items:stretch; border-right:1px solid var(--eng-line); }
    .tab-group:last-child { border-right:0; }
    .tab-group > span { width:72px; padding:.9rem .55rem; color:#818897; font-size:.64rem; font-weight:900; letter-spacing:.1em; text-transform:uppercase; writing-mode:vertical-rl; transform:rotate(180deg); text-align:center; border-right:1px solid var(--eng-line); }
    .tab-group > div { display:flex; }
    .tab-group button { min-width:150px; padding:.8rem .9rem; border:0; border-right:1px solid rgba(18,26,44,.08); text-align:left; color:var(--eng-ink); background:transparent; cursor:pointer; }
    .tab-group button:last-child { border-right:0; }
    .tab-group button strong,.tab-group button small { display:block; }
    .tab-group button strong { font-size:.82rem; }
    .tab-group button small { margin-top:.22rem; color:#7f8795; font-size:.68rem; }
    .tab-group button.active { background:#fff; box-shadow:inset 0 -2px 0 var(--eng-violet); }
    .tab-group--ministry > span { color:#315faf; }
    .tab-group--ministry button.active { box-shadow:inset 0 -2px 0 #315faf; }
    .overview-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .overview-card { padding:1.4rem; }
    .overview-card h2 { margin:0 0 1rem; font-size:1.6rem; }
    .overview-card dl { display:grid; grid-template-columns:1fr 1fr; gap:0; margin:0; border:1px solid var(--eng-line); border-radius:8px; overflow:hidden; }
    .overview-card dl div { padding:.8rem; border-right:1px solid var(--eng-line); border-bottom:1px solid var(--eng-line); }
    .overview-card dt { color:var(--eng-muted); font-size:.68rem; text-transform:uppercase; }
    .overview-card dd { margin:.25rem 0 0; font-weight:800; }
    .readiness-list { display:grid; border-top:1px solid var(--eng-line); }
    .readiness-list span { display:flex; justify-content:space-between; gap:1rem; padding:.85rem 0; border-bottom:1px solid var(--eng-line); }
    .readiness-list em { color:var(--eng-muted); font-style:normal; text-transform:capitalize; }
    .care-network { margin-top:1rem; border:1px solid var(--eng-line); border-radius:12px; background:#fffdfa; overflow:hidden; }
    .care-network__header { display:flex; align-items:flex-start; justify-content:space-between; gap:2rem; padding:1.35rem 1.45rem; border-bottom:1px solid var(--eng-line); }
    .care-network__header h2 { margin:0; font-size:1.65rem; }
    .care-network__header p:last-child { max-width:780px; margin:.45rem 0 0; color:var(--eng-muted); line-height:1.5; }
    .network-summary { padding:.45rem .65rem; border-radius:999px; background:#eef1f5; color:#536075; font-size:.72rem; font-weight:850; }
    .care-metrics { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid var(--eng-line); }
    .care-metrics article { padding:1rem 1.2rem; border-right:1px solid var(--eng-line); }
    .care-metrics article:last-child { border-right:0; }
    .care-metrics span,.care-metrics small { display:block; color:var(--eng-muted); font-size:.7rem; }
    .care-metrics strong { display:block; margin:.2rem 0; font-size:1.65rem; }
    .care-layout { display:grid; grid-template-columns:330px minmax(0,1fr); min-height:600px; }
    .response-queue { border-right:1px solid var(--eng-line); background:#faf8f4; }
    .response-queue > header { padding:1rem; border-bottom:1px solid var(--eng-line); }
    .response-queue > header strong,.response-queue > header small { display:block; }
    .response-queue > header small { margin-top:.2rem; color:var(--eng-muted); font-size:.72rem; }
    .response-row { display:grid; grid-template-columns:38px minmax(0,1fr); gap:.7rem; width:100%; padding:.85rem 1rem; border:0; border-bottom:1px solid rgba(18,26,44,.08); text-align:left; background:transparent; cursor:pointer; }
    .response-row.active { background:#fff; box-shadow:inset 3px 0 0 var(--eng-violet); }
    .response-avatar { display:grid; width:36px; height:36px; place-items:center; border-radius:8px; color:#315faf; background:#eaf0fc; font-size:.7rem; font-weight:900; }
    .response-row strong,.response-row small,.response-row em { display:block; }
    .response-row small { margin-top:.15rem; color:var(--eng-muted); font-size:.67rem; }
    .response-row em { grid-column:2; color:#5f6a7a; font-size:.65rem; font-style:normal; font-weight:800; }
    .care-workspace { min-width:0; padding:1.2rem; }
    .response-detail { padding-bottom:1.1rem; border-bottom:1px solid var(--eng-line); }
    .response-detail__heading { display:flex; justify-content:space-between; gap:1rem; }
    .response-detail h3,.partner-section h3,.referral-status h3,.consent-card h3 { margin:0; font-size:1.45rem; }
    .response-detail__heading p:last-child { max-width:700px; color:var(--eng-muted); line-height:1.5; }
    .priority-chip,.consent-ok { height:fit-content; padding:.4rem .55rem; border-radius:999px; font-size:.68rem; font-weight:850; }
    .priority-chip { color:#6f4e1d; background:#f8eddb; }
    .consent-ok { color:#287253; background:#e8f4ed; }
    .person-facts { display:grid; grid-template-columns:repeat(4,1fr); margin:1rem 0 0; border:1px solid var(--eng-line); border-radius:8px; overflow:hidden; }
    .person-facts div { padding:.7rem; border-right:1px solid var(--eng-line); }
    .person-facts div:last-child { border-right:0; }
    .person-facts dt { color:var(--eng-muted); font-size:.63rem; text-transform:uppercase; }
    .person-facts dd { margin:.2rem 0 0; font-size:.78rem; font-weight:800; overflow-wrap:anywhere; }
    .consent-card { display:grid; grid-template-columns:42px minmax(0,1fr) auto; align-items:start; gap:1rem; margin-top:1.2rem; padding:1.1rem; border:1px solid #e1c99f; border-radius:9px; background:#fff8eb; }
    .consent-card__icon { display:grid; width:38px; height:38px; place-items:center; border-radius:50%; color:#fff; background:#a36a22; font-weight:900; }
    .consent-card p:last-child { margin:.35rem 0 0; color:#77694f; line-height:1.45; }
    .partner-section { margin-top:1.2rem; }
    .partner-section > header { display:flex; justify-content:space-between; gap:1rem; align-items:start; }
    .partner-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; margin-top:1rem; }
    .partner-card { position:relative; padding:1rem; border:1px solid var(--eng-line); border-radius:9px; text-align:left; background:#fff; cursor:pointer; }
    .partner-card.selected { border-color:#7b65d6; box-shadow:0 0 0 2px rgba(106,79,215,.12); }
    .partner-card__top { display:flex; justify-content:space-between; gap:.75rem; }
    .partner-card__top em { color:var(--eng-muted); font-size:.68rem; font-style:normal; }
    .partner-card > small { display:block; margin:.25rem 0; color:var(--eng-muted); font-size:.67rem; }
    .partner-card > p { min-height:3em; color:#5e6878; font-size:.72rem; line-height:1.45; }
    .partner-tags { display:flex; flex-wrap:wrap; gap:.25rem; }
    .partner-tags i { padding:.2rem .35rem; border-radius:999px; color:#576175; background:#f0f2f5; font-size:.58rem; font-style:normal; }
    .partner-card > b { display:inline-block; margin-top:.65rem; color:#267253; font-size:.64rem; text-transform:capitalize; }
    .partner-card > b[data-availability='limited'] { color:#a36a22; }
    .referral-composer { display:grid; grid-template-columns:minmax(240px,.8fr) minmax(300px,1.2fr) auto; align-items:end; gap:1rem; margin-top:1rem; padding:1rem; border-radius:9px; color:#e8ecf5; background:#172033; }
    .referral-composer h3 { margin:0; font-size:1.05rem; }
    .referral-composer p { margin:.25rem 0 0; color:#aab2c1; font-size:.7rem; }
    .referral-composer label span { display:block; margin-bottom:.35rem; color:#c5cbd6; font-size:.68rem; font-weight:750; }
    .referral-composer textarea { width:100%; padding:.65rem; border:1px solid rgba(255,255,255,.15); border-radius:7px; color:#fff; background:rgba(255,255,255,.07); resize:vertical; }
    .referral-status { margin-top:1.2rem; }
    .referral-status > header { display:flex; justify-content:space-between; gap:1rem; }
    .referral-status > header p:last-child { margin:.3rem 0 0; color:var(--eng-muted); }
    .handoff-track { display:grid; grid-template-columns:repeat(4,1fr); margin-top:1rem; border:1px solid var(--eng-line); border-radius:8px; overflow:hidden; }
    .handoff-track span { position:relative; display:grid; gap:.3rem; justify-items:center; padding:1rem .5rem; color:#8a909a; background:#faf9f7; }
    .handoff-track span + span { border-left:1px solid var(--eng-line); }
    .handoff-track b { display:grid; width:28px; height:28px; place-items:center; border-radius:50%; background:#e7e9ed; font-size:.7rem; }
    .handoff-track small { font-size:.64rem; text-align:center; }
    .handoff-track span.done { color:#225d46; background:#f1f8f4; }
    .handoff-track span.done b { color:#fff; background:#2d7d5c; }
    .referral-actions { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:1rem; }
    .connection-complete { padding:.7rem .8rem; border-radius:7px; color:#266e50; background:#e8f4ed; font-size:.78rem; font-weight:800; }
    .church-response { margin-top:1rem; padding:1.2rem; border-radius:10px; color:#e8ecf5; background:#1c1721; }
    .church-response h3 { margin:0; color:#fff; }
    .church-response p:last-of-type { color:#b9b2bf; line-height:1.5; }
    .church-response > div { display:flex; gap:.6rem; }
    .church-response .accept { background:#edf7f1; color:#24694d; }
    .church-response .decline { background:#fff0ef; color:#9c403c; }
    .empty-copy,.empty-workspace,.loading-state { padding:2.5rem; color:var(--eng-muted); text-align:center; }
    .empty-workspace strong { color:var(--eng-ink); }
    .loading-state--error { color:var(--eng-danger); }
    .migration-placeholder { padding:1.5rem; }
    .migration-placeholder h2 { margin:0; }
    .migration-placeholder p:not(.eng-eyebrow) { max-width:700px; color:var(--eng-muted); line-height:1.5; }
    @media (max-width:1100px) {
      .care-layout { grid-template-columns:280px minmax(0,1fr); }
      .partner-grid { grid-template-columns:1fr; }
      .referral-composer { grid-template-columns:1fr; }
      .person-facts { grid-template-columns:repeat(2,1fr); }
      .care-metrics { grid-template-columns:repeat(2,1fr); }
      .care-metrics article:nth-child(2) { border-right:0; }
    }
    @media (max-width:760px) {
      .workspace-header { align-items:flex-start; }
      .workspace-header__status { display:none; }
      .overview-grid { grid-template-columns:1fr; }
      .care-layout { grid-template-columns:1fr; }
      .response-queue { border-right:0; border-bottom:1px solid var(--eng-line); }
      .consent-card { grid-template-columns:42px minmax(0,1fr); }
      .consent-card button { grid-column:1/-1; }
      .handoff-track { grid-template-columns:1fr 1fr; }
      .handoff-track span:nth-child(3) { border-left:0; border-top:1px solid var(--eng-line); }
      .handoff-track span:nth-child(4) { border-top:1px solid var(--eng-line); }
    }
  `],
})
export class AssignmentWorkspaceComponent implements OnInit {
  readonly assignment = signal<EngagementDetails | null>(null);
  readonly completion = signal<EngagementCompletion | null>(null);
  readonly network = signal<CareNetworkState | null>(null);
  readonly selectedResponseId = signal<string | null>(null);
  readonly churchResponseReferralId = signal<number | null>(null);
  readonly tab = signal<WorkspaceTab>('overview');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly selectedResponse = computed(() => {
    const id = this.selectedResponseId();
    return this.completion()?.responses.find((response) => response.id === id) ?? null;
  });

  readonly activeReferral = computed(() => {
    const state = this.network();
    const response = this.selectedResponse();
    if (!state || !response) return null;
    return this.networkStore.latestReferral(state, response.id);
  });

  readonly selectedPartner = computed(() => {
    const state = this.network();
    const response = this.selectedResponse();
    if (!state || !response) return null;
    return this.networkStore.partner(state, state.selectedPartnerByResponse[response.id] ?? 302);
  });

  readonly needsActionCount = computed(() => {
    const responses = this.completion()?.responses ?? [];
    const state = this.network();
    if (!state) return responses.length;
    return responses.filter((response) => !this.consentConfirmed(response) || !this.networkStore.latestReferral(state, response.id)).length;
  });

  readonly awaitingCount = computed(() => {
    const state = this.network();
    if (!state) return 0;
    return state.referrals.filter((item) => ['sent', 'viewed'].includes(item.status)).length;
  });

  readonly acceptedCount = computed(() => {
    const state = this.network();
    if (!state) return 0;
    return state.referrals.filter((item) => item.status === 'accepted').length;
  });

  readonly connectedCount = computed(() => {
    const state = this.network();
    if (!state) return 0;
    return state.referrals.filter((item) => item.status === 'connected').length;
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: EngagementsApiService,
    public readonly networkStore: CareNetworkStoreService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('The assignment identifier is missing.');
      this.loading.set(false);
      return;
    }

    forkJoin({
      assignment: this.api.getAssignment(id),
      completion: this.api.getCompletion(id),
    }).subscribe({
      next: ({ assignment, completion }) => {
        this.assignment.set(assignment);
        this.completion.set(completion);
        this.network.set(this.networkStore.get(assignment));
        this.selectedResponseId.set(
          completion.responses.find((response) => response.requiresFollowUp)?.id
            ?? completion.responses[0]?.id
            ?? null,
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('This assignment workspace could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  selectResponse(id: string): void {
    this.selectedResponseId.set(id);
    this.churchResponseReferralId.set(null);
  }

  verifyConsent(responseId: string): void {
    const assignmentId = this.assignment()?.summary.id;
    if (!assignmentId) return;
    this.network.set(this.networkStore.setConsent(assignmentId, responseId, true));
  }

  selectPartner(responseId: string, partnerId: number): void {
    const assignmentId = this.assignment()?.summary.id;
    if (!assignmentId) return;
    this.network.set(this.networkStore.selectPartner(assignmentId, responseId, partnerId));
  }

  sendReferral(responseId: string, message: string): void {
    const assignmentId = this.assignment()?.summary.id;
    if (!assignmentId) return;
    this.network.set(this.networkStore.sendReferral(assignmentId, responseId, message));
  }

  openChurchResponse(referralId: number): void {
    const assignmentId = this.assignment()?.summary.id;
    if (!assignmentId) return;
    this.network.set(this.networkStore.updateReferral(assignmentId, referralId, 'viewed'));
    this.churchResponseReferralId.set(referralId);
  }

  respondFromChurch(referralId: number, status: 'accepted' | 'declined'): void {
    const assignmentId = this.assignment()?.summary.id;
    if (!assignmentId) return;
    this.network.set(this.networkStore.updateReferral(assignmentId, referralId, status));
    this.churchResponseReferralId.set(null);
  }

  sendReminder(referralId: number): void {
    const assignmentId = this.assignment()?.summary.id;
    if (!assignmentId) return;
    this.network.set(this.networkStore.remind(assignmentId, referralId));
  }

  confirmConnection(referralId: number): void {
    const assignmentId = this.assignment()?.summary.id;
    if (!assignmentId) return;
    this.network.set(this.networkStore.updateReferral(assignmentId, referralId, 'connected'));
  }

  consentConfirmed(response: MinistryResponse): boolean {
    return response.careHandoffCreated || this.network()?.consentByResponse[response.id] === true;
  }

  partnerFor(referral: CareReferral): CarePartner | null {
    const state = this.network();
    return state ? this.networkStore.partner(state, referral.partnerId) : null;
  }

  responseStatus(response: MinistryResponse): string {
    const state = this.network();
    if (!state) return response.followUpStatus.replace('-', ' ');
    const referral = this.networkStore.latestReferral(state, response.id);
    if (referral) return this.networkStore.statusLabel(referral.status);
    return this.consentConfirmed(response) ? 'Ready to refer' : 'Consent needed';
  }

  responseTypeLabel(response: MinistryResponse): string {
    return response.type
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  defaultReferralMessage(response: MinistryResponse, partner: CarePartner): string {
    const person = response.personName || 'This person';
    return `${person} requested ${this.responseTypeLabel(response).toLowerCase()} follow-up after this assignment. Please let our team know whether ${partner.name} can receive this referral and take responsibility for the next local connection.`;
  }

  initials(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  dateLabel(value: string | null): string {
    if (!value) return 'Pending';
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  tabLabel(tab: WorkspaceTab): string {
    const labels: Record<WorkspaceTab, string> = {
      overview: 'Overview',
      checklist: 'Checklist',
      travel: 'Travel',
      contacts: 'Contacts',
      care: 'Care Network',
      documents: 'Documents',
      closeout: 'Closeout',
    };
    return labels[tab];
  }
}
