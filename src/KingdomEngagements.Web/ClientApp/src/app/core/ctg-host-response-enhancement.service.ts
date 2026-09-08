import { Injectable } from '@angular/core';
import {
  CtgBookingDeskStateService,
  HostResponseChannel,
  ManualBookingRecord,
} from './ctg-booking-desk-state.service';

interface LogHostResponseEventDetail {
  id?: string;
}

@Injectable({ providedIn: 'root' })
export class CtgHostResponseEnhancementService {
  private mounted = false;
  private observer: MutationObserver | null = null;

  constructor(private readonly state: CtgBookingDeskStateService) {}

  mount(): void {
    if (this.mounted || typeof document === 'undefined') return;
    this.mounted = true;
    this.installStyles();

    window.addEventListener('apostolos:log-host-response', event => {
      const detail = (event as CustomEvent<LogHostResponseEventDetail>).detail;
      if (detail?.id) this.openResponseDialog(detail.id);
    });
    window.addEventListener('apostolos:host-response-saved', () => {
      window.setTimeout(() => this.enhanceBookingDesk(), 0);
    });

    this.observer = new MutationObserver(() => this.enhanceBookingDesk());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.enhanceBookingDesk();
  }

  private enhanceBookingDesk(): void {
    if (!window.location.pathname.startsWith('/organization/ctg/bookings')) return;

    document.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
      if (button.textContent?.trim() === 'Record host response') {
        button.textContent = 'Log host response';
        button.title = 'Record what the host told CTG and update the same booking record.';
      }
    });

    const detail = document.querySelector<HTMLElement>('dialog.detail-dialog[open] .detail-shell');
    if (!detail) return;

    const eventName = detail.querySelector('header h2')?.textContent?.trim();
    const headerCopy = detail.querySelector('header p')?.textContent?.trim() ?? '';
    if (!eventName) return;

    const record = this.state.bookings().find(item =>
      item.eventName === eventName && (!item.hostOrganization || headerCopy.includes(item.hostOrganization)));
    if (!record) return;

    const body = detail.querySelector<HTMLElement>('.detail-body');
    const nextStep = body?.querySelector<HTMLElement>('.next-step');
    if (!body || !nextStep) return;

    const missing = this.state.missingInformation(record);
    const signature = JSON.stringify({
      id: record.id,
      updatedAtUtc: record.updatedAtUtc,
      responseCount: record.hostResponses.length,
      nextFollowUpAtUtc: record.nextFollowUpAtUtc,
      missing,
    });
    if (detail.dataset['hostResponseSignature'] === signature) return;
    detail.dataset['hostResponseSignature'] = signature;

    body.querySelector('.host-response-readiness')?.remove();
    body.querySelector('.host-response-history')?.remove();

    const readiness = document.createElement('section');
    readiness.className = 'detail-section host-response-readiness';
    const followUp = record.nextFollowUpAtUtc
      ? `<p class="hr-follow-up"><strong>Next follow-up:</strong> ${this.escapeText(this.formatDateTime(record.nextFollowUpAtUtc))}</p>`
      : '';

    readiness.innerHTML = missing.length === 0
      ? `<span class="eyebrow">Information status</span><h3>Information complete</h3><p class="hr-ready">This request has the information needed to move into review.</p>${followUp}`
      : `<span class="eyebrow">Information status</span><h3>${missing.length} ${missing.length === 1 ? 'item' : 'items'} still needed</h3><div class="hr-missing">${missing.map(item => `<span>${this.escapeText(item)}</span>`).join('')}</div>${followUp}`;
    nextStep.before(readiness);

    if (record.hostResponses.length) {
      const history = document.createElement('section');
      history.className = 'detail-section host-response-history';
      history.innerHTML = `
        <span class="eyebrow">Host communication</span>
        <h3>Response history</h3>
        <div class="hr-history-list">
          ${[...record.hostResponses].reverse().map(response => `
            <article>
              <div class="hr-history-meta">
                <strong>${this.escapeText(this.channelLabel(response.channel))}</strong>
                <time datetime="${this.escapeAttribute(response.receivedAtUtc)}">${this.escapeText(this.formatDateTime(response.receivedAtUtc))}</time>
              </div>
              <p>${this.escapeText(response.summary)}</p>
              ${response.fieldsUpdated.length ? `<small>Updated: ${response.fieldsUpdated.map(field => this.escapeText(field)).join(' · ')}</small>` : ''}
              ${response.followUp ? `<small><strong>Follow-up:</strong> ${this.escapeText(response.followUp)}${response.followUpAtUtc ? ` · ${this.escapeText(this.formatDateTime(response.followUpAtUtc))}` : ''}</small>` : ''}
            </article>
          `).join('')}
        </div>`;
      readiness.before(history);
    }
  }

  private openResponseDialog(id: string): void {
    const record = this.state.bookings().find(item => item.id === id);
    if (!record) {
      window.alert('The booking could not be found.');
      return;
    }

    document.getElementById('ctg-host-response-dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'ctg-host-response-dialog';
    dialog.className = 'ctg-host-response-dialog';

    const form = document.createElement('form');
    form.className = 'ctg-host-response-form';
    form.innerHTML = `
      <header>
        <div>
          <span>Host communication</span>
          <h2>Log host response</h2>
          <p>${this.escapeText(record.hostName)} · ${this.escapeText(record.eventName)}</p>
        </div>
        <button type="button" class="hr-close" aria-label="Close">×</button>
      </header>

      <div class="hr-scroll">
        <section>
          <h3>What did the host say?</h3>
          <div class="hr-grid">
            <label>Response received
              <input name="receivedAt" type="datetime-local" value="${this.escapeAttribute(this.localDateTimeValue(new Date().toISOString()))}" required>
            </label>
            <label>Channel
              <select name="channel">
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="whatsapp" ${record.whatsapp ? 'selected' : ''}>WhatsApp</option>
                <option value="text">Text</option>
                <option value="in-person">In person</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label class="wide">Response summary
              <textarea name="summary" rows="4" required placeholder="Example: Host confirmed airfare, lodging and local transportation. Security contact will be sent Friday."></textarea>
            </label>
          </div>
        </section>

        <section>
          <div class="hr-section-heading">
            <div><h3>Update what the host confirmed</h3><p>These are the same booking fields already shown on the request. Change only what the host clarified.</p></div>
          </div>
          <div class="hr-grid">
            <label class="wide">Entry / visa information
              <textarea name="entryRequirements" rows="3">${this.escapeText(record.entryRequirements)}</textarea>
            </label>
            <label class="wide">Security / protocol contact or plan
              <textarea name="securityNotes" rows="3">${this.escapeText(record.securityNotes)}</textarea>
            </label>
            <label>Airfare responsibility
              <input name="airfareResponsibility" value="${this.escapeAttribute(record.airfareResponsibility)}" placeholder="Host confirmed">
            </label>
            <label>Lodging responsibility
              <input name="lodgingResponsibility" value="${this.escapeAttribute(record.lodgingResponsibility)}" placeholder="Host confirmed">
            </label>
            <label>Ground transportation
              <input name="groundResponsibility" value="${this.escapeAttribute(record.groundResponsibility)}" placeholder="Host confirmed">
            </label>
            <label>Agreement status
              <select name="agreementStatus">
                ${this.option('not-started', 'Not started', record.agreementStatus)}
                ${this.option('drafting', 'Drafting', record.agreementStatus)}
                ${this.option('sent', 'Sent', record.agreementStatus)}
                ${this.option('signed', 'Signed', record.agreementStatus)}
              </select>
            </label>
            <label>Honorarium
              <input name="honorariumAmount" type="number" min="0" step="0.01" value="${record.honorariumAmount ?? ''}">
            </label>
            <label>Currency
              <input name="honorariumCurrency" value="${this.escapeAttribute(record.honorariumCurrency)}" placeholder="USD">
            </label>
            <label>Requested start
              <input name="requestedStartDate" type="date" value="${this.escapeAttribute(record.requestedStartDate)}">
            </label>
            <label>Requested end
              <input name="requestedEndDate" type="date" value="${this.escapeAttribute(record.requestedEndDate)}">
            </label>
            <label class="wide">Alternate dates
              <input name="alternateDates" value="${this.escapeAttribute(record.alternateDates)}" placeholder="March 25–28, 2027">
            </label>
          </div>
        </section>

        <section>
          <h3>What happens next?</h3>
          <div class="hr-grid">
            <label class="wide">Follow-up note
              <textarea name="followUp" rows="3" placeholder="Example: Waiting on security contact. Follow up Friday if it has not arrived."></textarea>
            </label>
            <label>Next follow-up
              <input name="followUpAt" type="datetime-local" value="${record.nextFollowUpAtUtc ? this.escapeAttribute(this.localDateTimeValue(record.nextFollowUpAtUtc)) : ''}">
            </label>
            <label>Owner
              <input name="owner" value="${this.escapeAttribute(record.owner)}">
            </label>
          </div>
        </section>
      </div>

      <footer>
        <span class="hr-message" role="status" aria-live="polite"></span>
        <button type="button" class="hr-cancel">Cancel</button>
        <button type="submit" class="hr-save">Save response</button>
      </footer>`;

    dialog.appendChild(form);
    document.body.appendChild(dialog);

    const close = () => dialog.close();
    form.querySelector<HTMLButtonElement>('.hr-close')?.addEventListener('click', close);
    form.querySelector<HTMLButtonElement>('.hr-cancel')?.addEventListener('click', close);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    form.addEventListener('submit', event => {
      event.preventDefault();
      this.saveResponse(record, form, dialog);
    });

    dialog.showModal();
    window.setTimeout(() => form.querySelector<HTMLTextAreaElement>('textarea[name="summary"]')?.focus(), 0);
  }

  private saveResponse(record: ManualBookingRecord, form: HTMLFormElement, dialog: HTMLDialogElement): void {
    const data = new FormData(form);
    const stringValue = (name: string) => String(data.get(name) ?? '').trim();
    const summary = stringValue('summary');
    const message = form.querySelector<HTMLElement>('.hr-message');
    if (!summary) {
      if (message) message.textContent = 'Add a short summary of what the host said.';
      return;
    }

    const changes: Partial<ManualBookingRecord> = {};
    const fieldsUpdated: string[] = [];
    const apply = <K extends keyof ManualBookingRecord>(key: K, value: ManualBookingRecord[K], label: string) => {
      if (record[key] !== value) {
        Object.assign(changes, { [key]: value });
        fieldsUpdated.push(label);
      }
    };

    apply('entryRequirements', stringValue('entryRequirements'), 'Visa / entry');
    apply('securityNotes', stringValue('securityNotes'), 'Security / protocol');
    apply('airfareResponsibility', stringValue('airfareResponsibility'), 'Airfare');
    apply('lodgingResponsibility', stringValue('lodgingResponsibility'), 'Lodging');
    apply('groundResponsibility', stringValue('groundResponsibility'), 'Ground transportation');
    apply('honorariumCurrency', stringValue('honorariumCurrency'), 'Honorarium currency');
    apply('agreementStatus', stringValue('agreementStatus'), 'Agreement');
    apply('requestedStartDate', stringValue('requestedStartDate'), 'Requested start');
    apply('requestedEndDate', stringValue('requestedEndDate'), 'Requested end');
    apply('alternateDates', stringValue('alternateDates'), 'Alternate dates');

    const honorariumRaw = stringValue('honorariumAmount');
    const honorarium = honorariumRaw === '' ? null : Number(honorariumRaw);
    if (honorarium === null || Number.isFinite(honorarium)) {
      apply('honorariumAmount', honorarium, 'Honorarium');
    }

    const channelRaw = stringValue('channel');
    const channel: HostResponseChannel = ['email', 'phone', 'whatsapp', 'text', 'in-person', 'other'].includes(channelRaw)
      ? channelRaw as HostResponseChannel
      : 'other';
    const receivedAtUtc = this.toIso(stringValue('receivedAt')) ?? new Date().toISOString();
    const followUpAtUtc = this.toIso(stringValue('followUpAt'));

    this.state.logHostResponse(record.id, {
      receivedAtUtc,
      channel,
      summary,
      followUp: stringValue('followUp'),
      followUpAtUtc,
      owner: stringValue('owner') || record.owner,
      changes,
      fieldsUpdated,
    });

    if (message) message.textContent = 'Host response saved.';
    const save = form.querySelector<HTMLButtonElement>('.hr-save');
    if (save) save.disabled = true;
    window.setTimeout(() => {
      dialog.close();
      this.enhanceBookingDesk();
    }, 220);
  }

  private installStyles(): void {
    if (document.getElementById('ctg-host-response-styles')) return;
    const style = document.createElement('style');
    style.id = 'ctg-host-response-styles';
    style.textContent = `
      .ctg-host-response-dialog{width:min(780px,calc(100vw - 28px));max-width:none;max-height:calc(100dvh - 36px);padding:0;border:0;border-radius:18px;background:#fff;box-shadow:0 32px 100px rgba(10,16,26,.32)}
      .ctg-host-response-dialog::backdrop{background:rgba(11,17,26,.48);backdrop-filter:blur(3px)}
      .ctg-host-response-form{display:flex;max-height:calc(100dvh - 36px);flex-direction:column;color:#1d2633}
      .ctg-host-response-form>header{display:flex;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #e1e4e8}
      .ctg-host-response-form>header span{color:#936d35;font-size:.61rem;font-weight:900;letter-spacing:.115em;text-transform:uppercase}
      .ctg-host-response-form>header h2{margin:5px 0 4px;font-size:1.55rem;letter-spacing:-.035em}
      .ctg-host-response-form>header p{margin:0;color:#757c85;font-size:.72rem}
      .hr-close{width:38px;height:38px;border:0;border-radius:50%;background:#f1f2f4;color:#4e5661;font-size:1.15rem;cursor:pointer}
      .hr-scroll{overflow:auto;padding:0 24px}
      .hr-scroll>section{padding:21px 0;border-bottom:1px solid #e5e7ea}.hr-scroll>section:last-child{border-bottom:0}
      .hr-scroll h3{margin:0 0 12px;font-size:1rem}.hr-section-heading p{margin:-6px 0 12px;color:#737a83;font-size:.7rem;line-height:1.5}
      .hr-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.hr-grid .wide{grid-column:1/-1}
      .hr-grid label{display:grid;gap:6px;color:#5f6670;font-size:.65rem;font-weight:800}
      .hr-grid input,.hr-grid select,.hr-grid textarea{box-sizing:border-box;width:100%;padding:10px 11px;border:1px solid #d3d8df;border-radius:8px;background:#fbfbfa;color:#202a36;font:inherit;font-size:.75rem;line-height:1.4}
      .ctg-host-response-form>footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:16px 24px;border-top:1px solid #e1e4e8;background:#fff}
      .ctg-host-response-form>footer .hr-message{margin-right:auto;color:#3e6f54;font-size:.7rem;font-weight:800}
      .hr-cancel,.hr-save{min-height:40px;padding:0 14px;border:1px solid #d7dce2;border-radius:8px;background:#fff;color:#526171;font:inherit;font-size:.7rem;font-weight:850;cursor:pointer}
      .hr-save{border-color:#17263a;background:#17263a;color:#fff}.hr-save:disabled{opacity:.6}
      .host-response-readiness .hr-ready{margin:0;padding:11px 13px;border-radius:9px;background:#edf7f0;color:#2f6847;font-size:.72rem;line-height:1.5}
      .hr-missing{display:flex;flex-wrap:wrap;gap:6px}.hr-missing span{padding:6px 8px;border-radius:999px;background:#fff0dc;color:#855b18;font-size:.6rem;font-weight:800}
      .hr-follow-up{margin:10px 0 0;color:#65707c;font-size:.68rem}
      .hr-history-list{display:grid;gap:9px}.hr-history-list article{padding:11px 12px;border:1px solid #e4e7ea;border-radius:9px;background:#fafaf8}
      .hr-history-meta{display:flex;justify-content:space-between;gap:12px;color:#68717a;font-size:.62rem}.hr-history-meta strong{color:#315b87;text-transform:capitalize}.hr-history-list p{margin:7px 0;color:#343d48;font-size:.7rem;line-height:1.55}.hr-history-list small{display:block;margin-top:4px;color:#747c85;font-size:.6rem;line-height:1.45}
      @media(max-width:620px){.ctg-host-response-dialog{width:100vw;max-height:100dvh;height:100dvh;border-radius:0}.ctg-host-response-form{max-height:100dvh}.hr-grid{grid-template-columns:1fr}.hr-grid .wide{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  private option(value: string, label: string, selected: string): string {
    return `<option value="${this.escapeAttribute(value)}" ${selected === value ? 'selected' : ''}>${this.escapeText(label)}</option>`;
  }

  private channelLabel(channel: HostResponseChannel): string {
    return channel === 'in-person'
      ? 'In person'
      : channel === 'whatsapp'
        ? 'WhatsApp'
        : channel.charAt(0).toUpperCase() + channel.slice(1);
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(date);
  }

  private localDateTimeValue(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  private toIso(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private escapeAttribute(value: string): string {
    return this.escapeText(value).replaceAll('"', '&quot;');
  }

  private escapeText(value: string): string {
    return (value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}
