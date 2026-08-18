import { Component, Input, computed, signal } from '@angular/core';
import { CareNetworkStoreService } from '../../core/care-network-store.service';
import {
  CareNetworkState,
  CarePartner,
  CareReferral,
  EngagementCompletion,
  EngagementDetails,
  MinistryResponse,
} from '../../core/models';

@Component({
  selector: 'app-care-network-tab',
  standalone: true,
  template: `
    <section class="care-network">
      <header class="care-network__header">
        <div>
          <p>Ministry · Care Network</p>
          <h2>Responses, referrals and handoffs</h2>
          <span>
            Move each response from documented consent to a trusted local church,
            then confirm that a real connection was made.
          </span>
        </div>
        <b>{{ completion.responses.length }} responses</b>
      </header>

      <section class="care-metrics">
        <article><span>Needs action</span><strong>{{ needsActionCount() }}</strong><small>Consent or referral needed</small></article>
        <article><span>Awaiting church</span><strong>{{ awaitingCount() }}</strong><small>Sent or under review</small></article>
        <article><span>Accepted</span><strong>{{ acceptedCount() }}</strong><small>Church owns next step</small></article>
        <article><span>Connected</span><strong>{{ connectedCount() }}</strong><small>Connection confirmed</small></article>
      </section>

      <div class="care-layout">
        <aside class="response-queue">
          <header><div><strong>Response queue</strong><small>People needing accountable follow-up</small></div></header>
          @if (completion.responses.length === 0) {
            <p class="empty-copy">No individual ministry responses are recorded for this assignment yet.</p>
          } @else {
            @for (response of completion.responses; track response.id) {
              <button
                type="button"
                class="response-row"
                [class.active]="selectedResponseId() === response.id"
                (click)="selectResponse(response.id)">
                <span class="response-avatar">{{ initials(response.personName || response.type) }}</span>
                <span>
                  <strong>{{ response.personName || responseTypeLabel(response) }}</strong>
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
                  <p>Ministry response</p>
                  <h3>{{ response.personName || responseTypeLabel(response) }}</h3>
                  <span>{{ response.notes || 'Individual follow-up requested from this assignment.' }}</span>
                </div>
                <b>{{ response.requiresFollowUp ? 'Follow-up required' : 'Recorded' }}</b>
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
                  <p>Consent required</p>
                  <h3>Verify documented permission before referral.</h3>
                  <span>
                    Confirm that this person gave permission for their contact details and
                    request to be shared with a local Care Network church.
                  </span>
                </div>
                <button type="button" (click)="verifyConsent(response.id)">Verify documented consent</button>
              </section>
            } @else if (!activeReferral()) {
              <section class="partner-section">
                <header>
                  <div><p>Trusted church directory</p><h3>Choose the best local care partner.</h3></div>
                  <span>✓ Consent verified</span>
                </header>

                <div class="partner-grid">
                  @for (partner of network()?.partners || []; track partner.id) {
                    <button
                      type="button"
                      class="partner-card"
                      [class.selected]="selectedPartner()?.id === partner.id"
                      (click)="selectPartner(response.id, partner.id)">
                      <span class="partner-card__top"><strong>{{ partner.name }}</strong><em>{{ partner.distanceMiles }} mi</em></span>
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
                      <p>Referral to {{ partner.name }}</p>
                      <h3>Send only what the receiving church needs.</h3>
                      <span>{{ partner.contactName }} · {{ partner.contactRole }} · response target {{ partner.responseSlaHours }} hours</span>
                    </div>
                    <label>
                      <span>Personal message</span>
                      <textarea #referralMessage rows="4">{{ defaultReferralMessage(response, partner) }}</textarea>
                    </label>
                    <button type="button" (click)="sendReferral(response.id, referralMessage.value)">Send church referral</button>
                  </section>
                }
              </section>
            } @else if (activeReferral(); as referral) {
              <section class="referral-status">
                <header>
                  <div><p>Church handoff</p><h3>{{ partnerFor(referral)?.name }}</h3><span>{{ store.statusLabel(referral.status) }}</span></div>
                  <b [attr.data-status]="referral.status">{{ store.statusLabel(referral.status) }}</b>
                </header>

                <div class="handoff-track">
                  <span class="done"><b>1</b><small>Referral sent</small></span>
                  <span [class.done]="referral.status !== 'sent'"><b>2</b><small>Church reviewed</small></span>
                  <span [class.done]="['accepted','connected'].includes(referral.status)"><b>3</b><small>Responsibility accepted</small></span>
                  <span [class.done]="referral.status === 'connected'"><b>4</b><small>Person connected</small></span>
                </div>

                <div class="referral-actions">
                  @if (referral.status === 'sent') {
                    <button type="button" (click)="openChurchResponse(referral.id)">Open church response</button>
                    <button type="button" (click)="sendReminder(referral.id)">Send reminder</button>
                  }
                  @if (referral.status === 'viewed') {
                    <button type="button" (click)="openChurchResponse(referral.id)">Continue church response</button>
                  }
                  @if (referral.status === 'accepted') {
                    <button type="button" class="primary" (click)="confirmConnection(referral.id)">Confirm person connected</button>
                  }
                  @if (referral.status === 'connected') {
                    <span class="connection-complete">✓ Connection confirmed. Care responsibility is complete for this assignment.</span>
                  }
                </div>

                @if (churchResponseReferralId() === referral.id && ['sent','viewed'].includes(referral.status)) {
                  <section class="church-response">
                    <p>Receiving church view</p>
                    <h3>{{ partnerFor(referral)?.name }} received this referral.</h3>
                    <span>
                      The receiving church sees the consented referral, requested support,
                      and sender contact—not the private Engagements record.
                    </span>
                    <div>
                      <button type="button" class="accept" (click)="respondFromChurch(referral.id, 'accepted')">Accept care responsibility</button>
                      <button type="button" class="decline" (click)="respondFromChurch(referral.id, 'declined')">Unable to accept</button>
                    </div>
                  </section>
                }
              </section>
            }
          } @else {
            <div class="empty-workspace"><strong>Select a ministry response.</strong><span>The Care Network workspace will open here.</span></div>
          }
        </main>
      </div>
    </section>
  `,
  styles: [`
    .care-network{margin-top:1rem;border:1px solid var(--eng-line);border-radius:12px;background:#fffdfa;overflow:hidden}
    .care-network__header{display:flex;align-items:flex-start;justify-content:space-between;gap:2rem;padding:1.35rem 1.45rem;border-bottom:1px solid var(--eng-line)}
    .care-network__header p,.response-detail__heading p,.consent-card p,.partner-section header p,.referral-composer p,.referral-status header p,.church-response p{margin:0 0 .35rem;color:var(--eng-blue);font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    .care-network__header h2{margin:0;font-size:1.65rem}.care-network__header span{display:block;max-width:780px;margin-top:.45rem;color:var(--eng-muted);font-size:.76rem;line-height:1.5}.care-network__header>b{padding:.45rem .65rem;border-radius:999px;background:#eef1f5;color:#536075;font-size:.7rem}
    .care-metrics{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--eng-line)}.care-metrics article{padding:1rem 1.2rem;border-right:1px solid var(--eng-line)}.care-metrics article:last-child{border-right:0}.care-metrics span,.care-metrics small{display:block;color:var(--eng-muted);font-size:.68rem}.care-metrics strong{display:block;margin:.2rem 0;font-size:1.6rem}
    .care-layout{display:grid;grid-template-columns:330px minmax(0,1fr);min-height:590px}.response-queue{border-right:1px solid var(--eng-line);background:#faf8f4}.response-queue>header{padding:1rem;border-bottom:1px solid var(--eng-line)}.response-queue>header strong,.response-queue>header small{display:block}.response-queue>header small{margin-top:.2rem;color:var(--eng-muted);font-size:.7rem}
    .response-row{display:grid;grid-template-columns:38px minmax(0,1fr);gap:.7rem;width:100%;padding:.85rem 1rem;border:0;border-bottom:1px solid rgba(18,26,44,.08);text-align:left;background:transparent;cursor:pointer}.response-row.active{background:#fff;box-shadow:inset 3px 0 0 var(--eng-violet)}.response-avatar{display:grid;width:36px;height:36px;place-items:center;border-radius:8px;color:#315faf;background:#eaf0fc;font-size:.68rem;font-weight:900}.response-row strong,.response-row small,.response-row em{display:block}.response-row small{margin-top:.15rem;color:var(--eng-muted);font-size:.65rem}.response-row em{grid-column:2;color:#5f6a7a;font-size:.63rem;font-style:normal;font-weight:800}
    .care-workspace{min-width:0;padding:1.2rem}.response-detail{padding-bottom:1.1rem;border-bottom:1px solid var(--eng-line)}.response-detail__heading{display:flex;justify-content:space-between;gap:1rem}.response-detail h3,.partner-section h3,.referral-status h3,.consent-card h3{margin:0;font-size:1.4rem}.response-detail__heading span{display:block;max-width:700px;margin-top:.35rem;color:var(--eng-muted);font-size:.74rem;line-height:1.5}.response-detail__heading>b{height:fit-content;padding:.4rem .55rem;border-radius:999px;color:#6f4e1d;background:#f8eddb;font-size:.65rem}
    .person-facts{display:grid;grid-template-columns:repeat(4,1fr);margin:1rem 0 0;border:1px solid var(--eng-line);border-radius:8px;overflow:hidden}.person-facts div{padding:.7rem;border-right:1px solid var(--eng-line)}.person-facts div:last-child{border-right:0}.person-facts dt{color:var(--eng-muted);font-size:.61rem;text-transform:uppercase}.person-facts dd{margin:.2rem 0 0;font-size:.75rem;font-weight:800;overflow-wrap:anywhere}
    .consent-card{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:start;gap:1rem;margin-top:1.2rem;padding:1.1rem;border:1px solid #e1c99f;border-radius:9px;background:#fff8eb}.consent-card__icon{display:grid;width:38px;height:38px;place-items:center;border-radius:50%;color:#fff;background:#a36a22;font-weight:900}.consent-card span:not(.consent-card__icon){display:block;margin-top:.35rem;color:#77694f;font-size:.73rem;line-height:1.45}.consent-card button,.referral-composer button,.referral-actions button,.church-response button{min-height:40px;padding:.58rem .75rem;border:1px solid var(--eng-line);border-radius:7px;font-weight:800;cursor:pointer}.consent-card button,.referral-composer button,.referral-actions .primary{color:#fff;border-color:transparent;background:var(--eng-ink)}
    .partner-section{margin-top:1.2rem}.partner-section>header{display:flex;justify-content:space-between;gap:1rem;align-items:start}.partner-section>header>span{padding:.38rem .55rem;border-radius:999px;color:#287253;background:#e8f4ed;font-size:.65rem;font-weight:850}.partner-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;margin-top:1rem}.partner-card{padding:1rem;border:1px solid var(--eng-line);border-radius:9px;text-align:left;background:#fff;cursor:pointer}.partner-card.selected{border-color:#7b65d6;box-shadow:0 0 0 2px rgba(106,79,215,.12)}.partner-card__top{display:flex;justify-content:space-between;gap:.75rem}.partner-card__top em{color:var(--eng-muted);font-size:.65rem;font-style:normal}.partner-card>small{display:block;margin:.25rem 0;color:var(--eng-muted);font-size:.65rem}.partner-card>p{min-height:3em;color:#5e6878;font-size:.7rem;line-height:1.45}.partner-tags{display:flex;flex-wrap:wrap;gap:.25rem}.partner-tags i{padding:.2rem .35rem;border-radius:999px;color:#576175;background:#f0f2f5;font-size:.56rem;font-style:normal}.partner-card>b{display:inline-block;margin-top:.65rem;color:#267253;font-size:.62rem;text-transform:capitalize}.partner-card>b[data-availability='limited']{color:#a36a22}
    .referral-composer{display:grid;grid-template-columns:minmax(240px,.8fr) minmax(300px,1.2fr) auto;align-items:end;gap:1rem;margin-top:1rem;padding:1rem;border-radius:9px;color:#e8ecf5;background:#172033}.referral-composer h3{margin:0;font-size:1.05rem}.referral-composer div>span{display:block;margin-top:.25rem;color:#aab2c1;font-size:.68rem}.referral-composer label>span{display:block;margin-bottom:.35rem;color:#c5cbd6;font-size:.66rem;font-weight:750}.referral-composer textarea{width:100%;padding:.65rem;border:1px solid rgba(255,255,255,.15);border-radius:7px;color:#fff;background:rgba(255,255,255,.07);resize:vertical}.referral-composer button{color:#172033;background:#fff}
    .referral-status{margin-top:1.2rem}.referral-status>header{display:flex;justify-content:space-between;gap:1rem}.referral-status>header div>span{display:block;margin-top:.3rem;color:var(--eng-muted);font-size:.72rem}.referral-status>header>b{height:fit-content;padding:.4rem .55rem;border-radius:999px;background:#eeeafd;color:#5d48bd;font-size:.65rem}.referral-status>header>b[data-status='accepted'],.referral-status>header>b[data-status='connected']{background:#e8f4ed;color:#267052}.referral-status>header>b[data-status='declined']{background:#f9e8e7;color:#a34843}
    .handoff-track{display:grid;grid-template-columns:repeat(4,1fr);margin-top:1rem;border:1px solid var(--eng-line);border-radius:8px;overflow:hidden}.handoff-track span{display:grid;gap:.3rem;justify-items:center;padding:1rem .5rem;color:#8a909a;background:#faf9f7}.handoff-track span+span{border-left:1px solid var(--eng-line)}.handoff-track b{display:grid;width:28px;height:28px;place-items:center;border-radius:50%;background:#e7e9ed;font-size:.68rem}.handoff-track small{font-size:.62rem;text-align:center}.handoff-track span.done{color:#225d46;background:#f1f8f4}.handoff-track span.done b{color:#fff;background:#2d7d5c}
    .referral-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1rem}.referral-actions button{color:var(--eng-ink);background:#fff}.connection-complete{padding:.7rem .8rem;border-radius:7px;color:#266e50;background:#e8f4ed;font-size:.76rem;font-weight:800}
    .church-response{margin-top:1rem;padding:1.2rem;border-radius:10px;color:#e8ecf5;background:#1c1721}.church-response h3{margin:0;color:#fff}.church-response>span{display:block;margin-top:.4rem;color:#b9b2bf;font-size:.73rem;line-height:1.5}.church-response>div{display:flex;gap:.6rem;margin-top:.8rem}.church-response .accept{background:#edf7f1;color:#24694d}.church-response .decline{background:#fff0ef;color:#9c403c}
    .empty-copy,.empty-workspace{padding:2.5rem;color:var(--eng-muted);text-align:center}.empty-workspace strong,.empty-workspace span{display:block}.empty-workspace strong{color:var(--eng-ink)}.empty-workspace span{margin-top:.3rem;font-size:.72rem}
    @media(max-width:1100px){.care-layout{grid-template-columns:280px minmax(0,1fr)}.partner-grid{grid-template-columns:1fr}.referral-composer{grid-template-columns:1fr}.person-facts{grid-template-columns:repeat(2,1fr)}.care-metrics{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:760px){.care-layout{grid-template-columns:1fr}.response-queue{border-right:0;border-bottom:1px solid var(--eng-line)}.consent-card{grid-template-columns:42px minmax(0,1fr)}.consent-card button{grid-column:1/-1}.handoff-track{grid-template-columns:1fr 1fr}}
  `],
})
export class CareNetworkTabComponent {
  private _assignment!: EngagementDetails;
  private _completion!: EngagementCompletion;

