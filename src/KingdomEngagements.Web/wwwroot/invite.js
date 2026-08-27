(() => {
  const form = document.getElementById('invitation-form');
  const formView = document.getElementById('form-view');
  const confirmation = document.getElementById('confirmation');
  const loading = document.getElementById('loading');
  const errorBox = document.getElementById('form-error');
  const requestMessage = document.getElementById('request-message');
  const submitButton = document.getElementById('submit-button');
  const responseSection = document.getElementById('response-section');
  const tokenMatch = window.location.pathname.match(/\/invite\/apostle-cynthia\/requests\/([^/]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  let currentRequest = null;

  const value = name => form.elements.namedItem(name)?.value?.trim() ?? '';
  const setValue = (name, next) => {
    const field = form.elements.namedItem(name);
    if (field) field.value = next ?? '';
  };
  const label = text => String(text || '').replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase());
  const dateLabel = raw => raw ? new Date(`${raw}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  function requestBody() {
    return {
      organizationName: value('organizationName'), eventName: value('eventName'), eventType: value('eventType'),
      contactName: value('contactName'), contactEmail: value('contactEmail'), contactPhone: value('contactPhone'),
      city: value('city'), state: value('state') || null, country: value('country'), region: value('region') || null,
      timeZone: value('timeZone'), venueAddress: value('venueAddress'), venueName: value('venueName'),
      startDate: value('startDate'), endDate: value('endDate'), ministryRequest: value('ministryRequest'),
      expectedAttendance: Number(value('expectedAttendance') || 0), travelCoverageStatus: value('travelCoverageStatus'),
      lodgingCoverageStatus: value('lodgingCoverageStatus'), honorariumStatus: value('honorariumStatus'),
      travelBookedBy: value('travelBookedBy'), honorariumAmount: Number(value('honorariumAmount') || 0),
      honorariumCurrency: value('honorariumCurrency'), paymentStatus: value('paymentStatus'),
      agreementStatus: value('agreementStatus'), engagementStatus: value('engagementStatus')
    };
  }

  function showError(message) {
    errorBox.textContent = message;
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Dismiss error');
    close.addEventListener('click', () => { errorBox.hidden = true; errorBox.textContent = ''; });
    errorBox.appendChild(close); errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearError() { errorBox.hidden = true; errorBox.textContent = ''; }

  function readiness() {
    const input = requestBody();
    const checks = {
      event: !!(input.startDate && input.endDate && input.venueName),
      contact: !!(input.contactName && input.contactEmail && input.contactPhone),
      travel: input.travelCoverageStatus !== 'not-determined', lodging: input.lodgingCoverageStatus !== 'not-determined',
      honorarium: input.honorariumStatus !== 'not-determined', ministry: !!input.ministryRequest, attendance: input.expectedAttendance > 0
    };
    const percent = Math.round(Object.values(checks).filter(Boolean).length * 100 / Object.keys(checks).length);
    document.getElementById('readiness-percentage').textContent = `${percent}%`;
    document.getElementById('readiness-bar').style.width = `${percent}%`;
    document.querySelectorAll('[data-check]').forEach(item => item.classList.toggle('complete', checks[item.dataset.check]));
  }

  function populate(item) {
    Object.entries(item).forEach(([name, next]) => setValue(name, next));
    currentRequest = item;
    responseSection.hidden = false;
    requestMessage.hidden = false;
    requestMessage.textContent = item.communications?.at(-1)?.message || 'The ministry team requested an update. Review the invitation and send your changes.';
    document.getElementById('page-eyebrow').textContent = item.referenceNumber;
    document.getElementById('form-title').textContent = 'Update speaking invitation';
    document.getElementById('submit-heading').textContent = 'Send updated invitation';
    document.getElementById('submit-copy').textContent = 'Every updated field will remain connected to the approved assignment and its host preparation record.';
    submitButton.firstChild.textContent = 'Send update ';
    readiness();
  }

  function showConfirmation(item) {
    currentRequest = item;
    document.getElementById('confirmation-status').textContent = label(item.status);
    document.getElementById('summary-event').textContent = item.eventName;
    document.getElementById('summary-reference').textContent = item.referenceNumber;
    document.getElementById('summary-host').textContent = item.organizationName;
    document.getElementById('summary-dates').textContent = `${dateLabel(item.startDate)} – ${dateLabel(item.endDate)}`;
    document.getElementById('summary-location').textContent = [item.city, item.state || item.region, item.country].filter(Boolean).join(', ');
    document.getElementById('summary-contact').textContent = `${item.contactName} · ${item.contactEmail}`;
    document.getElementById('summary-submitted').textContent = new Date(item.submittedAtUtc).toLocaleString();
    document.getElementById('summary-readiness').textContent = `${item.readinessPercentage}%`;
    formView.hidden = true; loading.hidden = true; confirmation.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function responseJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const validation = data.errors ? Object.values(data.errors).flat().join(' ') : '';
      throw new Error(validation || data.message || data.title || 'The invitation could not be saved.');
    }
    return data;
  }

  async function loadUpdate() {
    if (!token) return;
    loading.hidden = false; formView.hidden = true;
    try {
      const item = await responseJson(await fetch(`/api/public/engagements/requests/${encodeURIComponent(token)}`));
      populate(item); formView.hidden = false; loading.hidden = true;
    } catch (error) {
      loading.hidden = true; formView.hidden = false; showError(error.message);
    }
  }

  form.addEventListener('input', () => { clearError(); readiness(); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); clearError();
    if (!form.reportValidity()) return;
    const body = requestBody();
    if (body.endDate < body.startDate) return showError('The end date cannot be before the start date.');
    if (token && !value('responseMessage')) return showError('Add a response message describing what you updated.');
    submitButton.disabled = true;
    try {
      const endpoint = token ? `/api/public/engagements/requests/${encodeURIComponent(token)}` : '/api/public/engagements/requests';
      const payload = token ? { request: body, responseMessage: value('responseMessage') } : body;
      const item = await responseJson(await fetch(endpoint, { method: token ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
      showConfirmation(item);
    } catch (error) {
      showError(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  document.getElementById('submit-another').addEventListener('click', () => {
    window.location.assign('/invite/apostle-cynthia');
  });

  readiness();
  loadUpdate();
})();
