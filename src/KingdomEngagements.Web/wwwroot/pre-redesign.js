(() => {
  const assignmentGrid = document.querySelector('#assignments');
  const assignmentDetail = document.querySelector('#assignment-detail');
  const assignmentList = document.querySelector('#assignment-list');

  const proxyTabs = [
    ['overview', 'Overview', 'Assignment summary'],
    ['checklist', 'Checklist', 'Preparation responsibilities'],
    ['travel', 'Travel', 'Flights, lodging and transportation'],
    ['schedule', 'Schedule', 'Sessions and ministry timing'],
    ['contacts', 'Contacts', 'Host and assignment contacts'],
    ['documents', 'Documents', 'Files, schedules and resources'],
    ['event', 'Event day', 'Arrival and on-site details'],
    ['responses', 'Responses', 'Ministry response record'],
    ['followup', 'Follow-up', 'Care and next actions'],
    ['closeout', 'Closeout', 'Final record and outcomes'],
    ['activity', 'Ministry Log', 'Updates, decisions and activity'],
  ];

  function clampPercent(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function assignmentStage(item) {
    const statuses = [
      item.travelStatus,
      item.lodgingStatus,
      item.transportationStatus,
      item.hostStatus,
      item.documentsStatus,
    ];
    if (item.closeoutStatus === 'complete') return ['Completed', 'Engagement record closed'];
    if (statuses.includes('needs-attention')) return ['Needs attention', 'Resolve preparation blockers'];
    if (Number(item.readinessPercent || 0) >= 80) return ['Final preparation', 'Confirm arrival and ministry details'];
    if (Number(item.readinessPercent || 0) >= 50) return ['Preparation', 'Travel and host coordination'];
    return ['Coordination', 'Build the preparation record'];
  }

  function renderFoundationAssignments() {
    if (!assignmentList || typeof state === 'undefined') return;
    assignmentList.innerHTML = state.assignments.length ? state.assignments.map(item => {
      const stage = assignmentStage(item);
      const readiness = clampPercent(item.readinessPercent);
      const starts = item.startsAtUtc ? formatDate(item.startsAtUtc) : 'Date pending';
      return `
        <button class="assignment-card ${item.id === state.selectedId ? 'active' : ''}" data-id="${item.id}">
          <header class="foundation-card-heading">
            <div>
              <span class="foundation-status">Active</span>
              <span class="foundation-reference">${escapeHtml(String(item.externalAssignmentId || item.id).slice(0, 12))}</span>
            </div>
            <span class="foundation-timing">${escapeHtml(starts)}</span>
          </header>
          <div class="foundation-card-body">
            <div class="foundation-card-main">
              <p class="foundation-event-type">Ministry assignment</p>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.hostOrganization || 'Host organization pending')}</p>
              <div class="foundation-event-details">
                <span><b>Date</b>${escapeHtml(starts)}</span>
                <span><b>Location</b>${escapeHtml(item.location || 'Pending')}</span>
                <span><b>Tasks</b>${Number(item.openTasks || 0)} open</span>
              </div>
            </div>
            <div class="foundation-current-stage">
              <small>Current stage</small>
              <strong>${escapeHtml(stage[0])}</strong>
              <span>${escapeHtml(stage[1])}</span>
            </div>
          </div>
          <footer class="foundation-card-footer">
            <div>
              <div class="foundation-progress-heading"><span>Assignment progress</span><strong>${readiness}%</strong></div>
              <div class="foundation-progress-track"><i style="width:${readiness}%"></i></div>
              <small>${Number(item.openTasks || 0)} preparation ${Number(item.openTasks || 0) === 1 ? 'item' : 'items'} remaining</small>
            </div>
            <span class="foundation-open" aria-hidden="true">→</span>
          </footer>
        </button>`;
    }).join('') : '<p class="request-list-empty">No approved engagements yet.</p>';

    assignmentList.querySelectorAll('[data-id]').forEach(button => {
      button.addEventListener('click', async () => {
        openAssignmentWorkspace();
        await selectAssignment(button.dataset.id);
        reconcileAssignment();
      });
    });
  }

  if (typeof renderAssignments === 'function') {
    renderAssignments = renderFoundationAssignments;
  }

  function openAssignmentWorkspace() {
    assignmentGrid?.classList.add('is-workspace-open');
  }

  function closeAssignmentWorkspace() {
    assignmentGrid?.classList.remove('is-workspace-open');
    renderFoundationAssignments();
    requestAnimationFrame(() => assignmentGrid?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function ensureBackButton() {
    if (!assignmentDetail || assignmentDetail.querySelector('.foundation-back')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'foundation-back';
    button.innerHTML = '<span aria-hidden="true">←</span> Back to assignments';
    button.addEventListener('click', closeAssignmentWorkspace);
    assignmentDetail.prepend(button);
  }

  function currentWorkspace() {
    return state?.assignmentWorkspace || null;
  }

  function coordinationInfo() {
    const result = currentWorkspace();
    const preparation = result?.workspace?.preparation;
    return {
      url: result?.coordinationUrl || null,
      termsUrl: result?.termsUrl || null,
      termsAccepted: preparation?.termsStatus === 'accepted',
      status: preparation?.coordinationStatus || 'not-started',
      preparation,
      readiness: result?.workspace?.readiness || null,
    };
  }

  function coordinationLabel(status) {
    switch (String(status || '').toLowerCase()) {
      case 'submitted': return 'Host details received';
      case 'in-progress': return 'Host coordination in progress';
      case 'requested': return 'Waiting for host details';
      default: return 'Host coordination available after terms';
    }
  }

  function hostControl(info, cssClass = 'foundation-host-button') {
    if (info.url) {
      return `<a class="${cssClass}" href="${escapeHtml(info.url)}" target="_blank" rel="noopener"><span class="foundation-host-button-icon" aria-hidden="true">H</span>Host Coordination</a>`;
    }
    return `<button type="button" class="${cssClass}" aria-disabled="true" title="Accepted terms are required before Host Coordination opens"><span class="foundation-host-button-icon" aria-hidden="true">H</span>Host Coordination</button>`;
  }

  function enhanceHeading() {
    const header = assignmentDetail?.querySelector('.detail-header');
    if (!header || !state?.selected) return;

    ensureBackButton();
    const info = coordinationInfo();
    let meta = header.querySelector('.foundation-heading-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'foundation-heading-meta';
      const eyebrow = header.querySelector('.eyebrow');
      if (eyebrow) {
        eyebrow.insertAdjacentElement('afterend', meta);
      } else {
        header.prepend(meta);
      }
    }
    meta.innerHTML = `<span class="foundation-status">${escapeHtml(formatStatus(state.selected.summary?.status || 'active'))}</span>${hostControl(info)}`;

    let summary = assignmentDetail.querySelector('.foundation-heading-summary');
    if (!summary) {
      summary = document.createElement('section');
      summary.className = 'foundation-heading-summary';
      header.insertAdjacentElement('afterend', summary);
    }
    const readiness = clampPercent(state.selected.summary?.readinessPercent);
    summary.innerHTML = `
      <article><small>Event dates</small><strong>${escapeHtml(formatDate(state.selected.summary?.startsAtUtc || ''))}</strong><span>${escapeHtml(state.selected.summary?.location || 'Location pending')}</span></article>
      <article class="foundation-heading-readiness"><div><small>Overall readiness</small><strong>${readiness}%</strong></div><div class="foundation-heading-progress"><i style="width:${readiness}%"></i></div><span>${Number(state.selected.tasks?.filter(task => !['complete','waived'].includes(task.status)).length || 0)} open items</span></article>`;
  }

  function ensureChecklistPane() {
    const workspace = assignmentDetail?.querySelector('.assignment-workspace');
    const editor = workspace?.querySelector('#assignment-coordination-form');
    const nativeNav = workspace?.querySelector('.assignment-workspace__tabs');
    if (!workspace || !editor || !nativeNav) return;

    let pane = editor.querySelector('[data-workspace-pane="checklist"]');
    if (!pane) {
      const legacyTaskSection = Array.from(assignmentDetail.children).find(element =>
        element.matches?.('.detail-section') && element.querySelector('h3')?.textContent.trim() === 'Readiness tasks');
      if (legacyTaskSection) {
        pane = legacyTaskSection;
        pane.classList.add('assignment-pane', 'restored-checklist-pane');
        pane.dataset.workspacePane = 'checklist';
        const footer = editor.querySelector('.assignment-editor__actions');
        editor.insertBefore(pane, footer || null);
      }
    }

    if (pane && !nativeNav.querySelector('[data-workspace-tab="checklist"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.workspaceTab = 'checklist';
      button.textContent = 'Checklist';
      const travel = nativeNav.querySelector('[data-workspace-tab="travel"]');
      nativeNav.insertBefore(button, travel || null);
      button.addEventListener('click', () => {
        const completion = workspace.querySelector('.completion-workspace');
        editor.hidden = false;
        if (completion) completion.hidden = true;
        nativeNav.querySelectorAll('button').forEach(item => item.classList.toggle('is-active', item === button));
        editor.querySelectorAll('[data-workspace-pane]').forEach(item => item.classList.toggle('is-active', item === pane));
      });
    }
  }

  function foundationOverviewMarkup() {
    const info = coordinationInfo();
    const selected = state?.selected;
    if (!selected) return '';
    const tasks = selected.tasks || [];
    const nextTask = tasks.find(task => !['complete', 'waived'].includes(task.status));
    const readiness = info.readiness;
    const lanes = readiness?.lanes || [];
    const starts = selected.summary?.startsAtUtc ? new Date(selected.summary.startsAtUtc) : null;
    const days = starts && !Number.isNaN(starts.getTime()) ? Math.ceil((starts.getTime() - Date.now()) / 86400000) : null;
    const stageLane = lanes.find(lane => Number(lane.percent || 0) < 100) || lanes[lanes.length - 1];

    return `
      <section class="foundation-overview" data-foundation-overview>
        <section class="foundation-overview-grid">
          <article class="foundation-overview-card foundation-overview-card--next">
            <p class="eyebrow">What’s next</p><h3>Next assignment action</h3>
            <strong>${escapeHtml(nextTask?.title || 'Assignment preparation is current')}</strong>
            <p>${escapeHtml(nextTask?.detail || (nextTask ? `${formatStatus(nextTask.category)} · ${nextTask.owner}` : 'There are no open readiness tasks right now.'))}</p>
            <button type="button" class="foundation-overview-action" data-foundation-tab="checklist">Open checklist</button>
          </article>
          <article class="foundation-overview-card">
            <p class="eyebrow">Host Coordination</p><h3>${escapeHtml(coordinationLabel(info.status))}</h3>
            <strong>${info.termsAccepted ? 'Secure host workspace' : 'Accepted terms required'}</strong>
            <p>Collect travel, lodging, local contacts, schedule, promotion, prayer focus and documents from the host in one place.</p>
            ${hostControl(info, 'foundation-overview-action secondary')}
          </article>
          <article class="foundation-overview-card">
            <p class="eyebrow">Current stage</p><h3>${escapeHtml(stageLane?.label || 'Preparation')}</h3>
            <strong>${stageLane ? `${clampPercent(stageLane.percent)}% ready` : `${clampPercent(selected.summary?.readinessPercent)}% overall`}</strong>
            <p>${escapeHtml(stageLane?.detail || 'Continue working through the assignment preparation record.')}</p>
          </article>
          <article class="foundation-overview-card">
            <p class="eyebrow">Event timing</p><h3>${days === null ? 'Date pending' : days < 0 ? 'Event completed' : days === 0 ? 'Event day' : `${days} day${days === 1 ? '' : 's'} away`}</h3>
            <strong>${days !== null && days <= 14 && days >= 0 ? 'Final preparation window' : 'Preparation window'}</strong>
            <p>${escapeHtml(selected.summary?.location || 'Location pending')}</p>
          </article>
        </section>
        <article class="foundation-overview-card">
          <p class="eyebrow">Readiness radar</p><h3>Preparation by stage</h3>
          <div class="foundation-readiness-list">
            ${lanes.length ? lanes.map(lane => `<div class="foundation-readiness-row"><div><strong>${escapeHtml(lane.label)}</strong><small>${escapeHtml(lane.detail || '')}</small></div><div class="foundation-lane-progress"><span><i style="width:${clampPercent(lane.percent)}%"></i></span><b>${clampPercent(lane.percent)}%</b></div></div>`).join('') : `<div class="foundation-readiness-row"><div><strong>Overall preparation</strong><small>Current assignment readiness</small></div><div class="foundation-lane-progress"><span><i style="width:${clampPercent(selected.summary?.readinessPercent)}%"></i></span><b>${clampPercent(selected.summary?.readinessPercent)}%</b></div></div>`}
          </div>
        </article>
      </section>`;
  }

  function ensureFoundationOverview() {
    const workspace = assignmentDetail?.querySelector('.assignment-workspace');
    const overviewPane = workspace?.querySelector('[data-workspace-pane="overview"]');
    if (!overviewPane) return;
    overviewPane.querySelector('[data-foundation-overview]')?.remove();
    overviewPane.insertAdjacentHTML('afterbegin', foundationOverviewMarkup());
    overviewPane.querySelectorAll('[data-foundation-tab]').forEach(button => {
      button.addEventListener('click', () => activateProxyTab(button.dataset.foundationTab));
    });
  }

  function nativeButtonFor(key) {
    const workspace = assignmentDetail?.querySelector('.assignment-workspace');
    if (!workspace) return null;
    return workspace.querySelector(`[data-workspace-tab="${key}"]`) || workspace.querySelector(`[data-unified-completion-tab="${key}"]`);
  }

  function activateProxyTab(key) {
    const button = nativeButtonFor(key);
    if (!button) return;
    button.click();
    const proxy = assignmentDetail?.querySelector('.foundation-tabs');
    proxy?.querySelectorAll('button').forEach(item => item.classList.toggle('is-active', item.dataset.foundationProxyTab === key));
  }

  function ensureFoundationTabs() {
    const workspace = assignmentDetail?.querySelector('.assignment-workspace');
    if (!workspace || !workspace.querySelector('#assignment-coordination-form')) return;
    let nav = workspace.querySelector('.foundation-tabs');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'foundation-tabs';
      nav.setAttribute('aria-label', 'Assignment sections');
      workspace.insertBefore(nav, workspace.querySelector('#assignment-coordination-form'));
    }
    const visibleTabs = proxyTabs.filter(([key]) => !!nativeButtonFor(key));
    nav.innerHTML = visibleTabs.map(([key, label, description], index) => `<button type="button" data-foundation-proxy-tab="${key}" class="${index === 0 ? 'is-active' : ''}"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></button>`).join('');
    nav.querySelectorAll('[data-foundation-proxy-tab]').forEach(button => {
      button.addEventListener('click', () => activateProxyTab(button.dataset.foundationProxyTab));
    });
  }

  function hideLegacyDuplicates() {
    const readiness = assignmentDetail?.querySelector('.readiness-card');
    const status = assignmentDetail?.querySelector('.status-grid');
    const details = assignmentDetail?.querySelector('.details-list')?.closest('.detail-section');
    const documents = assignmentDetail?.querySelector('.detail-section#documents');
    const closeout = assignmentDetail?.querySelector('.detail-section#closeout');
    if (readiness) readiness.hidden = true;
    if (status) status.hidden = true;
    if (details) details.hidden = true;
    if (documents) documents.hidden = true;
    if (closeout) closeout.hidden = true;
  }

  function reconcileAssignment() {
    if (!assignmentGrid?.classList.contains('is-workspace-open')) return;
    if (!state?.selected) return;
    ensureBackButton();
    hideLegacyDuplicates();
    ensureChecklistPane();
    enhanceHeading();
    ensureFoundationTabs();
    ensureFoundationOverview();
  }

  if (typeof selectAssignment === 'function') {
    const existingSelectAssignment = selectAssignment;
    selectAssignment = async function(id) {
      await existingSelectAssignment(id);
      renderFoundationAssignments();
      if (assignmentGrid?.classList.contains('is-workspace-open')) reconcileAssignment();
    };
  }

  document.addEventListener('click', event => {
    const fromInvitation = event.target.closest('[data-open-assignment]');
    if (fromInvitation) {
      openAssignmentWorkspace();
      setTimeout(reconcileAssignment, 0);
    }
    const assignmentNav = event.target.closest('.sidebar nav a[href="#assignments"]');
    if (assignmentNav && assignmentGrid?.classList.contains('is-workspace-open')) closeAssignmentWorkspace();
  }, true);

  window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#assignments') assignmentGrid?.classList.remove('is-workspace-open');
  });

  let frame = 0;
  const observer = new MutationObserver(() => {
    if (!assignmentGrid?.classList.contains('is-workspace-open')) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(reconcileAssignment);
  });
  if (assignmentDetail) observer.observe(assignmentDetail, { childList: true, subtree: true });

  if (typeof state !== 'undefined' && state.assignments?.length) renderFoundationAssignments();
})();
