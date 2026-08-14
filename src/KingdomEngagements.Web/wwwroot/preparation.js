const baseSelectAssignment = selectAssignment;

selectAssignment = async function(id) {
  await baseSelectAssignment(id);
  await renderAssignmentWorkspace();
};

async function renderAssignmentWorkspace() {
  if (!state.selectedId || !detail.querySelector('.detail-header')) return;
  try {
    const result = await api(`/api/engagements/assignments/${state.selectedId}/workspace`);
    state.assignmentWorkspace = result;
    const workspace = result.workspace;
    const preparation = workspace.preparation;
    const coordination = preparation.coordination;
    const readiness = workspace.readiness;
    const termsAccepted = preparation.termsStatus === 'accepted';
    const coordinationSubmitted = preparation.coordinationStatus === 'submitted';

    hideLegacyAssignmentSummary();

    const panel = document.createElement('section');
    panel.className = 'assignment-workspace';
    panel.innerHTML = `
      <header class="assignment-workspace__header">
        <div class="assignment-workspace__identity">
          <p class="eyebrow">${escapeHtml(preparation.referenceNumber)} · approved invitation</p>
          <h3>Assignment preparation</h3>
          <p>One working record for the ministry team and host—from accepted terms through arrival readiness.</p>
        </div>
        <div class="readiness-dial" style="--readiness:${Math.max(0, Math.min(100, readiness.overallPercent))}">
          <strong>${readiness.overallPercent}%</strong>
          <span>${escapeHtml(formatStatus(readiness.status))}</span>
        </div>
      </header>

      <section class="assignment-progress" aria-label="Assignment preparation progress">
        ${progressStep('01', 'Invitation', 'Approved', true, false, 'The approved host intake created this assignment.')}
        ${progressStep('02', 'Terms', termsAccepted ? 'Accepted' : 'Awaiting host', termsAccepted, !termsAccepted, termsAccepted
          ? `Accepted${preparation.termsAcceptedByName ? ` by ${escapeHtml(preparation.termsAcceptedByName)}` : ''}.`
          : 'Host acceptance unlocks the coordination portal.')}
        ${progressStep('03', 'Host preparation', coordinationSubmitted ? 'Submitted' : termsAccepted ? 'In progress' : 'Locked', coordinationSubmitted, termsAccepted && !coordinationSubmitted,
          coordinationSubmitted ? 'Host details are connected to the assignment.' : termsAccepted ? 'Host and ministry team can continue preparation.' : 'Coordination opens after terms are accepted.')}
      </section>

      <section class="readiness-radar">
        <header>
          <div><p class="eyebrow">Readiness Radar</p><h4>What is ready—and what still needs attention</h4></div>
          <small>Calculated from the actual assignment record</small>
        </header>
        <div class="readiness-radar__lanes">
          ${readiness.lanes.map(lane => `
            <article class="readiness-lane">
              <div><span>${escapeHtml(lane.label)}</span><strong>${lane.percent}%</strong></div>
              <div class="readiness-lane__track"><i style="width:${Math.max(0, Math.min(100, lane.percent))}%"></i></div>
              <p>${escapeHtml(lane.detail)}</p>
            </article>`).join('')}
        </div>
      </section>

      <div class="assignment-workspace__links">
        <div>
          <span>Host-facing links</span>
          <p>Use these when the ministry team needs to resend a secure preparation link.</p>
        </div>
        <div class="assignment-workspace__link-actions">
          <a href="${escapeHtml(result.termsUrl)}" target="_blank" rel="noopener">${termsAccepted ? 'View terms' : 'Open terms'}</a>
          <button type="button" data-copy-link="${escapeHtml(result.termsUrl)}">Copy terms link</button>
          ${result.coordinationUrl ? `<a href="${escapeHtml(result.coordinationUrl)}" target="_blank" rel="noopener">Open host portal</a><button type="button" data-copy-link="${escapeHtml(result.coordinationUrl)}">Copy host link</button>` : ''}
        </div>
      </div>

      <form id="assignment-coordination-form" class="assignment-editor">
        <nav class="assignment-workspace__tabs" aria-label="Assignment preparation sections">
          ${tabButton('overview', 'Overview', true)}
          ${tabButton('travel', 'Travel & stay')}
          ${tabButton('schedule', 'Schedule')}
          ${tabButton('contacts', 'Contacts')}
          ${tabButton('documents', 'Documents')}
          ${tabButton('activity', 'Activity')}
        </nav>

        <section class="assignment-pane is-active" data-workspace-pane="overview">
          <div class="assignment-overview">
            <section class="assignment-overview__main">
              <div class="section-intro"><p class="eyebrow">At a glance</p><h4>Prepared for arrival</h4></div>
              <dl class="overview-ledger">
                ${ledgerRow('Outbound', travelSummary(coordination, false))}
                ${ledgerRow('Return', travelSummary(coordination, true))}
                ${ledgerRow('Lodging', coordination.hotelName ? `${coordination.hotelName}${coordination.hotelConfirmationNumber ? ` · ${coordination.hotelConfirmationNumber}` : ''}` : 'Not entered')}
                ${ledgerRow('Ground transportation', coordination.pickupContactName ? `${coordination.pickupContactName}${coordination.pickupContactPhone ? ` · ${coordination.pickupContactPhone}` : ''}` : coordination.transportationPlan || 'Not entered')}
                ${ledgerRow('Event schedule', `${coordination.schedule?.length || 0} session${coordination.schedule?.length === 1 ? '' : 's'} recorded`)}
                ${ledgerRow('Primary host', primaryContactSummary(coordination.contacts))}
                ${ledgerRow('Prayer focus', coordination.prayerFocus || 'Not recorded')}
              </dl>
            </section>
            <aside class="attention-rail">
              <p class="eyebrow">Needs attention</p>
              <h4>${readiness.attentionItems.length ? `${readiness.attentionItems.length} preparation item${readiness.attentionItems.length === 1 ? '' : 's'}` : 'Nothing outstanding'}</h4>
              ${readiness.attentionItems.length ? `<ol>${readiness.attentionItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>` : '<p class="attention-clear">The current preparation record has no open readiness signals.</p>'}
            </aside>
          </div>
          <section class="ministry-preparation-notes">
            <div class="section-intro"><p class="eyebrow">Ministry preparation</p><h4>Prayer, promotion and host notes</h4><p>These are shared preparation details, not a second copy of the host record.</p></div>
            <div class="editor-grid">
              <label class="editor-field editor-field--wide"><span>Prayer focus</span><textarea name="prayerFocus" rows="4" maxlength="4000" placeholder="What is the host asking the ministry team to carry in prayer?">${escapeHtml(coordination.prayerFocus || '')}</textarea></label>
              <label class="editor-field"><span>Promotion requirements</span><textarea name="promotionRequirements" rows="5" maxlength="4000" placeholder="Approved imagery, biography, naming, posting or media requirements.">${escapeHtml(coordination.promotionRequirements || '')}</textarea></label>
              <label class="editor-field"><span>Host notes</span><textarea name="hostNotes" rows="5" maxlength="4000" placeholder="Green room, arrival, protocol or other preparation notes.">${escapeHtml(coordination.hostNotes || '')}</textarea></label>
            </div>
          </section>
        </section>

        <section class="assignment-pane" data-workspace-pane="travel">
          <div class="section-intro"><p class="eyebrow">Travel itinerary</p><h4>Outbound and return</h4><p>Coordinator edits write back to the same itinerary the host supplied.</p></div>
          <div class="journey-ledger">
            ${flightEditor('outbound', 'Outbound', coordination)}
            ${flightEditor('return', 'Return', coordination)}
          </div>
          <section class="stay-editor">
            <div class="section-intro"><p class="eyebrow">Lodging</p><h4>Stay details</h4></div>
            <div class="editor-grid editor-grid--three">
              ${inputField('Hotel name', 'hotelName', coordination.hotelName, 'text')}
              ${inputField('Confirmation number', 'hotelConfirmationNumber', coordination.hotelConfirmationNumber, 'text')}
              ${inputField('Hotel address', 'hotelAddress', coordination.hotelAddress, 'text', 'editor-field--wide')}
              ${inputField('Check in', 'hotelCheckInAtUtc', dateTimeLocal(coordination.hotelCheckInAtUtc), 'datetime-local')}
              ${inputField('Check out', 'hotelCheckOutAtUtc', dateTimeLocal(coordination.hotelCheckOutAtUtc), 'datetime-local')}
            </div>
          </section>
          <section class="stay-editor">
            <div class="section-intro"><p class="eyebrow">Local transportation</p><h4>Airport, hotel and venue movement</h4></div>
            <div class="editor-grid">
              <label class="editor-field editor-field--wide"><span>Transportation plan</span><textarea name="transportationPlan" rows="4" maxlength="3000">${escapeHtml(coordination.transportationPlan || '')}</textarea></label>
              ${inputField('Pickup contact', 'pickupContactName', coordination.pickupContactName, 'text')}
              ${inputField('Pickup phone', 'pickupContactPhone', coordination.pickupContactPhone, 'tel')}
            </div>
          </section>
        </section>

        <section class="assignment-pane" data-workspace-pane="schedule">
          <div class="section-intro section-intro--with-action"><div><p class="eyebrow">Event schedule</p><h4>Sessions and ministry moments</h4><p>Keep the schedule here so the traveler-facing assignment and host preparation stay aligned.</p></div><button type="button" class="quiet-action" data-add-schedule>Add session</button></div>
          <div class="schedule-editor" data-schedule-list>
            ${(coordination.schedule?.length ? coordination.schedule : []).map((item, index) => scheduleRow(item, index)).join('') || '<p class="editor-empty" data-empty-schedule>No schedule items yet. Add the first ministry session.</p>'}
          </div>
        </section>

        <section class="assignment-pane" data-workspace-pane="contacts">
          <div class="section-intro section-intro--with-action"><div><p class="eyebrow">Coordination contacts</p><h4>People responsible for the assignment</h4><p>Primary, travel, media and emergency contacts remain attached to this assignment.</p></div><button type="button" class="quiet-action" data-add-contact>Add contact</button></div>
          <div class="contact-editor" data-contact-list>
            ${(coordination.contacts?.length ? coordination.contacts : []).map((item, index) => contactRow(item, index)).join('') || '<p class="editor-empty" data-empty-contact>No contacts have been added.</p>'}
          </div>
        </section>

        <section class="assignment-pane" data-workspace-pane="documents">
          ${documentsPane(coordination.documents || [], state.selected?.documents || [])}
        </section>

        <section class="assignment-pane" data-workspace-pane="activity">
          ${activityPane(workspace.activity || [])}
        </section>

        <footer class="assignment-editor__actions">
          <div><span>Last host submission</span><strong>${preparation.coordinationSubmittedAtUtc ? escapeHtml(formatDateTime(preparation.coordinationSubmittedAtUtc)) : 'Not submitted yet'}</strong></div>
          <div>
            <button type="submit" class="secondary-save" data-submit-prepared="false">Save changes</button>
            <button type="submit" class="primary-save" data-submit-prepared="true" ${termsAccepted ? '' : 'disabled title="Accepted terms are required first"'}>${coordinationSubmitted ? 'Save & keep prepared' : 'Save & mark prepared'}</button>
          </div>
        </footer>
      </form>`;

    detail.querySelector('.detail-header').insertAdjacentElement('afterend', panel);
    bindAssignmentWorkspace(panel);
  } catch (error) {
    if (!/approved invitation preparation record|not created from an approved speaking invitation/i.test(error.message)) showMessage(error.message, true);
  }
}

function hideLegacyAssignmentSummary() {
  const readiness = detail.querySelector('.readiness-card');
  const status = detail.querySelector('.status-grid');
  const details = detail.querySelector('.details-list')?.closest('.detail-section');
  const documents = detail.querySelector('.detail-section#documents');
  if (readiness) readiness.hidden = true;
  if (status) status.hidden = true;
  if (details) details.hidden = true;
  if (documents) documents.hidden = true;
}

function progressStep(number, label, status, complete, active, copy) {
  return `<article class="assignment-progress__step ${complete ? 'is-complete' : ''} ${active ? 'is-active' : ''}"><span>${number} · ${escapeHtml(label)}</span><strong>${escapeHtml(status)}</strong><p>${copy}</p></article>`;
}

function tabButton(key, label, active = false) {
  return `<button type="button" class="${active ? 'is-active' : ''}" data-workspace-tab="${key}">${escapeHtml(label)}</button>`;
}

function ledgerRow(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || 'Not entered')}</dd></div>`;
}

function travelSummary(coordination, returning) {
  const prefix = returning ? 'return' : 'outbound';
  const airline = coordination[`${prefix}Airline`];
  const flight = coordination[`${prefix}FlightNumber`];
  const departure = coordination[`${prefix}DepartureAirport`];
  const arrival = coordination[`${prefix}ArrivalAirport`];
  const departsAt = coordination[`${prefix}DepartsAtUtc`];
  if (!airline && !flight && !departure && !arrival) return 'Not entered';
  return `${[airline, flight].filter(Boolean).join(' ')}${departure || arrival ? ` · ${departure || '—'} → ${arrival || '—'}` : ''}${departsAt ? ` · ${formatDateTime(departsAt)}` : ''}`;
}

function primaryContactSummary(contacts = []) {
  const primary = contacts.find(item => ['primary', 'host'].includes(String(item.type || '').toLowerCase())) || contacts[0];
  return primary ? `${primary.name}${primary.phone ? ` · ${primary.phone}` : ''}` : 'Not entered';
}

function flightEditor(prefix, label, coordination) {
  const cap = prefix[0].toUpperCase() + prefix.slice(1);
  return `<section class="flight-editor">
    <header><span>${escapeHtml(label)}</span><strong>${escapeHtml(travelSummary(coordination, prefix === 'return'))}</strong></header>
    <div class="editor-grid editor-grid--three">
      ${inputField('Airline', `${prefix}Airline`, coordination[`${prefix}Airline`], 'text')}
      ${inputField('Flight number', `${prefix}FlightNumber`, coordination[`${prefix}FlightNumber`], 'text')}
      ${inputField('Confirmation', `${prefix}ConfirmationNumber`, coordination[`${prefix}ConfirmationNumber`], 'text')}
      ${inputField('Departure airport', `${prefix}DepartureAirport`, coordination[`${prefix}DepartureAirport`], 'text')}
      ${inputField('Arrival airport', `${prefix}ArrivalAirport`, coordination[`${prefix}ArrivalAirport`], 'text')}
      ${inputField('Departs', `${prefix}DepartsAtUtc`, dateTimeLocal(coordination[`${prefix}DepartsAtUtc`]), 'datetime-local')}
      ${inputField('Arrives', `${prefix}ArrivesAtUtc`, dateTimeLocal(coordination[`${prefix}ArrivesAtUtc`]), 'datetime-local')}
    </div>
  </section>`;
}

function inputField(label, name, value, type = 'text', className = '') {
  return `<label class="editor-field ${className}"><span>${escapeHtml(label)}</span><input type="${escapeHtml(type)}" name="${escapeHtml(name)}" value="${escapeHtml(value || '')}" /></label>`;
}

function scheduleRow(item = {}, index = 0) {
  return `<article class="schedule-editor__row" data-schedule-row>
    <div class="schedule-editor__number">${String(index + 1).padStart(2, '0')}</div>
    <div class="schedule-editor__fields">
      ${inputField('Session / ministry moment', 'scheduleTitle', item.title, 'text', 'editor-field--wide')}
      ${inputField('Date', 'scheduleDate', item.date, 'date')}
      ${inputField('Starts', 'scheduleStartsAt', item.startsAt, 'time')}
      ${inputField('Ends', 'scheduleEndsAt', item.endsAt, 'time')}
      ${inputField('Location', 'scheduleLocation', item.location, 'text')}
      <label class="editor-field editor-field--wide"><span>Notes</span><textarea name="scheduleNotes" rows="2">${escapeHtml(item.notes || '')}</textarea></label>
    </div>
    <button type="button" class="row-remove" data-remove-schedule aria-label="Remove schedule item">×</button>
  </article>`;
}

function contactRow(item = {}, index = 0) {
  const type = String(item.type || 'primary').toLowerCase();
  return `<article class="contact-editor__row" data-contact-row>
    <div class="contact-editor__number">${String(index + 1).padStart(2, '0')}</div>
    <div class="contact-editor__fields">
      <label class="editor-field"><span>Responsibility</span><select name="contactType">${['primary','travel','media','emergency','host'].map(value => `<option value="${value}" ${value === type ? 'selected' : ''}>${formatStatus(value)}</option>`).join('')}</select></label>
      ${inputField('Name', 'contactName', item.name, 'text')}
      ${inputField('Email', 'contactEmail', item.email, 'email')}
      ${inputField('Phone', 'contactPhone', item.phone, 'tel')}
    </div>
    <button type="button" class="row-remove" data-remove-contact aria-label="Remove contact">×</button>
  </article>`;
}

function documentsPane(coordinationDocuments, assignmentDocuments) {
  const linkedIds = new Set(coordinationDocuments.map(item => item.id));
  const otherRecords = assignmentDocuments.filter(item => !String(item.storageReference || '').startsWith('coordination-document:'));
  return `
    <div class="section-intro"><p class="eyebrow">Assignment files</p><h4>Documents carried with the engagement</h4><p>Host uploads and ministry-team uploads live on the same preparation record.</p></div>
    <div class="document-upload-row">
      <label><span>Add a file</span><input type="file" data-workspace-file /></label>
      <button type="button" class="quiet-action" data-upload-document>Upload document</button>
      <small>PDFs, images and office files up to 10 MB.</small>
    </div>
    <div class="workspace-document-list">
      ${coordinationDocuments.length ? coordinationDocuments.map(doc => `
        <article>
          <div><span class="document-mark">DOC</span><div><a href="/api/engagements/assignments/${state.selectedId}/preparation/documents/${doc.id}?download=false" target="_blank" rel="noopener">${escapeHtml(doc.fileName)}</a><small>${formatBytes(doc.length)} · ${formatDateTime(doc.uploadedAtUtc)}</small></div></div>
          <div class="workspace-document-actions"><a href="/api/engagements/assignments/${state.selectedId}/preparation/documents/${doc.id}?download=true" download>Download</a><button type="button" data-delete-document="${doc.id}">Remove</button></div>
        </article>`).join('') : '<p class="editor-empty">No coordination files have been uploaded yet.</p>'}
    </div>
    ${otherRecords.length ? `<section class="record-ledger"><p class="eyebrow">Tracked records</p>${otherRecords.map(doc => `<div><span>${escapeHtml(doc.name)}</span><strong>${escapeHtml(formatStatus(doc.status))}</strong><small>${escapeHtml(formatStatus(doc.category))}</small></div>`).join('')}</section>` : ''}`;
}

function activityPane(activity) {
  return `
    <div class="section-intro"><p class="eyebrow">Assignment history</p><h4>What changed and when</h4><p>Invitation exchange, terms, host preparation, coordinator edits, files, and readiness updates are brought into one timeline.</p></div>
    <div class="assignment-activity">
      ${activity.length ? activity.map(item => `<article><i></i><div><header><strong>${escapeHtml(item.title)}</strong><time>${escapeHtml(formatDateTime(item.occurredAtUtc))}</time></header><p>${escapeHtml(item.detail)}</p><small>${escapeHtml(item.actor)}</small></div></article>`).join('') : '<p class="editor-empty">No assignment activity has been recorded yet.</p>'}
    </div>`;
}

function bindAssignmentWorkspace(panel) {
  panel.querySelectorAll('[data-workspace-tab]').forEach(button => button.addEventListener('click', () => {
    panel.querySelectorAll('[data-workspace-tab]').forEach(item => item.classList.toggle('is-active', item === button));
    panel.querySelectorAll('[data-workspace-pane]').forEach(pane => pane.classList.toggle('is-active', pane.dataset.workspacePane === button.dataset.workspaceTab));
  }));

  panel.querySelectorAll('[data-copy-link]').forEach(button => button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copyLink);
      showMessage('Secure host link copied.');
    } catch {
      showMessage(`Secure host link: ${button.dataset.copyLink}`);
    }
  }));

  const scheduleList = panel.querySelector('[data-schedule-list]');
  panel.querySelector('[data-add-schedule]')?.addEventListener('click', () => {
    scheduleList.querySelector('[data-empty-schedule]')?.remove();
    scheduleList.insertAdjacentHTML('beforeend', scheduleRow({}, scheduleList.querySelectorAll('[data-schedule-row]').length));
    bindRowRemovers(panel);
  });

  const contactList = panel.querySelector('[data-contact-list]');
  panel.querySelector('[data-add-contact]')?.addEventListener('click', () => {
    contactList.querySelector('[data-empty-contact]')?.remove();
    contactList.insertAdjacentHTML('beforeend', contactRow({}, contactList.querySelectorAll('[data-contact-row]').length));
    bindRowRemovers(panel);
  });
  bindRowRemovers(panel);

  panel.querySelector('#assignment-coordination-form')?.addEventListener('submit', event => saveAssignmentCoordination(event, panel));
  panel.querySelector('[data-upload-document]')?.addEventListener('click', () => uploadAssignmentDocument(panel));
  panel.querySelectorAll('[data-delete-document]').forEach(button => button.addEventListener('click', () => deleteAssignmentDocument(button.dataset.deleteDocument)));
}

function bindRowRemovers(panel) {
  panel.querySelectorAll('[data-remove-schedule]').forEach(button => {
    button.onclick = () => {
      button.closest('[data-schedule-row]')?.remove();
      renumberRows(panel, '[data-schedule-row]', '.schedule-editor__number');
    };
  });
  panel.querySelectorAll('[data-remove-contact]').forEach(button => {
    button.onclick = () => {
      button.closest('[data-contact-row]')?.remove();
      renumberRows(panel, '[data-contact-row]', '.contact-editor__number');
    };
  });
}

function renumberRows(panel, selector, numberSelector) {
  panel.querySelectorAll(selector).forEach((row, index) => {
    const number = row.querySelector(numberSelector);
    if (number) number.textContent = String(index + 1).padStart(2, '0');
  });
}

async function saveAssignmentCoordination(event, panel) {
  event.preventDefault();
  const form = event.currentTarget;
  const markPrepared = event.submitter?.dataset.submitPrepared === 'true';
  try {
    const payload = workspacePayload(form, markPrepared);
    await api(`/api/engagements/assignments/${state.selectedId}/workspace/coordination`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    showMessage(markPrepared ? 'Assignment preparation saved and marked prepared.' : 'Assignment preparation saved.');
    await loadAssignments(true);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function workspacePayload(form, markPrepared) {
  const value = name => form.elements.namedItem(name)?.value?.trim() || null;
  const schedule = [...form.querySelectorAll('[data-schedule-row]')].map(row => {
    const title = row.querySelector('[name="scheduleTitle"]')?.value.trim() || '';
    const date = row.querySelector('[name="scheduleDate"]')?.value || '';
    if (!title && !date) return null;
    if (!title) throw new Error('Each schedule item needs a title.');
    if (!date) throw new Error(`Choose a date for “${title}”.`);
    return {
      title,
      date,
      startsAt: row.querySelector('[name="scheduleStartsAt"]')?.value || null,
      endsAt: row.querySelector('[name="scheduleEndsAt"]')?.value || null,
      location: row.querySelector('[name="scheduleLocation"]')?.value.trim() || null,
      notes: row.querySelector('[name="scheduleNotes"]')?.value.trim() || null,
    };
  }).filter(Boolean);
  const contacts = [...form.querySelectorAll('[data-contact-row]')].map(row => {
    const name = row.querySelector('[name="contactName"]')?.value.trim() || '';
    const email = row.querySelector('[name="contactEmail"]')?.value.trim() || '';
    const phone = row.querySelector('[name="contactPhone"]')?.value.trim() || '';
    if (!name && !email && !phone) return null;
    if (!name) throw new Error('Each coordination contact needs a name.');
    return {
      type: row.querySelector('[name="contactType"]')?.value || 'primary',
      name,
      email: email || null,
      phone: phone || null,
    };
  }).filter(Boolean);

  return {
    outboundAirline: value('outboundAirline'),
    outboundFlightNumber: value('outboundFlightNumber'),
    outboundConfirmationNumber: value('outboundConfirmationNumber'),
    outboundDepartureAirport: value('outboundDepartureAirport'),
    outboundArrivalAirport: value('outboundArrivalAirport'),
    outboundDepartsAtUtc: isoOrNull(value('outboundDepartsAtUtc')),
    outboundArrivesAtUtc: isoOrNull(value('outboundArrivesAtUtc')),
    returnAirline: value('returnAirline'),
    returnFlightNumber: value('returnFlightNumber'),
    returnConfirmationNumber: value('returnConfirmationNumber'),
    returnDepartureAirport: value('returnDepartureAirport'),
    returnArrivalAirport: value('returnArrivalAirport'),
    returnDepartsAtUtc: isoOrNull(value('returnDepartsAtUtc')),
    returnArrivesAtUtc: isoOrNull(value('returnArrivesAtUtc')),
    hotelName: value('hotelName'),
    hotelAddress: value('hotelAddress'),
    hotelConfirmationNumber: value('hotelConfirmationNumber'),
    hotelCheckInAtUtc: isoOrNull(value('hotelCheckInAtUtc')),
    hotelCheckOutAtUtc: isoOrNull(value('hotelCheckOutAtUtc')),
    transportationPlan: value('transportationPlan'),
    pickupContactName: value('pickupContactName'),
    pickupContactPhone: value('pickupContactPhone'),
    schedule,
    contacts,
    promotionRequirements: value('promotionRequirements'),
    prayerFocus: value('prayerFocus'),
    hostNotes: value('hostNotes'),
    submit: markPrepared,
  };
}

async function uploadAssignmentDocument(panel) {
  const input = panel.querySelector('[data-workspace-file]');
  const file = input?.files?.[0];
  if (!file) {
    showMessage('Choose a document to upload.', true);
    return;
  }
  try {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`/api/engagements/assignments/${state.selectedId}/workspace/documents`, {
      method: 'POST', credentials: 'same-origin', body: form,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const validation = body?.errors ? Object.values(body.errors).flat().join(' ') : '';
      throw new Error(validation || body?.message || `Upload failed (${response.status})`);
    }
    showMessage(`${file.name} added to the assignment.`);
    await loadAssignments(true);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function deleteAssignmentDocument(documentId) {
  if (!await window.kingdomConfirm({
    title: 'Remove this file?',
    message: 'The file will be removed from this assignment record. This cannot be undone.',
    confirmLabel: 'Remove file',
  })) return;
  try {
    await api(`/api/engagements/assignments/${state.selectedId}/workspace/documents/${documentId}`, { method: 'DELETE' });
    showMessage('Assignment document removed.');
    await loadAssignments(true);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function dateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('One of the date or time values is invalid.');
  return date.toISOString();
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
