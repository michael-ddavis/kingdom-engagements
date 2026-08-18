import { Component, Input, computed, signal } from '@angular/core';
import { EngagementsApiService } from '../../core/engagements-api.service';
import {
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
          <p>Ministry · Kingdom Care</p>
          <h2>Move personal follow-up into the care system</h2>
          <span>
            Engagements records the ministry response and confirmed permission. Kingdom Care then owns
            pastoral follow-up, local church selection, the bounded referral, and connection tracking.
          </span>
        </div>
        <b>{{ responses().length }} responses</b>
      </header>

      <section class="care-metrics">
        <article>
          <span>Needs handoff</span>
          <strong>{{ needsHandoffCount() }}</strong>
          <small>Follow-up still owned here</small>
        </article>
        <article>
          <span>Sent to Care</span>
          <strong>{{ sentToCareCount() }}</strong>
          <small>Kingdom Care owns next step</small>
        </article>
        <article>
          <span>No transfer needed</span>
          <strong>{{ noHandoffCount() }}</strong>
          <small>Recorded without personal follow-up</small>
        </article>
      </section>

      @if (message()) {
        <p class="care-message" [class.care-message--error]="messageError()">{{ message() }}</p>
      }

      <div class="care-layout">
        <aside class="response-queue">
          <header>
            <div>
              <strong>Response queue</strong>
              <small>Choose a person to review the Care handoff.</small>
            </div>
          </header>

          @if (responses().length === 0) {
            <p class="empty-copy">No individual ministry responses are recorded for this assignment yet.</p>
          } @else {
            @for (response of responses(); track response.id) {
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
                <em [attr.data-state]="response.careHandoffCreated ? 'sent' : response.requiresFollowUp ? 'action' : 'recorded'">
                  {{ responseStatus(response) }}
                </em>
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
                  <span>{{ response.notes || 'Individual ministry response recorded for this assignment.' }}</span>
                </div>
                <b [attr.data-state]="response.careHandoffCreated ? 'sent' : response.requiresFollowUp ? 'action' : 'recorded'">
                  {{ responseStatus(response) }}
                </b>
              </div>

              <dl class="person-facts">
                <div><dt>Email</dt><dd>{{ response.email || 'Not provided' }}</dd></div>
                <div><dt>Phone</dt><dd>{{ response.phone || 'Not provided' }}</dd></div>
                <div><dt>Follow-up owner</dt><dd>{{ response.followUpOwner || 'Not assigned' }}</dd></div>
                <div><dt>Received</dt><dd>{{ dateLabel(response.createdAtUtc) }}</dd></div>
              </dl>
            </section>

            <section class="handoff-journey" aria-label="Care handoff journey">
              <article class="complete">
                <span>1</span>
                <div><strong>Response recorded</strong><small>Engagements keeps the ministry record.</small></div>
              </article>
              <article [class.complete]="response.careHandoffCreated">
                <span>2</span>
                <div><strong>Transfer to Kingdom Care</strong><small>{{ response.careHandoffCreated ? 'Responsibility transferred' : 'Confirm consent and send' }}</small></div>
              </article>
              <article [class.active]="response.careHandoffCreated">
                <span>3</span>
                <div><strong>Care + church connection</strong><small>{{ response.careHandoffCreated ? 'Managed inside Kingdom Care' : 'Begins after Care receives it' }}</small></div>
              </article>
            </section>

            @if (response.careHandoffCreated) {
              <section class="ownership-card ownership-card--complete">
                <span class="ownership-card__icon" aria-hidden="true">✓</span>
                <div>
                  <p>Responsibility transferred</p>
                  <h3>Kingdom Care owns the next step.</h3>
                  <span>
                    This response has been handed to Care with confirmed consent. Care coordinators can accept it,
                    assign follow-up, choose a trusted local church, send the bounded referral, and track the real connection.
                  </span>
                </div>
                @if (careEnabled() && careUrl()) {
                  <a [href]="careUrl() || '#'">Open Kingdom Care ↗</a>
                }
              </section>

              <p class="privacy-boundary">
                <strong>Module boundary:</strong> Engagements no longer simulates church acceptance or connection status.
                Those actions live in Kingdom Care, where the care record and privacy boundary are enforced.
              </p>
            } @else if (!response.requiresFollowUp) {
              <section class="ownership-card ownership-card--quiet">
                <span class="ownership-card__icon" aria-hidden="true">—</span>
                <div>
                  <p>No Care transfer required</p>
                  <h3>This response is recorded without individual follow-up.</h3>
                  <span>If personal follow-up becomes necessary, update the response first and then send responsibility to Kingdom Care.</span>
                </div>
              </section>
            } @else {
              <section class="transfer-card">
                <div class="transfer-card__copy">
                  <p>Permission boundary</p>
                  <h3>Confirm consent, then transfer responsibility.</h3>
                  <span>
                    Confirm that this person gave permission for their contact details and care request to move from
                    Engagements into Kingdom Care. A separate bounded church referral is created later from inside Care.
                  </span>
                </div>

                <label class="consent-check">
                  <input
                    type="checkbox"
                    [checked]="consentConfirmed(response.id)"
                    (change)="setConsent(response.id, $any($event.target).checked)" />
                  <span>
                    <strong>Documented consent confirmed</strong>
                    <small>The person approved this transfer into Kingdom Care.</small>
                  </span>
                </label>

                <button
                  type="button"
                  [disabled]="!consentConfirmed(response.id) || sendingResponseId() === response.id"
                  (click)="sendToCare(response)">
                  {{ sendingResponseId() === response.id ? 'Sending to Care…' : 'Send to Kingdom Care' }}
                </button>
              </section>
            }
          } @else {
            <div class="empty-workspace">
              <strong>Select a ministry response.</strong>
              <span>The Care handoff details will open here.</span>
            </div>
          }
        </main>
      </div>
    </section>
  `,
  styles: [`
    .care-network{margin-top:1rem;border:1px solid var(--eng-line);border-radius:12px;background:#fffdfa;overflow:hidden}
    .care-network__header{display:flex;align-items:flex-start;justify-content:space-between;gap:2rem;padding:1.35rem 1.45rem;border-bottom:1px solid var(--eng-line)}
    .care-network__header p,.response-detail__heading p,.ownership-card p,.transfer-card p{margin:0 0 .35rem;color:var(--eng-blue);font-size:.68rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    .care-network__header h2{margin:0;font-size:1.65rem}.care-network__header span{display:block;max-width:780px;margin-top:.45rem;color:var(--eng-muted);font-size:.76rem;line-height:1.5}.care-network__header>b{padding:.45rem .65rem;border-radius:999px;background:#eef1f5;color:#536075;font-size:.7rem}
    .care-metrics{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--eng-line)}.care-metrics article{padding:1rem 1.2rem;border-right:1px solid var(--eng-line)}.care-metrics article:last-child{border-right:0}.care-metrics span,.care-metrics small{display:block;color:var(--eng-muted);font-size:.68rem}.care-metrics strong{display:block;margin:.2rem 0;font-size:1.6rem}
    .care-message{margin:0;padding:.72rem 1.2rem;border-bottom:1px solid #bfdfcd;color:#256849;background:#edf7f1;font-size:.74rem;font-weight:750}.care-message--error{border-color:#efcbc8;color:#9d403c;background:#fff0ef}
    .care-layout{display:grid;grid-template-columns:330px minmax(0,1fr);min-height:560px}.response-queue{border-right:1px solid var(--eng-line);background:#faf8f4}.response-queue>header{padding:1rem;border-bottom:1px solid var(--eng-line)}.response-queue>header strong,.response-queue>header small{display:block}.response-queue>header small{margin-top:.2rem;color:var(--eng-muted);font-size:.7rem}
    .response-row{display:grid;grid-template-columns:38px minmax(0,1fr);gap:.7rem;width:100%;padding:.85rem 1rem;border:0;border-bottom:1px solid rgba(18,26,44,.08);text-align:left;background:transparent;cursor:pointer}.response-row.active{background:#fff;box-shadow:inset 3px 0 0 var(--eng-violet)}.response-avatar{display:grid;width:36px;height:36px;place-items:center;border-radius:8px;color:#315faf;background:#eaf0fc;font-size:.68rem;font-weight:900}.response-row strong,.response-row small,.response-row em{display:block}.response-row small{margin-top:.15rem;color:var(--eng-muted);font-size:.65rem}.response-row em{grid-column:2;color:#6f4e1d;font-size:.63rem;font-style:normal;font-weight:850}.response-row em[data-state='sent']{color:#267052}.response-row em[data-state='recorded']{color:#667080}
    .care-workspace{min-width:0;padding:1.2rem}.response-detail{padding-bottom:1.1rem;border-bottom:1px solid var(--eng-line)}.response-detail__heading{display:flex;justify-content:space-between;gap:1rem}.response-detail h3,.ownership-card h3,.transfer-card h3{margin:0;font-size:1.4rem}.response-detail__heading span{display:block;max-width:700px;margin-top:.35rem;color:var(--eng-muted);font-size:.74rem;line-height:1.5}.response-detail__heading>b{height:fit-content;padding:.4rem .55rem;border-radius:999px;color:#6f4e1d;background:#f8eddb;font-size:.65rem}.response-detail__heading>b[data-state='sent']{color:#267052;background:#e8f4ed}.response-detail__heading>b[data-state='recorded']{color:#566176;background:#eef1f5}
    .person-facts{display:grid;grid-template-columns:repeat(4,1fr);margin:1rem 0 0;border:1px solid var(--eng-line);border-radius:8px;overflow:hidden}.person-facts div{padding:.7rem;border-right:1px solid var(--eng-line)}.person-facts div:last-child{border-right:0}.person-facts dt{color:var(--eng-muted);font-size:.61rem;text-transform:uppercase}.person-facts dd{margin:.2rem 0 0;font-size:.75rem;font-weight:800;overflow-wrap:anywhere}
    .handoff-journey{display:grid;grid-template-columns:repeat(3,1fr);margin-top:1.15rem;border:1px solid var(--eng-line);border-radius:9px;overflow:hidden}.handoff-journey article{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:.65rem;padding:.9rem;background:#faf9f7}.handoff-journey article+article{border-left:1px solid var(--eng-line)}.handoff-journey article>span{display:grid;width:28px;height:28px;place-items:center;border-radius:50%;color:#727b89;background:#e7e9ed;font-size:.68rem;font-weight:900}.handoff-journey strong,.handoff-journey small{display:block}.handoff-journey strong{font-size:.72rem}.handoff-journey small{margin-top:.18rem;color:var(--eng-muted);font-size:.62rem}.handoff-journey article.complete{background:#f1f8f4}.handoff-journey article.complete>span{color:#fff;background:#2d7d5c}.handoff-journey article.active{background:#f3f0fd}.handoff-journey article.active>span{color:#fff;background:#6a4fd7}
    .ownership-card{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:start;gap:1rem;margin-top:1.2rem;padding:1.15rem;border:1px solid var(--eng-line);border-radius:10px}.ownership-card--complete{border-color:#bfdccc;background:#f1f8f4}.ownership-card--quiet{background:#f7f7f5}.ownership-card__icon{display:grid;width:38px;height:38px;place-items:center;border-radius:50%;color:#fff;background:#2d7d5c;font-weight:900}.ownership-card--quiet .ownership-card__icon{color:#667080;background:#e4e6e9}.ownership-card>div>span{display:block;max-width:720px;margin-top:.4rem;color:#607066;font-size:.74rem;line-height:1.5}.ownership-card>a{display:inline-flex;min-height:40px;align-items:center;padding:0 .8rem;border:1px solid #b8d4c5;border-radius:7px;color:#225d46;background:#fff;font-size:.7rem;font-weight:850;text-decoration:none}.privacy-boundary{margin:.85rem 0 0;padding:.75rem .85rem;border-left:3px solid #6a4fd7;color:#626b79;background:#f5f3fb;font-size:.71rem;line-height:1.5}
    .transfer-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,.75fr) auto;align-items:end;gap:1rem;margin-top:1.2rem;padding:1.2rem;border:1px solid #e1c99f;border-radius:10px;background:#fff8eb}.transfer-card__copy>span{display:block;max-width:680px;margin-top:.4rem;color:#77694f;font-size:.74rem;line-height:1.5}.consent-check{display:flex;align-items:flex-start;gap:.65rem;padding:.8rem;border:1px solid rgba(163,106,34,.2);border-radius:8px;background:rgba(255,255,255,.55);cursor:pointer}.consent-check input{width:17px;height:17px;margin-top:.1rem;accent-color:#172033}.consent-check strong,.consent-check small{display:block}.consent-check strong{font-size:.72rem}.consent-check small{margin-top:.2rem;color:#77694f;font-size:.64rem;line-height:1.4}.transfer-card button{min-height:42px;padding:.6rem .85rem;border:0;border-radius:7px;color:#fff;background:var(--eng-ink);font-weight:850;cursor:pointer}.transfer-card button:disabled{cursor:default;opacity:.45}
    .empty-copy,.empty-workspace{padding:2.5rem;color:var(--eng-muted);text-align:center}.empty-workspace strong,.empty-workspace span{display:block}.empty-workspace strong{color:var(--eng-ink)}.empty-workspace span{margin-top:.3rem;font-size:.72rem}
    @media(max-width:1100px){.care-layout{grid-template-columns:280px minmax(0,1fr)}.transfer-card{grid-template-columns:1fr}.person-facts{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:760px){.care-metrics{grid-template-columns:1fr}.care-metrics article{border-right:0;border-bottom:1px solid var(--eng-line)}.care-metrics article:last-child{border-bottom:0}.care-layout{grid-template-columns:1fr}.response-queue{border-right:0;border-bottom:1px solid var(--eng-line)}.handoff-journey{grid-template-columns:1fr}.handoff-journey article+article{border-left:0;border-top:1px solid var(--eng-line)}.ownership-card{grid-template-columns:42px minmax(0,1fr)}.ownership-card>a{grid-column:1/-1}.person-facts{grid-template-columns:1fr}}
  `],
})
export class CareNetworkTabComponent {
  private readonly assignmentState = signal<EngagementDetails | null>(null);
  private readonly completionState = signal<EngagementCompletion | null>(null);

  @Input({ required: true })
  set assignment(value: EngagementDetails) {
    this.assignmentState.set(value);
  }

  @Input({ required: true })
  set completion(value: EngagementCompletion) {
    this.completionState.set(value);
    if (!this.selectedResponseId()) {
      this.selectedResponseId.set(
        value.responses.find(response => response.requiresFollowUp && !response.careHandoffCreated)?.id
          ?? value.responses.find(response => response.requiresFollowUp)?.id
          ?? value.responses[0]?.id
          ?? null,
      );
    }
  }

  readonly selectedResponseId = signal<string | null>(null);
  readonly sendingResponseId = signal<string | null>(null);
  readonly consentByResponse = signal<ReadonlySet<string>>(new Set<string>());
  readonly message = signal<string | null>(null);
  readonly messageError = signal(false);
  readonly careUrl = signal<string | null>(null);
  readonly careEnabled = signal(false);

  readonly responses = computed(() => this.completionState()?.responses ?? []);
  readonly selectedResponse = computed(() =>
    this.responses().find(response => response.id === this.selectedResponseId()) ?? null,
  );
  readonly needsHandoffCount = computed(() =>
    this.responses().filter(response => response.requiresFollowUp && !response.careHandoffCreated).length,
  );
  readonly sentToCareCount = computed(() =>
    this.responses().filter(response => response.careHandoffCreated).length,
  );
  readonly noHandoffCount = computed(() =>
    this.responses().filter(response => !response.requiresFollowUp).length,
  );

  constructor(private readonly api: EngagementsApiService) {
    this.api.getProduct().subscribe({
      next: product => {
        this.careUrl.set(product.careUrl);
        this.careEnabled.set(product.careEnabled);
      },
    });
  }

  selectResponse(id: string): void {
    this.selectedResponseId.set(id);
    this.message.set(null);
    this.messageError.set(false);
  }

  setConsent(responseId: string, confirmed: boolean): void {
    const next = new Set(this.consentByResponse());
    if (confirmed) next.add(responseId);
    else next.delete(responseId);
    this.consentByResponse.set(next);
  }

  consentConfirmed(responseId: string): boolean {
    return this.consentByResponse().has(responseId);
  }

  sendToCare(response: MinistryResponse): void {
    const assignmentId = this.assignmentState()?.summary.id;
    if (!assignmentId || this.sendingResponseId() || !this.consentConfirmed(response.id)) return;

    this.sendingResponseId.set(response.id);
    this.message.set(null);
    this.messageError.set(false);

    this.api.handoffToCare(assignmentId, response.id).subscribe({
      next: completion => {
        this.completionState.set(completion);
        this.sendingResponseId.set(null);
        this.message.set('Responsibility transferred to Kingdom Care. Care now owns follow-up and the local church connection.');
      },
      error: () => {
        this.sendingResponseId.set(null);
        this.messageError.set(true);
        this.message.set('The Care handoff could not be completed. Confirm this response requires follow-up and try again.');
      },
    });
  }

  responseStatus(response: MinistryResponse): string {
    if (response.careHandoffCreated) return 'Sent to Kingdom Care';
    return response.requiresFollowUp ? 'Needs Care handoff' : 'Recorded';
  }

  responseTypeLabel(response: MinistryResponse): string {
    return response.type
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  initials(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  dateLabel(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
