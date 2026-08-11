(() => {
  const assignmentGrid = document.querySelector('#assignments');
  const assignmentPanel = assignmentGrid?.querySelector('.assignment-panel');
  const assignmentDetail = document.querySelector('#assignment-detail');
  const assignmentList = document.querySelector('#assignment-list');

  if (!assignmentGrid || !assignmentPanel || !assignmentDetail || !assignmentList) return;

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function normalizedStatus(value) {
    return String(value || 'active').trim().toLowerCase();
  }

  function statusLabel(value) {
    const status = normalizedStatus(value);
    if (status === 'completed' || status === 'complete') return 'Completed';
    if (status === 'cancelled' || status === 'canceled') return 'Cancelled';
    return 'Active';
  }

  function statusClass(value) {
    const status = normalizedStatus(value);
    if (status === 'completed' || status === 'complete') return 'completed';
    if (status === 'cancelled' || status === 'canceled') return 'cancelled';
    return 'active';
  }

  function shortReference(value) {
    const text = String(value || '');
    if (!text) return 'ENG';
    return text.length > 10 ? text.slice(0, 8).toUpperCase() : text.toUpperCase();
  }

  function daysUntil(value) {
    if (!value) return null;
    const target = new Date(value);
    if (Number.isNaN(target.getTime())) return null;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const day = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    return Math.ceil((day - start) / 86400000);
  }

  function timingLabel(item) {
    const days = daysUntil(item.startsAtUtc);
    if (days === null) return 'Date pending';
    if (days < 0) return 'Past event';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 30) return `${days} days away`;
    return formatDate(item.startsAtUtc);
  }

  function stageFor(item) {
    const lanes = [
      item.travelStatus,
      item.lodgingStatus,
      item.transportationStatus,
      item.hostStatus,
      item.documentsStatus,
    ].map(normalizedStatus);

    if (normalizedStatus(item.closeoutStatus) === 'complete') {
      return ['Closeout', 'Engagement record complete'];
    }
    if (lanes.includes('needs-attention')) {
      return ['Preparation', 'One or more coordination items need attention'];
    }
    if (clamp(item.readinessPercent) >= 80) {
      return ['Final readiness', 'Confirm arrival, ministry, and event-day details'];
    }
    if (clamp(item.readinessPercent) >= 50) {
      return ['Preparation', 'Travel, host, and schedule coordination'];
    }
    return ['Host coordination', 'Build the preparation record with the host'];
  }

  function countAttention(item) {
    return [
      item.travelStatus,
      item.lodgingStatus,
      item.transportationStatus,
      item.hostStatus,
      item.documentsStatus,
      item.closeoutStatus,
    ].filter(value => normalizedStatus(value) === 'needs-attention').length;
  }

  function assignmentSummaryMarkup() {
    const assignments = state.assignments || [];
    const active = assignments.filter(item => statusClass(item.status) === 'active').length;
    const approaching = assignments.filter(item => {
      const days = daysUntil(item.startsAtUtc);
      return days !== null && days >= 0 && days <= 30;
    }).length;
    const average = assignments.length
      ? Math.round(assignments.reduce((sum, item) => sum + clamp(item.readinessPercent), 0) / assignments.length)
      : 0;
    const attention = assignments.reduce((sum, item) => sum + countAttention(item), 0);

    return `
      <section class="legacy-assignment-summary" aria-label="Assignment summary">
        <article><span class="legacy-summary-icon legacy-summary-icon--navy">SJ</span><div><strong>${assignments.length}</strong><span>Total assignments</span><small>Approved ministry engagements</small></div></article>
        <article><span class="legacy-summary-icon legacy-summary-icon--violet">A</span><div><strong>${active}</strong><span>Active assignments</span><small>Currently in preparation</small></div></article>
        <article><span class="legacy-summary-icon legacy-summary-icon--gold">30</span><div><strong>${approaching}</strong><span>Within 30 days</span><small>Engagements approaching</small></div></article>
        <article><span class="legacy-summary-icon legacy-summary-icon--green">%</span><div><strong>${average}%</strong><span>Average readiness</span><small>Across all assignments</small></div></article>
      </section>
      ${attention ? `
        <section class="legacy-attention-banner">
          <span>!</span>
          <div><strong>Preparation needs attention</strong><p>${attention} coordination ${attention === 1 ? 'lane requires' : 'lanes require'} action.</p></div>
        </section>` : ''}
      <section class="legacy-assignment-toolbar">
        <div class="legacy-filter-group" role="group" aria-label="Filter assignments">
          <button type="button" class="selected" data-legacy-filter="all">All <span>${assignments.length}</span></button>
          <button type="button" data-legacy-filter="active">Active <span>${active}</span></button>
          <button type="button" data-legacy-filter="completed">Completed <span>${assignments.filter(item => statusClass(item.status) === 'completed').length}</span></button>
          <button type="button" data-legacy-filter="cancelled">Cancelled <span>${assignments.filter(item => statusClass(item.status) === 'cancelled').length}</span></button>
        </div>
        <span class="legacy-result-count">${assignments.length} ${assignments.length === 1 ? 'assignment' : 'assignments'}</span>
      </section>`;
  }

  let currentFilter = 'all';

  function renderExactAssignmentQueue() {
    if (typeof state === 'undefined') return;

    let utility = assignmentPanel.querySelector('.legacy-assignment-utility');
    if (!utility) {
      utility = document.createElement('div');
      utility.className = 'legacy-assignment-utility';
      const panelHeader = assignmentPanel.querySelector(':scope > header');
      panelHeader?.insertAdjacentElement('afterend', utility);
    }
    utility.innerHTML = assignmentSummaryMarkup();

    const filtered = (state.assignments || []).filter(item =>
      currentFilter === 'all' || statusClass(item.status) === currentFilter
    );

    const countText = utility.querySelector('.legacy-result-count');
    if (countText) countText.textContent = `${filtered.length} ${filtered.length === 1 ? 'assignment' : 'assignments'}`;

    assignmentList.innerHTML = filtered.length ? filtered.map(item => {
      const stage = stageFor(item);
      const readiness = clamp(item.readinessPercent);
      const attention = countAttention(item);
      const status = statusClass(item.status);
      return `
        <button class="legacy-assignment-card ${item.id === state.selectedId ? 'active' : ''}" data-id="${escapeHtml(String(item.id))}">
          <header class="legacy-assignment-card-heading">
            <div><span class="legacy-assignment-status legacy-assignment-status--${status}">${statusLabel(item.status)}</span><span class="legacy-assignment-reference">ENG-${escapeHtml(shortReference(item.id))}</span></div>
            <span class="legacy-event-timing ${daysUntil(item.startsAtUtc) !== null && daysUntil(item.startsAtUtc) <= 14 && daysUntil(item.startsAtUtc) >= 0 ? 'legacy-event-timing--soon' : ''}">${escapeHtml(timingLabel(item))}</span>
          </header>
          <div class="legacy-assignment-card-body">
            <div class="legacy-assignment-main">
              <p class="legacy-event-type">Ministry engagement</p>
              <h2>${escapeHtml(item.title)}</h2>
              <p class="legacy-organization-name">${escapeHtml(item.hostOrganization || 'Host organization pending')}</p>
              <div class="legacy-event-details">
                <span><strong>Dates</strong>${escapeHtml(formatDate(item.startsAtUtc))}</span>
                <span><strong>Location</strong>${escapeHtml(item.location || 'Pending')}</span>
                <span><strong>Open work</strong>${Number(item.openTasks || 0)} ${Number(item.openTasks || 0) === 1 ? 'task' : 'tasks'}</span>
              </div>
            </div>
            <aside class="legacy-current-stage">
              <small>Current stage</small>
              <strong>${escapeHtml(stage[0])}</strong>
              <span>${escapeHtml(stage[1])}</span>
            </aside>
          </div>
          <footer class="legacy-assignment-card-footer">
            <div class="legacy-assignment-progress">
              <div><span>Assignment progress</span><strong>${readiness}%</strong></div>
              <div class="legacy-progress-bar"><i style="width:${readiness}%"></i></div>
              <small>${Number(item.openTasks || 0) ? `${Number(item.openTasks || 0)} preparation ${Number(item.openTasks || 0) === 1 ? 'item' : 'items'} remaining` : 'Current preparation items complete'}</small>
            </div>
            <div class="legacy-assignment-meta">
              ${attention ? `<span class="legacy-blocked-count"><b>!</b>${attention} need${attention === 1 ? 's' : ''} attention</span>` : ''}
              <span class="legacy-next-task"><small>Next step</small><strong>${escapeHtml(stage[0])}</strong><span>${escapeHtml(timingLabel(item))}</span></span>
              <span class="legacy-open-arrow">→</span>
            </div>
          </footer>
        </button>`;
    }).join('') : `
      <section class="legacy-empty-state">
        <span>SJ</span><h2>No assignments found</h2><p>There are no assignments matching the selected filter.</p>
        <button type="button" data-legacy-filter="all">View all assignments</button>
      </section>`;

    [...utility.querySelectorAll('[data-legacy-filter]'), ...assignmentList.querySelectorAll('[data-legacy-filter]')].forEach(button => {
      button.classList.toggle('selected', button.dataset.legacyFilter === currentFilter);
      button.addEventListener('click', () => {
        currentFilter = button.dataset.legacyFilter || 'all';
        renderExactAssignmentQueue();
      });
    });

    assignmentList.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', async () => {
      await selectAssignment(button.dataset.id);
      window.openLegacyEngagementWorkspace?.();
    }));
  }

  if (typeof renderAssignments === 'function') {
    renderAssignments = renderExactAssignmentQueue;
  }

  window.renderExactAssignmentQueue = renderExactAssignmentQueue;
})();
