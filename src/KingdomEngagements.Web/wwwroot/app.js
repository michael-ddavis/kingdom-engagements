const state = {
  assignments: [],
  details: new Map(),
  entries: [],
  visibleEntries: [],
  selectedEntryId: null,
  selected: null,
  activeDate: startOfDay(new Date()),
  view: 'day',
  recordOpen: false,
};

const ledger = document.querySelector('#ledger');
const recordWorkspace = document.querySelector('#record-workspace');
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
  message.style.background = error ? '#fff3f0' : '#edf5f0';
  message.style.color = error ? '#8c3e3a' : '#245f48';
}

async function loadProduct() {
  const product = await api('/api/product');
  document.querySelector('#tenant-name').textContent = product.tenantName;
  document.querySelector('#platform-link').href = product.platformUrl;
}

async function loadAssignments(keepSelection = true) {
  showMessage('');
  state.assignments = await api('/api/engagements/assignments');
  const details = await Promise.all(state.assignments.map(item =>
    api(`/api/engagements/assignments/${item.id}`)
  ));
  state.details = new Map(details.map(item => [item.summary.id, item]));
  state.entries = buildEntries();

  const previousId = keepSelection ? state.selectedEntryId : null;
  renderDaybook();
  const preferred = state.visibleEntries.find(entry => entry.id === previousId)
    || state.visibleEntries[0]
    || state.entries[0]
    || null;
  selectEntry(preferred?.id || null);
}

function buildEntries() {
  const now = new Date();
  const entries = [];

  state.assignments.forEach(summary => {
    const details = state.details.get(summary.id);
    const blockedLane = statusEntries(summary).find(([, value]) => value === 'needs-attention');
    entries.push({
      id: `assignment-${summary.id}`,
      assignmentId: summary.id,
      taskId: null,
      kind: 'event',
      date: summary.startsAtUtc || now.toISOString(),
      timeLabel: 'Engagement',
      sourceLabel: 'Scheduled engagement',
      title: summary.title,
      description: `${summary.hostOrganization} · ${summary.location || 'Location pending'}`,
      statusLabel: `${summary.readinessPercent}% prepared`,
      stageLabel: blockedLane ? blockedLane[0] : currentStage(summary),
      owner: 'Engagement Coordinator',
      attention: Boolean(blockedLane),
      nextAction: blockedLane
        ? `Resolve the ${blockedLane[0].toLowerCase()} exception before the engagement advances.`
        : `${summary.openTasks} readiness ${summary.openTasks === 1 ? 'task remains' : 'tasks remain'} before arrival.`,
      intelligence: blockedLane
        ? `${blockedLane[0]} is marked needs attention. Keep detailed logistics inside Engagements and share only governed risk and requested help with Operations.`
        : `This engagement is ${summary.readinessPercent}% ready. Continue the next unfinished coordination lane without duplicating traveler details in Operations.`,
      details,
    });

    (details?.tasks || []).filter(task => !isComplete(task.status)).forEach(task => {
      const overdue = task.dueAtUtc && new Date(task.dueAtUtc) < startOfDay(now);
      const attention = task.status === 'needs-attention' || overdue;
      entries.push({
        id: `task-${task.id}`,
        assignmentId: summary.id,
        taskId: task.id,
        kind: 'task',
        date: task.dueAtUtc || summary.startsAtUtc || now.toISOString(),
        timeLabel: task.status === 'needs-attention' ? 'Blocked' : overdue ? 'Overdue' : 'Due',
        sourceLabel: `${titleCase(task.category)} preparation`,
        title: task.title,
        description: `${summary.title} · ${task.detail || 'Readiness work assigned'}`,
        statusLabel: titleCase(task.status),
        stageLabel: titleCase(task.category),
        owner: task.owner,
        attention,
        nextAction: attention
          ? `Resolve this item with ${task.owner} so ${task.category} preparation can continue.`
          : `Complete this item with ${task.owner} and record the outcome in the engagement.`,
        intelligence: attention
          ? `This item can prevent the engagement from being ready. Confirm ownership and the missing information before advancing the lane.`
          : `This is an unfinished ${task.category} item. Completing it will improve the engagement readiness record.`,
        details,
      });
    });
  });

  return entries.sort((left, right) => {
    if (left.attention !== right.attention) return left.attention ? -1 : 1;
    return new Date(left.date) - new Date(right.date);
  });
}

