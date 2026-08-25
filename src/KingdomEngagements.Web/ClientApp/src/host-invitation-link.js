(() => {
  const bookingRequestUrl = '/invite/apostle-cynthia';

  const ensureBookingRequestAction = () => {
    if (!/^\/app\/assignments\/[^/?#]+/i.test(window.location.pathname)) return;

    const title = document.querySelector('.legacy-workspace-title');
    if (!title || title.querySelector('.legacy-booking-request-action')) return;

    let actions = title.querySelector('.legacy-workspace-title__actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'legacy-workspace-title__actions';
      title.append(actions);
    }

    const link = document.createElement('a');
    link.className = 'legacy-booking-request-action';
    link.href = bookingRequestUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = 'Open the public Cynthia Thompson booking request';
    link.innerHTML = 'Open Cynthia Thompson booking request <span aria-hidden="true">↗</span>';
    actions.append(link);
  };

  const observer = new MutationObserver(ensureBookingRequestAction);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', ensureBookingRequestAction);
  document.addEventListener('DOMContentLoaded', ensureBookingRequestAction);
  ensureBookingRequestAction();
})();
