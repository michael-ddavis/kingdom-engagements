(() => {
  const assignmentGrid = document.querySelector('#assignments');
  const assignmentPanel = assignmentGrid?.querySelector('.assignment-panel');
  const assignmentList = document.querySelector('#assignment-list');
  const assignmentDetail = document.querySelector('#assignment-detail');
  const terminal = new Set(['complete', 'completed', 'waived']);
  const recordKeys = new Set(['closeout', 'activity', 'event', 'responses', 'followup']);
  let assignmentOpen = false;
  let activeKey = 'overview';
  let selectedFilter = 'all';

  const clamp = value => Math.max(0, Math.min(100, Number(value || 0)));
  const norm = value => String(value || '').trim().toLowerCase();
  const activeStatus = value => !['completed', 'complete', 'cancelled', 'canceled'].includes(norm(value));
  const visibleStatus = value => {
    const status = norm(value);
    if (status === 'completed' || status === 'complete') return ['Completed', 'completed'];
    if (status === 'cancelled' || status === 'canceled') return ['Cancelled', 'cancelled'];
    return [status === 'planning' ? 'Planning' : 'Active', 'active'];
  };

  function modeFromHash() {
    const hash = (window.location.hash || '#overview').toLowerCase();
    if (hash === '#requests') return 'requests';
    if (hash === '#assignments' || ['#readiness', '#coordination', '#documents', '#closeout'].includes(hash)) return 'assignments';
    return 'overview';
  }

  function applyMode() {
    const mode = assignmentOpen ? 'assignments' : modeFromHash();
    document.body.classList.remove('exact18-mode-overview', 'exact18-mode-requests', 'exact18-mode-assignments');
    document.body.classList.add(`exact18-mode-${mode}`);
    document.body.classList.toggle('exact18-assignment-open', assignmentOpen);
    document.querySelectorAll('.sidebar nav a').forEach(link => {
      const href = link.getAttribute('href');
      const active = mode === 'overview' ? href === '#overview' : mode === 'requests' ? href === '#requests' : href === '#assignments';
      link.classList.toggle('active', active);
    });
  }

  function daysUntil(value) {
    if (!value) return null;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return null;
    return Math.ceil((time - Date.now()) / 86400000);
  }

  function eventTiming(item) {
    const days = daysUntil(item.startsAtUtc);
    if (days === null) return ['Date pending', false];
    if (days < 0) return ['Event completed', false];
    if (days === 0) return ['Today', true];
    if (days === 1) return ['Tomorrow', true];
    if (days <= 30) return [`In ${days} days`, days <= 14];
    return [formatDate(item.startsAtUtc), false];
  }

  function stageFor(item) {
    const lanes = [item.travelStatus, item.lodgingStatus, item.transportationStatus, item.hostStatus, item.documentsStatus];
    if (norm(item.closeoutStatus) === 'complete') return ['Closeout complete', 'Assignment record is complete.'];
    if (lanes.some(value => norm(value) === 'needs-attention')) return ['Preparation', 'Resolve the items that need attention.'];
    if (Number(item.readinessPercent || 0) >= 80) return ['Final preparation', 'Confirm final details before arrival.'];
    if (Number(item.readinessPercent || 0) >= 45) return ['Preparation', 'Travel and host coordination are underway.'];
    return ['Assignment setup', 'Build the preparation record.'];
  }

  function countForFilter(filter) {
    if (filter === 'all') return state.assignments.length;
    if (filter === 'active') return state.assignments.filter(item => activeStatus(item.status)).length;
    if (filter === 'completed') return state.assignments.filter(item => ['complete', 'completed'].includes(norm(item.status))).length;
    return state.assignments.filter(item => ['cancelled', 'canceled'].includes(norm(item.status))).length;
  }

  function filteredAssignments() {
    if (selectedFilter === 'all') return state.assignments;
    if (selectedFilter === 'active') return state.assignments.filter(item => activeStatus(item.status));
    if (selectedFilter === 'completed') return state.assignments.filter(item => ['complete', 'completed'].includes(norm(item.status)));
    return state.assignments.filter(item => ['cancelled', 'canceled'].includes(norm(item.status)));
  }

  function prepareListChrome() {
    if (!assignmentPanel || !assignmentList) return;
    const header = assignmentPanel.querySelector(':scope > header');
    if (header) {
      header.className = 'exact18-page-heading';
      const copy = header.querySelector('div');
      if (copy) {
        copy.querySelector('.eyebrow')?.replaceChildren('Itinerant ministry');
        copy.querySelector('h2')?.replaceChildren('Assignments');
        let description = copy.querySelector('.exact18-page-description');
        if (!description) {
          description = document.createElement('p');
          description.className = 'exact18-page-description';
          copy.appendChild(description);
        }
        description.textContent = 'Track every approved engagement from initial preparation through travel, ministry and follow-up.';
      }
      const countBadge = header.querySelector('#assignment-count');
      if (countBadge) countBadge.hidden = true;
      let invitation = header.querySelector('.exact18-primary-action');
      if (!invitation) {
        invitation = document.createElement('a');
        invitation.className = 'exact18-primary-action';
        invitation.href = '/invite/apostle-cynthia';
        invitation.target = '_blank';
        invitation.rel = 'noopener';
        invitation.innerHTML = '<span aria-hidden="true">+</span> Open invitation form';
        header.appendChild(invitation);
      }
    }

    assignmentPanel.querySelector('.exact18-list-utility')?.remove();
    const active = state.assignments.filter(item => activeStatus(item.status)).length;
    const within30 = state.assignments.filter(item => {
      const days = daysUntil(item.startsAtUtc);
      return days !== null && days >= 0 && days <= 30;
    }).length;
    const average = state.assignments.length ? Math.round(state.assignments.reduce((sum, item) => sum + Number(item.readinessPercent || 0), 0) / state.assignments.length) : 0;
    const attention = state.assignments.filter(item => [item.travelStatus, item.lodgingStatus, item.transportationStatus, item.hostStatus, item.documentsStatus].some(value => norm(value) === 'needs-attention')).length;
    const utility = document.createElement('section');
    utility.className = 'exact18-list-utility';
    utility.innerHTML = `
      <section class="exact18-summary-grid" aria-label="Assignment summary">
        ${summaryCard('SJ', 'navy', state.assignments.length, 'Total assignments', 'Approved ministry engagements')}
        ${summaryCard('A', 'violet', active, 'Active assignments', 'Currently in preparation')}
        ${summaryCard('30', 'gold', within30, 'Within 30 days', 'Engagements approaching')}
        ${summaryCard('%', 'green', `${average}%`, 'Average readiness', 'Across all assignments')}
      </section>
      ${attention ? `<section class="exact18-attention"><span class="exact18-attention-mark">!</span><div><strong>Preparation needs attention</strong><p>${attention} ${attention === 1 ? 'assignment requires' : 'assignments require'} action.</p></div></section>` : ''}
      <section class="exact18-toolbar">
        <div class="exact18-filter-group" aria-label="Filter assignments">
          ${['all', 'active', 'completed', 'cancelled'].map(filter => `<button type="button" data-exact18-filter="${filter}" class="${selectedFilter === filter ? 'selected' : ''}">${formatStatus(filter)} <span>${countForFilter(filter)}</span></button>`).join('')}
        </div>
        <span class="exact18-result-count">${filteredAssignments().length} ${filteredAssignments().length === 1 ? 'assignment' : 'assignments'}</span>
      </section>`;
    assignmentPanel.insertBefore(utility, assignmentList);
    utility.querySelectorAll('[data-exact18-filter]').forEach(button => button.addEventListener('click', () => {
      selectedFilter = button.dataset.exact18Filter;
      renderExactAssignments();
    }));
  }

  function summaryCard(mark, tone, value, label, note) {
    return `<article class="exact18-summary-card"><div class="exact18-summary-icon exact18-summary-icon--${tone}">${mark}</div><div><strong>${value}</strong><span>${label}</span><small>${note}</small></div></article>`;
  }

  function renderExactAssignments() {
    if (!assignmentList || typeof state === 'undefined') return;
    prepareListChrome();
    const items = filteredAssignments();
    assignmentList.innerHTML = items.length ? items.map(item => {
      const [statusLabel, statusClass] = visibleStatus(item.status);
      const [timing, soon] = eventTiming(item);
      const [stage, stageDetail] = stageFor(item);
      const readiness = clamp(item.readinessPercent);
      return `<button class="assignment-card exact18-assignment-card" data-id="${item.id}">
        <header class="exact18-assignment-card-heading"><div class="exact18-assignment-identity"><span class="exact18-status exact18-status--${statusClass}">${statusLabel}</span><span class="exact18-reference">ASN-${escapeHtml(String(item.externalAssignmentId || item.id).slice(-8).toUpperCase())}</span></div><span class="exact18-event-timing ${soon ? 'exact18-event-timing--soon' : ''}">${escapeHtml(timing)}</span></header>
        <div class="exact18-assignment-card-body"><div class="exact18-assignment-main"><p class="exact18-event-type">Ministry engagement</p><h2>${escapeHtml(item.title)}</h2><p class="exact18-organization">${escapeHtml(item.hostOrganization || 'Host organization pending')}</p><div class="exact18-event-details"><span><strong>Dates</strong>${escapeHtml(formatDate(item.startsAtUtc))}</span><span><strong>Location</strong>${escapeHtml(item.location || 'Pending')}</span><span><strong>Tasks</strong>${Number(item.openTasks || 0)} open</span></div></div><div class="exact18-current-stage"><small>Current stage</small><strong>${escapeHtml(stage)}</strong><span>${escapeHtml(stageDetail)}</span></div></div>
        <footer class="exact18-assignment-card-footer"><div class="exact18-assignment-progress"><div class="exact18-progress-heading"><span>Assignment progress</span><strong>${readiness}%</strong></div><div class="exact18-progress-bar"><i style="width:${readiness}%"></i></div><small>${Number(item.openTasks || 0)} preparation ${Number(item.openTasks || 0) === 1 ? 'item' : 'items'} remaining</small></div><div class="exact18-assignment-meta"><div class="exact18-next-task"><small>Next step</small><strong>${escapeHtml(stage)}</strong><span>${Number(item.openTasks || 0) ? 'Continue preparation' : 'Review assignment'}</span></div><span class="exact18-open-arrow" aria-hidden="true">→</span></div></footer>
      </button>`;
    }).join('') : '<section class="empty-state"><h2>No assignments found</h2><p>There are no assignments matching the selected filter.</p></section>';
    assignmentList.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', async () => {
      assignmentOpen = true;
      activeKey = 'overview';
      window.location.hash = 'assignments';
      applyMode();
      await selectAssignment(button.dataset.id);
      assignmentGrid?.scrollIntoView({ block: 'start' });
    }));
  }

  if (typeof renderAssignments === 'function') renderAssignments = renderExactAssignments;

  function ensureChecklist(editor) {
    if (!editor || !assignmentDetail) return null;
    let pane = editor.querySelector('[data-workspace-pane="checklist"]');
    if (pane) return pane;
    const section = Array.from(assignmentDetail.children).find(element => element.matches?.('.detail-section') && element.querySelector('h3')?.textContent.trim() === 'Readiness tasks');
    if (!section) return null;
    section.classList.add('assignment-pane', 'restored-checklist-pane');
    section.dataset.workspacePane = 'checklist';
    section.hidden = true;
    editor.insertBefore(section, editor.querySelector('.assignment-editor__actions') || null);
    return section;
  }

  function readinessLane(result, text) {
    return (result?.workspace?.readiness?.lanes || []).find(lane => String(lane.label || '').toLowerCase().includes(text));
  }

  function coordinationInfo() {
    const result = state.assignmentWorkspace;
    const preparation = result?.workspace?.preparation || {};
    return {
      result,
      preparation,
      coordination: preparation.coordination || {},
      readiness: result?.workspace?.readiness || {},
      url: result?.coordinationUrl || null,
      termsUrl: result?.termsUrl || null,
    };
  }

  function hostStatusLabel(status) {
    switch (norm(status)) {
      case 'submitted': return 'Ready for review';
      case 'in-progress': return 'Host is adding details';
      case 'requested': return 'Waiting for host';
      case 'reviewed': return 'Host details reviewed';
      default: return 'Link not sent';
    }
  }

  function hostAction(info, labelClass = 'exact18-card-action') {
    if (info.url) return `<a class="${labelClass}" href="${escapeHtml(info.url)}" target="_blank" rel="noopener">Open host coordination link <span>→</span></a>`;
    return `<button type="button" class="${labelClass}" disabled title="Accepted terms are required before Host Coordination opens">Create host coordination link <span>→</span></button>`;
  }

  function dateRange(summary, endsAt) {
    const first = summary?.startsAtUtc ? formatDate(summary.startsAtUtc) : 'Date pending';
    if (!endsAt) return first;
    const second = formatDate(endsAt);
    return first === second ? first : `${first} – ${second}`;
  }

  function prepareOverview(editor) {
    const pane = editor?.querySelector('[data-workspace-pane="overview"]');
    if (!pane || !state.selected) return;
    const info = coordinationInfo();
    const original = document.createElement('div');
    original.className = 'exact18-original-overview-fields';
    while (pane.firstChild) original.appendChild(pane.firstChild);
    pane.appendChild(original);

    const openTasks = (state.selected.tasks || []).filter(task => !terminal.has(norm(task.status)));
    const nextTask = openTasks[0];
    const hostLane = readinessLane(info.result, 'host');
    const hostPercent = clamp(hostLane?.percent || 0);
    const lanes = info.readiness?.lanes || [];
    const coordination = info.coordination;
    const sourceRef = info.preparation.referenceNumber || state.selected.summary.externalAssignmentId || 'Engagement record';
    const exact = document.createElement('section');
    exact.className = 'exact18-overview';
    exact.innerHTML = `
      <section class="exact18-overview-grid">
        <article class="exact18-overview-card exact18-overview-card--next"><div class="exact18-card-heading"><div><p class="eyebrow">What’s next</p><h2>Next assignment action</h2></div><span class="exact18-action-mark">→</span></div>${nextTask ? `<strong class="exact18-next-title">${escapeHtml(nextTask.title)}</strong><p>${escapeHtml(nextTask.detail || `${formatStatus(nextTask.category)} preparation`)}</p><div class="exact18-next-meta"><span>Owner: <strong>${escapeHtml(nextTask.owner || 'Engagement Coordinator')}</strong></span>${nextTask.dueAtUtc ? `<span>Due: <strong>${escapeHtml(formatDate(nextTask.dueAtUtc))}</strong></span>` : ''}</div><button type="button" class="exact18-card-action" data-exact18-open="checklist">Open checklist <span>→</span></button>` : `<strong class="exact18-next-title">Assignment checklist complete</strong><p>Every current preparation item has been completed.</p>`}</article>
        <article class="exact18-overview-card"><div class="exact18-card-heading"><div><p class="eyebrow">Host coordination</p><h2>External details</h2></div><span class="exact18-coordinator-avatar">H</span></div><strong class="exact18-next-title">${escapeHtml(hostStatusLabel(info.preparation.coordinationStatus))}</strong><p>Collect lodging, ground travel, contacts, schedule, promotion, prayer focus and files in one host-facing form.</p>${norm(info.preparation.coordinationStatus) !== 'not-requested' ? `<div class="exact18-host-progress"><span><small>Host completion</small><strong>${hostPercent}%</strong></span><span class="exact18-host-track"><i style="width:${hostPercent}%"></i></span><small>${escapeHtml(formatStatus(info.preparation.coordinationStatus || 'not-requested'))}</small></div>` : ''}${hostAction(info)}</article>
      </section>
      <details class="exact18-source-panel"><summary><span class="exact18-source-mark">↳</span><span class="exact18-source-copy"><small>Invitation source</small><strong>Approved terms retained · ${escapeHtml(sourceRef)}</strong></span><span class="exact18-source-note">Review carried-forward details</span></summary><div class="exact18-source-content"><article><small>Requested ministry</small><p>${escapeHtml(state.selected.summary.title || 'Approved ministry engagement')}</p></article><dl class="exact18-source-facts"><div><dt>Host</dt><dd>${escapeHtml(state.selected.summary.hostOrganization || 'Pending')}</dd></div><div><dt>Location</dt><dd>${escapeHtml(state.selected.summary.location || 'Pending')}</dd></div><div><dt>Terms</dt><dd>${escapeHtml(formatStatus(info.preparation.termsStatus || 'pending'))}</dd></div><div><dt>Host preparation</dt><dd>${escapeHtml(formatStatus(info.preparation.coordinationStatus || 'not-requested'))}</dd></div><div><dt>Event dates</dt><dd>${escapeHtml(dateRange(state.selected.summary, state.selected.endsAtUtc))}</dd></div><div><dt>Documents</dt><dd>${Number(coordination.documents?.length || 0)} received</dd></div></dl></div></details>
      <section class="exact18-readiness-panel"><header class="exact18-panel-heading"><div><p class="eyebrow">Readiness radar</p><h2>Preparation by stage</h2></div><div class="exact18-overall"><strong>${clamp(info.readiness.overallPercent ?? state.selected.summary.readinessPercent)}%</strong><span>Overall</span></div></header><div class="exact18-readiness-list">${lanes.length ? lanes.map(lane => `<div class="exact18-readiness-row"><div class="exact18-readiness-copy"><strong>${escapeHtml(lane.label)}</strong><span>${escapeHtml(lane.detail || formatStatus(lane.status || 'in-progress'))}</span></div><div class="exact18-readiness-progress"><div><i style="width:${clamp(lane.percent)}%"></i></div><strong>${clamp(lane.percent)}%</strong></div></div>`).join('') : `<div class="exact18-readiness-row"><div class="exact18-readiness-copy"><strong>Overall preparation</strong><span>Current assignment readiness</span></div><div class="exact18-readiness-progress"><div><i style="width:${clamp(state.selected.summary.readinessPercent)}%"></i></div><strong>${clamp(state.selected.summary.readinessPercent)}%</strong></div></div>`}</div></section>`;
    pane.insertBefore(exact, original);
    exact.querySelectorAll('[data-exact18-open]').forEach(button => button.addEventListener('click', () => activate(button.dataset.exact18Open)));
  }

  function decorateTravel(editor) {
    const pane = editor?.querySelector('[data-workspace-pane="travel"]');
    if (!pane || pane.querySelector('.exact18-travel-heading')) return;
    const info = coordinationInfo();
    const travelLanes = (info.readiness?.lanes || []).filter(lane => ['travel', 'lodging', 'transport'].some(term => String(lane.label || '').toLowerCase().includes(term)));
    const travelReadiness = travelLanes.length ? Math.round(travelLanes.reduce((sum, lane) => sum + clamp(lane.percent), 0) / travelLanes.length) : clamp(state.selected?.summary?.readinessPercent);
    pane.querySelector(':scope > .section-intro')?.setAttribute('hidden', '');
    const heading = document.createElement('header');
    heading.className = 'exact18-travel-heading';
    heading.innerHTML = `<div><p class="eyebrow">Travel itinerary</p><h2>Travel arrangements</h2><p>Record flights, lodging and local transportation. Partial information can be saved while arrangements are still being finalized.</p></div><aside class="exact18-travel-readiness"><div><span>Travel readiness</span><strong>${travelReadiness}%</strong></div><div><i style="width:${travelReadiness}%"></i></div></aside>`;
    const host = document.createElement('section');
    host.className = 'exact18-host-coordination';
    host.innerHTML = `<span class="exact18-host-mark">H</span><div><p class="eyebrow">Host coordination</p><h3>${escapeHtml(hostStatusLabel(info.preparation.coordinationStatus))}</h3><p>One link collects hotel, pickup, local contacts, schedule, promotion, prayer focus and documents. Responses populate this assignment.</p></div>${info.url ? `<a href="${escapeHtml(info.url)}" target="_blank" rel="noopener">Open host link</a>` : '<button type="button" disabled>Create host link</button>'}`;
    pane.prepend(host);
    pane.prepend(heading);
  }

  function ensureWorkspaceHeading() {
    assignmentDetail.querySelector('.exact18-back-link')?.remove();
    assignmentDetail.querySelector('.exact18-workspace-heading')?.remove();
    assignmentDetail.querySelector('.exact18-assignment-tabs')?.remove();
    const summary = state.selected?.summary;
    if (!summary) return;
    const [statusLabel, statusClass] = visibleStatus(summary.status);
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'exact18-back-link';
    back.innerHTML = '<span aria-hidden="true">←</span> Back to assignments';
    back.addEventListener('click', closeWorkspace);
    assignmentDetail.prepend(back);

    const heading = document.createElement('header');
    heading.className = 'exact18-workspace-heading';
    heading.innerHTML = `<div><div class="exact18-heading-meta"><p class="eyebrow">Ministry assignment</p><span class="exact18-status exact18-status--${statusClass}">${escapeHtml(statusLabel)}</span></div><h1>${escapeHtml(summary.title)}</h1><p class="exact18-subtitle">${escapeHtml(summary.hostOrganization || 'Host organization pending')} <span aria-hidden="true">·</span> ${escapeHtml(summary.location || 'Location pending')}</p></div><div class="exact18-heading-summary"><article class="exact18-event-date"><small>Event dates</small><strong>${escapeHtml(dateRange(summary, state.selected.endsAtUtc))}</strong><span>${escapeHtml(summary.location || 'Location pending')}</span></article><article class="exact18-heading-readiness"><div><small>Overall readiness</small><strong>${clamp(summary.readinessPercent)}%</strong></div><div class="exact18-heading-progress"><i style="width:${clamp(summary.readinessPercent)}%"></i></div></article></div>`;
    back.insertAdjacentElement('afterend', heading);

    const nav = document.createElement('nav');
    nav.className = 'exact18-assignment-tabs';
    nav.setAttribute('aria-label', 'Assignment sections');
    nav.innerHTML = `
      <section class="exact18-tab-group"><span class="exact18-tab-label">Assignment</span><div class="exact18-tab-items">${navButton('overview','Overview','Executive assignment summary')}</div></section>
      <section class="exact18-tab-group exact18-tab-group--preparation"><span class="exact18-tab-label">Preparation</span><div class="exact18-tab-items">${navButton('checklist','Checklist','Preparation responsibilities')}${navButton('travel','Travel','Flights, lodging and transportation')}${navButton('contacts','Contacts','Host and assignment contacts')}${navButton('documents','Documents','Files, schedules and resources')}</div></section>
      <section class="exact18-tab-group"><span class="exact18-tab-label">Record</span><div class="exact18-tab-items"><details class="exact18-record-menu"><summary class="exact18-tab exact18-record-trigger"><span><strong>Record</strong><small>Closeout and ministry log</small></span><i class="exact18-record-chevron" aria-hidden="true"></i></summary><div class="exact18-record-popover"><button type="button" data-exact18-record="closeout"><strong>Closeout</strong><small>Outcomes, reconciliation and archive</small></button><button type="button" data-exact18-record="activity"><strong>Ministry Log</strong><small>Updates, decisions and activity</small></button><span class="exact18-record-divider">Ministry outcomes</span><button type="button" data-exact18-record="event"><strong>Event day</strong><small>Arrival and on-site ministry</small></button><button type="button" data-exact18-record="responses"><strong>Responses</strong><small>Ministry response record</small></button><button type="button" data-exact18-record="followup"><strong>Follow-up</strong><small>Care and next actions</small></button></div></details></div></section>`;
    heading.insertAdjacentElement('afterend', nav);
    nav.querySelectorAll('[data-exact18-tab]').forEach(button => button.addEventListener('click', () => activate(button.dataset.exact18Tab)));
    nav.querySelectorAll('[data-exact18-record]').forEach(button => button.addEventListener('click', () => activate(button.dataset.exact18Record)));
  }

  function navButton(key, label, description) {
    return `<button type="button" class="exact18-tab" data-exact18-tab="${key}"><strong>${label}</strong><small>${description}</small></button>`;
  }

  function setNavState() {
    const nav = assignmentDetail.querySelector('.exact18-assignment-tabs');
    if (!nav) return;
    nav.querySelectorAll('[data-exact18-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.exact18Tab === activeKey));
    const record = nav.querySelector('.exact18-record-menu');
    record?.classList.toggle('is-active', recordKeys.has(activeKey));
    nav.querySelectorAll('[data-exact18-record]').forEach(button => button.classList.toggle('is-active', button.dataset.exact18Record === activeKey));
    if (record && recordKeys.has(activeKey)) record.open = false;
  }

  function activate(key) {
    const workspace = assignmentDetail.querySelector('.assignment-workspace');
    const editor = workspace?.querySelector('#assignment-coordination-form');
    const completion = assignmentDetail.querySelector('.completion-workspace');
    if (!editor) return;
    ensureChecklist(editor);
    const prepKey = key === 'activity' ? 'activity' : key;
    const prepPane = editor.querySelector(`[data-workspace-pane="${prepKey}"]`);
    if (prepPane && !['closeout','event','responses','followup'].includes(key)) {
      editor.hidden = false;
      if (completion) completion.hidden = true;
      editor.querySelectorAll('[data-workspace-pane]').forEach(pane => {
        const on = pane === prepPane;
        pane.hidden = !on;
        pane.classList.toggle('is-active', on);
      });
      const footer = editor.querySelector('.assignment-editor__actions');
      if (footer) footer.hidden = ['overview','checklist','documents','activity'].includes(key);
    } else if (completion) {
      editor.hidden = true;
      completion.hidden = false;
      completion.querySelectorAll('[data-completion-pane]').forEach(pane => {
        const on = pane.dataset.completionPane === key;
        pane.hidden = !on;
        pane.classList.toggle('is-active', on);
      });
    }
    activeKey = key;
    setNavState();
  }

  function renderExactWorkspace() {
    if (!assignmentOpen || !state.selected || !assignmentDetail) return;
    const workspace = assignmentDetail.querySelector('.assignment-workspace');
    const editor = workspace?.querySelector('#assignment-coordination-form');
    if (!workspace || !editor) return;
    ensureChecklist(editor);
    ensureWorkspaceHeading();
    prepareOverview(editor);
    decorateTravel(editor);
    activate(activeKey || 'overview');
    applyMode();
  }

  function closeWorkspace() {
    assignmentOpen = false;
    activeKey = 'overview';
    applyMode();
    renderExactAssignments();
    requestAnimationFrame(() => assignmentGrid?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  if (typeof selectAssignment === 'function') {
    const baseSelect = selectAssignment;
    selectAssignment = async function(id) {
      await baseSelect(id);
      if (assignmentOpen) renderExactWorkspace();
    };
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-open-assignment]')) {
      assignmentOpen = true;
      activeKey = 'overview';
    }
    const nav = event.target.closest('.sidebar nav a');
    if (nav) {
      const href = nav.getAttribute('href');
      if (href === '#assignments' && assignmentOpen) closeWorkspace();
      else if (href !== '#assignments') assignmentOpen = false;
      requestAnimationFrame(applyMode);
    }
    const record = assignmentDetail?.querySelector('.exact18-record-menu');
    if (record?.open && !event.target.closest('.exact18-record-menu')) record.open = false;
  }, true);

  window.addEventListener('hashchange', () => {
    if ((window.location.hash || '#overview').toLowerCase() !== '#assignments') {
      assignmentOpen = false;
      activeKey = 'overview';
    }
    applyMode();
  });

  document.addEventListener('DOMContentLoaded', applyMode);
  applyMode();
})();
