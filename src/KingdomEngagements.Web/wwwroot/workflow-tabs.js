(() => {
  const completionTabs = [
    ['event', 'Event day'],
    ['responses', 'Responses'],
    ['followup', 'Follow-up'],
    ['closeout', 'Closeout'],
  ];

  function ensureTopLevelTabs() {
    const requests = document.querySelector('#requests');
    const assignments = document.querySelector('#assignments');
    if (!requests || !assignments) return;

    let nav = document.querySelector('.engagements-workspace-tabs');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'engagements-workspace-tabs';
      nav.setAttribute('aria-label', 'Engagements workspace');
      nav.innerHTML = `
        <button type="button" data-engagements-mode="assignments">Assignments</button>
        <button type="button" data-engagements-mode="requests">Invitations</button>`;
      requests.insertAdjacentElement('beforebegin', nav);
      nav.querySelectorAll('[data-engagements-mode]').forEach(button => {
        button.addEventListener('click', () => {
          const mode = button.dataset.engagementsMode;
          window.location.hash = mode === 'requests' ? '#requests' : '#assignments';
          applyTopLevelMode(mode);
        });
      });
    }

    applyTopLevelMode(modeFromHash());
  }

  function modeFromHash() {
    const hash = (window.location.hash || '').toLowerCase();
    return hash === '#requests' ? 'requests' : 'assignments';
  }

  function applyTopLevelMode(mode) {
    const requests = document.querySelector('#requests');
    const assignments = document.querySelector('#assignments');
    const nav = document.querySelector('.engagements-workspace-tabs');
    if (!requests || !assignments || !nav) return;

    requests.hidden = mode !== 'requests';
    assignments.hidden = mode !== 'assignments';
    nav.querySelectorAll('[data-engagements-mode]').forEach(button => {
      const active = button.dataset.engagementsMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function unifyAssignmentWorkspace() {
    const workspace = document.querySelector('#assignment-detail .assignment-workspace');
    const completion = document.querySelector('#assignment-detail .completion-workspace');
    if (!workspace || !completion || workspace.dataset.unifiedTabs === 'true') return;

    const editor = workspace.querySelector('#assignment-coordination-form');
    const nav = workspace.querySelector('.assignment-workspace__tabs');
    if (!editor || !nav) return;

    workspace.dataset.unifiedTabs = 'true';
    workspace.classList.add('is-unified');

    // Keep the tab strip outside either form so completion forms never become nested.
    editor.insertAdjacentElement('beforebegin', nav);
    editor.insertAdjacentElement('afterend', completion);
    completion.classList.add('completion-workspace--unified');

    const activityButton = nav.querySelector('[data-workspace-tab="activity"]');
    completionTabs.forEach(([key, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.unifiedCompletionTab = key;
      button.textContent = label;
      if (activityButton) nav.insertBefore(button, activityButton);
      else nav.appendChild(button);
      button.addEventListener('click', () => showCompletionPane(workspace, key));
    });

    nav.querySelectorAll('[data-workspace-tab]').forEach(button => {
      button.addEventListener('click', () => showPreparationPane(workspace, button));
    });

    completion.querySelectorAll('[data-completion-tab]').forEach(button => {
      button.setAttribute('tabindex', '-1');
      button.setAttribute('aria-hidden', 'true');
    });

    showPreparationPane(workspace, nav.querySelector('[data-workspace-tab].is-active') || nav.querySelector('[data-workspace-tab="overview"]'));
  }

  function showPreparationPane(workspace, button) {
    const editor = workspace.querySelector('#assignment-coordination-form');
    const completion = workspace.querySelector('.completion-workspace');
    if (!editor || !completion) return;

    editor.hidden = false;
    completion.hidden = true;
    setUnifiedActive(workspace, button);
  }

  function showCompletionPane(workspace, key) {
    const editor = workspace.querySelector('#assignment-coordination-form');
    const completion = workspace.querySelector('.completion-workspace');
    if (!editor || !completion) return;

    editor.hidden = true;
    completion.hidden = false;
    const original = completion.querySelector(`[data-completion-tab="${key}"]`);
    original?.click();
    setUnifiedActive(workspace, workspace.querySelector(`[data-unified-completion-tab="${key}"]`));
  }

  function setUnifiedActive(workspace, activeButton) {
    workspace.querySelectorAll('.assignment-workspace__tabs > button').forEach(button => {
      const active = button === activeButton;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function reconcile() {
    ensureTopLevelTabs();
    unifyAssignmentWorkspace();
  }

  window.addEventListener('hashchange', () => applyTopLevelMode(modeFromHash()));
  document.addEventListener('DOMContentLoaded', reconcile);

  const observer = new MutationObserver(() => requestAnimationFrame(reconcile));
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