  @Input({ required: true })
  set assignment(value: EngagementDetails) {
    this._assignment = value;
    this.network.set(this.store.get(value));
  }
  get assignment(): EngagementDetails { return this._assignment; }

  @Input({ required: true })
  set completion(value: EngagementCompletion) {
    this._completion = value;
    if (!this.selectedResponseId()) {
      this.selectedResponseId.set(
        value.responses.find((response) => response.requiresFollowUp)?.id
          ?? value.responses[0]?.id
          ?? null,
      );
    }
  }
  get completion(): EngagementCompletion { return this._completion; }

  readonly network = signal<CareNetworkState | null>(null);
  readonly selectedResponseId = signal<string | null>(null);
  readonly churchResponseReferralId = signal<number | null>(null);

  readonly selectedResponse = computed(() =>
    this.completion?.responses.find((response) => response.id === this.selectedResponseId()) ?? null,
  );
  readonly activeReferral = computed(() => {
    const state = this.network();
    const response = this.selectedResponse();
    return state && response ? this.store.latestReferral(state, response.id) : null;
  });
  readonly selectedPartner = computed(() => {
    const state = this.network();
    const response = this.selectedResponse();
    if (!state || !response) return null;
    return this.store.partner(state, state.selectedPartnerByResponse[response.id] ?? 302);
  });
  readonly needsActionCount = computed(() => {
    const state = this.network();
    if (!state) return this.completion?.responses.length ?? 0;
    return this.completion.responses.filter((response) =>
      !this.consentConfirmed(response) || !this.store.latestReferral(state, response.id),
    ).length;
  });
  readonly awaitingCount = computed(() => this.network()?.referrals.filter((item) => ['sent','viewed'].includes(item.status)).length ?? 0);
  readonly acceptedCount = computed(() => this.network()?.referrals.filter((item) => item.status === 'accepted').length ?? 0);
  readonly connectedCount = computed(() => this.network()?.referrals.filter((item) => item.status === 'connected').length ?? 0);

