(() => {
  const STORAGE_KEY = 'kingdomos-demo-care-network-v1';
  let selectedResponseId = null;
  let selectedPartnerId = 302;
  let queueFilter = 'all';

  const html = value => escapeHtml(value ?? '');
  const nowIso = () => new Date().toISOString();
  const addHours = (value, hours) => {
    const date = new Date(value);
    date.setHours(date.getHours() + hours);
    return date.toISOString();
  };

  function seedState(assignmentId, assignment) {
    const location = String(assignment?.summary?.location || 'Atlanta, GA');
    const atlanta = /atlanta/i.test(location);
    const city = atlanta ? 'Atlanta' : (location.split(',')[0]?.trim() || 'Local area');
    const stateName = atlanta ? 'GA' : (location.split(',')[1]?.trim() || '');
    const hostName = assignment?.summary?.hostOrganization || 'Host church';
    return {
      assignmentId: String(assignmentId),
      partners: [
        {
          id: 301,
          name: atlanta ? 'New Covenant Global Church' : hostName,
          city,
          state: stateName,
          distanceMiles: 0,
          contactName: 'Pastor Simone Reed',
          contactRole: 'Discipleship pastor',
          contactEmail: 'simone@newcovenant.example',
          contactPhone: '(404) 555-0110',
          relationship: 'host-church',
          serviceArea: `${city} and nearby communities`,
          ministries: ['New believer pathway', 'Young adults', 'Prayer care'],
          languages: ['English', 'Spanish'],
          availability: 'available',
          responseSlaHours: 24,
          notes: 'Host church with an established new-believer pathway.',
          isActive: true,
        },
        {
          id: 302,
          name: atlanta ? 'Greater Atlanta Community Church' : `${city} Community Church`,
          city: atlanta ? 'Decatur' : city,
          state: stateName,
          distanceMiles: atlanta ? 5 : 4,
          contactName: 'Jordan Ellis',
          contactRole: 'Connections director',
          contactEmail: 'jordan@communitychurch.example',
          contactPhone: '(404) 555-0148',
          relationship: 'verified-partner',
          serviceArea: atlanta ? 'Decatur, East Atlanta and Avondale Estates' : `${city} and surrounding communities`,
          ministries: ['Foundations small groups', 'Young professionals', 'Family support'],
          languages: ['English'],
          availability: 'available',
          responseSlaHours: 48,
          notes: 'Strong fit for young adults and foundations groups.',
          isActive: true,
        },
        {
          id: 303,
          name: atlanta ? 'Eastside Fellowship' : 'Eastside Fellowship',
          city: atlanta ? 'Stone Mountain' : city,
          state: stateName,
          distanceMiles: atlanta ? 13 : 9,
          contactName: 'Minister Leah Grant',
          contactRole: 'Care team lead',
          contactEmail: 'leah@eastsidefellowship.example',
          contactPhone: '(770) 555-0162',
          relationship: 'verified-partner',
          serviceArea: atlanta ? 'Stone Mountain and eastern DeKalb County' : `${city} metro area`,
          ministries: ['Prayer follow-up', "Women's care groups"],
          languages: ['English'],
          availability: 'limited',
          responseSlaHours: 72,
          notes: 'Confirm capacity before sending more than one referral.',
          isActive: true,
        },
      ],
      responses: [
        {
          id: 4101,
          personName: 'Jasmine Lee',
          email: 'jasmine.lee@example.com',
          phone: '(404) 555-0186',
          preferredContactMethod: 'text',
          city: atlanta ? 'Decatur' : city,
          state: stateName,
          postalCode: atlanta ? '30030' : '',
          responseType: 'Discipleship',
          requestedSupport: 'Wants to join a local foundations group and connect with a church community.',
          consentToShare: true,
          consentSource: 'qr-form',
          consentRecordedUtc: '2026-08-17T20:42:00.000Z',
          consentRecordedBy: 'Jasmine Lee',
          receivedUtc: '2026-08-17T20:42:00.000Z',
          status: 'ready-to-refer',
          assignedCoordinator: 'Michael Davis',
          priority: 'standard',
          nextFollowUpUtc: '2026-08-19T15:00:00.000Z',
          closedUtc: null,
          closureNote: '',
        },
        {
          id: 4102,
          personName: 'Daniel Carter',
          email: 'daniel.carter@example.com',
          phone: '(678) 555-0142',
          preferredContactMethod: 'phone',
          city: atlanta ? 'Marietta' : city,
          state: stateName,
          postalCode: atlanta ? '30060' : '',
          responseType: 'Prayer follow-up',
          requestedSupport: 'Requested a follow-up conversation before selecting a local church.',
          consentToShare: false,
          consentSource: 'not-recorded',
          consentRecordedUtc: null,
          consentRecordedBy: '',
          receivedUtc: '2026-08-17T20:49:00.000Z',
          status: 'needs-review',
          assignedCoordinator: 'Michael Davis',
          priority: 'urgent',
          nextFollowUpUtc: '2026-08-18T13:30:00.000Z',
          closedUtc: null,
          closureNote: '',
        },
        {
          id: 4103,
          personName: 'Aisha Morgan',
          email: 'aisha.morgan@example.com',
          phone: '(470) 555-0117',
          preferredContactMethod: 'email',
          city,
          state: stateName,
          postalCode: atlanta ? '30308' : '',
          responseType: 'Church connection',
          requestedSupport: 'Asked to connect with a nearby church and a young-adult discipleship group.',
          consentToShare: true,
          consentSource: 'qr-form',
          consentRecordedUtc: '2026-08-17T21:03:00.000Z',
          consentRecordedBy: 'Aisha Morgan',
          receivedUtc: '2026-08-17T21:03:00.000Z',
          status: 'referred',
          assignedCoordinator: 'Michael Davis',
          priority: 'standard',
          nextFollowUpUtc: '2026-08-19T13:15:00.000Z',
          closedUtc: null,
          closureNote: '',
        },
      ],
      referrals: [
        {
          id: 5001,
          responseId: 4103,
          partnerId: 301,
          status: 'sent',
          personalMessage: 'Aisha asked for a local church connection and young-adult discipleship. Please let our team know whether you can receive this referral.',
          sentUtc: '2026-08-18T09:15:00.000Z',
          viewedUtc: null,
          respondedUtc: null,
          connectedUtc: null,
          expiresUtc: '2026-08-19T09:15:00.000Z',
          lastReminderUtc: null,
          reminderCount: 0,
          reassignedFromReferralId: null,
          assignedOwner: '',
          nextStep: '',
          declineReason: '',
          connectionConfirmedBy: '',
          connectionNote: '',
        },
      ],
    };
  }

  function loadAllState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  function saveAllState(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* demo remains in memory only */ }
  }

  function networkForAssignment() {
    const assignmentId = String(state.selectedId || '');
    const all = loadAllState();
    if (!all[assignmentId]) {
      all[assignmentId] = seedState(assignmentId, state.selected);
      saveAllState(all);
    }
    return all[assignmentId];
  }

  function publishNetwork(network) {
    const assignmentId = String(state.selectedId || network.assignmentId || '');
    const all = loadAllState();
    all[assignmentId] = network;
    saveAllState(all);
  }

  function referralForResponse(network, responseId) {
    return [...network.referrals].reverse().find(item => item.responseId === responseId && !['declined','expired','cancelled'].includes(item.status));
  }

  function partnerFor(network, referral) {
    return network.partners.find(item => item.id === referral?.partnerId);
  }

  function statusLabel(status) {
    const labels = {
      sent: 'Awaiting church response',
      viewed: 'Church reviewing',
      accepted: 'Accepted by church',
      connected: 'Person connected',
      declined: 'Unable to accept',
      expired: 'Response overdue',
      cancelled: 'Returned for reassignment',
    };
    return labels[status] || formatStatus(status);
  }

  function consentSourceLabel(source) {
    return ({ 'qr-form':'Event response form', 'verbal-confirmation':'Direct verbal confirmation', 'written-confirmation':'Written confirmation' })[source] || 'Not verified';
  }

  function queueResponses(network) {
    if (queueFilter === 'action') return network.responses.filter(item => !item.closedUtc && (!item.consentToShare || !referralForResponse(network, item.id)));
    if (queueFilter === 'awaiting') return network.responses.filter(item => ['sent','viewed'].includes(referralForResponse(network, item.id)?.status));
    if (queueFilter === 'accepted') return network.responses.filter(item => ['accepted','connected'].includes(referralForResponse(network, item.id)?.status));
    if (queueFilter === 'closed') return network.responses.filter(item => item.closedUtc);
    return network.responses;
  }

  function careMetric(label, value, note, tone = '') {
    return `<article class="care-legacy-metric ${tone}"><span>${html(label)}</span><strong>${html(value)}</strong><small>${html(note)}</small></article>`;
  }

  function ensureHistoricalTab() {
    const nav = document.querySelector('.exact18-assignment-tabs');
    if (!nav || nav.querySelector('.exact18-tab-group--ministry')) return;
    const existing = nav.querySelector('[data-legacy-pane="care"]');
    if (!existing) return;
    existing.querySelector('strong').textContent = 'Care Network';
    existing.querySelector('small').textContent = 'Responses, referrals and handoffs';
    existing.classList.toggle('is-active', document.body.classList.contains('care-network-pane-open'));
    const preparation = existing.closest('.exact18-tab-group');
    existing.remove();
    const ministry = document.createElement('section');
    ministry.className = 'exact18-tab-group exact18-tab-group--ministry';
    ministry.innerHTML = '<span class="exact18-tab-label">Ministry</span><div class="exact18-tab-items"></div>';
    ministry.querySelector('.exact18-tab-items').append(existing);
    const record = [...nav.querySelectorAll('.exact18-tab-group')].find(group => group.querySelector('.exact18-tab-label')?.textContent?.trim() === 'Record');
    nav.insertBefore(ministry, record || null);
    if (preparation?.querySelector('.exact18-tab-items')?.children.length === 0) preparation.remove();
  }

  function responseRow(network, response) {
    const referral = referralForResponse(network, response.id);
    const selected = selectedResponseId === response.id;
    return `<button type="button" class="care-legacy-response ${selected ? 'is-selected' : ''}" data-care-response="${response.id}">
      <span class="care-legacy-avatar">${html(response.personName.charAt(0))}</span>
      <span class="care-legacy-response-copy">
        <span class="care-legacy-response-title"><strong>${html(response.personName)}</strong><em class="care-status care-status--${html(response.status)}">${html(formatStatus(response.status))}</em></span>
        <span>${html(response.responseType)} · ${html(response.city)}, ${html(response.state)}</span>
        <small class="care-consent-line ${response.consentToShare ? 'is-confirmed' : ''}">${response.consentToShare ? '✓ Permission to share recorded' : 'Consent must be confirmed'}</small>
        <span class="care-legacy-case-meta"><small>${html(response.assignedCoordinator || 'Unassigned')}</small><small>${response.priority === 'urgent' ? 'Urgent · ' : ''}${response.nextFollowUpUtc ? `Follow up ${html(formatDateTime(response.nextFollowUpUtc))}` : 'No follow-up due'}</small>${referral ? `<small class="active-referral">${html(statusLabel(referral.status))}</small>` : ''}</span>
      </span>
    </button>`;
  }

  function partnerCard(partner) {
    const disabled = partner.availability === 'unavailable' || !partner.isActive;
    return `<button type="button" class="care-partner-card ${selectedPartnerId === partner.id ? 'is-selected' : ''} ${disabled ? 'is-unavailable' : ''}" data-care-partner="${partner.id}" ${disabled ? 'disabled' : ''}>
      <span class="care-partner-heading"><strong>${html(partner.name)}</strong><small>${html(partner.availability)}</small></span>
      <span>${html(partner.city)}, ${html(partner.state)} · ${partner.distanceMiles} mi</span>
      <small>${html(partner.ministries.join(' · '))}</small>
      <span class="care-partner-response-time">Response requested within ${partner.responseSlaHours} hours</span>
    </button>`;
  }

  function composeReferral(network, response) {
    const partner = network.partners.find(item => item.id === selectedPartnerId) || network.partners.find(item => item.availability === 'available');
    if (partner && !selectedPartnerId) selectedPartnerId = partner.id;
    const message = `${response.personName} requested ${response.responseType.toLowerCase()} support and gave permission to share contact details. Please confirm whether your team can receive this referral.`;
    return `<section class="care-partner-section">
      <div class="care-section-heading"><div><small>Recommended local partners</small><strong>Select a receiving church</strong></div><span>Location and capacity matched</span></div>
      <div class="care-partner-grid">${network.partners.map(partnerCard).join('')}</div>
    </section>
    ${partner ? `<section class="care-email-composer">
      <div class="care-section-heading"><div><small>Referral email</small><strong>To ${html(partner.contactName)}</strong></div><span>${html(partner.contactEmail)}</span></div>
      <label><span>Personal message</span><textarea rows="4" maxlength="500" data-referral-message>${html(message)}</textarea></label>
      <div class="care-composer-footer"><small>The receiving church gets a secure response link rather than private ministry notes by email.</small><button type="button" class="care-primary" data-send-referral ${response.consentToShare ? '' : 'disabled'}>${response.consentToShare ? 'Send referral email' : 'Consent required before sending'}</button></div>
    </section>` : ''}`;
  }

  function activeReferralCard(network, response, referral) {
    const partner = partnerFor(network, referral);
    return `<section class="care-active-referral care-active-referral--${html(referral.status)}">
      <div class="care-active-referral-heading"><div><small>Current handoff status</small><strong>${html(statusLabel(referral.status))}</strong></div><span aria-hidden="true">→</span></div>
      <p><strong>${html(partner?.name || 'Care partner')}</strong><br>${html(partner?.contactName || '')} · ${html(partner?.contactEmail || '')}</p>
      ${referral.sentUtc ? `<p class="care-timestamp">Email recorded as sent ${html(formatDateTime(referral.sentUtc))}</p>` : ''}
      ${referral.expiresUtc && ['sent','viewed'].includes(referral.status) ? `<div class="care-referral-deadline"><span>Response due ${html(formatDateTime(referral.expiresUtc))}</span>${referral.reminderCount ? `<small>${referral.reminderCount} reminder${referral.reminderCount === 1 ? '' : 's'} sent</small>` : ''}</div>` : ''}
      ${['accepted','connected'].includes(referral.status) ? `<div class="care-accepted-detail"><span><small>Assigned owner</small><strong>${html(referral.assignedOwner)}</strong></span><span><small>Next step</small><strong>${html(referral.nextStep)}</strong></span></div>` : ''}
      <div class="care-referral-actions">
        ${['sent','viewed'].includes(referral.status) ? `<button type="button" data-open-church-response="${referral.id}">Open church response</button><button type="button" data-send-reminder="${referral.id}">Send reminder</button><button type="button" data-expire-referral="${referral.id}">No response · reassign</button>` : ''}
        ${referral.status === 'accepted' ? `<button type="button" class="care-primary" data-confirm-connected="${referral.id}">Confirm person connected</button><button type="button" data-return-referral="${referral.id}">Return for reassignment</button>` : ''}
        ${referral.status === 'connected' ? '<span class="care-completed-message">✓ Engagement follow-up complete</span>' : ''}
      </div>
    </section>`;
  }

  function referralHistory(network, response) {
    const referrals = network.referrals.filter(item => item.responseId === response.id);
    if (!referrals.length) return '';
    return `<section class="care-referral-history"><div class="care-section-heading"><div><small>Referral history</small><strong>Every handoff remains traceable</strong></div><span>${referrals.length}</span></div>${[...referrals].reverse().map(referral => `<article><span class="care-history-status care-history-status--${html(referral.status)}">${html(statusLabel(referral.status))}</span><div><strong>${html(partnerFor(network, referral)?.name || 'Care partner')}</strong><small>Sent ${html(formatDateTime(referral.sentUtc))}</small>${referral.declineReason ? `<p>${html(referral.declineReason)}</p>` : ''}</div></article>`).join('')}</section>`;
  }

  function referralWorkspace(network) {
    const response = network.responses.find(item => item.id === selectedResponseId) || network.responses[0];
    if (!response) return '<div class="care-legacy-empty"><h3>Select an event response</h3><p>Choose a person to review consent and find a trusted local care partner.</p></div>';
    selectedResponseId = response.id;
    const referral = referralForResponse(network, response.id);
    return `<header class="care-referral-heading"><div><p class="eyebrow">Referral workspace</p><h3>${html(response.personName)}</h3></div><span class="care-consent-badge ${response.consentToShare ? 'is-confirmed' : 'is-missing'}">${response.consentToShare ? 'Consent confirmed' : 'Consent required'}</span></header>
      <div class="care-response-detail"><div><small>Requested support</small><strong>${html(response.responseType)}</strong><p>${html(response.requestedSupport)}</p></div><dl><div><dt>Location</dt><dd>${html(response.city)}, ${html(response.state)} ${html(response.postalCode)}</dd></div><div><dt>Received</dt><dd>${html(formatDateTime(response.receivedUtc))}</dd></div><div><dt>Consent record</dt><dd>${response.consentToShare ? `${html(consentSourceLabel(response.consentSource))} · ${html(formatDateTime(response.consentRecordedUtc))} · ${html(response.consentRecordedBy)}` : 'Not verified'}</dd></div></dl></div>
      <section class="care-case-management"><div class="care-section-heading"><div><small>Follow-up responsibility</small><strong>Keep the next action visible</strong></div><span>${response.nextFollowUpUtc ? `Follow-up ${html(formatDateTime(response.nextFollowUpUtc))}` : 'No follow-up scheduled'}</span></div><div class="care-case-plan"><label><span>Assigned care coordinator</span><input data-case-owner value="${html(response.assignedCoordinator || '')}"></label><label><span>Priority</span><select data-case-priority><option value="standard" ${response.priority === 'standard' ? 'selected' : ''}>Standard</option><option value="urgent" ${response.priority === 'urgent' ? 'selected' : ''}>Urgent</option></select></label><label><span>Next follow-up</span><input type="datetime-local" data-case-due value="${response.nextFollowUpUtc ? response.nextFollowUpUtc.slice(0,16) : ''}"></label><button type="button" data-save-care-plan>Save care plan</button></div></section>
      ${!response.closedUtc ? `<div class="care-referral-actions care-response-actions">${!response.consentToShare ? '<button type="button" class="care-primary" data-verify-consent>Verify documented consent</button>' : '<button type="button" data-withdraw-consent>Withdraw consent</button>'}<button type="button" data-mark-unreachable>Mark unreachable</button></div>` : ''}
      ${referral ? activeReferralCard(network, response, referral) : response.closedUtc ? `<section class="care-closed-summary"><small>Case closed</small><strong>${html(response.closureNote || 'Follow-up closed.')}</strong></section>` : composeReferral(network, response)}
      ${referralHistory(network, response)}`;
  }

  function renderCareNetwork() {
    const target = document.querySelector('[data-legacy-content]');
    if (!target || !state.selectedId) return;
    document.body.classList.add('care-network-pane-open');
    ensureHistoricalTab();
    document.querySelectorAll('.exact18-tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.legacyPane === 'care'));
    const network = networkForAssignment();
    if (!selectedResponseId || !network.responses.some(item => item.id === selectedResponseId)) selectedResponseId = network.responses[0]?.id || null;
    const awaiting = network.referrals.filter(item => ['sent','viewed'].includes(item.status)).length;
    const accepted = network.referrals.filter(item => ['accepted','connected'].includes(item.status)).length;
    const needsAction = network.responses.filter(item => !item.closedUtc && (!item.consentToShare || !referralForResponse(network, item.id))).length;
    target.innerHTML = `<section class="care-legacy-page">
      <header class="care-legacy-page-heading"><div><p class="eyebrow">Accountable follow-up</p><h2>Care Network</h2><p>Prepare trusted churches near the event, send consented referrals and keep responsibility visible until a local connection is confirmed.</p></div><div class="care-page-actions"><button type="button" data-add-partner>+ Add local partner</button><button type="button" data-reset-network>Reset demo data</button></div></header>
      <section class="care-legacy-metrics">${careMetric('Local partners', network.partners.length, 'Prepared for this event')}${careMetric('Needs attention', needsAction, 'Consent, referral or follow-up due')}${careMetric('Awaiting church', awaiting, 'Follow-up remains with the ministry')}${careMetric('Accepted or connected', accepted, 'Responsibility received locally', 'is-success')}</section>
      <section class="care-legacy-layout"><section class="care-response-panel"><header class="care-panel-heading"><div><p class="eyebrow">Event responses</p><h3>People needing connection</h3></div><span>${network.responses.length}</span></header><nav class="care-queue-filter">${[['all','All'],['action','Needs action'],['awaiting','Awaiting church'],['accepted','Accepted'],['closed','Closed']].map(([value,label]) => `<button type="button" data-care-filter="${value}" class="${queueFilter === value ? 'is-active' : ''}">${label}</button>`).join('')}</nav><div class="care-response-list">${queueResponses(network).map(item => responseRow(network, item)).join('') || '<p class="care-legacy-empty">No care responses match this view.</p>'}</div></section><section class="care-referral-panel">${referralWorkspace(network)}</section></section>
    </section>`;
    bindCareNetwork(target, network);
  }

  function bindCareNetwork(target, network) {
    target.querySelectorAll('[data-care-filter]').forEach(button => button.addEventListener('click', () => { queueFilter = button.dataset.careFilter; renderCareNetwork(); }));
    target.querySelectorAll('[data-care-response]').forEach(button => button.addEventListener('click', () => { selectedResponseId = Number(button.dataset.careResponse); renderCareNetwork(); }));
    target.querySelectorAll('[data-care-partner]').forEach(button => button.addEventListener('click', () => { selectedPartnerId = Number(button.dataset.carePartner); renderCareNetwork(); }));
    target.querySelector('[data-reset-network]')?.addEventListener('click', () => {
      const all = loadAllState(); all[String(state.selectedId)] = seedState(String(state.selectedId), state.selected); saveAllState(all); selectedResponseId = 4101; selectedPartnerId = 302; queueFilter = 'all'; renderCareNetwork(); showMessage('Care Network demo state restored.');
    });
    target.querySelector('[data-add-partner]')?.addEventListener('click', () => showMessage('For this demo, the historical trusted partner directory is already prepared for the assignment.'));
    target.querySelector('[data-verify-consent]')?.addEventListener('click', async () => {
      const response = network.responses.find(item => item.id === selectedResponseId); if (!response) return;
      if (!await window.kingdomConfirm({ title:'Verify documented consent?', message:`Only continue if ${response.personName} directly gave permission to share contact details and the care request with a receiving church.`, confirmLabel:'Yes, verify consent' })) return;
      response.consentToShare = true; response.consentSource = 'verbal-confirmation'; response.consentRecordedUtc = nowIso(); response.consentRecordedBy = 'Michael Davis'; response.status = 'ready-to-refer'; publishNetwork(network); showMessage('Consent verified and recorded.'); renderCareNetwork();
    });
    target.querySelector('[data-withdraw-consent]')?.addEventListener('click', async () => {
      const response = network.responses.find(item => item.id === selectedResponseId); if (!response) return;
      if (!await window.kingdomConfirm({ title:'Withdraw consent?', message:'This prevents any new sharing and returns any active referral to the ministry team.', confirmLabel:'Withdraw consent' })) return;
      response.consentToShare = false; response.consentSource = 'not-recorded'; response.consentRecordedUtc = null; response.consentRecordedBy = ''; response.status = 'withdrawn'; response.closedUtc = nowIso(); response.closureNote = 'The person withdrew permission to share their care request.'; network.referrals.filter(item => item.responseId === response.id && ['sent','viewed','accepted'].includes(item.status)).forEach(item => { item.status = 'cancelled'; item.respondedUtc = nowIso(); item.declineReason = response.closureNote; }); publishNetwork(network); renderCareNetwork();
    });
    target.querySelector('[data-mark-unreachable]')?.addEventListener('click', () => { const response = network.responses.find(item => item.id === selectedResponseId); if (!response) return; response.status = 'unreachable'; response.closedUtc = nowIso(); response.closureNote = 'The ministry team could not reach the person after follow-up attempts.'; publishNetwork(network); renderCareNetwork(); });
    target.querySelector('[data-save-care-plan]')?.addEventListener('click', () => { const response = network.responses.find(item => item.id === selectedResponseId); if (!response) return; response.assignedCoordinator = target.querySelector('[data-case-owner]')?.value.trim() || 'Michael Davis'; response.priority = target.querySelector('[data-case-priority]')?.value || 'standard'; const due = target.querySelector('[data-case-due]')?.value; response.nextFollowUpUtc = due ? new Date(due).toISOString() : null; publishNetwork(network); showMessage('Care plan updated.'); renderCareNetwork(); });
    target.querySelector('[data-send-referral]')?.addEventListener('click', () => {
      const response = network.responses.find(item => item.id === selectedResponseId); const partner = network.partners.find(item => item.id === selectedPartnerId); if (!response || !partner || !response.consentToShare) return;
      const sentUtc = nowIso(); const previous = [...network.referrals].reverse().find(item => item.responseId === response.id && ['declined','expired','cancelled'].includes(item.status));
      const referral = { id: Math.max(5000, ...network.referrals.map(item => item.id)) + 1, responseId:response.id, partnerId:partner.id, status:'sent', personalMessage:target.querySelector('[data-referral-message]')?.value.trim() || '', sentUtc, viewedUtc:null, respondedUtc:null, connectedUtc:null, expiresUtc:addHours(sentUtc, partner.responseSlaHours), lastReminderUtc:null, reminderCount:0, reassignedFromReferralId:previous?.id || null, assignedOwner:'', nextStep:'', declineReason:'', connectionConfirmedBy:'', connectionNote:'' };
      response.status = 'referred'; response.nextFollowUpUtc = referral.expiresUtc; network.referrals.push(referral); publishNetwork(network); showMessage(`Care referral sent to ${partner.name}.`); renderCareNetwork();
    });
    target.querySelectorAll('[data-open-church-response]').forEach(button => button.addEventListener('click', () => window.open(`/referrals/${button.dataset.openChurchResponse}/respond`, '_blank', 'noopener')));
    target.querySelectorAll('[data-send-reminder]').forEach(button => button.addEventListener('click', () => { const referral = network.referrals.find(item => item.id === Number(button.dataset.sendReminder)); if (!referral) return; referral.lastReminderUtc = nowIso(); referral.reminderCount += 1; publishNetwork(network); showMessage('Care referral reminder recorded.'); renderCareNetwork(); }));
    target.querySelectorAll('[data-expire-referral]').forEach(button => button.addEventListener('click', () => { const referral = network.referrals.find(item => item.id === Number(button.dataset.expireReferral)); if (!referral) return; referral.status='expired'; referral.respondedUtc=nowIso(); referral.declineReason='No response within the requested service window.'; const response=network.responses.find(item=>item.id===referral.responseId); if(response){response.status='ready-to-refer';response.nextFollowUpUtc=nowIso();} publishNetwork(network); renderCareNetwork(); }));
    target.querySelectorAll('[data-confirm-connected]').forEach(button => button.addEventListener('click', () => { const referral=network.referrals.find(item=>item.id===Number(button.dataset.confirmConnected)); if(!referral)return; referral.status='connected';referral.connectedUtc=nowIso();referral.connectionConfirmedBy='Michael Davis';referral.connectionNote='Local connection confirmed.'; const response=network.responses.find(item=>item.id===referral.responseId);if(response){response.status='connected';response.closedUtc=referral.connectedUtc;response.nextFollowUpUtc=null;response.closureNote='Local connection confirmed.';}publishNetwork(network);showMessage('Local church connection confirmed.');renderCareNetwork(); }));
    target.querySelectorAll('[data-return-referral]').forEach(button => button.addEventListener('click', () => { const referral=network.referrals.find(item=>item.id===Number(button.dataset.returnReferral));if(!referral)return;referral.status='cancelled';referral.respondedUtc=nowIso();referral.declineReason='Referral returned for reassignment.';const response=network.responses.find(item=>item.id===referral.responseId);if(response){response.status='ready-to-refer';response.nextFollowUpUtc=nowIso();}publishNetwork(network);renderCareNetwork(); }));
  }

  function findReferral(referralId) {
    const all = loadAllState();
    for (const network of Object.values(all)) {
      const referral = network?.referrals?.find(item => item.id === referralId);
      if (referral) return { network, referral, response:network.responses.find(item=>item.id===referral.responseId), partner:network.partners.find(item=>item.id===referral.partnerId) };
    }
    return null;
  }

  function renderPartnerPortal() {
    const match = window.location.pathname.match(/^\/referrals\/(\d+)\/respond\/?$/i);
    if (!match) return false;
    const context = findReferral(Number(match[1]));
    document.body.className = 'care-partner-portal-mode';
    if (!context || !context.response || !context.partner) {
      document.body.innerHTML = '<main class="partner-response-page"><section class="partner-response-not-found"><p class="eyebrow">Care Network</p><h1>Referral not found</h1><p>This secure referral is no longer available.</p></section></main>';
      return true;
    }
    if (context.referral.status === 'sent') { context.referral.status='viewed'; context.referral.viewedUtc=nowIso(); publishPartnerNetwork(context.network); }
    const { network, referral, response, partner } = context;
    const assignmentTitle = 'Ministry assignment';
    document.body.innerHTML = `<section class="partner-response-page"><header class="partner-preview-banner"><div><span>Partner portal preview</span><strong>This is the secure response experience received by ${html(partner.name)}.</strong></div><button type="button" data-close-partner>Close preview</button></header><main class="partner-response-card"><header class="partner-church-heading"><div class="partner-church-mark">${html(partner.name.charAt(0))}</div><div><p>KingdomOS Care Network</p><h1>${html(partner.name)}</h1><span>Secure care referral from Cynthia Thompson Global</span></div><small class="partner-status partner-status--${html(referral.status)}">${html(statusLabel(referral.status))}</small></header><section class="partner-trust-notice"><span>◎</span><p>This person gave permission for the sending ministry to share the contact information below for local ministry follow-up. Please accept only if your team can take responsibility for the next step.</p></section><section class="partner-referral-summary"><div class="partner-person-summary"><span>${html(response.personName.charAt(0))}</span><div><small>Person requesting connection</small><h2>${html(response.personName)}</h2><p>${html(response.city)}, ${html(response.state)} ${html(response.postalCode)}</p></div></div><dl><div><dt>Requested support</dt><dd>${html(response.responseType)}</dd></div><div><dt>Event</dt><dd>${html(assignmentTitle)}</dd></div><div><dt>Event location</dt><dd>${html(state?.selected?.summary?.location || response.city)}</dd></div><div><dt>Requested response time</dt><dd>Within ${partner.responseSlaHours} hours</dd></div></dl><article><small>What the person requested</small><p>${html(response.requestedSupport)}</p></article><article><small>Ministry coordinator note</small><p>${html(referral.personalMessage)}</p></article></section>${['sent','viewed'].includes(referral.status) ? `<form class="partner-response-form" data-partner-form><header><p>Accept responsibility</p><h2>Confirm your church's next step</h2><span>The sending ministry remains responsible until your team accepts this handoff.</span></header><div class="partner-field-grid"><label><span>Assigned church owner</span><input name="owner" maxlength="120" value="${html(partner.contactName)}"></label><label><span>Planned next step</span><input name="nextStep" maxlength="180" value="Contact within 24 hours and connect to a local care leader"></label></div><label class="partner-decline-field" hidden><span>Why is your church unable to accept?</span><textarea name="declineReason" rows="3" maxlength="240" placeholder="Capacity, location, ministry fit or another reason"></textarea></label><footer><button type="button" class="partner-decline" data-decline>Unable to accept</button><button type="submit" class="partner-accept">Accept care responsibility</button></footer></form>` : `<section class="partner-response-recorded partner-response-recorded--${html(referral.status)}"><span>${['declined','expired','cancelled'].includes(referral.status) ? '×' : '✓'}</span><div><p>Response recorded</p><h2>${html(statusLabel(referral.status))}</h2>${['accepted','connected'].includes(referral.status) ? `<p><strong>${html(referral.assignedOwner)}</strong> now owns ${html(referral.nextStep)}. The sending ministry can see the acceptance without receiving private pastoral notes.</p>${referral.status==='accepted'?'<button type="button" data-partner-connected>Confirm connection completed</button>':''}` : '<p>The response has returned to the sending ministry so another local care partner can be selected.</p>'}</div></section>`}</main></section>`;
    document.querySelector('[data-close-partner]')?.addEventListener('click', () => window.close());
    const form = document.querySelector('[data-partner-form]');
    form?.addEventListener('submit', event => { event.preventDefault(); const data=new FormData(form); const owner=String(data.get('owner')||'').trim(); const nextStep=String(data.get('nextStep')||'').trim(); if(!owner||!nextStep)return; referral.status='accepted';referral.respondedUtc=nowIso();referral.assignedOwner=owner;referral.nextStep=nextStep;referral.declineReason='';publishPartnerNetwork(network);renderPartnerPortal(); });
    document.querySelector('[data-decline]')?.addEventListener('click', () => { const field=form?.querySelector('.partner-decline-field'); if(field && field.hidden){field.hidden=false;field.querySelector('textarea')?.focus();return;} const reason=String(new FormData(form).get('declineReason')||'').trim();if(!reason)return;referral.status='declined';referral.respondedUtc=nowIso();referral.declineReason=reason;response.status='ready-to-refer';response.nextFollowUpUtc=nowIso();publishPartnerNetwork(network);renderPartnerPortal(); });
    document.querySelector('[data-partner-connected]')?.addEventListener('click', () => { referral.status='connected';referral.connectedUtc=nowIso();referral.connectionConfirmedBy=partner.name;referral.connectionNote='Connection completed by receiving church.';response.status='connected';response.closedUtc=referral.connectedUtc;response.nextFollowUpUtc=null;publishPartnerNetwork(network);renderPartnerPortal(); });
    return true;
  }

  function publishPartnerNetwork(network) {
    const all=loadAllState(); all[String(network.assignmentId)] = network; saveAllState(all);
  }

  if (renderPartnerPortal()) return;

  document.addEventListener('click', event => {
    const careButton = event.target.closest?.('[data-legacy-pane="care"]');
    if (!careButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderCareNetwork();
    document.querySelector('#assignments')?.scrollIntoView({ block:'start' });
  }, true);

  const observer = new MutationObserver(() => ensureHistoricalTab());
  observer.observe(document.body, { subtree:true, childList:true });
  document.addEventListener('DOMContentLoaded', ensureHistoricalTab);
  ensureHistoricalTab();
})();
