import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EngagementsApiService } from '../core/engagements-api.service';
import { SpeakingRequestDetails } from '../core/speaking-request.models';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="eng-page invitations-page">
      <a class="back-link" routerLink="/assignments">← Engagements</a>
      <header class="page-heading">
        <div>
          <p class="eng-eyebrow">Needs review</p>
          <h1>Invitation review</h1>
          <p>Review the host request, resolve missing information, and move an approved invitation into preparation.</p>
        </div>
        <span>{{ reviewCount() }} need review</span>
      </header>

      @if (message()) {
        <p class="notice" [class.notice--error]="messageError()">{{ message() }}<button type="button" aria-label="Dismiss message" (click)="message.set(null)">×</button></p>
      }

      <div class="request-layout">
        <aside class="request-queue">
          @if (loading()) {
            <p class="empty">Loading invitations…</p>
          } @else if (requests().length === 0) {
            <p class="empty">No invitations have been submitted yet.</p>
          } @else {
            @for (item of requests(); track item.id) {
              <button type="button" class="request-row" [class.active]="item.id === selectedId()" (click)="select(item.id)">
                <span class="status" [attr.data-status]="item.status">{{ statusLabel(item.status) }}</span>
                <strong>{{ item.eventName }}</strong>
                <small>{{ item.organizationName }} · {{ location(item) }}</small>
                <em>{{ item.referenceNumber }} · {{ dateLabel(item.startDate) }}</em>
                <b>{{ item.readinessPercentage }}%</b>
              </button>
            }
          }
        </aside>

        <article class="request-detail">
          @if (selected(); as item) {
            <header class="detail-heading">
              <div>
                <p class="eng-eyebrow">{{ item.referenceNumber }}</p>
                <h2>{{ item.eventName }}</h2>
                <p>{{ item.organizationName }} · {{ item.eventType }}</p>
              </div>
              <span class="status" [attr.data-status]="item.status">{{ statusLabel(item.status) }}</span>
            </header>

            <section class="readiness-strip">
              <div><strong>{{ item.readinessPercentage }}%</strong><small>host readiness</small></div>
              <progress max="100" [value]="item.readinessPercentage"></progress>
            </section>

            <section class="summary-grid">
              <article><span>Event dates</span><strong>{{ dateRange(item) }}</strong></article>
              <article><span>Venue</span><strong>{{ item.venueName }}</strong><small>{{ item.venueAddress }}</small></article>
              <article><span>Location</span><strong>{{ location(item) }}</strong></article>
              <article><span>Timezone</span><strong>{{ item.timeZone }}</strong></article>
              <article><span>Primary contact</span><strong>{{ item.contactName }}</strong><small>{{ item.contactEmail }} · {{ item.contactPhone }}</small></article>
              <article><span>Expected attendance</span><strong>{{ item.expectedAttendance }}</strong></article>
            </section>

            <section class="detail-section">
              <p class="eng-eyebrow">Requested ministry</p>
              <h3>Assignment request</h3>
              <p>{{ item.ministryRequest }}</p>
            </section>

            <section class="detail-section">
              <p class="eng-eyebrow">Host commitments</p>
              <h3>Travel, lodging and terms</h3>
              <div class="terms-grid">
                <article><span>Travel coverage</span><strong>{{ statusLabel(item.travelCoverageStatus) }}</strong></article>
                <article><span>Lodging coverage</span><strong>{{ statusLabel(item.lodgingCoverageStatus) }}</strong></article>
                <article><span>Honorarium</span><strong>{{ honorarium(item) }}</strong></article>
                <article><span>Travel booked by</span><strong>{{ statusLabel(item.travelBookedBy) }}</strong></article>
                <article><span>Payment</span><strong>{{ statusLabel(item.paymentStatus) }}</strong></article>
                <article><span>Agreement</span><strong>{{ statusLabel(item.agreementStatus) }}</strong></article>
              </div>
            </section>

            <section class="detail-section">
              <div class="section-heading"><div><p class="eng-eyebrow">Review exchange</p><h3>Communication history</h3></div><span>{{ item.communications.length }}</span></div>
              <div class="timeline">
                @for (entry of item.communications; track entry.id) {
                  <article><span></span><div><strong>{{ statusLabel(entry.type) }}</strong><p>{{ entry.message }}</p><small>{{ entry.actor }} · {{ dateTimeLabel(entry.createdAtUtc) }}</small></div></article>
                }
              </div>
            </section>

            @if (reviewable(item)) {
              <section class="review-panel">
                <label>
                  <span>Message or decision reason</span>
                  <textarea #reviewMessage rows="4" placeholder="Write the host question or decline reason here."></textarea>
                </label>
                <div class="review-actions">
                  <button type="button" class="secondary" [disabled]="saving()" (click)="requestInfo(item, reviewMessage.value)">Request information</button>
                  <button type="button" class="primary" [disabled]="saving()" (click)="approve(item)">Approve invitation</button>
                  <button type="button" class="danger" [disabled]="saving()" (click)="decline(item, reviewMessage.value)">Decline</button>
                </div>
              </section>
            } @else if (item.status === 'approved' && item.assignmentId) {
              <section class="resolved-panel">
                <div><strong>Invitation approved</strong><p>This engagement has moved into preparation.</p></div>
                <button type="button" class="primary" (click)="openAssignment(item.assignmentId)">Open engagement</button>
              </section>
            } @else {
              <section class="resolved-panel"><div><strong>Invitation declined</strong><p>{{ item.declineReason || 'The ministry team is unable to accept this invitation.' }}</p></div></section>
            }
          } @else {
            <p class="empty">Select an invitation to review its details.</p>
          }
        </article>
      </div>

      @if (decision(); as pending) {
        <button class="decision-scrim" type="button" aria-label="Cancel decision" (click)="decision.set(null)"></button>
        <section class="decision-modal" role="alertdialog" aria-modal="true" aria-labelledby="decision-title">
          <header><div><p class="eng-eyebrow">Invitation decision</p><h2 id="decision-title">{{ pending.type === 'approve' ? 'Approve this invitation?' : 'Decline this invitation?' }}</h2></div><button type="button" aria-label="Close" (click)="decision.set(null)">×</button></header>
          <p>{{ pending.type === 'approve' ? 'This creates the Engagements assignment and carries every host field into its source record and preparation workflow.' : 'The host will see that the invitation was declined, and the reason will remain in its communication history.' }}</p>
          <footer><button type="button" class="secondary" (click)="decision.set(null)">Cancel</button><button type="button" [class.primary]="pending.type === 'approve'" [class.danger]="pending.type === 'decline'" [disabled]="saving()" (click)="confirmDecision()">{{ pending.type === 'approve' ? 'Approve and create assignment' : 'Decline invitation' }}</button></footer>
        </section>
      }
    </section>
  `,
  styles: [`
    .invitations-page{padding-top:1.25rem}.back-link{display:inline-block;margin:.35rem 0 1rem;color:#526178;font-size:.76rem;font-weight:800;text-decoration:none}.page-heading,.detail-heading,.section-heading,.resolved-panel{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}.page-heading{padding-bottom:1.15rem;border-bottom:1px solid var(--eng-line)}.page-heading h1{margin:0;font-size:clamp(2rem,4vw,3.2rem);letter-spacing:-.04em}.page-heading p:last-child,.detail-heading p:last-child{margin:.5rem 0 0;color:var(--eng-muted)}.page-heading>span,.section-heading>span{color:#667080;font-size:.7rem;font-weight:800}.request-layout{display:grid;grid-template-columns:minmax(280px,.72fr) minmax(0,1.7fr);gap:.8rem;margin-top:.9rem}.request-queue,.request-detail{border:1px solid var(--eng-line);border-radius:9px;background:var(--eng-surface)}.request-queue{align-self:start;overflow:hidden}.request-row{position:relative;display:grid;width:100%;gap:.25rem;padding:.9rem 3.2rem .9rem .9rem;border:0;border-bottom:1px solid var(--eng-line);text-align:left;background:transparent;color:var(--eng-ink);cursor:pointer}.request-row:last-child{border-bottom:0}.request-row.active{background:#f4f1fb;box-shadow:inset 3px 0 0 var(--eng-violet)}.request-row strong{font-size:.86rem}.request-row small,.request-row em{color:var(--eng-muted);font-size:.68rem;font-style:normal}.request-row b{position:absolute;right:.9rem;bottom:.9rem}.status{display:inline-flex;width:max-content;padding:.27rem .44rem;border-radius:999px;background:#eef0f4;color:#5e6675;font-size:.6rem;font-weight:900;text-transform:capitalize}.status[data-status='approved']{background:#e8f5ed;color:#257553}.status[data-status='declined']{background:#fbe9e8;color:#9d4541}.status[data-status='information-needed']{background:#fff2d9;color:#8b6617}.request-detail{padding:1.15rem}.detail-heading h2{margin:0;font-size:1.6rem}.readiness-strip{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:1rem;margin-top:1rem;padding:.75rem 0;border-top:1px solid var(--eng-line);border-bottom:1px solid var(--eng-line)}.readiness-strip strong,.readiness-strip small{display:block}.readiness-strip progress{width:100%}.summary-grid,.terms-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem;margin-top:.9rem}.summary-grid article,.terms-grid article{padding:.7rem;border:1px solid var(--eng-line);border-radius:7px;background:#fbfaf8}.summary-grid span,.summary-grid small,.terms-grid span{display:block;color:var(--eng-muted);font-size:.61rem}.summary-grid strong,.terms-grid strong{display:block;margin-top:.2rem;font-size:.73rem}.detail-section{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--eng-line)}.detail-section h3{margin:0;font-size:1rem}.detail-section>p:last-child{color:#596476;line-height:1.6}.timeline{display:grid;margin-top:.6rem}.timeline article{display:grid;grid-template-columns:14px 1fr;gap:.5rem;padding:.55rem 0}.timeline article>span{width:8px;height:8px;margin-top:.25rem;border:2px solid var(--eng-violet);border-radius:50%}.timeline strong{font-size:.7rem}.timeline p{margin:.18rem 0;color:#5f697a;font-size:.68rem;line-height:1.45}.timeline small{color:#8a919e;font-size:.6rem}.review-panel{margin-top:1rem;padding:.9rem;border:1px solid #ddd5f4;border-radius:8px;background:#f8f6fc}.review-panel label{display:grid;gap:.4rem}.review-panel label span{font-size:.7rem;font-weight:800}.review-panel textarea{width:100%;padding:.65rem;border:1px solid #cfd3dc;border-radius:7px;resize:vertical}.review-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.7rem}.review-actions button,.resolved-panel button{min-height:38px;padding:.5rem .72rem;border-radius:7px;border:1px solid #cfd3dc;font-size:.7rem;font-weight:800;cursor:pointer}.primary{color:#fff;background:#171d2d!important;border-color:#171d2d!important}.secondary{background:#fff}.danger{color:#a03f43;background:#fff;border-color:#e1bbbb!important}.resolved-panel{margin-top:1rem;padding:.9rem;border-radius:8px;background:#f2f5f3}.resolved-panel p{margin:.25rem 0 0;color:var(--eng-muted);font-size:.7rem}.notice{margin:1rem 0 0;padding:.7rem .9rem;border-left:3px solid #2b8764;background:#edf8f1;color:#2b6b52}.notice--error{border-color:#a64b4b;background:#fff1f0;color:#94433f}.empty{padding:2rem;color:var(--eng-muted);text-align:center}.review-actions button:disabled{opacity:.55;cursor:wait}
    @media(max-width:980px){.request-layout{grid-template-columns:1fr}.request-queue{display:flex;overflow:auto}.request-row{min-width:270px;border-right:1px solid var(--eng-line);border-bottom:0}.summary-grid,.terms-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:620px){.page-heading,.detail-heading,.resolved-panel{display:grid}.summary-grid,.terms-grid{grid-template-columns:1fr}.review-actions{display:grid}.review-actions button{width:100%}}
  `, `
    .notice{display:flex;align-items:center;justify-content:space-between;gap:1rem}.notice>button{width:28px;height:28px;border:0;border-radius:50%;color:inherit;background:rgba(255,255,255,.65);font-size:1rem;cursor:pointer}
    .decision-scrim{position:fixed;inset:0;z-index:70;border:0;background:rgba(12,18,32,.4);backdrop-filter:blur(3px)}
    .decision-modal{position:fixed;z-index:71;left:50%;top:50%;width:min(520px,calc(100vw - 32px));padding:1.3rem;border-radius:14px;background:#fff;box-shadow:0 30px 100px rgba(15,23,42,.3);transform:translate(-50%,-50%)}
    .decision-modal header{display:flex;justify-content:space-between;gap:1rem}.decision-modal header h2{margin:.25rem 0 0}.decision-modal header>button{width:38px;height:38px;border:0;border-radius:8px;font-size:1.15rem}.decision-modal>p{color:var(--eng-muted);line-height:1.6}.decision-modal footer{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1.2rem}.decision-modal footer button{min-height:42px;padding:0 .85rem;border-radius:7px;font-weight:800}
  `],
})
export class InvitationsComponent implements OnInit {
  readonly requests = signal<readonly SpeakingRequestDetails[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly selected = signal<SpeakingRequestDetails | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);
  readonly messageError = signal(false);
  readonly decision = signal<{ type: 'approve' | 'decline'; item: SpeakingRequestDetails; reason: string } | null>(null);
  readonly reviewCount = computed(() => this.requests().filter(item => this.reviewable(item)).length);

  constructor(
    private readonly api: EngagementsApiService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.reload(this.route.snapshot.queryParamMap.get('request') ?? undefined);
  }

  reload(preferredId?: string): void {
    this.loading.set(true);
    this.api.getRequests().subscribe({
      next: requests => {
        this.requests.set(requests);
        const requested = preferredId && requests.some(item => item.id === preferredId) ? preferredId : null;
        const id = requested ?? this.selectedId() ?? requests[0]?.id ?? null;
        this.loading.set(false);
        if (id) this.select(id); else this.selected.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.setMessage('Invitations could not be loaded.', true);
      },
    });
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.api.getRequest(id).subscribe({
      next: item => this.selected.set(item),
      error: () => this.setMessage('The selected invitation could not be loaded.', true),
    });
  }

  requestInfo(item: SpeakingRequestDetails, message: string): void {
    const text = message.trim();
    if (!text) return this.setMessage('Write the information request before sending it to the host.', true);
    this.saving.set(true);
    this.api.requestInformation(item.id, text).subscribe({
      next: result => {
        this.saving.set(false);
        this.setMessage(`Information requested. Secure host link: ${result.editUrl}`);
        this.reload(item.id);
      },
      error: error => this.finishError(error),
    });
  }

  approve(item: SpeakingRequestDetails): void {
    this.decision.set({ type: 'approve', item, reason: '' });
  }

  private performApprove(item: SpeakingRequestDetails): void {
    this.saving.set(true);
    this.api.approveRequest(item.id).subscribe({
      next: result => {
        this.saving.set(false);
        this.setMessage('Invitation approved. The engagement moved into preparation.');
        this.reload(item.id);
        this.router.navigate(['/assignments', result.assignmentId]);
      },
      error: error => this.finishError(error),
    });
  }

  decline(item: SpeakingRequestDetails, reason: string): void {
    const text = reason.trim();
    if (!text) return this.setMessage('A decline reason is required.', true);
    this.decision.set({ type: 'decline', item, reason: text });
  }

  confirmDecision(): void {
    const pending = this.decision();
    if (!pending || this.saving()) return;
    this.decision.set(null);
    if (pending.type === 'approve') return this.performApprove(pending.item);
    this.performDecline(pending.item, pending.reason);
  }

  private performDecline(item: SpeakingRequestDetails, text: string): void {
    this.saving.set(true);
    this.api.declineRequest(item.id, text).subscribe({
      next: () => {
        this.saving.set(false);
        this.setMessage('Invitation declined and the decision was recorded.');
        this.reload(item.id);
      },
      error: error => this.finishError(error),
    });
  }

  openAssignment(id: string): void { this.router.navigate(['/assignments', id]); }
  reviewable(item: SpeakingRequestDetails): boolean { return !['approved', 'declined'].includes(item.status); }
  statusLabel(value: string): string { return value.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase()); }
  location(item: SpeakingRequestDetails): string { return [item.city, item.state || item.region, item.country].filter(Boolean).join(', '); }
  dateLabel(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  dateRange(item: SpeakingRequestDetails): string { return item.startDate === item.endDate ? this.dateLabel(item.startDate) : `${this.dateLabel(item.startDate)} – ${this.dateLabel(item.endDate)}`; }
  dateTimeLabel(value: string): string { return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  honorarium(item: SpeakingRequestDetails): string { return item.honorariumAmount > 0 ? `${this.statusLabel(item.honorariumStatus)} · ${item.honorariumCurrency} ${item.honorariumAmount.toLocaleString()}` : this.statusLabel(item.honorariumStatus); }

  private setMessage(message: string, error = false): void { this.message.set(message); this.messageError.set(error); }
  private finishError(error: any): void { this.saving.set(false); this.setMessage(error?.error?.message || error?.error?.title || 'The invitation could not be updated.', true); }
}