  constructor(public readonly store: CareNetworkStoreService) {}

  selectResponse(id: string): void { this.selectedResponseId.set(id); this.churchResponseReferralId.set(null); }

  verifyConsent(responseId: string): void {
    this.network.set(this.store.setConsent(this.assignment.summary.id, responseId, true));
  }

  selectPartner(responseId: string, partnerId: number): void {
    this.network.set(this.store.selectPartner(this.assignment.summary.id, responseId, partnerId));
  }

  sendReferral(responseId: string, message: string): void {
    this.network.set(this.store.sendReferral(this.assignment.summary.id, responseId, message));
  }

  openChurchResponse(referralId: number): void {
    this.network.set(this.store.updateReferral(this.assignment.summary.id, referralId, 'viewed'));
    this.churchResponseReferralId.set(referralId);
  }

  respondFromChurch(referralId: number, status: 'accepted' | 'declined'): void {
    this.network.set(this.store.updateReferral(this.assignment.summary.id, referralId, status));
    this.churchResponseReferralId.set(null);
  }

  sendReminder(referralId: number): void {
    this.network.set(this.store.remind(this.assignment.summary.id, referralId));
  }

  confirmConnection(referralId: number): void {
    this.network.set(this.store.updateReferral(this.assignment.summary.id, referralId, 'connected'));
  }

  consentConfirmed(response: MinistryResponse): boolean {
    return response.careHandoffCreated || this.network()?.consentByResponse[response.id] === true;
  }

  partnerFor(referral: CareReferral): CarePartner | null {
    const state = this.network();
    return state ? this.store.partner(state, referral.partnerId) : null;
  }

  responseStatus(response: MinistryResponse): string {
    const state = this.network();
    const referral = state ? this.store.latestReferral(state, response.id) : null;
    if (referral) return this.store.statusLabel(referral.status);
    return this.consentConfirmed(response) ? 'Ready to refer' : 'Consent needed';
  }

  responseTypeLabel(response: MinistryResponse): string {
    return response.type.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  defaultReferralMessage(response: MinistryResponse, partner: CarePartner): string {
    const person = response.personName || 'This person';
    return `${person} requested ${this.responseTypeLabel(response).toLowerCase()} follow-up after this assignment. Please let our team know whether ${partner.name} can receive this referral and take responsibility for the next local connection.`;
  }

  initials(value: string): string {
    return value.split(/\s+/).filter(Boolean).slice(0,2).map((part) => part.charAt(0).toUpperCase()).join('');
  }

  dateLabel(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
  }
}
