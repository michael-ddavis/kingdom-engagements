(() => {
  const primaryTabs = [
    ['overview', 'Overview', 'Assignment summary'],
    ['checklist', 'Checklist', 'Preparation responsibilities'],
    ['travel', 'Travel', 'Flights, lodging and transportation'],
    ['contacts', 'Contacts', 'Host and assignment contacts'],
    ['documents', 'Documents', 'Files, schedules and resources'],
  ];

  const recordTabs = [
    ['event', 'Event day', 'Arrival and on-site ministry'],
    ['responses', 'Responses', 'Ministry response record'],
    ['followup', 'Follow-up', 'Care and next actions'],
    ['closeout', 'Closeout', 'Final outcomes and closeout'],
    ['activity', 'Ministry Log', 'Updates, decisions and history'],
  ];

  const recordKeys = new Set(recordTabs.map(([key]) => key));
  let activeKey = 'overview';
  let activeAssignmentId = '';
  let frame = 0;

  function roots() {
    const detail = document.querySelector('#assignment-detail');
    const grid = document.querySelector('#assignments');
    const workspace = detail?.querySelector('.assignment-workspace') || null;
    const editor = workspace?.querySelector('#assignment-coordination-form') || null;
    const completion = detail?.querySelector('.completion-workspace') || null;
    return { detail, grid, workspace, editor, completion };
  }

  function assignmentIsOpen(grid) {
    return !!grid?.classList.contains('is-workspace-open');
  }

  function selectedAssignmentId() {
    return typeof state !== 'undefined' ? String(state.selectedId || '') : '';
  }

  function ensureChecklistPane({ detail, editor }) {
    if (!detail || !editor) return null;

    let pane = editor.querySelector('[data-workspace-pane="checklist"]');
    if (pane) return pane;

    const legacy = Array.from(detail.children).find(element =>
      element.matches?.('.detail-section') &&
      element.querySelector('h3')?.textContent.trim() === 'Readiness tasks');

    if (!legacy) return null;

    legacy.classList.add('assignment-pane', 'restored-checklist-pane');
    legacy.dataset.workspacePane = 'checklist';
    legacy.hidden = true;
    editor.insertBefore(legacy, editor.querySelector('.assignment-editor__actions') || null);
    return legacy;
  }

  function ensureNavigation(current) {
    const { detail, workspace, editor } = current;
    if (!detail || !workspace || !editor) return null;

    let nav = detail.querySelector('.legacy-six-tabs');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'legacy-six-tabs';
      nav.setAttribute('aria-label', 'Assignment sections');

      const anchor = detail.querySelector('.foundation-heading-summary') || detail.querySelector('.detail-header');
      if (anchor) anchor.insertAdjacentElement('afterend', nav);
      else detail.prepend(nav);
    }

    if (nav.dataset.built !== 'true') {
      nav.dataset.built = 'true';
      nav.innerHTML = `
        ${primaryTabs.map(([key, label, description]) => `
          <button type="button" class="legacy-six-tab" data-six-tab="${key}">
            <strong>${label}</strong>
            <small>${description}</small>
          </button>`).join('')}
        <details class="legacy-record-menu">
          <summary class="legacy-six-tab legacy-record-trigger">
            <span>
              <strong>Record</strong>
              <small>Ministry record and closeout</small>
            </span>
            <i aria-hidden="true"></i>
          </summary>
          <div class="legacy-record-popover">
            ${recordTabs.map(([key, label, description]) => `
              <button type="button" data-record-tab="${key}">
                <strong>${label}</strong>
                <small>${description}</small>
              </button>`).join('')}
          </div>
        </details>`;

      nav.querySelectorAll('[data-six-tab]').forEach(button => {
        button.addEventListener('click', () => activate(button.dataset.sixTab));
      });

      nav.querySelectorAll('[data-record-tab]').forEach(button => {
        button.addEventListener('click', () => activate(button.dataset.recordTab));
      });
    }

    return nav;
  }

  function setNavigationState(nav, key) {
    if (!nav) return;

    nav.querySelectorAll('[data-six-tab]').forEach(button => {
      const isActive = button.dataset.sixTab === key;
      button.classList.toggle('is-active', isActive);
      if (isActive) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });

    const record = nav.querySelector('.legacy-record-menu');
    const recordActive = recordKeys.has(key);
    record?.classList.toggle('is-active', recordActive);

    nav.querySelectorAll('[data-record-tab]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.recordTab === key);
    });
  }

  function showPreparation(current, key) {
    const { editor, completion } = current;
    if (!editor) return false;

    ensureChecklistPane(current);

    const pane = editor.querySelector(`[data-workspace-pane="${key}"]`);
    if (!pane) return false;

    editor.hidden = false;
    if (completion) completion.hidden = true;

    editor.querySelectorAll('[data-workspace-pane]').forEach(candidate => {
      const isActive = candidate === pane;
      candidate.classList.toggle('is-active', isActive);
      candidate.hidden = !isActive;
    });

    editor.querySelectorAll('[data-workspace-tab]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.workspaceTab === key);
    });

    return true;
  }

  function showCompletion(current, key) {
    const { editor, completion } = current;
    if (!completion) return false;

    if (editor) editor.hidden = true;
    completion.hidden = false;
    completion.classList.add('legacy-record-workspace');

    const pane = completion.querySelector(`[data-completion-pane="${key}"]`);
    if (!pane) return false;

    completion.querySelectorAll('[data-completion-pane]').forEach(candidate => {
      const isActive = candidate === pane;
      candidate.classList.toggle('is-active', isActive);
      candidate.hidden = !isActive;
    });

    completion.querySelectorAll('[data-completion-tab]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.completionTab === key);
    });

    return true;
  }

  function activate(key) {
    const current = roots();
    if (!assignmentIsOpen(current.grid)) return;

    let shown = false;
    if (key === 'activity') shown = showPreparation(current, 'activity');
    else if (recordKeys.has(key)) shown = showCompletion(current, key);
    else shown = showPreparation(current, key);

    if (!shown) return;

    activeKey = key;
    const nav = ensureNavigation(current);
    setNavigationState(nav, key);

    const record = nav?.querySelector('.legacy-record-menu');
    if (record && recordKeys.has(key)) record.open = false;
  }

  function hideLegacyWorkspaceChrome(current) {
    const { detail, workspace } = current;
    if (!detail || !workspace) return;

    workspace.querySelector('.assignment-workspace__header')?.setAttribute('hidden', '');
    workspace.querySelector('.assignment-progress')?.setAttribute('hidden', '');
    workspace.querySelector('.readiness-radar')?.setAttribute('hidden', '');
    workspace.querySelector('.assignment-workspace__links')?.setAttribute('hidden', '');
    workspace.querySelector('.assignment-workspace__tabs')?.setAttribute('hidden', '');
    detail.querySelector('.foundation-tabs')?.setAttribute('hidden', '');

    const readiness = detail.querySelector('.readiness-card');
    const status = detail.querySelector('.status-grid');
    const details = detail.querySelector('.details-list')?.closest('.detail-section');
    const documents = detail.querySelector('.detail-section#documents');
    const closeout = detail.querySelector('.detail-section#closeout');
    if (readiness) readiness.hidden = true;
    if (status) status.hidden = true;
    if (details) details.hidden = true;
    if (documents) documents.hidden = true;
    if (closeout) closeout.hidden = true;
  }

  function reconcile() {
    const current = roots();
    const open = assignmentIsOpen(current.grid);
    document.body.classList.toggle('engagement-assignment-open', open);
    if (!open) return;
    if (!current.workspace || !current.editor) return;

    ensureChecklistPane(current);
    hideLegacyWorkspaceChrome(current);
    const nav = ensureNavigation(current);

    const id = selectedAssignmentId();
    if (id && id !== activeAssignmentId) {
      activeAssignmentId = id;
      activeKey = 'overview';
    }

    if (activeKey === 'activity') showPreparation(current, 'activity');
    else if (recordKeys.has(activeKey)) {
      if (!showCompletion(current, activeKey)) showPreparation(current, 'overview');
    } else if (!showPreparation(current, activeKey)) {
      activeKey = 'overview';
      showPreparation(current, 'overview');
    }

    setNavigationState(nav, activeKey);
  }

  document.addEventListener('click', event => {
    const record = document.querySelector('#assignment-detail .legacy-record-menu');
    if (record?.open && !event.target.closest('.legacy-record-menu')) record.open = false;

    if (event.target.closest('.foundation-back')) {
      document.body.classList.remove('engagement-assignment-open');
      activeKey = 'overview';
      activeAssignmentId = '';
    }
  }, true);

  window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#assignments') {
      document.body.classList.remove('engagement-assignment-open');
      activeKey = 'overview';
      activeAssignmentId = '';
    }
  });

  document.addEventListener('DOMContentLoaded', reconcile);

  const observer = new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(reconcile);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
