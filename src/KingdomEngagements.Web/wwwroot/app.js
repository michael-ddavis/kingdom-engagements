const state = { assignments: [], selectedId: null, selected: null };
const list = document.querySelector('#assignment-list');
const count = document.querySelector('#assignment-count');
const detail = document.querySelector('#assignment-detail');
const metrics = document.querySelector('#metrics');
const message = document.querySelector('#message');
const dialog = document.querySelector('#task-dialog');
const taskForm = document.querySelector('#task-form');

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.title || `Request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
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

document.querySelector('#refresh').addEventListener('click', () => loadAssignments(true).catch(error => showMessage(error.message, true)));
document.querySelectorAll('.sidebar nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.sidebar nav a').forEach(item => item.classList.remove('active'));
  link.classList.add('active');
}));

function statusEntries(item) {
  return [
    ['Travel', item.travelStatus], ['Lodging', item.lodgingStatus],
    ['Transportation', item.transportationStatus], ['Host', item.hostStatus],
    ['Documents', item.documentsStatus], ['Closeout', item.closeoutStatus],
  ];
}
function formatDate(value) { return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Date pending'; }
function formatDateTime(value) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Pending'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[character]); }

Promise.all([loadProduct(), loadAssignments(false)]).catch(error => showMessage(error.message, true));
