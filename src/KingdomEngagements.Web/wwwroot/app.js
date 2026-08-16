const state = { assignments: [], selectedId: null, selected: null, requests: [], selectedRequestId: null, selectedRequest: null };
const list = document.querySelector('#assignment-list');
const count = document.querySelector('#assignment-count');
const detail = document.querySelector('#assignment-detail');
const metrics = document.querySelector('#metrics');
const message = document.querySelector('#message');
const dialog = document.querySelector('#task-dialog');
const taskForm = document.querySelector('#task-form');
const requestList = document.querySelector('#request-list');
const requestCount = document.querySelector('#request-count');
const requestDetail = document.querySelector('#request-detail');

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const validation = body?.errors ? Object.values(body.errors).flat().join(' ') : '';
    throw new Error(validation || body?.message || body?.title || `Request failed (${response.status})`);
  }
  return body;
}

function showMessage(text, error = false) {
  message.hidden = !text;
  message.textContent = text || '';
  message.style.background = error ? '#fff3f6' : '#eefaf8';
  message.style.color = error ? '#8d3450' : '#126764';
}

async function loadProduct() {
  const product = await api('/api/product');
  document.querySelector('#tenant-name').textContent = product.tenantName;
  document.querySelector('#platform-link').href = product.platformUrl;
}

async function loadRequests(keepSelection = true) {
  state.requests = await api('/api/engagements/requests');
  requestCount.textContent = String(state.requests.length);
  renderRequests();
  const preferred = keepSelection && state.selectedRequestId
    ? state.requests.find(item => item.id === state.selectedRequestId)?.id
    : state.requests[0]?.id;
  if (preferred) await selectRequest(preferred);
  else requestDetail.innerHTML = '<div class="empty request-empty">No invitations have been submitted yet. Open the host invitation form to start the demo flow.</div>';
}

function renderRequests() {
  requestList.innerHTML = state.requests.length ? state.requests.map(item => `
    <button class="request-card ${item.id === state.selectedRequestId ? 'active' : ''}" data-request-id="${item.id}">
      <span class="request-status request-status--${escapeHtml(item.status)}">${formatStatus(item.status)}</span>
      <strong>${escapeHtml(item.eventName)}</strong>
      <small>${escapeHtml(item.organizationName)} · ${escapeHtml(item.city)}, ${escapeHtml(item.state || item.region || item.country)}</small>
      <em>${escapeHtml(item.referenceNumber)} · ${formatDate(item.startDate)}</em>
      <b>${item.readinessPercentage}%</b>
    </button>`).join('') : '<p class="request-list-empty">No invitations yet.</p>';
  requestList.querySelectorAll('[data-request-id]').forEach(button => button.addEventListener('click', () => selectRequest(button.dataset.requestId)));
}

async function selectRequest(id) {
  state.selectedRequestId = id;
  state.selectedRequest = await api(`/api/engagements/requests/${id}`);
  renderRequests();
  renderRequestDetail();
}