function renderDaybook() {
  const rangeDays = state.view === 'month' ? 30 : state.view === 'week' ? 7 : 1;
  const rangeStart = startOfDay(state.activeDate);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + rangeDays);
  const isToday = sameDay(rangeStart, new Date());
  const inRange = state.entries.filter(entry => {
    if (isToday && entry.attention) return true;
    const date = new Date(entry.date);
    return date >= rangeStart && date < rangeEnd;
  });
  state.visibleEntries = inRange.length ? inRange : state.entries.slice(0, 8);

  document.querySelector('#selected-date').textContent = formatLongDate(state.activeDate);
  document.querySelector('#working-date').textContent = formatLongDate(state.activeDate);
  document.querySelector('#entry-count').textContent = `${state.visibleEntries.length} in range`;
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === state.view);
    button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
  });

  const attention = state.visibleEntries.filter(entry => entry.attention).length;
  const events = state.visibleEntries.filter(entry => entry.kind === 'event').length;
  document.querySelector('#summary-line').lastChild.textContent = ` ${attention ? `${attention} ${attention === 1 ? 'item needs' : 'items need'} attention` : 'No work is marked urgent'} · ${state.visibleEntries.length} ${state.visibleEntries.length === 1 ? 'entry' : 'entries'} in this working range${events ? ` · ${events} scheduled ${events === 1 ? 'engagement' : 'engagements'}` : ''}.`;

  ledger.innerHTML = state.visibleEntries.length
    ? state.visibleEntries.map(entry => `
      <button type="button" role="listitem" class="ledger-row ${entry.attention ? 'attention' : ''} ${entry.id === state.selectedEntryId ? 'selected' : ''}" data-entry-id="${entry.id}" aria-pressed="${entry.id === state.selectedEntryId}">
        <span class="ledger-edge" aria-hidden="true"></span>
        <span class="ledger-when"><strong>${formatShortDate(entry.date)}</strong><small>${entry.timeLabel}</small></span>
        <span class="ledger-body"><span class="ledger-source">Kingdom Engagements · ${escapeHtml(entry.sourceLabel)}</span><strong class="ledger-title">${escapeHtml(entry.title)}</strong><span class="ledger-description">${escapeHtml(entry.description)}</span><span class="ledger-meta">Owner: ${escapeHtml(entry.owner)} · ${escapeHtml(entry.stageLabel)}</span></span>
        <span class="ledger-state">${entry.attention ? '<em>Needs attention</em>' : ''}<span>${escapeHtml(entry.statusLabel)}</span></span>
        <span class="ledger-arrow" aria-hidden="true">›</span>
      </button>`).join('')
    : '<div class="ledger-empty">The working range is clear. New permitted engagement work will appear here.</div>';
  ledger.querySelectorAll('[data-entry-id]').forEach(button =>
    button.addEventListener('click', () => selectEntry(button.dataset.entryId))
  );
}

function selectEntry(entryId) {
  state.selectedEntryId = entryId;
  state.selected = state.entries.find(entry => entry.id === entryId) || null;
  if (!state.recordOpen) renderDaybook();
  renderJourney();
  renderContext();
  renderActionLine();
}

function renderJourney() {
  const entry = state.selected;
  const journeyList = document.querySelector('#journey-list');
  if (!entry) {
    document.querySelector('#journey-stage').textContent = 'No active stage';
    journeyList.innerHTML = '';
    return;
  }
  document.querySelector('#journey-stage').textContent = entry.stageLabel;
  const steps = buildJourney(entry.details.summary);
  journeyList.innerHTML = steps.map(step => `
    <li class="journey-step ${step.state}"><span class="journey-marker" aria-hidden="true"></span><span class="journey-copy"><strong>${escapeHtml(step.label)}</strong><small>${escapeHtml(step.description)}</small></span></li>
  `).join('');
}

function buildJourney(summary) {
  const statuses = statusEntries(summary);
  let currentAssigned = false;
  return statuses.map(([label, status]) => {
    let journeyState = 'upcoming';
    if (isComplete(status)) journeyState = 'complete';
    else if (status === 'needs-attention') journeyState = 'blocked';
    else if (!currentAssigned) {
      journeyState = 'current';
      currentAssigned = true;
    }
    return { label, state: journeyState, description: titleCase(status) };
  });
}

