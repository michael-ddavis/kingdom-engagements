(() => {
  document.addEventListener('click', event => {
    const pane = event.target.closest?.('[data-legacy-pane]');
    if (pane && pane.dataset.legacyPane !== 'care') {
      document.body.classList.remove('care-network-pane-open');
    }
    if (event.target.closest?.('[data-legacy-back]')) {
      document.body.classList.remove('care-network-pane-open');
    }
  }, true);

  window.addEventListener('hashchange', () => {
    if ((window.location.hash || '').toLowerCase() !== '#assignments') {
      document.body.classList.remove('care-network-pane-open');
    }
  });
})();
