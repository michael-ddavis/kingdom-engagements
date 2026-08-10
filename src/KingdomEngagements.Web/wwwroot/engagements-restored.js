(() => {
  const assignmentGrid = document.querySelector('#assignments');
  const assignmentDetail = document.querySelector('#assignment-detail');
  const assignmentList = document.querySelector('#assignment-list');

  function stageFor(item) {
    const statuses = [item.travelStatus, item.lodgingStatus, item.transportationStatus, item.hostStatus, item.documentsStatus];
    if (item.closeoutStatus === 'complete') return ['Completed', 'Engagement record closed'];
    if (statuses.includes('needs-attention')) return ['Needs attention', 'Coordination requires action'];
    if (Number(item.readinessPercent || 0) >= 80) return ['Final readiness', 'Confirm arrival and ministry details'];
    if (Number(item.readinessPercent || 0) >= 50) return ['Preparation', 'Travel and host coordination'];
    return ['Host coordination', 'Build the preparation record'];
  }

  function restoreAssignmentQueue() {
    if (!assignmentList || typeof state === 'undefined') return;
    assignmentList.innerHTML = state.assignments.length ? state.assignments.map(item => {
      const stage = stageFor(item);
      const readiness = Math.max(0, Math.min(100, Number(item.readinessPercent || 0)));
      return `
        <button class="assignment-card ${item.id === state.selectedId ? 'active' : ''}" data-id="${item.id}">
          <div class="assignment-card-main">
            <div class="assignment-card-meta"><span>Active engagement</span><small>${escapeHtml(formatDate(item.startsAtUtc))}</small></div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.hostOrganization)}${item.location ? ` · ${escapeHtml(item.location)}` : ''}</p>
            <small>${item.openTasks} open ${item.openTasks === 1 ? 'task' : 'tasks'}</small>
          </div>
          <div class="assignment-card-stage">
            <small>Current stage</small>
            <strong>${escapeHtml(stage[0])}</strong>
            <span>${escapeHtml(stage[1])}</span>
          </div>
          <div class="assignment-card-readiness">
            <div><span>Readiness</span><strong>${readiness}%</strong></div>
            <div class="assignment-card-progress"><i style="width:${readiness}%"></i></div>
            <small>${item.openTasks ? `${item.openTasks} remaining` : 'No open tasks'}</small>
          </div>
          <span class="assignment-card-arrow" aria-hidden="true">→</span>
        </button>`;
    }).join('') : '<p class="request-list-empty">No approved engagements yet.</p>';

    assignmentList.querySelectorAll('[data-id]').forEach(button => button.addEventListener('click', () => selectAssignment(button.dataset.id)));
  }

  if (typeof renderAssignments === 'function') {
    renderAssignments = restoreAssignmentQueue;
    if (typeof state !== 'undefined' && state.assignments?.length) restoreAssignmentQueue();
  }

  function ensureBackButton() {
    if (!assignmentDetail || assignmentDetail.querySelector('.engagement-back')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'engagement-back';
    button.innerHTML = '<span aria-hidden="true">←</span> Back to assignments';
    button.addEventListener('click', closeAssignmentWorkspace);
    assignmentDetail.prepend(button);
  }

  function summaryDate(item) {
    if (!item?.summary?.startsAtUtc) return 'Date pending';
    const start = formatDate(item.summary.startsAtUtc);
    const end = item.endsAtUtc ? formatDate(item.endsAtUtc) : null;
    return end && end !== start ? `${start} – ${end}` : start;
  }

  function enhanceAssignmentHeader() {
    if (!assignmentDetail || !assignmentGrid?.classList.contains('is-workspace-open')) return;
    const header = assignmentDetail.querySelector('.detail-header');
    if (!header || typeof state === 'undefined' || !state.selected) return;
    ensureBackButton();

    header.querySelector('.eyebrow')?.replaceChildren(document.createTextNode('Ministry engagement'));
    let summary = assignmentDetail.querySelector('.engagement-heading-summary');
    if (!summary) {
      summary = document.createElement('section');
      summary.className = 'engagement-heading-summary';
      header.insertAdjacentElement('afterend', summary);
    }

    const item = state.selected;
    const readiness = Math.max(0, Math.min(100, Number(item.summary?.readinessPercent || 0)));
    summary.innerHTML = `
      <article>
        <small>Event dates</small>
        <strong>${escapeHtml(summaryDate(item))}</strong>
        <span>${escapeHtml(item.summary?.location || 'Location pending')}</span>
      </article>
      <article>
        <small>Host organization</small>
        <strong>${escapeHtml(item.summary?.hostOrganization || item.hostOrganization || 'Host pending')}</strong>
        <span>${escapeHtml(item.hostContactName || 'Primary contact pending')}</span>
      </article>
      <article class="engagement-heading-readiness">
        <div><small>Overall readiness</small><strong>${readiness}%</strong></div>
        <div class="engagement-heading-progress"><i style="width:${readiness}%"></i></div>
        <span>${item.tasks?.filter(task => !['complete','waived'].includes(task.status)).length || 0} open preparation items</span>
      </article>`;
  }

  function openAssignmentWorkspace() {
    if (!assignmentGrid) return;
    assignmentGrid.classList.add('is-workspace-open');
    ensureBackButton();
    requestAnimationFrame(() => {
      enhanceAssignmentHeader();
      assignmentGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function closeAssignmentWorkspace() {
    if (!assignmentGrid) return;
    assignmentGrid.classList.remove('is-workspace-open');
    assignmentDetail?.querySelector('.engagement-heading-summary')?.remove();
    restoreAssignmentQueue();
    requestAnimationFrame(() => assignmentGrid.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  document.addEventListener('click', event => {
    const assignment = event.target.closest('#assignment-list [data-id]');
    if (assignment) openAssignmentWorkspace();

    const fromInvitation = event.target.closest('[data-open-assignment]');
    if (fromInvitation) setTimeout(openAssignmentWorkspace, 0);

    const assignmentNav = event.target.closest('.sidebar nav a[href="#assignments"]');
    if (assignmentNav && assignmentGrid?.classList.contains('is-workspace-open')) closeAssignmentWorkspace();
  }, true);

  window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#assignments') assignmentGrid?.classList.remove('is-workspace-open');
  });

  const detailObserver = new MutationObserver(() => {
    if (assignmentGrid?.classList.contains('is-workspace-open')) requestAnimationFrame(enhanceAssignmentHeader);
  });
  if (assignmentDetail) detailObserver.observe(assignmentDetail, { childList: true, subtree: true });
})();