function renderContext() {
  const entry = state.selected;
  if (!entry) return;
  const details = entry.details;
  const summary = details.summary;
  document.querySelector('#context-title').textContent = entry.title;
  document.querySelector('#context-ministry').textContent = summary.hostOrganization;
  document.querySelector('#context-location').textContent = summary.location || 'Location pending';
  document.querySelector('#context-facts').innerHTML = [
    ['Responsible', entry.owner],
    ['Prepared', `${summary.readinessPercent}%`],
    ['Documents', details.documents.length],
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
  const people = [...new Set([
    summary.speakerName,
    details.hostContactName,
    entry.owner,
  ].filter(Boolean))];
  document.querySelector('#people-list').innerHTML = people.map(person => `<li><span>${escapeHtml(person.charAt(0))}</span>${escapeHtml(person)}</li>`).join('');
  document.querySelector('#intelligence-copy').textContent = entry.intelligence;
  const history = [
    [`${titleCase(summary.status)} engagement record`, summary.updatedAtUtc],
    ...details.tasks.slice(0, 2).map(task => [`${task.title} · ${titleCase(task.status)}`, task.updatedAtUtc]),
  ];
  document.querySelector('#history-list').innerHTML = history.map(([title, date]) => `<li><strong>${escapeHtml(title)}</strong><span>${formatDateTime(date)}</span></li>`).join('');
}

function renderActionLine() {
  const entry = state.selected;
  const action = document.querySelector('#primary-action');
  document.querySelector('#next-action').textContent = entry?.nextAction || 'Select a work item to see its next action.';
  action.disabled = !entry;
  action.textContent = state.recordOpen ? 'Back to Daybook →' : 'Open coordination record →';
}

function openRecord() {
  if (!state.selected) return;
  state.recordOpen = true;
  ledger.hidden = true;
  recordWorkspace.hidden = false;
  renderRecord();
  renderActionLine();
}

function closeRecord() {
  state.recordOpen = false;
  recordWorkspace.hidden = true;
  ledger.hidden = false;
  renderDaybook();
  renderActionLine();
}

function renderRecord() {
  const item = state.selected?.details;
  if (!item) return;
  const node = document.querySelector('#record-template').content.cloneNode(true);
  node.querySelector('[data-field="title"]').textContent = item.summary.title;
  node.querySelector('[data-field="subtitle"]').textContent = `${item.summary.speakerName} · ${item.summary.hostOrganization}`;
  node.querySelector('[data-field="status"]').textContent = item.summary.status;
  node.querySelector('[data-field="readiness"]').textContent = `${item.summary.readinessPercent}%`;
  node.querySelector('[data-field="progress"]').value = item.summary.readinessPercent;
  node.querySelector('.status-ledger').innerHTML = statusEntries(item.summary)
    .map(([label, value]) => `<article><span>${label}</span><strong>${escapeHtml(titleCase(value))}</strong></article>`).join('');
  node.querySelector('.details-list').innerHTML = [
    ['Host contact', item.hostContactName || 'Not assigned'],
    ['Host email', item.hostContactEmail || 'Not provided'],
    ['Location', item.summary.location || 'Pending'],
    ['Starts', formatDateTime(item.summary.startsAtUtc)],
    ['Ends', formatDateTime(item.endsAtUtc)],
    ['External assignment', item.summary.externalAssignmentId],
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
  node.querySelector('.task-list').innerHTML = item.tasks.length ? item.tasks.map(task => `
    <article class="task-item"><div><strong>${escapeHtml(task.title)}</strong><p>${escapeHtml(titleCase(task.category))} · ${escapeHtml(task.owner)}</p><small>${task.dueAtUtc ? `Due ${formatShortDate(task.dueAtUtc)}` : 'No due date'}${task.detail ? ` · ${escapeHtml(task.detail)}` : ''}</small></div><select data-task-id="${task.id}" aria-label="Status for ${escapeHtml(task.title)}">${['open','in-progress','needs-attention','confirmed','complete','waived'].map(status => `<option value="${status}" ${status === task.status ? 'selected' : ''}>${titleCase(status)}</option>`).join('')}</select></article>`).join('') : '<p class="ledger-empty">No readiness tasks have been added.</p>';
  node.querySelector('.document-list').innerHTML = item.documents.length ? item.documents.map(document => `
    <article class="document-item"><div><strong>${escapeHtml(document.name)}</strong><small>${escapeHtml(titleCase(document.category))} · ${escapeHtml(titleCase(document.status))}</small></div><b>${document.storageReference ? 'Stored' : 'Pending'}</b></article>`).join('') : '<p class="ledger-empty">No documents are being tracked.</p>';
  node.querySelector('.closeout-copy').textContent = item.summary.closeoutStatus === 'complete'
    ? 'Closeout is complete. Outcomes may now be shared through governed KingdomOS events.'
    : 'Closeout remains in Engagements until host follow-up, final documents, expense handoff, and outcome notes are complete.';
  node.querySelector('[data-action="back"]').addEventListener('click', closeRecord);
  node.querySelector('[data-action="add-task"]').addEventListener('click', () => dialog.showModal());
  recordWorkspace.replaceChildren(node);
  recordWorkspace.querySelectorAll('[data-task-id]').forEach(select =>
    select.addEventListener('change', () => updateTask(select.dataset.taskId, select.value))
  );
}

async function updateTask(taskId, status) {
  const item = state.selected.details;
  const task = item.tasks.find(candidate => candidate.id === taskId);
  try {
    await api(`/api/engagements/assignments/${item.summary.id}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, owner: task.owner, detail: task.detail, dueAtUtc: task.dueAtUtc }),
    });
    showMessage('Readiness task updated.');
    await loadAssignments(true);
    if (state.recordOpen) renderRecord();
  } catch (error) {
    showMessage(error.message, true);
    await loadAssignments(true);
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
    await api(`/api/engagements/assignments/${state.selected.details.summary.id}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        category: data.get('category'),
        title: data.get('title'),
        owner: data.get('owner'),
        detail: data.get('detail') || null,
        dueAtUtc: data.get('dueAtUtc') ? new Date(`${data.get('dueAtUtc')}T12:00:00Z`).toISOString() : null,
      }),
    });
    taskForm.reset();
    dialog.close();
    showMessage('Readiness task added.');
    await loadAssignments(true);
    if (state.recordOpen) renderRecord();
  } catch (error) {
    showMessage(error.message, true);
  }
});

