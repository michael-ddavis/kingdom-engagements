(() => {
  const hostPreparationLabel = 'Open host preparation';
  let workspaceRequest = null;

  function assignmentIdFromPath() {
    const match = window.location.pathname.match(/\/assignments\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function getWorkspaceEnvelope() {
    const assignmentId = assignmentIdFromPath();
    if (!assignmentId) return Promise.reject(new Error('Assignment identifier is unavailable.'));

    if (!workspaceRequest) {
      workspaceRequest = fetch(`/api/engagements/assignments/${encodeURIComponent(assignmentId)}/workspace`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      }).then(response => {
        if (!response.ok) throw new Error(`Workspace request failed (${response.status}).`);
        return response.json();
      });
    }

    return workspaceRequest;
  }

  function addHostInvitationAction() {
    const title = document.querySelector('.legacy-workspace-title');
    if (!title || title.querySelector('.legacy-host-invitation-action')) return;

    const actions = document.createElement('div');
    actions.className = 'legacy-workspace-title__actions';

    const link = document.createElement('a');
    link.className = 'legacy-host-invitation-action';
    link.href = '#';
    link.innerHTML = 'View host invitation <span aria-hidden="true">→</span>';
    link.setAttribute('aria-label', 'View host invitation');

    link.addEventListener('click', event => {
      event.preventDefault();
      getWorkspaceEnvelope()
        .then(envelope => {
          const requestId = envelope?.workspace?.preparation?.requestId;
          if (!requestId) throw new Error('Host invitation is not available for this assignment.');
          window.location.assign(`/invitations?request=${encodeURIComponent(requestId)}`);
        })
        .catch(error => console.error('Unable to open host invitation.', error));
    });

    actions.appendChild(link);
    title.appendChild(actions);
  }

  document.addEventListener('click', event => {
    const origin = event.target instanceof Element ? event.target : null;
    const button = origin?.closest('button.legacy-card-action');
    if (!button || !button.textContent?.includes(hostPreparationLabel)) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const hostWindow = window.open('', '_blank');
    if (hostWindow) {
      hostWindow.opener = null;
      hostWindow.document.title = 'Opening host preparation…';
      hostWindow.document.body.innerHTML = '<p style="font-family:system-ui,sans-serif;padding:24px;color:#445166">Opening host preparation…</p>';
    }

    getWorkspaceEnvelope()
      .then(envelope => {
        if (!envelope?.coordinationUrl) throw new Error('Host preparation link is not available yet.');
        if (hostWindow && !hostWindow.closed) {
          hostWindow.location.replace(envelope.coordinationUrl);
        } else {
          window.location.assign(envelope.coordinationUrl);
        }
      })
      .catch(error => {
        if (hostWindow && !hostWindow.closed) hostWindow.close();
        console.error('Unable to open host preparation.', error);
      });
  }, true);

  const observer = new MutationObserver(addHostInvitationAction);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addHostInvitationAction();
})();
