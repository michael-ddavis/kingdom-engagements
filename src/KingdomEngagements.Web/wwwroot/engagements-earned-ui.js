(() => {
  const DEFAULT_VOLUME_THRESHOLD = 5;

  function productState() {
    try {
      return typeof state !== 'undefined' ? state : null;
    } catch {
      return null;
    }
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function ensureSignal(panel) {
    let signal = panel.querySelector('.earned-ui-inline-signal');
    if (signal) return signal;
    signal = document.createElement('div');
    signal.className = 'earned-ui-inline-signal';
    signal.setAttribute('role', 'status');
    const header = panel.querySelector(':scope > header');
    if (header) header.insertAdjacentElement('afterend', signal);
    else panel.prepend(signal);
    return signal;
  }

  function syncRequests(current) {
    const panel = document.querySelector('#requests .request-panel');
    if (!panel || !Array.isArray(current?.requests)) return;

    const count = current.requests.length;
    const highVolume = count >= DEFAULT_VOLUME_THRESHOLD;
    panel.dataset.earnedUiVolume = highVolume ? 'summary' : 'focused';

    const summary = panel.querySelector('.legacy18-request-summary');
    if (summary) summary.hidden = !highVolume;

    const awaiting = current.requests.filter(item => !['approved', 'declined'].includes(normalize(item.status))).length;
    const existingSignal = panel.querySelector('.earned-ui-inline-signal');

    if (highVolume || awaiting === 0 || document.body.classList.contains('legacy18-request-open')) {
      existingSignal?.remove();
      return;
    }

    const signal = ensureSignal(panel);
    signal.innerHTML = `<span class="earned-ui-inline-signal__mark" aria-hidden="true">!</span><div><strong>${awaiting} ${awaiting === 1 ? 'invitation needs' : 'invitations need'} review</strong><small>Open ${awaiting === 1 ? 'it' : 'them'} to continue the decision workflow.</small></div>`;
  }

  function syncAssignments(current) {
    const panel = document.querySelector('#assignments .assignment-panel');
    if (!panel || !Array.isArray(current?.assignments)) return;

    const count = current.assignments.length;
    const highVolume = count >= DEFAULT_VOLUME_THRESHOLD;
    panel.dataset.earnedUiVolume = highVolume ? 'summary' : 'focused';

    const summary = panel.querySelector('.exact18-summary-grid');
    const toolbar = panel.querySelector('.exact18-toolbar');

    if (!highVolume && toolbar) {
      const allFilter = toolbar.querySelector('[data-legacy-filter="all"]');
      if (allFilter && !allFilter.classList.contains('selected')) {
        allFilter.click();
        return;
      }
    }

    if (summary) summary.hidden = !highVolume;
    if (toolbar) toolbar.hidden = !highVolume;
  }

  function sync() {
    const current = productState();
    if (!current) return;
    syncRequests(current);
    syncAssignments(current);
  }

  document.addEventListener('DOMContentLoaded', sync);
  window.addEventListener('hashchange', () => requestAnimationFrame(sync));

  const observer = new MutationObserver(() => sync());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