document.querySelector('#refresh').addEventListener('click', () => loadAssignments(true).catch(error => showMessage(error.message, true)));
document.querySelector('#primary-action').addEventListener('click', () => state.recordOpen ? closeRecord() : openRecord());
document.querySelector('#today').addEventListener('click', () => { state.activeDate = startOfDay(new Date()); renderDaybook(); selectEntry(state.visibleEntries[0]?.id || state.entries[0]?.id || null); });
document.querySelector('#previous-range').addEventListener('click', () => moveRange(-1));
document.querySelector('#next-range').addEventListener('click', () => moveRange(1));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  state.view = button.dataset.view;
  renderDaybook();
  selectEntry(state.visibleEntries[0]?.id || state.entries[0]?.id || null);
}));
document.querySelectorAll('.sidebar nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.sidebar nav a').forEach(item => item.classList.remove('active'));
  link.classList.add('active');
}));

function moveRange(direction) {
  const amount = state.view === 'month' ? 30 : state.view === 'week' ? 7 : 1;
  state.activeDate.setDate(state.activeDate.getDate() + (amount * direction));
  state.activeDate = startOfDay(state.activeDate);
  renderDaybook();
  selectEntry(state.visibleEntries[0]?.id || state.entries[0]?.id || null);
}

function statusEntries(item) {
  return [
    ['Travel', item.travelStatus],
    ['Lodging', item.lodgingStatus],
    ['Transportation', item.transportationStatus],
    ['Host', item.hostStatus],
    ['Documents', item.documentsStatus],
    ['Closeout', item.closeoutStatus],
  ];
}

function currentStage(item) {
  return statusEntries(item).find(([, status]) => !isComplete(status))?.[0] || 'Closeout';
}

function isComplete(status) {
  return ['confirmed', 'complete', 'received', 'waived'].includes(status);
}

function titleCase(value) {
  return String(value || '').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function startOfDay(value) { return new Date(value.getFullYear(), value.getMonth(), value.getDate()); }
function sameDay(left, right) { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate(); }
function formatShortDate(value) { return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value)) : 'Pending'; }
function formatLongDate(value) { return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(value); }
function formatDateTime(value) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Pending'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[character]); }

Promise.all([loadProduct(), loadAssignments(false)]).catch(error => showMessage(error.message, true));
