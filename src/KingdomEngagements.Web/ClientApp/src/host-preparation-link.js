(() => {
  const hostPreparationLabel = 'Open host preparation';

  document.addEventListener('click', event => {
    const origin = event.target instanceof Element ? event.target : null;
    const button = origin?.closest('button.legacy-card-action');
    if (!button || !button.textContent?.includes(hostPreparationLabel)) return;

    const assignmentMatch = window.location.pathname.match(/\/assignments\/([^/?#]+)/i);
    if (!assignmentMatch) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const assignmentId = decodeURIComponent(assignmentMatch[1]);
    const hostWindow = window.open('', '_blank');
    if (hostWindow) {
      hostWindow.opener = null;
      hostWindow.document.title = 'Opening host preparation…';
      hostWindow.document.body.innerHTML = '<p style="font-family:system-ui,sans-serif;padding:24px;color:#445166">Opening host preparation…</p>';
    }

    fetch(`/api/engagements/assignments/${encodeURIComponent(assignmentId)}/workspace`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then(response => {
        if (!response.ok) throw new Error(`Workspace request failed (${response.status}).`);
        return response.json();
      })
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
})();