function renderRequestDetail() {
  const item = state.selectedRequest;
  if (!item) return;
  const canReview = !['approved', 'declined'].includes(item.status);
  const hostLink = item.status === 'information-needed' && item.editToken
    ? `${window.location.origin}/invite/apostle-cynthia/requests/${encodeURIComponent(item.editToken)}`
    : null;
  const timeline = item.communications?.length
    ? item.communications.map(entry => `
      <article class="request-timeline-item">
        <span></span>
        <div><strong>${escapeHtml(formatCommunicationType(entry.type))}</strong><p>${escapeHtml(entry.message)}</p><small>${escapeHtml(entry.actor)} · ${formatDateTime(entry.createdAtUtc)}</small></div>
      </article>`).join('')
    : '<p class="request-list-empty">No communication history yet.</p>';

  requestDetail.innerHTML = `
    <header class="request-detail-header">
      <div><p class="eyebrow">${escapeHtml(item.referenceNumber)}</p><h2>${escapeHtml(item.eventName)}</h2><p>${escapeHtml(item.organizationName)} · ${escapeHtml(item.eventType)}</p></div>
      <span class="request-status request-status--${escapeHtml(item.status)}">${formatStatus(item.status)}</span>
    </header>
    <section class="request-readiness">
      <div><strong>${item.readinessPercentage}%</strong><small>host readiness</small></div>
      <progress max="100" value="${item.readinessPercentage}"></progress>
    </section>
    <section class="request-summary-grid">
      ${requestSummary('Event dates', `${formatDate(item.startDate)}${item.endDate !== item.startDate ? ` – ${formatDate(item.endDate)}` : ''}`)}
      ${requestSummary('Venue', `${item.venueName} · ${item.venueAddress}`)}
      ${requestSummary('Location', [item.city, item.state || item.region, item.country].filter(Boolean).join(', '))}
      ${requestSummary('Timezone', item.timeZone)}
      ${requestSummary('Primary contact', `${item.contactName} · ${item.contactEmail} · ${item.contactPhone}`)}
      ${requestSummary('Expected attendance', String(item.expectedAttendance))}
    </section>
    <section class="request-section">
      <header><div><p class="eyebrow">Requested ministry</p><h3>Assignment request</h3></div></header>
      <p class="request-copy">${escapeHtml(item.ministryRequest)}</p>
    </section>
    <section class="request-section">
      <header><div><p class="eyebrow">Host commitments</p><h3>Travel, lodging and terms</h3></div></header>
      <div class="request-terms-grid">
        ${requestSummary('Travel coverage', formatStatus(item.travelCoverageStatus))}
        ${requestSummary('Lodging coverage', formatStatus(item.lodgingCoverageStatus))}
        ${requestSummary('Honorarium', `${formatStatus(item.honorariumStatus)}${item.honorariumAmount ? ` · ${item.honorariumCurrency} ${Number(item.honorariumAmount).toLocaleString()}` : ''}`)}
        ${requestSummary('Travel booked by', formatStatus(item.travelBookedBy))}
        ${requestSummary('Payment', formatStatus(item.paymentStatus))}
        ${requestSummary('Agreement', formatStatus(item.agreementStatus))}
      </div>
    </section>
    ${hostLink ? `<section class="host-link-card"><div><p class="eyebrow">Host correction link</p><strong>Waiting on host response</strong><p>The same invitation form will reopen with the host's original answers populated.</p></div><a href="${hostLink}" target="_blank" rel="noopener">Open secure link</a></section>` : ''}
    <section class="request-section">
      <header><div><p class="eyebrow">Review exchange</p><h3>Communication history</h3></div></header>
      <div class="request-timeline">${timeline}</div>
    </section>
    ${canReview ? `<section class="request-actions">
      <label>Message or decision reason<textarea id="review-message" rows="4" placeholder="Write the host question or decline reason here."></textarea></label>
      <div class="request-action-buttons">
        <button type="button" class="request-action request-action--secondary" data-review-action="rfi">Request information</button>
        <button type="button" class="request-action request-action--approve" data-review-action="approve">Approve invitation</button>
        <button type="button" class="request-action request-action--decline" data-review-action="decline">Decline</button>
      </div>
    </section>` : item.status === 'approved' && item.assignmentId ? `<section class="request-actions request-actions--resolved"><strong>Invitation approved</strong><p>This request is now linked to a real Engagements assignment.</p><button type="button" class="request-action request-action--approve" data-open-assignment="${item.assignmentId}">Open assignment</button></section>` : `<section class="request-actions request-actions--resolved"><strong>Invitation declined</strong><p>${escapeHtml(item.declineReason || 'The ministry team is unable to accept this invitation.')}</p></section>`}
  `;

  requestDetail.querySelectorAll('[data-review-action]').forEach(button => button.addEventListener('click', () => reviewRequest(button.dataset.reviewAction)));
  requestDetail.querySelectorAll('[data-open-assignment]').forEach(button => button.addEventListener('click', async () => {
    await loadAssignments(false);
    await selectAssignment(button.dataset.openAssignment);
    window.location.hash = 'assignments';
  }));
}

function requestSummary(label, value) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || 'Not provided')}</strong></article>`;
}

