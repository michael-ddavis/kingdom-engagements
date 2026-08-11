(() => {
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

  function reconcile() {
    applyTopLevelMode(modeFromHash());
  }

  window.addEventListener('hashchange', reconcile);
  document.addEventListener('DOMContentLoaded', reconcile);
})();
