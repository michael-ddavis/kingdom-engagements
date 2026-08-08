const baseSelectAssignment = selectAssignment;

selectAssignment = async function(id) {
  await baseSelectAssignment(id);
  await renderPreparationPanel();
};

async function renderPreparationPanel() {
  if (!state.selectedId || !detail.querySelector('.detail-header')) return;
  try {
    const result = await api(`/api/engagements/assignments/${state.selectedId}/preparation`);
    const preparation = result.preparation;
    const coordination = preparation.coordination;
    const termsAccepted = preparation.termsStatus === 'accepted';
    const coordinationSubmitted = preparation.coordinationStatus === 'submitted';
    const docs = coordination.documents || [];
    const panel = document.createElement('section');
    panel.className = 'preparation-panel';
    panel.innerHTML = `
      <header class="preparation-panel__header">
        <div><p class="eyebrow">Approved invitation · ${escapeHtml(preparation.referenceNumber)}</p><h3>Terms and host preparation</h3><p>The approved invitation now moves through accepted terms and a secure host coordination portal before readiness is complete.</p></div>
        <span class="preparation-state">${escapeHtml(formatStatus(preparation.coordinationStatus))}</span>
      </header>
      <div class="preparation-steps">
        <article class="preparation-step is-complete"><span>01 · Invitation</span><strong>Approved</strong><p>The assignment was created from the host intake without duplicate entry.</p></article>
        <article class="preparation-step ${termsAccepted ? 'is-complete' : 'is-active'}"><span>02 · Terms</span><strong>${termsAccepted ? 'Accepted' : 'Awaiting host acceptance'}</strong><p>${termsAccepted ? `Accepted${preparation.termsAcceptedByName ? ` by ${escapeHtml(preparation.termsAcceptedByName)}` : ''}.` : 'The host must accept the approved travel, lodging and honorarium commitments before coordination opens.'}</p></article>
        <article class="preparation-step ${coordinationSubmitted ? 'is-complete' : termsAccepted ? 'is-active' : ''}"><span>03 · Host coordination</span><strong>${coordinationSubmitted ? 'Submitted' : termsAccepted ? 'In progress' : 'Locked'}</strong><p>${coordinationSubmitted ? 'Travel, lodging, schedule, contacts, prayer focus and host files are now connected to this assignment.' : termsAccepted ? 'The host portal is open and progress can be saved before final submission.' : 'This unlocks automatically after terms are accepted.'}</p></article>
      </div>
      <div class="preparation-actions">
        <a class="${termsAccepted ? '' : 'primary'}" href="${escapeHtml(result.termsUrl)}" target="_blank" rel="noopener">${termsAccepted ? 'View accepted terms' : 'Open terms link'}</a>
        <button type="button" data-copy-link="${escapeHtml(result.termsUrl)}">Copy terms link</button>
        ${result.coordinationUrl ? `<a class="${coordinationSubmitted ? '' : 'primary'}" href="${escapeHtml(result.coordinationUrl)}" target="_blank" rel="noopener">Open host coordination</a><button type="button" data-copy-link="${escapeHtml(result.coordinationUrl)}">Copy coordination link</button>` : ''}
      </div>
      <section class="coordination-snapshot">
        <header><div><p class="eyebrow">Host coordination snapshot</p><h4>${coordinationSubmitted ? 'Submitted host details' : termsAccepted ? 'Live preparation details' : 'Waiting for accepted terms'}</h4></div>${preparation.coordinationSubmittedAtUtc ? `<small>Submitted ${escapeHtml(formatDateTime(preparation.coordinationSubmittedAtUtc))}</small>` : ''}</header>
        <div class="coordination-snapshot-grid">
          <article><span>Travel</span><strong>${escapeHtml(coordination.outboundAirline ? `${coordination.outboundAirline} ${coordination.outboundFlightNumber || ''}`.trim() : 'Pending')}</strong></article>
          <article><span>Lodging</span><strong>${escapeHtml(coordination.hotelName || 'Pending')}</strong></article>
          <article><span>Event schedule</span><strong>${coordination.schedule?.length || 0} session${coordination.schedule?.length === 1 ? '' : 's'}</strong></article>
          <article><span>Local contacts</span><strong>${coordination.contacts?.length || 0} contact${coordination.contacts?.length === 1 ? '' : 's'}</strong></article>
          <article><span>Transportation</span><strong>${escapeHtml(coordination.pickupContactName || (coordination.transportationPlan ? 'Plan provided' : 'Pending'))}</strong></article>
          <article><span>Prayer focus</span><strong>${escapeHtml(coordination.prayerFocus ? 'Provided' : 'Pending')}</strong></article>
          <article><span>Promotional notes</span><strong>${escapeHtml(coordination.promotionRequirements ? 'Provided' : 'Pending')}</strong></article>
          <article><span>Host documents</span><strong>${docs.length} received</strong></article>
        </div>
        ${docs.length ? `<div class="preparation-documents">${docs.map(doc => `<article class="preparation-document"><a href="/api/engagements/assignments/${state.selectedId}/preparation/documents/${doc.id}" target="_blank" rel="noopener">${escapeHtml(doc.fileName)}</a><small>${Math.max(1, Math.round(doc.length / 1024))} KB</small></article>`).join('')}</div>` : ''}
      </section>`;
    const header = detail.querySelector('.detail-header');
    header.insertAdjacentElement('afterend', panel);
    panel.querySelectorAll('[data-copy-link]').forEach(button => button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copyLink);
        showMessage('Secure host link copied.');
      } catch {
        showMessage(`Secure host link: ${button.dataset.copyLink}`);
      }
    }));
  } catch (error) {
    if (!/not created from an approved speaking invitation/i.test(error.message)) showMessage(error.message, true);
  }
}
