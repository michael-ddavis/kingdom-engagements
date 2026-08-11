(() => {
  const completionTabs = [
    ['event', 'Event day'],
    ['responses', 'Responses'],
    ['followup', 'Follow-up'],
    ['closeout', 'Closeout'],
  ];

  function modeFromHash() {
    const hash = (window.location.hash || '').toLowerCase();
    if (hash === '#requests') return 'requests';
    if (hash === '#assignments') return 'assignments';
    return 'overview';
  }

  function applyTopLevelMode(mode) {
    const hero = document.querySelector('#overview');
    const metrics = document.querySelector('#metrics');
    const requests = document.querySelector('#requests');
    const assignments = document.querySelector('#assignments');
    if (!hero || !metrics || !requests || !assignments) return;

    requests.hidden = mode !== 'requests';
    assignments.hidden = mode !== 'assignments';
    metrics.hidden = mode !== 'overview';

    const eyebrow = hero.querySelector('.eyebrow');
    const title = hero.querySelector('h1');
    const nextTitle = mode === 'requests' ? 'Invitations' : mode === 'assignments' ? 'Assignments' : 'Engagements';
    if (eyebrow && eyebrow.textContent !== 'Kingdom Engagements') eyebrow.textContent = 'Kingdom Engagements';
    if (title && title.textContent !== nextTitle) title.textContent = nextTitle;

    document.querySelectorAll('.sidebar nav a').forEach(link => {
      const href = link.getAttribute('href');
      const active = mode === 'overview' ? href === '#overview' : href === `#${mode}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
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
    workspace.querySelectorAll('.assignment-workspace__tabs button').forEach(button => {
      const active = button === activeButton;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function reconcile() {
    applyTopLevelMode(modeFromHash());
    unifyAssignmentWorkspace();
  }

  window.addEventListener('hashchange', () => applyTopLevelMode(modeFromHash()));
  document.addEventListener('DOMContentLoaded', reconcile);

  let frame = 0;
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(reconcile);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
