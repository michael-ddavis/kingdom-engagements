(() => {
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

  function hostCoordinationCard() {
    return [...document.querySelectorAll('.legacy-overview-card')].find(card =>
      card.querySelector('.eng-eyebrow')?.textContent?.trim().toLowerCase() === 'host coordination',
    );
  }

  function statusLabel(value) {
    if (value === 'locked') return 'Waiting on terms';
    return String(value || 'not-started')
      .replaceAll('-', ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function syncHostCoordinationCard() {
    const card = hostCoordinationCard();
    if (!card || card.dataset.hostStateBound === 'true') return;
    card.dataset.hostStateBound = 'true';

    getWorkspaceEnvelope()
      .then(envelope => {
        const preparation = envelope?.workspace?.preparation;
        if (!preparation) return;

        const heading = card.querySelector('header h4');
        if (heading) heading.textContent = statusLabel(preparation.coordinationStatus);

        const action = card.querySelector('.legacy-card-action');
        if (!(action instanceof HTMLButtonElement)) return;

        if (envelope.coordinationUrl) {
          action.innerHTML = 'Open host preparation <b aria-hidden="true">→</b>';
          action.dataset.hostTarget = envelope.coordinationUrl;
          action.dataset.hostMode = 'coordination';
        } else if (envelope.termsUrl) {
          action.innerHTML = 'Review engagement terms <b aria-hidden="true">→</b>';
          action.dataset.hostTarget = envelope.termsUrl;
          action.dataset.hostMode = 'terms';
        } else {
          action.textContent = 'Host preparation unavailable';
          action.disabled = true;
        }
      })
      .catch(error => {
        card.dataset.hostStateBound = 'false';
        console.error('Unable to load host coordination state.', error);
      });
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
    if (!button || !hostCoordinationCard()?.contains(button)) return;

    const target = button.dataset.hostTarget;
    if (!target) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const hostWindow = window.open(target, '_blank', 'noopener,noreferrer');
    if (!hostWindow) window.location.assign(target);
  }, true);

  function sync() {
    addHostInvitationAction();
    syncHostCoordinationCard();
  }

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', () => {
    workspaceRequest = null;
    sync();
  });
  sync();
})();
