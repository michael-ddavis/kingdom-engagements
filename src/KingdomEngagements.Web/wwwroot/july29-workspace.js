(() => {
  const assignmentGrid = document.querySelector('#assignments');
  const assignmentDetail = document.querySelector('#assignment-detail');
  if (!assignmentGrid || !assignmentDetail) return;
  const terminalTaskStatuses = new Set(['complete', 'waived']);
  const laneOrder = ['terms', 'travel', 'lodging', 'transportation', 'host', 'documents'];
  function clamp(value) { return Math.max(0, Math.min(100, Number(value || 0))); }
  function normalizedStatus(value) { return String(value || 'active').trim().toLowerCase(); }
  function statusLabel(value) { const status=normalizedStatus(value); if(status==='completed'||status==='complete') return 'Completed'; if(status==='cancelled'||status==='canceled') return 'Cancelled'; return 'Active'; }
  function statusClass(value) { const status=normalizedStatus(value); if(status==='completed'||status==='complete') return 'completed'; if(status==='cancelled'||status==='canceled') return 'cancelled'; return 'active'; }
  function ensureBackLink() {
    let link = assignmentDetail.querySelector('.legacy-back-link');
    if (link) return link;
    link = document.createElement('button');
    link.type = 'button';
    link.className = 'legacy-back-link';
    link.innerHTML = '<span aria-hidden="true">←</span> Back to assignments';
    link.addEventListener('click', closeAssignmentWorkspace);
    assignmentDetail.prepend(link);
    return link;
  }

  function selectedStatus() {
    return state.selected?.summary?.status || state.selected?.status || 'active';
  }

  function selectedDateRange() {
    const start = state.selected?.summary?.startsAtUtc;
    const end = state.selected?.endsAtUtc;
    if (!start) return 'Date pending';
    const first = formatDate(start);
    const second = end ? formatDate(end) : '';
    return second && second !== first ? `${first} – ${second}` : first;
  }

  function enhanceWorkspaceHeading() {
    const header = assignmentDetail.querySelector('.detail-header');
    if (!header || !state.selected) return;

    header.classList.add('legacy-workspace-heading');
    const eyebrow = header.querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = 'Ministry assignment';

    const status = header.querySelector(':scope > span');
    if (status) {
      status.className = `legacy-heading-status legacy-heading-status--${statusClass(selectedStatus())}`;
      status.textContent = `${statusLabel(selectedStatus())} assignment`;
    }

    let summary = assignmentDetail.querySelector('.legacy-heading-summary');
    if (!summary) {
      summary = document.createElement('section');
      summary.className = 'legacy-heading-summary';
      header.insertAdjacentElement('afterend', summary);
    }

    const readiness = clamp(state.selected.summary?.readinessPercent);
    const location = state.selected.summary?.location || 'Location pending';
    const headingSignature = [selectedDateRange(), readiness, location, selectedStatus()].join('|');
    if (summary.dataset.signature === headingSignature) return;
    summary.dataset.signature = headingSignature;
    summary.innerHTML = `
      <article class="legacy-event-date">
        <small>Event dates</small>
        <strong>${escapeHtml(selectedDateRange())}</strong>
        <span>${escapeHtml(location)}</span>
      </article>
      <article class="legacy-heading-readiness">
        <div><small>Overall readiness</small><strong>${readiness}%</strong></div>
        <div class="legacy-heading-progress"><i style="width:${readiness}%"></i></div>
      </article>`;
  }

  function restoreChecklistPane(workspace) {
    const editor = workspace.querySelector('#assignment-coordination-form');
    let nav = workspace.querySelector('.assignment-workspace__tabs');
    if (!editor || !nav) return;

    let pane = editor.querySelector('[data-workspace-pane="checklist"]');
    if (!pane) {
      const taskSection = Array.from(assignmentDetail.children).find(element =>
        element.matches?.('.detail-section') &&
        element.querySelector('h3')?.textContent.trim() === 'Readiness tasks'
      );

      if (taskSection) {
        pane = taskSection;
        pane.classList.add('assignment-pane', 'legacy-checklist-pane');
        pane.dataset.workspacePane = 'checklist';
        const actions = editor.querySelector('.assignment-editor__actions');
        editor.insertBefore(pane, actions || null);
      }
    }

    if (pane && !nav.querySelector('[data-workspace-tab="checklist"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.workspaceTab = 'checklist';
      button.textContent = 'Checklist';
      const travel = nav.querySelector('[data-workspace-tab="travel"]');
      nav.insertBefore(button, travel || null);
      button.addEventListener('click', () => {
        const completion = workspace.querySelector('.completion-workspace');
        editor.hidden = false;
        if (completion) completion.hidden = true;
        nav.querySelectorAll('button').forEach(item => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        editor.querySelectorAll('[data-workspace-pane]').forEach(item => item.classList.toggle('is-active', item === pane));
      });
    }
  }

  const tabMeta = {
    overview: ['Overview', 'Executive assignment summary'],
    checklist: ['Checklist', 'Preparation responsibilities'],
    travel: ['Travel & stay', 'Flights, lodging and transportation'],
    schedule: ['Schedule', 'Sessions and ministry moments'],
    contacts: ['Contacts', 'Host and assignment contacts'],
    documents: ['Documents', 'Files, schedules and resources'],
    event: ['Event day', 'On-the-ground quick reference'],
    responses: ['Responses', 'Ministry response intake'],
    followup: ['Follow-up', 'Assigned care and next steps'],
    closeout: ['Closeout', 'Outcomes and final reconciliation'],
    activity: ['Activity', 'Updates, decisions and history'],
  };

  const tabGroups = [
    ['assignment', 'Assignment', ['overview']],
    ['preparation', 'Preparation', ['checklist', 'travel', 'schedule', 'contacts', 'documents']],
    ['ministry', 'Ministry', ['event', 'responses', 'followup']],
    ['record', 'Record', ['closeout', 'activity']],
  ];

  function tabKey(button) {
    return button.dataset.workspaceTab || button.dataset.unifiedCompletionTab || '';
  }

  function transformTabs(workspace) {
    const nav = workspace.querySelector('.assignment-workspace__tabs');
    if (!nav) return;

    const directButtons = Array.from(nav.querySelectorAll(':scope > button'));
    if (nav.dataset.legacyGrouped === 'true' && directButtons.length === 0) return;

    const buttons = nav.dataset.legacyGrouped === 'true'
      ? [...nav.querySelectorAll('.legacy-assignment-tab'), ...directButtons]
      : directButtons;
    const map = new Map();
    buttons.forEach(button => {
      const key = tabKey(button);
      if (key) map.set(key, button);
    });

    nav.classList.add('legacy-assignment-tabs');
    nav.setAttribute('aria-label', 'Assignment sections');
    nav.replaceChildren();

    tabGroups.forEach(([id, label, keys]) => {
      const section = document.createElement('section');
      section.className = `legacy-assignment-tab-group legacy-assignment-tab-group--${id}`;
      const groupLabel = document.createElement('span');
      groupLabel.className = 'legacy-assignment-tab-group-label';
      groupLabel.textContent = label;
      const items = document.createElement('div');
      items.className = 'legacy-assignment-tab-group-items';

      keys.forEach(key => {
        const button = map.get(key);
        if (!button) return;
        const [title, description] = tabMeta[key] || [button.textContent.trim(), ''];
        button.classList.add('legacy-assignment-tab');
        button.innerHTML = `<strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small>`;
        items.appendChild(button);
      });

      if (items.children.length) {
        section.append(groupLabel, items);
        nav.appendChild(section);
      }
    });

    nav.dataset.legacyGrouped = 'true';
  }

  function safeText(value, fallback = 'Not provided') {
    const text = String(value || '').trim();
    return text || fallback;
  }

  function lanePercent(readiness, matcher) {
    const lane = (readiness?.lanes || []).find(item => matcher(String(item.label || '').toLowerCase()));
    return lane ? clamp(lane.percent) : 0;
  }

  function buildOverview(workspace) {
    const editor = workspace.querySelector('#assignment-coordination-form');
    const pane = editor?.querySelector('[data-workspace-pane="overview"]');
    const result = state.assignmentWorkspace;
    if (!pane || !result?.workspace) return;

    const record = result.workspace;
    const preparation = record.preparation || {};
    const coordination = preparation.coordination || {};
    const readiness = record.readiness || {};
    const tasks = (state.selected?.tasks || []).filter(task => !terminalTaskStatuses.has(normalizedStatus(task.status)));
    const nextTask = tasks[0];
    const coordinationStatus = normalizedStatus(preparation.coordinationStatus || 'not-requested');
    const hostPercent = lanePercent(readiness, label => label.includes('host'));
    const termsStatus = safeText(preparation.termsStatus, 'pending');
    const coordinationUrl = result.coordinationUrl || '';
    const termsUrl = result.termsUrl || '';
    const hostAction = coordinationUrl
      ? `<a class="legacy-card-action" href="${escapeHtml(coordinationUrl)}" target="_blank" rel="noopener"><span>Host coordination</span><b>→</b></a>`
      : `<button class="legacy-card-action legacy-card-action--disabled" type="button" disabled title="Accepted terms are required before host coordination"><span>Host coordination</span><b>→</b></button>`;

    const overviewSignature = JSON.stringify({
      nextTask: nextTask ? [nextTask.id, nextTask.title, nextTask.status, nextTask.owner, nextTask.dueAtUtc, nextTask.detail] : null,
      coordinationStatus: preparation.coordinationStatus,
      termsStatus: preparation.termsStatus,
      coordinationUrl,
      termsUrl,
      hostPercent,
      overallPercent: readiness.overallPercent,
      lanes: (readiness.lanes || []).map(lane => [lane.label, lane.percent, lane.detail, lane.status]),
      documents: coordination.documents?.length || 0,
      title: state.selected?.summary?.title,
      host: state.selected?.summary?.hostOrganization,
      location: state.selected?.summary?.location,
      dateRange: selectedDateRange(),
    });
    if (pane.dataset.legacyOverviewSignature === overviewSignature) return;
    pane.dataset.legacyOverviewSignature = overviewSignature;

    const lanes = (readiness.lanes || []).slice().sort((left, right) => {
      const leftLabel = String(left.label || '').toLowerCase();
      const rightLabel = String(right.label || '').toLowerCase();
      const li = laneOrder.findIndex(value => leftLabel.includes(value));
      const ri = laneOrder.findIndex(value => rightLabel.includes(value));
      return (li < 0 ? 99 : li) - (ri < 0 ? 99 : ri);
    });

    pane.classList.add('legacy-overview-pane');
    pane.innerHTML = `
      <section class="legacy-overview-page">
        <section class="legacy-overview-grid">
          <article class="legacy-overview-card legacy-overview-card--next">
            <header><div><p class="eyebrow">What's next</p><h4>Next assignment action</h4></div><span class="legacy-action-mark">→</span></header>
            ${nextTask ? `
              <strong class="legacy-next-action-title">${escapeHtml(nextTask.title)}</strong>
              <p>${escapeHtml(nextTask.detail || `${safeText(nextTask.category, 'Preparation')} · ${safeText(nextTask.owner, 'Engagement coordinator')}`)}</p>
              <div class="legacy-next-action-meta"><span>Owner: <strong>${escapeHtml(safeText(nextTask.owner, 'Engagement coordinator'))}</strong></span>${nextTask.dueAtUtc ? `<span>Due: <strong>${escapeHtml(formatDate(nextTask.dueAtUtc))}</strong></span>` : ''}</div>
              <button type="button" class="legacy-card-action" data-open-legacy-tab="checklist"><span>Open checklist</span><b>→</b></button>`
              : `<strong class="legacy-next-action-title">Assignment checklist complete</strong><p>Every current preparation item has been completed.</p>`}
          </article>

          <article class="legacy-overview-card legacy-host-card">
            <header><div><p class="eyebrow">Host coordination</p><h4>External details</h4></div><span class="legacy-coordinator-avatar">H</span></header>
            <strong class="legacy-next-action-title">${coordinationStatus === 'submitted' ? 'Ready for review' : coordinationStatus === 'accepted' || coordinationStatus === 'in-progress' ? 'Host is adding details' : coordinationStatus === 'not-requested' || !coordinationUrl ? 'Waiting for accepted terms' : 'Host coordination available'}</strong>
            <p>Collect lodging, ground travel, contacts, schedule, promotion, prayer focus and files in one host-facing form.</p>
            <div class="legacy-host-progress">
              <span><small>Host completion</small><strong>${hostPercent}%</strong></span>
              <span class="legacy-host-progress-track"><i style="width:${hostPercent}%"></i></span>
              <small>Coordination status: ${escapeHtml(formatStatus(preparation.coordinationStatus || 'not-requested'))}</small>
            </div>
            ${hostAction}
          </article>
        </section>

        <details class="legacy-invitation-source-panel">
          <summary>
            <span class="legacy-source-mark">↳</span>
            <span class="legacy-source-summary-copy"><small>Invitation source</small><strong>Approved terms retained · ${escapeHtml(safeText(preparation.referenceNumber, 'Engagement record'))}</strong></span>
            <span class="legacy-source-summary-note">Review carried-forward details</span>
            <span class="legacy-source-chevron">⌄</span>
          </summary>
          <div class="legacy-source-content">
            <article class="legacy-ministry-request-card"><small>Engagement</small><p>${escapeHtml(state.selected?.summary?.title || 'Approved ministry engagement')}</p></article>
            <dl class="legacy-source-facts">
              <div><dt>Host</dt><dd>${escapeHtml(state.selected?.summary?.hostOrganization || 'Pending')}</dd></div>
              <div><dt>Location</dt><dd>${escapeHtml(state.selected?.summary?.location || 'Pending')}</dd></div>
              <div><dt>Terms</dt><dd>${escapeHtml(formatStatus(termsStatus))}</dd></div>
              <div><dt>Host preparation</dt><dd>${escapeHtml(formatStatus(preparation.coordinationStatus || 'not-requested'))}</dd></div>
              <div><dt>Event dates</dt><dd>${escapeHtml(selectedDateRange())}</dd></div>
              <div><dt>Documents</dt><dd>${Number(coordination.documents?.length || 0)} received</dd></div>
            </dl>
            ${termsUrl ? `<a class="legacy-source-link" href="${escapeHtml(termsUrl)}" target="_blank" rel="noopener">View accepted terms <span>→</span></a>` : ''}
          </div>
        </details>

        <section class="legacy-readiness-panel">
          <header><div><p class="eyebrow">Readiness radar</p><h4>Preparation by stage</h4></div><div class="legacy-overall-readiness"><strong>${clamp(readiness.overallPercent)}%</strong><span>Overall</span></div></header>
          <div class="legacy-readiness-list">
            ${lanes.length ? lanes.map(lane => `
              <div class="legacy-readiness-row">
                <div><strong>${escapeHtml(lane.label)}</strong><span>${escapeHtml(lane.detail || formatStatus(lane.status || 'in-progress'))}</span></div>
                <div class="legacy-readiness-progress"><div><i style="width:${clamp(lane.percent)}%"></i></div><strong>${clamp(lane.percent)}%</strong></div>
              </div>`).join('') : '<p class="legacy-overview-empty">Readiness stages will appear as assignment preparation is recorded.</p>'}
          </div>
        </section>
      </section>`;

    pane.querySelector('[data-open-legacy-tab="checklist"]')?.addEventListener('click', () => {
      workspace.querySelector('[data-workspace-tab="checklist"]')?.click();
    });
  }

  function hideLegacyDuplicates() {
    Array.from(assignmentDetail.children).forEach(element => {
      if (element.matches?.('.detail-section#closeout')) element.hidden = true;
      if (element.matches?.('.readiness-card, .status-grid')) element.hidden = true;
    });
  }

  function transformWorkspace() {
    if (!assignmentGrid.classList.contains('is-workspace-open')) return;
    const workspace = assignmentDetail.querySelector('.assignment-workspace');
    if (!workspace || !state.selected) return;

    ensureBackLink();
    enhanceWorkspaceHeading();
    restoreChecklistPane(workspace);

    requestAnimationFrame(() => {
      const current = assignmentDetail.querySelector('.assignment-workspace');
      if (!current) return;
      current.classList.add('legacy-exact-workspace');
      current.querySelector('.assignment-workspace__header')?.setAttribute('hidden', '');
      current.querySelector('.assignment-progress')?.setAttribute('hidden', '');
      current.querySelector('.readiness-radar')?.setAttribute('hidden', '');
      current.querySelector('.assignment-workspace__links')?.setAttribute('hidden', '');
      transformTabs(current);
      buildOverview(current);
      hideLegacyDuplicates();
    });
  }

  function openAssignmentWorkspace() {
    assignmentGrid.classList.add('is-workspace-open');
    requestAnimationFrame(() => {
      transformWorkspace();
      assignmentGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function closeAssignmentWorkspace() {
    assignmentGrid.classList.remove('is-workspace-open');
    assignmentDetail.querySelector('.legacy-back-link')?.remove();
    assignmentDetail.querySelector('.legacy-heading-summary')?.remove();
    window.renderExactAssignmentQueue?.();
    requestAnimationFrame(() => assignmentGrid.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  document.addEventListener('click', event => {
    const fromInvitation = event.target.closest('[data-open-assignment]');
    if (fromInvitation) setTimeout(openAssignmentWorkspace, 0);

    const assignmentNav = event.target.closest('.sidebar nav a[href="#assignments"]');
    if (assignmentNav && assignmentGrid.classList.contains('is-workspace-open')) {
      closeAssignmentWorkspace();
    }
  }, true);

  window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#assignments') assignmentGrid.classList.remove('is-workspace-open');
  });

  let frame = 0;
  const observer = new MutationObserver(() => {
    if (!assignmentGrid.classList.contains('is-workspace-open')) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(transformWorkspace);
  });
  observer.observe(assignmentDetail, { childList: true, subtree: true });
  window.openLegacyEngagementWorkspace = openAssignmentWorkspace;
  if (typeof state !== 'undefined' && state.assignments?.length) window.renderExactAssignmentQueue?.();
})();