async function reviewRequest(action) {
  const item = state.selectedRequest;
  if (!item) return;
  const reviewMessage = requestDetail.querySelector('#review-message')?.value.trim() || '';
  try {
    if (action === 'rfi') {
      if (!reviewMessage) throw new Error('Write the information request before sending it to the host.');
      const result = await api(`/api/engagements/requests/${item.id}/request-information`, {
        method: 'POST', body: JSON.stringify({ message: reviewMessage }),
      });
      showMessage(`Information requested. Host update link: ${result.editUrl}`);
    } else if (action === 'decline') {
      if (!reviewMessage) throw new Error('A decline reason is required.');
      if (!await window.kingdomConfirm({
        title: 'Decline this invitation?',
        message: 'The reason will be recorded in the request history for the ministry team.',
        confirmLabel: 'Decline invitation',
      })) return;
      await api(`/api/engagements/requests/${item.id}/decline`, {
        method: 'POST', body: JSON.stringify({ reason: reviewMessage }),
      });
      showMessage('Invitation declined and the decision was recorded.');
    } else if (action === 'approve') {
      if (!await window.kingdomConfirm({
        title: 'Approve this invitation?',
        message: 'An Engagements assignment will be created from the host intake without duplicate entry.',
        confirmLabel: 'Approve & create assignment',
      })) return;
      const result = await api(`/api/engagements/requests/${item.id}/approve`, { method: 'POST', body: '{}' });
      showMessage('Invitation approved. The assignment was created from the host intake without duplicate entry.');
      state.selectedId = result.assignmentId;
      await loadAssignments(true);
    }
    await loadRequests(true);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function loadAssignments(keepSelection = true) {
  showMessage('');
  state.assignments = await api('/api/engagements/assignments');
  count.textContent = String(state.assignments.length);
  renderMetrics();
  renderAssignments();
  const preferred = keepSelection && state.selectedId
    ? state.assignments.find(item => item.id === state.selectedId)?.id
    : state.assignments[0]?.id;
  if (preferred) await selectAssignment(preferred);
  else detail.innerHTML = '<div class="empty">No approved assignments are waiting in Engagements.</div>';
}

function renderMetrics() {
  const total = state.assignments.length;
  const ready = state.assignments.filter(item => item.readinessPercent >= 80).length;
  const attention = state.assignments.filter(item => [
    item.travelStatus, item.lodgingStatus, item.transportationStatus,
    item.hostStatus, item.documentsStatus, item.closeoutStatus,
  ].includes('needs-attention')).length;
  const openTasks = state.assignments.reduce((sum, item) => sum + item.openTasks, 0);
  metrics.innerHTML = [
    ['Approved assignments', total, 'Owned by Engagements'],
    ['Ready or nearly ready', ready, '80% readiness or higher'],
    ['Needs attention', attention, 'A coordination lane is at risk'],
    ['Open readiness tasks', openTasks, 'Across travel, host, documents, and closeout'],
  ].map(([label, value, note]) => `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
}

function renderAssignments() {
  list.innerHTML = state.assignments.map(item => `
    <button class="assignment-card ${item.id === state.selectedId ? 'active' : ''}" data-id="${item.id}">
      <i></i>
      <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.hostOrganization)} · ${escapeHtml(item.location || 'Location pending')}</small><em>${formatDate(item.startsAtUtc)} · ${item.openTasks} open tasks</em></span>
      <b>${item.readinessPercent}%</b>
    </button>`).join('');
  list.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', () => selectAssignment(button.dataset.id)));
}

async function selectAssignment(id) {
  state.selectedId = id;
  state.selected = await api(`/api/engagements/assignments/${id}`);
  renderAssignments();
  renderDetail();
}

function renderDetail() {
  const item = state.selected;
  if (!item) return;
  const node = document.querySelector('#detail-template').content.cloneNode(true);
  node.querySelector('[data-field="title"]').textContent = item.summary.title;
  node.querySelector('[data-field="subtitle"]').textContent = `${item.summary.speakerName} · ${item.summary.hostOrganization}`;
  node.querySelector('[data-field="status"]').textContent = item.summary.status;
  node.querySelector('[data-field="readiness"]').textContent = `${item.summary.readinessPercent}%`;
  node.querySelector('[data-field="progress"]').value = item.summary.readinessPercent;
  node.querySelector('.status-grid').innerHTML = statusEntries(item.summary)
    .map(([label, value]) => `<article><span>${label}</span><strong>${escapeHtml(value)}</strong></article>`).join('');
  node.querySelector('.details-list').innerHTML = [
    ['Host contact', item.hostContactName || 'Not assigned'],
    ['Host email', item.hostContactEmail || 'Not provided'],
    ['Location', item.summary.location || 'Pending'],
    ['Starts', formatDateTime(item.summary.startsAtUtc)],
    ['Ends', formatDateTime(item.endsAtUtc)],
    ['External assignment', item.summary.externalAssignmentId],
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
  node.querySelector('.task-list').innerHTML = item.tasks.length ? item.tasks.map(task => `
    <article class="task-item">
      <div><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(task.category)} · ${escapeHtml(task.owner)}</p><small>${task.dueAtUtc ? `Due ${formatDate(task.dueAtUtc)}` : 'No due date'}${task.detail ? ` · ${escapeHtml(task.detail)}` : ''}</small></div>
      <select data-task-id="${task.id}" aria-label="Status for ${escapeHtml(task.title)}">
        ${['open','in-progress','needs-attention','confirmed','complete','waived'].map(status => `<option value="${status}" ${status === task.status ? 'selected' : ''}>${status}</option>`).join('')}
      </select>
    </article>`).join('') : '<p class="empty">No readiness tasks have been added.</p>';
  node.querySelector('.document-list').innerHTML = item.documents.length ? item.documents.map(document => `
    <article class="document-item"><div><strong>${escapeHtml(document.name)}</strong><small>${escapeHtml(document.category)} · ${escapeHtml(document.status)}</small></div><b>${document.storageReference ? 'Stored' : 'Pending'}</b></article>`).join('') : '<p class="empty">No documents are being tracked.</p>';
  node.querySelector('.closeout-copy').textContent = item.summary.closeoutStatus === 'complete'
    ? 'Closeout is complete. Outcomes may now be shared through governed KingdomOS events.'
    : 'Closeout remains in Engagements until host follow-up, final documents, expense handoff, and outcome notes are complete.';
  node.querySelector('[data-action="add-task"]').addEventListener('click', () => dialog.showModal());
  detail.replaceChildren(node);
  detail.querySelectorAll('[data-task-id]').forEach(select => select.addEventListener('change', () => updateTask(select.dataset.taskId, select.value)));
}

async function updateTask(taskId, status) {
  const task = state.selected.tasks.find(candidate => candidate.id === taskId);
  try {
    state.selected = await api(`/api/engagements/assignments/${state.selectedId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, owner: task.owner, detail: task.detail, dueAtUtc: task.dueAtUtc }),
    });
    showMessage('Readiness task updated.');
    await loadAssignments(true);
  } catch (error) {
    showMessage(error.message, true);
    await selectAssignment(state.selectedId);
  }
}

taskForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.submitter?.value === 'cancel') {
    dialog.close();
    return;
  }
  const data = new FormData(taskForm);
  try {
    state.selected = await api(`/api/engagements/assignments/${state.selectedId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        category: data.get('category'), title: data.get('title'), owner: data.get('owner'),
        detail: data.get('detail') || null,
        dueAtUtc: data.get('dueAtUtc') ? new Date(`${data.get('dueAtUtc')}T12:00:00Z`).toISOString() : null,
      }),
    });
    taskForm.reset();
    dialog.close();
    showMessage('Readiness task added.');
    await loadAssignments(true);
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.querySelector('#refresh').addEventListener('click', () => Promise.all([loadRequests(true), loadAssignments(true)]).catch(error => showMessage(error.message, true)));
document.querySelectorAll('.sidebar nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.sidebar nav a').forEach(item => item.classList.remove('active'));
  link.classList.add('active');
  if (link.getAttribute('href') === '#requests') {
    loadRequests(true).catch(error => showMessage(error.message, true));
  }
}));

let lastRequestRefreshAt = 0;
function refreshRequestsAfterReturn() {
  if (document.visibilityState !== 'visible' || Date.now() - lastRequestRefreshAt < 1000) return;
  lastRequestRefreshAt = Date.now();
  loadRequests(true).catch(error => showMessage(error.message, true));
}
window.addEventListener('focus', refreshRequestsAfterReturn);
document.addEventListener('visibilitychange', refreshRequestsAfterReturn);

function statusEntries(item) {
  return [
    ['Travel', item.travelStatus], ['Lodging', item.lodgingStatus],
    ['Transportation', item.transportationStatus], ['Host', item.hostStatus],
    ['Documents', item.documentsStatus], ['Closeout', item.closeoutStatus],
  ];
}
function formatStatus(value) { return String(value || '').replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function formatCommunicationType(value) { return ({ submitted:'Invitation submitted', 'information-requested':'Information requested', 'host-responded':'Host resubmitted', approved:'Invitation approved', declined:'Invitation declined' })[value] || formatStatus(value); }
function formatDate(value) {
  if (!value) return 'Date pending';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day));
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
function formatDateTime(value) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Pending'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[character]); }

Promise.all([loadProduct(), loadRequests(false), loadAssignments(false)]).catch(error => showMessage(error.message, true));
