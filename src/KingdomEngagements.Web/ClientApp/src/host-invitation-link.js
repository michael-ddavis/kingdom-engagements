(() => {
  const invitationUrl = '/invite/apostle-cynthia';

  const ensureHostInvitationAction = () => {
    if (!/^\/app\/assignments\/[^/?#]+/i.test(window.location.pathname)) return;

    const title = document.querySelector('.legacy-workspace-title');
    if (!title || title.querySelector('.legacy-host-invitation-action')) return;

    let actions = title.querySelector('.legacy-workspace-title__actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'legacy-workspace-title__actions';
      title.append(actions);
    }

    const link = document.createElement('a');
    link.className = 'legacy-host-invitation-action';
    link.href = invitationUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = 'Open the original public host invitation';
    link.innerHTML = 'View host invitation <span aria-hidden="true">↗</span>';
    actions.append(link);
  };

  const observer = new MutationObserver(ensureHostInvitationAction);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', ensureHostInvitationAction);
  document.addEventListener('DOMContentLoaded', ensureHostInvitationAction);
  ensureHostInvitationAction();
})();
