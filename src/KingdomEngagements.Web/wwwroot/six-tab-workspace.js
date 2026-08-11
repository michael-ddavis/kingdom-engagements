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
  let frame = 0;

  function detailRoot() {
    return document.querySelector('#assignment-detail');
  }

  function workspaceRoot() {
    return detailRoot()?.querySelector('.assignment-workspace') || null;
  }

  function nativeButtonFor(key) {
    const workspace = workspaceRoot();
    if (!workspace) return null;
    return workspace.querySelector(`[data-workspace-tab="${key}"]`) ||
      workspace.querySelector(`[data-unified-completion-tab="${key}"]`);
  }

  function setActive(key) {
    const nav = workspaceRoot()?.querySelector('.legacy-six-tabs');
    if (!nav) return;

    nav.querySelectorAll('[data-six-tab]').forEach(button => {
      const active = button.dataset.sixTab === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });

    const record = nav.querySelector('.legacy-record-menu');
    const recordActive = recordKeys.has(key);
    record?.classList.toggle('is-active', recordActive);
    const summary = record?.querySelector('summary');
    if (summary) summary.setAttribute('aria-current', recordActive ? 'page' : 'false');

    nav.querySelectorAll('[data-record-tab]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.recordTab === key);
    });
  }

  function activate(key, closeRecord = true) {
    const button = nativeButtonFor(key);
    if (!button) return false;
    button.click();
    setActive(key);

    if (closeRecord) {
      const record = workspaceRoot()?.querySelector('.legacy-record-menu');
      if (record) record.open = false;
    }
    return true;
  }

  function currentNativeKey() {
    const workspace = workspaceRoot();
    if (!workspace) return 'overview';

    const activePreparation = workspace.querySelector('.assignment-workspace__tabs [data-workspace-tab].is-active');
    if (activePreparation?.dataset.workspaceTab) return activePreparation.dataset.workspaceTab;

    const activeCompletion = workspace.querySelector('.assignment-workspace__tabs [data-unified-completion-tab].is-active');
    if (activeCompletion?.dataset.unifiedCompletionTab) return activeCompletion.dataset.unifiedCompletionTab;

    return 'overview';
  }

  function buildNavigation() {
    const workspace = workspaceRoot();
    const editor = workspace?.querySelector('#assignment-coordination-form');
    if (!workspace || !editor) return;

    const availablePrimary = primaryTabs.filter(([key]) => nativeButtonFor(key));
    const availableRecord = recordTabs.filter(([key]) => nativeButtonFor(key));
    if (!availablePrimary.length) return;

    workspace.querySelector('.foundation-tabs')?.setAttribute('hidden', '');

    let nav = workspace.querySelector('.legacy-six-tabs');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'legacy-six-tabs';
      nav.setAttribute('aria-label', 'Assignment sections');
      editor.insertAdjacentElement('beforebegin', nav);
    }

    const signature = JSON.stringify([
      availablePrimary.map(([key]) => key),
      availableRecord.map(([key]) => key),
    ]);

    if (nav.dataset.signature !== signature) {
      nav.dataset.signature = signature;
      nav.innerHTML = `
        ${availablePrimary.map(([key, label, description]) => `
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
            ${availableRecord.map(([key, label, description]) => `
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

    const selectedId = typeof state !== 'undefined' ? String(state.selectedId || '') : '';
    if (selectedId && nav.dataset.assignmentId !== selectedId) {
      nav.dataset.assignmentId = selectedId;
      requestAnimationFrame(() => activate('overview'));
      return;
    }

    setActive(currentNativeKey());
  }

  function reconcile() {
    const grid = document.querySelector('#assignments');
    if (!grid?.classList.contains('is-workspace-open')) return;
    buildNavigation();
  }

  document.addEventListener('click', event => {
    const native = event.target.closest('[data-workspace-tab], [data-unified-completion-tab]');
    if (native) {
      const key = native.dataset.workspaceTab || native.dataset.unifiedCompletionTab;
      if (key) requestAnimationFrame(() => setActive(key));
    }

    const record = workspaceRoot()?.querySelector('.legacy-record-menu');
    if (record?.open && !event.target.closest('.legacy-record-menu')) record.open = false;
  }, true);

  document.addEventListener('DOMContentLoaded', reconcile);

  const observer = new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(reconcile);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
