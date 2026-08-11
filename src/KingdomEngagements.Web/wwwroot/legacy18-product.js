(() => {
  const assignmentGrid = document.querySelector('#assignments');
  const assignmentPanel = assignmentGrid?.querySelector('.assignment-panel');
  const assignmentList = document.querySelector('#assignment-list');
  const assignmentDetail = document.querySelector('#assignment-detail');
  const terminal = new Set(['complete', 'completed', 'waived']);
  let assignmentOpen = false;
  let activePane = 'overview';
  let selectedFilter = 'all';
  let workspaceResult = null;
  let closeoutResult = null;

  const norm = value => String(value || '').trim().toLowerCase();
  const clamp = value => Math.max(0, Math.min(100, Number(value || 0)));
  const esc = value => escapeHtml(value ?? '');
  const isActive = item => !['complete', 'completed', 'cancelled', 'canceled'].includes(norm(item.status));

  function modeFromHash() {
    const hash = (window.location.hash || '#overview').toLowerCase();
    if (hash === '#requests') return 'requests';
    if (hash === '#assignments') return 'assignments';
    return 'overview';
  }

  function applyMode() {
    const mode = assignmentOpen ? 'assignments' : modeFromHash();
    document.body.classList.remove('exact18-mode-overview', 'exact18-mode-requests', 'exact18-mode-assignments');
    document.body.classList.add(`exact18-mode-${mode}`);
    document.body.classList.toggle('exact18-assignment-open', assignmentOpen);
    document.querySelectorAll('.sidebar nav a').forEach(link => {
      const href = link.getAttribute('href');
      const on = mode === 'overview' ? href === '#overview' : mode === 'requests' ? href === '#requests' : href === '#assignments';
      link.classList.toggle('active', on);
    });
  }

  function statusLabel(value) {
    const status = norm(value);
    if (['completed','complete'].includes(status)) return ['Completed', 'completed'];
    if (['cancelled','canceled'].includes(status)) return ['Cancelled', 'cancelled'];
    return [status === 'planning' ? 'Planning' : 'Active', 'active'];
  }

  function daysUntil(value) {
    const time = value ? new Date(value).getTime() : NaN;
    return Number.isNaN(time) ? null : Math.ceil((time - Date.now()) / 86400000);
  }

  function timingLabel(item) {
    const days = daysUntil(item.startsAtUtc);
    if (days === null) return ['Date pending', false];
    if (days < 0) return ['Event completed', false];
    if (days === 0) return ['Today', true];
    if (days === 1) return ['Tomorrow', true];
    if (days <= 30) return [`In ${days} days`, days <= 14];
    return [formatDate(item.startsAtUtc), false];
  }

  function stageFor(item) {
    const statuses = [item.travelStatus, item.lodgingStatus, item.transportationStatus, item.hostStatus, item.documentsStatus].map(norm);
    if (norm(item.closeoutStatus) === 'complete') return ['Closeout complete', 'Assignment record is complete.'];
    if (statuses.includes('needs-attention')) return ['Preparation', 'Resolve the items that need attention.'];
    if (Number(item.readinessPercent || 0) >= 80) return ['Final preparation', 'Confirm final details before arrival.'];
    if (Number(item.readinessPercent || 0) >= 45) return ['Preparation', 'Travel and host coordination are underway.'];
    return ['Assignment setup', 'Build the preparation record.'];
  }

  function filteredAssignments() {
    if (selectedFilter === 'all') return state.assignments;
    if (selectedFilter === 'active') return state.assignments.filter(isActive);
    if (selectedFilter === 'completed') return state.assignments.filter(item => ['complete','completed'].includes(norm(item.status)));
    return state.assignments.filter(item => ['cancelled','canceled'].includes(norm(item.status)));
  }

  function filterCount(filter) {
    if (filter === 'all') return state.assignments.length;
    if (filter === 'active') return state.assignments.filter(isActive).length;
    if (filter === 'completed') return state.assignments.filter(item => ['complete','completed'].includes(norm(item.status))).length;
    return state.assignments.filter(item => ['cancelled','canceled'].includes(norm(item.status))).length;
  }

  function summaryCard(mark, tone, value, label, note) {
    return `<article class="exact18-summary-card"><div class="exact18-summary-icon exact18-summary-icon--${tone}">${mark}</div><div><strong>${value}</strong><span>${label}</span><small>${note}</small></div></article>`;
  }

  function prepareListChrome() {
    if (!assignmentPanel || !assignmentList) return;
    const header = assignmentPanel.querySelector(':scope > header');
    if (header) {
      header.className = 'exact18-page-heading';
      header.innerHTML = `<div><p class="eyebrow">Itinerant ministry</p><h2>Assignments</h2><p class="exact18-page-description">Track every approved engagement from initial preparation through travel, ministry and follow-up.</p></div><a class="exact18-primary-action" href="/invite/apostle-cynthia" target="_blank" rel="noopener"><span aria-hidden="true">+</span> Open invitation form</a>`;
    }
    assignmentPanel.querySelector('.exact18-list-utility')?.remove();

    const active = state.assignments.filter(isActive).length;
    const within30 = state.assignments.filter(item => {
      const days = daysUntil(item.startsAtUtc);
      return days !== null && days >= 0 && days <= 30;
    }).length;
    const average = state.assignments.length
      ? Math.round(state.assignments.reduce((sum, item) => sum + Number(item.readinessPercent || 0), 0) / state.assignments.length)
      : 0;
    const attention = state.assignments.reduce((sum, item) => sum + Number(item.openTasks || 0), 0);

    const utility = document.createElement('section');
    utility.className = 'exact18-list-utility';
    utility.innerHTML = `
      <section class="exact18-summary-grid" aria-label="Assignment summary">
        ${summaryCard('SJ','navy',state.assignments.length,'Total assignments','Approved ministry engagements')}
        ${summaryCard('A','violet',active,'Active assignments','Currently in preparation')}
        ${summaryCard('30','gold',within30,'Within 30 days','Engagements approaching')}
        ${summaryCard('%','green',`${average}%`,'Average readiness','Across all assignments')}
      </section>
      ${attention ? `<section class="exact18-attention"><span class="exact18-attention-mark">!</span><div><strong>Preparation needs attention</strong><p>${attention} open ${attention === 1 ? 'item requires' : 'items require'} action.</p></div></section>` : ''}
      <section class="exact18-toolbar">
        <div class="exact18-filter-group" aria-label="Filter assignments">
          ${['all','active','completed','cancelled'].map(filter => `<button type="button" data-legacy-filter="${filter}" class="${selectedFilter === filter ? 'selected' : ''}">${formatStatus(filter)} <span>${filterCount(filter)}</span></button>`).join('')}
        </div>
        <span class="exact18-result-count">${filteredAssignments().length} ${filteredAssignments().length === 1 ? 'assignment' : 'assignments'}</span>
      </section>`;
    assignmentPanel.insertBefore(utility, assignmentList);
    utility.querySelectorAll('[data-legacy-filter]').forEach(button => button.addEventListener('click', () => {
      selectedFilter = button.dataset.legacyFilter;
      renderLegacyAssignments();
    }));
  }

  function renderLegacyAssignments() {
    if (!assignmentList || typeof state === 'undefined') return;
    prepareListChrome();
    const items = filteredAssignments();
    assignmentList.innerHTML = items.length ? items.map(item => {
      const [status, statusClass] = statusLabel(item.status);
      const [timing, soon] = timingLabel(item);
      const [stage, stageDetail] = stageFor(item);
      const readiness = clamp(item.readinessPercent);
      return `<button class="assignment-card exact18-assignment-card" data-legacy-assignment="${item.id}">
        <header class="exact18-assignment-card-heading"><div class="exact18-assignment-identity"><span class="exact18-status exact18-status--${statusClass}">${status}</span><span class="exact18-reference">ASN-${esc(String(item.externalAssignmentId || item.id).slice(-8).toUpperCase())}</span></div><span class="exact18-event-timing ${soon ? 'exact18-event-timing--soon' : ''}">${esc(timing)}</span></header>
        <div class="exact18-assignment-card-body"><div class="exact18-assignment-main"><p class="exact18-event-type">Ministry engagement</p><h2>${esc(item.title)}</h2><p class="exact18-organization">${esc(item.hostOrganization || 'Host organization pending')}</p><div class="exact18-event-details"><span><strong>Dates</strong>${esc(formatDate(item.startsAtUtc))}</span><span><strong>Location</strong>${esc(item.location || 'Pending')}</span><span><strong>Tasks</strong>${Number(item.openTasks || 0)} open</span></div></div><div class="exact18-current-stage"><small>Current stage</small><strong>${esc(stage)}</strong><span>${esc(stageDetail)}</span></div></div>
        <footer class="exact18-assignment-card-footer"><div class="exact18-assignment-progress"><div class="exact18-progress-heading"><span>Assignment progress</span><strong>${readiness}%</strong></div><div class="exact18-progress-bar"><i style="width:${readiness}%"></i></div><small>${Number(item.openTasks || 0)} preparation ${Number(item.openTasks || 0) === 1 ? 'item' : 'items'} remaining</small></div><div class="exact18-assignment-meta"><div class="exact18-next-task"><small>Next step</small><strong>${esc(stage)}</strong><span>${Number(item.openTasks || 0) ? 'Continue preparation' : 'Review assignment'}</span></div><span class="exact18-open-arrow" aria-hidden="true">→</span></div></footer>
      </button>`;
    }).join('') : '<section class="empty-state"><h2>No assignments found</h2><p>There are no assignments matching the selected filter.</p></section>';

    assignmentList.querySelectorAll('[data-legacy-assignment]').forEach(button => button.addEventListener('click', () => openAssignment(button.dataset.legacyAssignment)));
  }

  function dateRange(summary, endsAt) {
    const start = summary?.startsAtUtc ? formatDate(summary.startsAtUtc) : 'Date pending';
    if (!endsAt) return start;
    const end = formatDate(endsAt);
    return start === end ? start : `${start} – ${end}`;
  }

  function navButton(key, label, description) {
    return `<button type="button" class="exact18-tab ${activePane === key ? 'is-active' : ''}" data-legacy-pane="${key}"><strong>${label}</strong><small>${description}</small></button>`;
  }

  function renderShell() {
    const item = state.selected;
    if (!item || !assignmentDetail) return;
    const summary = item.summary;
    const [status, statusClass] = statusLabel(summary.status);
    assignmentDetail.innerHTML = `
      <button type="button" class="exact18-back-link" data-legacy-back><span aria-hidden="true">←</span> Back to assignments</button>
      <header class="exact18-workspace-heading">
        <div><div class="exact18-heading-meta"><p class="eyebrow">Ministry assignment</p><span class="exact18-status exact18-status--${statusClass}">${esc(status)}</span></div><h1>${esc(summary.title)}</h1><p class="exact18-subtitle">${esc(summary.hostOrganization || 'Host organization pending')} <span aria-hidden="true">·</span> ${esc(summary.location || 'Location pending')}</p></div>
        <div class="exact18-heading-summary"><article class="exact18-event-date"><small>Event dates</small><strong>${esc(dateRange(summary, item.endsAtUtc))}</strong><span>${esc(summary.location || 'Location pending')}</span></article><article class="exact18-heading-readiness"><div><small>Overall readiness</small><strong>${clamp(summary.readinessPercent)}%</strong></div><div class="exact18-heading-progress"><i style="width:${clamp(summary.readinessPercent)}%"></i></div></article></div>
      </header>
      <nav class="exact18-assignment-tabs" aria-label="Assignment sections">
        <section class="exact18-tab-group"><span class="exact18-tab-label">Assignment</span><div class="exact18-tab-items">${navButton('overview','Overview','Executive assignment summary')}</div></section>
        <section class="exact18-tab-group exact18-tab-group--preparation"><span class="exact18-tab-label">Preparation</span><div class="exact18-tab-items">${navButton('checklist','Checklist','Preparation responsibilities')}${navButton('travel','Travel','Flights, lodging and transportation')}${navButton('contacts','Contacts','Host and assignment contacts')}${navButton('documents','Documents','Files, schedules and resources')}</div></section>
        <section class="exact18-tab-group"><span class="exact18-tab-label">Record</span><div class="exact18-tab-items"><details class="exact18-record-menu"><summary class="exact18-tab exact18-record-trigger ${['closeout','activity'].includes(activePane) ? 'is-active' : ''}"><span><strong>Record</strong><small>Closeout and ministry log</small></span><i class="exact18-record-chevron" aria-hidden="true"></i></summary><div class="exact18-record-popover"><button type="button" data-legacy-pane="closeout"><strong>Closeout</strong><small>Outcomes, reconciliation and archive</small></button><button type="button" data-legacy-pane="activity"><strong>Ministry Log</strong><small>Updates, decisions and activity</small></button></div></details></div></section>
      </nav>
      <section class="legacy18-content" data-legacy-content></section>`;
    assignmentDetail.querySelector('[data-legacy-back]').addEventListener('click', closeAssignment);
    assignmentDetail.querySelectorAll('[data-legacy-pane]').forEach(button => button.addEventListener('click', () => activatePane(button.dataset.legacyPane)));
    renderActivePane();
  }

  function info() {
    const preparation = workspaceResult?.workspace?.preparation || {};
    return {
      preparation,
      coordination: preparation.coordination || {},
      readiness: workspaceResult?.workspace?.readiness || {},
      activity: workspaceResult?.workspace?.activity || [],
      coordinationUrl: workspaceResult?.coordinationUrl || null,
      termsUrl: workspaceResult?.termsUrl || null,
    };
  }

  function hostStatusText(value) {
    switch (norm(value)) {
      case 'submitted': return 'Ready for review';
      case 'in-progress': return 'Host is adding details';
      case 'requested': return 'Waiting for host';
      case 'reviewed': return 'Host details reviewed';
      default: return 'Link not sent';
    }
  }

  function renderOverview(target) {
    const item = state.selected;
    const data = info();
    const tasks = (item.tasks || []).filter(task => !terminal.has(norm(task.status)));
    const next = tasks[0];
    const lanes = data.readiness.lanes || [];
    const hostLane = lanes.find(lane => norm(lane.label).includes('host'));
    const hostPercent = clamp(hostLane?.percent || 0);
    const ref = data.preparation.referenceNumber || item.summary.externalAssignmentId || 'Engagement record';
    target.innerHTML = `
      <section class="exact18-overview">
        <section class="exact18-overview-grid">
          <article class="exact18-overview-card exact18-overview-card--next"><div class="exact18-card-heading"><div><p class="eyebrow">What’s next</p><h2>Next assignment action</h2></div><span class="exact18-action-mark">→</span></div>${next ? `<strong class="exact18-next-title">${esc(next.title)}</strong><p>${esc(next.detail || `${formatStatus(next.category)} preparation`)}</p><div class="exact18-next-meta"><span>Owner: <strong>${esc(next.owner || 'Engagement Coordinator')}</strong></span>${next.dueAtUtc ? `<span>Due: <strong>${esc(formatDate(next.dueAtUtc))}</strong></span>` : ''}</div><button type="button" class="exact18-card-action" data-open-pane="checklist">Open checklist <span>→</span></button>` : `<strong class="exact18-next-title">Assignment checklist complete</strong><p>Every current preparation item has been completed.</p>`}</article>
          <article class="exact18-overview-card"><div class="exact18-card-heading"><div><p class="eyebrow">Host coordination</p><h2>External details</h2></div><span class="exact18-coordinator-avatar">H</span></div><strong class="exact18-next-title">${esc(hostStatusText(data.preparation.coordinationStatus))}</strong><p>Collect lodging, ground travel, contacts, schedule, promotion, prayer focus and files in one host-facing form.</p><div class="host-progress"><span><small>Host completion</small><strong>${hostPercent}%</strong></span><span class="host-progress-track"><span style="width:${hostPercent}%"></span></span></div>${data.coordinationUrl ? `<a class="exact18-card-action" href="${esc(data.coordinationUrl)}" target="_blank" rel="noopener">Open host coordination link <span>→</span></a>` : `<button type="button" class="exact18-card-action" disabled>Create host coordination link <span>→</span></button>`}</article>
        </section>
        <details class="legacy18-source-panel"><summary><span>↳</span><div><small>Invitation source</small><strong>Approved terms retained · ${esc(ref)}</strong></div><em>Review carried-forward details</em></summary><div class="legacy18-source-body">${data.termsUrl ? `<a href="${esc(data.termsUrl)}" target="_blank" rel="noopener">View accepted terms <span>→</span></a>` : '<span>Terms link not available.</span>'}</div></details>
        <section class="legacy18-readiness-panel"><header><div><p class="eyebrow">Readiness radar</p><h2>Preparation by stage</h2></div><div><strong>${clamp(data.readiness.overallPercent ?? item.summary.readinessPercent)}%</strong><span>Overall</span></div></header><div>${lanes.length ? lanes.map(lane => `<article class="legacy18-readiness-row"><div><strong>${esc(lane.label)}</strong><span>${esc(lane.detail || '')}</span></div><div><div class="legacy18-progress"><i style="width:${clamp(lane.percent)}%"></i></div><strong>${clamp(lane.percent)}%</strong></div></article>`).join('') : '<p class="legacy18-empty">Readiness details are still being assembled.</p>'}</div></section>
      </section>`;
    target.querySelector('[data-open-pane="checklist"]')?.addEventListener('click', () => activatePane('checklist'));
  }

  function taskGroupLabel(category) {
    const value = norm(category);
    if (value === 'lodging' || value === 'transportation') return 'Travel';
    if (value === 'host') return 'Host readiness';
    if (value === 'documents') return 'Documents';
    if (value === 'closeout') return 'Closeout';
    return formatStatus(value || 'Preparation');
  }

  function renderChecklist(target) {
    const tasks = state.selected.tasks || [];
    const groups = new Map();
    tasks.forEach(task => {
      const label = taskGroupLabel(task.category);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(task);
    });
    const complete = tasks.filter(task => terminal.has(norm(task.status))).length;
    const percent = tasks.length ? Math.round((complete / tasks.length) * 100) : 100;
    target.innerHTML = `<section class="legacy18-page"><header class="legacy18-page-heading"><div><p class="eyebrow">Assignment checklist</p><h2>Preparation responsibilities</h2><p>Track ownership, deadlines and completion across every stage of the assignment.</p></div><div class="legacy18-readiness"><strong>${complete}/${tasks.length}</strong><span>Items complete</span><div><i style="width:${percent}%"></i></div></div></header><div class="legacy18-stage-list">${groups.size ? [...groups.entries()].map(([label, items], index) => `<details class="legacy18-stage" ${index === 0 ? 'open' : ''}><summary><span>${items.every(task => terminal.has(norm(task.status))) ? '✓' : label.charAt(0)}</span><div><h3>${esc(label)}</h3><p>${items.length} preparation ${items.length === 1 ? 'item' : 'items'}</p></div><strong>${items.filter(task => terminal.has(norm(task.status))).length}/${items.length}</strong></summary><div class="legacy18-task-list">${items.map(task => `<article class="legacy18-task ${terminal.has(norm(task.status)) ? 'is-complete' : ''}"><button type="button" data-task-toggle="${task.id}" aria-label="Toggle ${esc(task.title)}">${terminal.has(norm(task.status)) ? '✓' : ''}</button><div><strong>${esc(task.title)}</strong><p>${esc(task.detail || formatStatus(task.category))}</p><small>${esc(task.owner || 'Engagement Coordinator')}${task.dueAtUtc ? ` · Due ${esc(formatDate(task.dueAtUtc))}` : ''}</small></div><span>${esc(formatStatus(task.status))}</span></article>`).join('')}</div></details>`).join('') : '<p class="legacy18-empty">No preparation responsibilities have been added.</p>'}</div></section>`;
    target.querySelectorAll('[data-task-toggle]').forEach(button => button.addEventListener('click', async () => {
      const task = state.selected.tasks.find(item => String(item.id) === String(button.dataset.taskToggle));
      if (!task) return;
      const status = terminal.has(norm(task.status)) ? 'open' : 'complete';
      try {
        await api(`/api/engagements/assignments/${state.selectedId}/tasks/${task.id}`, { method:'PUT', body:JSON.stringify({ status, owner:task.owner, detail:task.detail, dueAtUtc:task.dueAtUtc }) });
        showMessage('Readiness task updated.');
        await refreshOpenAssignment();
      } catch (error) { showMessage(error.message, true); }
    }));
  }

  function input(label, name, value, type = 'text', wide = false) {
    return `<label class="legacy18-field ${wide ? 'wide' : ''}"><span>${label}</span><input type="${type}" name="${name}" value="${esc(value || '')}"></label>`;
  }

  function datetimeValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = number => String(number).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function coordinationPayload(form, contactsOverride = null) {
    const existing = info().coordination;
    const value = name => form?.elements?.namedItem(name)?.value?.trim() || null;
    const iso = name => {
      const raw = value(name);
      if (!raw) return null;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) throw new Error('One of the date or time values is invalid.');
      return date.toISOString();
    };
    return {
      outboundAirline:value('outboundAirline') ?? existing.outboundAirline ?? null,
      outboundFlightNumber:value('outboundFlightNumber') ?? existing.outboundFlightNumber ?? null,
      outboundConfirmationNumber:value('outboundConfirmationNumber') ?? existing.outboundConfirmationNumber ?? null,
      outboundDepartureAirport:value('outboundDepartureAirport') ?? existing.outboundDepartureAirport ?? null,
      outboundArrivalAirport:value('outboundArrivalAirport') ?? existing.outboundArrivalAirport ?? null,
      outboundDepartsAtUtc:form?.elements?.namedItem('outboundDepartsAtUtc') ? iso('outboundDepartsAtUtc') : existing.outboundDepartsAtUtc ?? null,
      outboundArrivesAtUtc:form?.elements?.namedItem('outboundArrivesAtUtc') ? iso('outboundArrivesAtUtc') : existing.outboundArrivesAtUtc ?? null,
      returnAirline:value('returnAirline') ?? existing.returnAirline ?? null,
      returnFlightNumber:value('returnFlightNumber') ?? existing.returnFlightNumber ?? null,
      returnConfirmationNumber:value('returnConfirmationNumber') ?? existing.returnConfirmationNumber ?? null,
      returnDepartureAirport:value('returnDepartureAirport') ?? existing.returnDepartureAirport ?? null,
      returnArrivalAirport:value('returnArrivalAirport') ?? existing.returnArrivalAirport ?? null,
      returnDepartsAtUtc:form?.elements?.namedItem('returnDepartsAtUtc') ? iso('returnDepartsAtUtc') : existing.returnDepartsAtUtc ?? null,
      returnArrivesAtUtc:form?.elements?.namedItem('returnArrivesAtUtc') ? iso('returnArrivesAtUtc') : existing.returnArrivesAtUtc ?? null,
      hotelName:value('hotelName') ?? existing.hotelName ?? null,
      hotelAddress:value('hotelAddress') ?? existing.hotelAddress ?? null,
      hotelConfirmationNumber:value('hotelConfirmationNumber') ?? existing.hotelConfirmationNumber ?? null,
      hotelCheckInAtUtc:form?.elements?.namedItem('hotelCheckInAtUtc') ? iso('hotelCheckInAtUtc') : existing.hotelCheckInAtUtc ?? null,
      hotelCheckOutAtUtc:form?.elements?.namedItem('hotelCheckOutAtUtc') ? iso('hotelCheckOutAtUtc') : existing.hotelCheckOutAtUtc ?? null,
      transportationPlan:value('transportationPlan') ?? existing.transportationPlan ?? null,
      pickupContactName:value('pickupContactName') ?? existing.pickupContactName ?? null,
      pickupContactPhone:value('pickupContactPhone') ?? existing.pickupContactPhone ?? null,
      schedule:existing.schedule || [],
      contacts:contactsOverride ?? existing.contacts ?? [],
      promotionRequirements:existing.promotionRequirements ?? null,
      prayerFocus:existing.prayerFocus ?? null,
      hostNotes:existing.hostNotes ?? null,
      submit:false
    };
  }

  function renderTravel(target) {
    const c = info().coordination;
    const readiness = clamp((info().readiness.lanes || []).find(lane => ['travel','lodging','transportation'].some(key => norm(lane.label).includes(key)))?.percent || 0);
    target.innerHTML = `<form class="legacy18-page legacy18-form" data-travel-form><header class="legacy18-page-heading"><div><p class="eyebrow">Travel itinerary</p><h2>Travel arrangements</h2><p>Record flights, lodging and local transportation. Partial information can be saved while arrangements are still being finalized.</p></div><div class="legacy18-readiness"><strong>${readiness}%</strong><span>Travel readiness</span><div><i style="width:${readiness}%"></i></div></div></header>
      <section class="legacy18-host-strip"><span>H</span><div><p class="eyebrow">Host coordination</p><h3>${esc(hostStatusText(info().preparation.coordinationStatus))}</h3><p>One host link collects hotel, pickup, contacts, schedule, promotion, prayer focus and documents.</p></div>${info().coordinationUrl ? `<a href="${esc(info().coordinationUrl)}" target="_blank" rel="noopener">Open host link</a>` : '<button type="button" disabled>Create host link</button>'}</section>
      <details class="legacy18-form-section" open><summary><span>01</span><div><p>Flight information</p><h3>Outbound flight</h3></div></summary><div class="legacy18-field-grid">${input('Airline','outboundAirline',c.outboundAirline)}${input('Flight number','outboundFlightNumber',c.outboundFlightNumber)}${input('Confirmation number','outboundConfirmationNumber',c.outboundConfirmationNumber)}${input('Departure airport','outboundDepartureAirport',c.outboundDepartureAirport)}${input('Arrival airport','outboundArrivalAirport',c.outboundArrivalAirport)}${input('Departs','outboundDepartsAtUtc',datetimeValue(c.outboundDepartsAtUtc),'datetime-local')}${input('Arrives','outboundArrivesAtUtc',datetimeValue(c.outboundArrivesAtUtc),'datetime-local')}</div></details>
      <details class="legacy18-form-section"><summary><span>02</span><div><p>Flight information</p><h3>Return flight</h3></div></summary><div class="legacy18-field-grid">${input('Airline','returnAirline',c.returnAirline)}${input('Flight number','returnFlightNumber',c.returnFlightNumber)}${input('Confirmation number','returnConfirmationNumber',c.returnConfirmationNumber)}${input('Departure airport','returnDepartureAirport',c.returnDepartureAirport)}${input('Arrival airport','returnArrivalAirport',c.returnArrivalAirport)}${input('Departs','returnDepartsAtUtc',datetimeValue(c.returnDepartsAtUtc),'datetime-local')}${input('Arrives','returnArrivesAtUtc',datetimeValue(c.returnArrivesAtUtc),'datetime-local')}</div></details>
      <details class="legacy18-form-section"><summary><span>03</span><div><p>Lodging</p><h3>Hotel information</h3></div></summary><div class="legacy18-field-grid">${input('Hotel name','hotelName',c.hotelName)}${input('Confirmation number','hotelConfirmationNumber',c.hotelConfirmationNumber)}${input('Hotel address','hotelAddress',c.hotelAddress,'text',true)}${input('Check in','hotelCheckInAtUtc',datetimeValue(c.hotelCheckInAtUtc),'datetime-local')}${input('Check out','hotelCheckOutAtUtc',datetimeValue(c.hotelCheckOutAtUtc),'datetime-local')}</div></details>
      <details class="legacy18-form-section"><summary><span>04</span><div><p>Local transportation</p><h3>Pickup and transportation</h3></div></summary><div class="legacy18-field-grid">${input('Pickup contact','pickupContactName',c.pickupContactName)}${input('Pickup phone','pickupContactPhone',c.pickupContactPhone,'tel')}<label class="legacy18-field wide"><span>Transportation plan</span><textarea name="transportationPlan" rows="5">${esc(c.transportationPlan || '')}</textarea></label></div></details>
      <footer class="legacy18-save"><div><strong>Save travel itinerary</strong><p>Travel, lodging and transportation remain attached to this assignment.</p></div><button type="submit">Save travel</button></footer></form>`;
    target.querySelector('[data-travel-form]').addEventListener('submit', async event => {
      event.preventDefault();
      try {
        await api(`/api/engagements/assignments/${state.selectedId}/workspace/coordination`, { method:'PUT', body:JSON.stringify(coordinationPayload(event.currentTarget)) });
        showMessage('Travel itinerary saved.');
        await refreshOpenAssignment();
      } catch (error) { showMessage(error.message, true); }
    });
  }

  const contactTypes = [
    ['primary','Primary host contact','Invitation contact'],
    ['travel','Travel contact','Local transportation'],
    ['media','Media contact','Media and production'],
    ['emergency','Emergency contact','Urgent support']
  ];

  function contactFor(type, contacts) {
    if (type === 'primary') return contacts.find(item => ['primary','host'].includes(norm(item.type))) || contacts[0] || {};
    return contacts.find(item => norm(item.type) === type) || {};
  }

  function renderContacts(target) {
    const contacts = info().coordination.contacts || [];
    const ready = contacts.filter(item => item.name && (item.email || item.phone)).length;
    const percent = Math.round((ready / contactTypes.length) * 100);
    target.innerHTML = `<form class="legacy18-page legacy18-form" data-contacts-form><header class="legacy18-page-heading"><div><p class="eyebrow">Assignment contacts</p><h2>People and communication</h2><p>Keep the primary host, travel, production and emergency contacts available to the assignment team.</p></div><div class="legacy18-readiness"><strong>${percent}%</strong><span>Contact readiness</span><div><i style="width:${percent}%"></i></div></div></header><section class="legacy18-contact-grid">${contactTypes.map(([type,title,eyebrow], index) => {
      const item = contactFor(type, contacts);
      return `<details class="legacy18-contact-card" ${index === 0 ? 'open' : ''} data-contact="${type}"><summary><span>${String(index+1).padStart(2,'0')}</span><div><p>${eyebrow}</p><h3>${title}</h3><small>${esc(item.name || 'Add when assigned')}</small></div></summary><div class="legacy18-field-grid">${input('Name','name',item.name)}${input('Email','email',item.email,'email')}${input('Phone','phone',item.phone,'tel')}${type !== 'primary' ? '<button type="button" class="legacy18-reuse" data-reuse-primary>Use primary contact</button>' : ''}</div></details>`;
    }).join('')}</section><footer class="legacy18-save"><div><strong>Save assignment contacts</strong><p>A contact is considered ready when a name and either a phone number or email address are present.</p></div><button type="submit">Save contacts</button></footer></form>`;
    const form = target.querySelector('[data-contacts-form]');
    form.querySelectorAll('[data-reuse-primary]').forEach(button => button.addEventListener('click', () => {
      const primary = form.querySelector('[data-contact="primary"]');
      const current = button.closest('[data-contact]');
      ['name','email','phone'].forEach(name => {
        current.querySelector(`[name="${name}"]`).value = primary.querySelector(`[name="${name}"]`).value;
      });
    }));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const payloadContacts = contactTypes.map(([type]) => {
        const card = form.querySelector(`[data-contact="${type}"]`);
        const name = card.querySelector('[name="name"]').value.trim();
        const email = card.querySelector('[name="email"]').value.trim();
        const phone = card.querySelector('[name="phone"]').value.trim();
        if (!name && !email && !phone) return null;
        return { type:type === 'primary' ? 'primary' : type, name, email:email || null, phone:phone || null };
      }).filter(Boolean);
      try {
        await api(`/api/engagements/assignments/${state.selectedId}/workspace/coordination`, { method:'PUT', body:JSON.stringify(coordinationPayload(null, payloadContacts)) });
        showMessage('Assignment contacts saved.');
        await refreshOpenAssignment();
      } catch (error) { showMessage(error.message, true); }
    });
  }

  function bytes(value) {
    const size = Number(value || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024*1024) return `${Math.max(1,Math.round(size/1024))} KB`;
    return `${(size/(1024*1024)).toFixed(1)} MB`;
  }

  function renderDocuments(target) {
    const docs = info().coordination.documents || [];
    const tracked = state.selected.documents || [];
    target.innerHTML = `<section class="legacy18-page"><header class="legacy18-page-heading"><div><p class="eyebrow">Assignment documents</p><h2>Files and resources</h2><p>Keep host uploads and ministry-team documents attached to the assignment record.</p></div></header><section class="legacy18-upload"><label><span>Add a file</span><input type="file" data-doc-file></label><button type="button" data-doc-upload>Upload document</button><small>PDFs, images and office files up to the current workspace limit.</small></section><section class="legacy18-document-list">${docs.length ? docs.map(doc => `<article><div><span>DOC</span><div><a href="/api/engagements/assignments/${state.selectedId}/preparation/documents/${doc.id}" target="_blank" rel="noopener">${esc(doc.fileName)}</a><small>${bytes(doc.length)} · ${esc(formatDateTime(doc.uploadedAtUtc))}</small></div></div><button type="button" data-doc-remove="${doc.id}">Remove</button></article>`).join('') : '<p class="legacy18-empty">No coordination files have been uploaded yet.</p>'}</section>${tracked.length ? `<section class="legacy18-record-ledger"><p class="eyebrow">Tracked records</p>${tracked.map(doc => `<div><span>${esc(doc.name)}</span><strong>${esc(formatStatus(doc.status))}</strong><small>${esc(formatStatus(doc.category))}</small></div>`).join('')}</section>` : ''}</section>`;
    target.querySelector('[data-doc-upload]').addEventListener('click', async () => {
      const file = target.querySelector('[data-doc-file]').files?.[0];
      if (!file) return showMessage('Choose a document to upload.', true);
      try {
        const form = new FormData(); form.append('file', file);
        const response = await fetch(`/api/engagements/assignments/${state.selectedId}/workspace/documents`, { method:'POST', credentials:'same-origin', body:form });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.message || `Upload failed (${response.status})`);
        showMessage(`${file.name} added to the assignment.`);
        await refreshOpenAssignment();
      } catch (error) { showMessage(error.message, true); }
    });
    target.querySelectorAll('[data-doc-remove]').forEach(button => button.addEventListener('click', async () => {
      if (!window.confirm('Remove this file from the assignment?')) return;
      try {
        await api(`/api/engagements/assignments/${state.selectedId}/workspace/documents/${button.dataset.docRemove}`, { method:'DELETE' });
        showMessage('Assignment document removed.');
        await refreshOpenAssignment();
      } catch (error) { showMessage(error.message, true); }
    }));
  }

  function renderActivity(target) {
    const activity = info().activity || [];
    target.innerHTML = `<section class="legacy18-page"><header class="legacy18-page-heading"><div><p class="eyebrow">Ministry log</p><h2>Assignment history</h2><p>Invitation exchange, terms, host preparation, coordinator edits, files and readiness updates in one timeline.</p></div></header><section class="legacy18-activity">${activity.length ? activity.map(item => `<article><i></i><div><header><strong>${esc(item.title)}</strong><time>${esc(formatDateTime(item.occurredAtUtc))}</time></header><p>${esc(item.detail)}</p><small>${esc(item.actor)}</small></div></article>`).join('') : '<p class="legacy18-empty">No assignment activity has been recorded yet.</p>'}</section></section>`;
  }

  async function loadCloseout() {
    if (closeoutResult) return closeoutResult;
    closeoutResult = await api(`/api/engagements/assignments/${state.selectedId}/completion`);
    return closeoutResult;
  }

  async function renderCloseout(target) {
    target.innerHTML = '<section class="legacy18-page"><p class="legacy18-empty">Loading closeout…</p></section>';
    try {
      const completion = await loadCloseout();
      const c = completion.closeout || {};
      target.innerHTML = `<form class="legacy18-page legacy18-form" data-closeout-form><header class="legacy18-page-heading"><div><p class="eyebrow">Post-event closeout</p><h2>Complete the assignment record</h2><p>Capture outcomes once, resolve operational follow-up and archive only when final responsibilities are complete.</p></div><span class="legacy18-closeout-status">${c.completedAtUtc ? 'closed' : 'open'}</span></header><details class="legacy18-form-section" open><summary><span>01</span><div><p>Event record</p><h3>Ministry outcomes</h3></div></summary><div class="legacy18-field-grid"><label class="legacy18-field wide"><span>Event notes</span><textarea name="eventNotes" rows="4">${esc(c.eventNotes || '')}</textarea></label><label class="legacy18-field wide"><span>Testimony / outcome summary</span><textarea name="testimonySummary" rows="5">${esc(c.testimonySummary || '')}</textarea></label></div></details><details class="legacy18-form-section" open><summary><span>02</span><div><p>Operations</p><h3>Financial and relationship follow-up</h3></div></summary><div class="legacy18-field-grid"><label class="legacy18-field wide"><span>Host follow-up notes</span><textarea name="hostFollowUpNotes" rows="4">${esc(c.hostFollowUpNotes || '')}</textarea></label>${['hostFollowUpComplete|Host follow-up complete','finalDocumentsComplete|Final documents received / filed','paymentComplete|Honorarium / payment reconciled','administrativeFollowUpComplete|Administrative follow-up complete','outcomesRecorded|Ministry outcomes recorded'].map(pair => { const [name,label]=pair.split('|'); return `<label class="legacy18-check"><input type="checkbox" name="${name}" ${c[name] ? 'checked' : ''}><span>${label}</span></label>`; }).join('')}</div></details><footer class="legacy18-save"><div><strong>${c.completedAtUtc ? '✓ Closeout complete' : 'Archive gate'}</strong><p>Complete the record only after the required operational follow-up is resolved.</p></div><div><button type="submit" data-complete="false">Save progress</button><button type="submit" data-complete="true" ${completion.canComplete ? '' : 'disabled'}>${c.completedAtUtc ? 'Assignment archived' : 'Complete & archive'}</button></div></footer></form>`;
      const form = target.querySelector('[data-closeout-form]');
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const complete = event.submitter?.dataset.complete === 'true';
        if (complete && !window.confirm('Complete and archive this assignment?')) return;
        const data = new FormData(form);
        const payload = {
          eventNotes:data.get('eventNotes') || null,
          testimonySummary:data.get('testimonySummary') || null,
          hostFollowUpNotes:data.get('hostFollowUpNotes') || null,
          hostFollowUpComplete:data.get('hostFollowUpComplete') === 'on',
          finalDocumentsComplete:data.get('finalDocumentsComplete') === 'on',
          paymentComplete:data.get('paymentComplete') === 'on',
          administrativeFollowUpComplete:data.get('administrativeFollowUpComplete') === 'on',
          outcomesRecorded:data.get('outcomesRecorded') === 'on',
          complete
        };
        try {
          await api(`/api/engagements/assignments/${state.selectedId}/closeout`, { method:'PUT', body:JSON.stringify(payload) });
          showMessage(complete ? 'Assignment completed and archived.' : 'Closeout saved.');
          closeoutResult = null;
          await refreshOpenAssignment();
        } catch (error) { showMessage(error.message, true); }
      });
    } catch (error) {
      target.innerHTML = `<section class="legacy18-page"><p class="legacy18-empty">${esc(error.message)}</p></section>`;
    }
  }

  function renderActivePane() {
    const target = assignmentDetail?.querySelector('[data-legacy-content]');
    if (!target) return;
    if (activePane === 'overview') renderOverview(target);
    else if (activePane === 'checklist') renderChecklist(target);
    else if (activePane === 'travel') renderTravel(target);
    else if (activePane === 'contacts') renderContacts(target);
    else if (activePane === 'documents') renderDocuments(target);
    else if (activePane === 'activity') renderActivity(target);
    else if (activePane === 'closeout') renderCloseout(target);
  }

  function activatePane(key) {
    activePane = key;
    renderShell();
    requestAnimationFrame(() => assignmentGrid?.scrollIntoView({ block:'start' }));
  }

  async function loadOpenAssignment(id) {
    const [selected, workspace] = await Promise.all([
      api(`/api/engagements/assignments/${id}`),
      api(`/api/engagements/assignments/${id}/workspace`).catch(() => null)
    ]);
    state.selectedId = id;
    state.selected = selected;
    workspaceResult = workspace;
    closeoutResult = null;
  }

  async function openAssignment(id) {
    try {
      assignmentOpen = true;
      activePane = 'overview';
      window.location.hash = 'assignments';
      applyMode();
      await loadOpenAssignment(id);
      renderShell();
      assignmentGrid?.scrollIntoView({ block:'start' });
    } catch (error) {
      assignmentOpen = false;
      applyMode();
      showMessage(error.message, true);
    }
  }

  async function refreshOpenAssignment() {
    if (!assignmentOpen || !state.selectedId) return;
    await loadOpenAssignment(state.selectedId);
    renderShell();
    renderLegacyAssignments();
  }

  function closeAssignment() {
    assignmentOpen = false;
    activePane = 'overview';
    workspaceResult = null;
    closeoutResult = null;
    applyMode();
    renderLegacyAssignments();
    requestAnimationFrame(() => assignmentGrid?.scrollIntoView({ behavior:'smooth', block:'start' }));
  }

  if (typeof renderAssignments === 'function') renderAssignments = renderLegacyAssignments;

  if (typeof selectAssignment === 'function') {
    selectAssignment = async function(id) {
      state.selectedId = id;
      state.selected = await api(`/api/engagements/assignments/${id}`);
      if (assignmentOpen) {
        workspaceResult = await api(`/api/engagements/assignments/${id}/workspace`).catch(() => null);
        closeoutResult = null;
        renderShell();
      }
    };
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest('.sidebar nav a');
    if (!nav) return;
    const href = nav.getAttribute('href');
    if (href === '#assignments' && assignmentOpen) {
      event.preventDefault();
      window.location.hash = 'assignments';
      closeAssignment();
    } else if (href !== '#assignments') {
      assignmentOpen = false;
      activePane = 'overview';
      applyMode();
    }
  }, true);

  window.addEventListener('hashchange', () => {
    if ((window.location.hash || '#overview').toLowerCase() !== '#assignments') {
      assignmentOpen = false;
      activePane = 'overview';
    }
    applyMode();
  });

  document.addEventListener('DOMContentLoaded', applyMode);
  applyMode();
})();