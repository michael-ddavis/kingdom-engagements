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
  const startedMode = !!token && new URLSearchParams(window.location.search).get('mode') === 'complete';
  let currentRequest = null;

  const value = name => form.elements.namedItem(name)?.value?.trim() ?? '';
  const setValue = (name, next) => {
    const field = form.elements.namedItem(name);
    if (field) field.value = next ?? '';
  };
  const label = text => String(text || '').replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase());
  const dateLabel = raw => raw && raw !== '0001-01-01'
    ? new Date(`${raw}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Pending';

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
    if (item.startDate === '0001-01-01') setValue('startDate', '');
    if (item.endDate === '0001-01-01') setValue('endDate', '');
    if (!item.expectedAttendance) setValue('expectedAttendance', '');
    currentRequest = item;
    requestMessage.hidden = false;
    document.getElementById('page-eyebrow').textContent = `Invitation ${item.referenceNumber}`;

    if (startedMode) {
      responseSection.hidden = true;
      requestMessage.textContent = `Cynthia Thompson Global started invitation ${item.referenceNumber} for you. Complete the missing host and event details below. Your submission will update this same invitation record—it will not create a new one.`;
      document.getElementById('form-title').textContent = 'Complete speaking invitation';
      document.getElementById('form-introduction').textContent = `CTG has already opened ${item.referenceNumber}. Review anything they entered, complete the remaining fields, and return this same invitation to the ministry team.`;
      document.getElementById('submit-heading').textContent = 'Return this invitation to CTG';
      document.getElementById('submit-copy').textContent = `Submitting completes ${item.referenceNumber} and moves it to Awaiting Review. This secure completion link will then close.`;
      submitButton.firstChild.textContent = 'Complete invitation ';
    } else {
      responseSection.hidden = false;
      requestMessage.textContent = item.communications?.at(-1)?.message || 'The ministry team requested an update. Review the invitation and send your changes.';
      document.getElementById('form-title').textContent = 'Update speaking invitation';
      document.getElementById('form-introduction').textContent = `You are updating ${item.referenceNumber}. Any changes stay attached to this same CTG invitation record.`;
      document.getElementById('submit-heading').textContent = 'Send updated invitation';
      document.getElementById('submit-copy').textContent = 'Every updated field will remain connected to this invitation and its future host preparation record.';
      submitButton.firstChild.textContent = 'Send update ';
    }
    readiness();
  }

  function showConfirmation(item) {
    currentRequest = item;
    if (startedMode) {
      document.getElementById('confirmation-eyebrow').textContent = `Invitation ${item.referenceNumber} completed`;
      document.getElementById('confirmation-title').textContent = 'Your invitation is now with the CTG ministry team.';
      document.getElementById('confirmation-copy').textContent = `You completed the invitation CTG started for you. The same record number will remain with this request through review and, if approved, engagement preparation.`;
      document.getElementById('submit-another').hidden = true;
    }
    document.getElementById('confirmation-status').textContent = label(item.status);
    document.getElementById('summary-event').textContent = item.eventName;
    document.getElementById('summary-reference').textContent = item.referenceNumber;
    document.getElementById('summary-host').textContent = item.organizationName;
    document.getElementById('summary-dates').textContent = `${dateLabel(item.startDate)} – ${dateLabel(item.endDate)}`;
    document.getElementById('summary-location').textContent = [item.city, item.state || item.region, item.country].filter(Boolean).join(', ');
    document.getElementById('summary-contact').textContent = `${item.contactName} · ${item.contactEmail}`;
    document.getElementById('summary-submitted').textContent = new Date(item.updatedAtUtc || item.submittedAtUtc).toLocaleString();
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
      const apiPath = startedMode
        ? `/api/public/engagements/started-requests/${encodeURIComponent(token)}`
        : `/api/public/engagements/requests/${encodeURIComponent(token)}`;
      const item = await responseJson(await fetch(apiPath));
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
    if (token && !startedMode && !value('responseMessage')) return showError('Add a response message describing what you updated.');
    submitButton.disabled = true;
    try {
      let endpoint = '/api/public/engagements/requests';
      let method = 'POST';
      let payload = body;
      if (token && startedMode) {
        endpoint = `/api/public/engagements/started-requests/${encodeURIComponent(token)}`;
        method = 'PUT';
      } else if (token) {
        endpoint = `/api/public/engagements/requests/${encodeURIComponent(token)}`;
        method = 'PUT';
        payload = { request: body, responseMessage: value('responseMessage') };
      }
      const item = await responseJson(await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
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