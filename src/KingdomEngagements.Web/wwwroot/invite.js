const form = document.querySelector('#invitation-form');
const formView = document.querySelector('#form-view');
const confirmation = document.querySelector('#confirmation');
const loading = document.querySelector('#loading');
const errorBox = document.querySelector('#form-error');
const requestMessage = document.querySelector('#request-message');
const responseSection = document.querySelector('#response-section');
const submitButton = document.querySelector('#submit-button');
const readinessPercentage = document.querySelector('#readiness-percentage');
const readinessBar = document.querySelector('#readiness-bar');
const tokenMatch = window.location.pathname.match(/\/invite\/apostle-cynthia\/requests\/([^/]+)$/);
const editToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
let loadedRequest = null;

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const validation = body.errors ? Object.values(body.errors).flat().join(' ') : '';
    throw new Error(validation || body.message || body.title || `Request failed (${response.status})`);
  }
  return body;
}

function value(name) { return form.elements[name]?.value ?? ''; }
function setValue(name, data) { if (form.elements[name]) form.elements[name].value = data ?? ''; }

function requestPayload() {
  return {
    organizationName: value('organizationName').trim(),
    eventName: value('eventName').trim(),
    eventType: value('eventType'),
    contactName: value('contactName').trim(),
    contactEmail: value('contactEmail').trim().toLowerCase(),
    contactPhone: value('contactPhone').trim(),
    city: value('city').trim(),
    state: value('state').trim() || null,
    country: value('country').trim(),
    region: value('region').trim() || null,
    timeZone: value('timeZone').trim(),
    venueAddress: value('venueAddress').trim(),
    venueName: value('venueName').trim(),
    startDate: value('startDate'),
    endDate: value('endDate'),
    ministryRequest: value('ministryRequest').trim(),
    expectedAttendance: Number(value('expectedAttendance')),
    travelCoverageStatus: value('travelCoverageStatus'),
    lodgingCoverageStatus: value('lodgingCoverageStatus'),
    honorariumStatus: value('honorariumStatus'),
    travelBookedBy: value('travelBookedBy'),
    honorariumAmount: Number(value('honorariumAmount') || 0),
    honorariumCurrency: value('honorariumCurrency').trim().toUpperCase() || 'USD',
    paymentStatus: value('paymentStatus'),
    agreementStatus: value('agreementStatus'),
    engagementStatus: value('engagementStatus'),
  };
}

function validate() {
  errorBox.hidden = true;
  form.querySelectorAll('.is-invalid').forEach(item => item.classList.remove('is-invalid'));
  let valid = true;
  form.querySelectorAll('[required]').forEach(control => {
    if (responseSection.hidden && control.name === 'responseMessage') return;
    if (!String(control.value || '').trim() || !control.checkValidity()) {
      control.classList.add('is-invalid');
      valid = false;
    }
  });
  const start = value('startDate');
  const end = value('endDate');
  if (start && end && end < start) {
    form.elements.startDate.classList.add('is-invalid');
    form.elements.endDate.classList.add('is-invalid');
    valid = false;
  }
  if (!valid) showError('Please complete the required fields and make sure the event dates are valid.');
  return valid;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function populate(request) {
  const names = [
    'organizationName','eventName','eventType','contactName','contactEmail','contactPhone','city','state','country','region','timeZone',
    'venueAddress','venueName','startDate','endDate','ministryRequest','expectedAttendance','travelCoverageStatus','lodgingCoverageStatus',
    'honorariumStatus','travelBookedBy','honorariumAmount','honorariumCurrency','paymentStatus','agreementStatus','engagementStatus'
  ];
  names.forEach(name => setValue(name, request[name]));
  updateReadiness();
}

function updateReadiness() {
  const checks = {
    event: Boolean(value('eventName').trim() && value('eventType') && value('venueName').trim() && value('startDate') && value('endDate') && value('endDate') >= value('startDate')),
    contact: Boolean(value('contactName').trim() && value('contactEmail').includes('@') && value('contactPhone').trim()),
    travel: value('travelCoverageStatus') !== 'not-determined',
    lodging: value('lodgingCoverageStatus') !== 'not-determined',
    honorarium: value('honorariumStatus') !== 'not-determined',
    ministry: Boolean(value('ministryRequest').trim()),
    attendance: Number(value('expectedAttendance')) > 0,
  };
  const completed = Object.values(checks).filter(Boolean).length;
  const percent = Math.round(completed * 100 / Object.keys(checks).length);
  readinessPercentage.textContent = `${percent}%`;
  readinessBar.style.width = `${percent}%`;
  Object.entries(checks).forEach(([key, complete]) => document.querySelector(`[data-check="${key}"]`)?.classList.toggle('complete', complete));
}

function latestInformationRequest(request) {
  return [...(request.communications || [])].reverse().find(item => item.type === 'information-requested');
}

async function loadEditRequest() {
  if (!editToken) return;
  loading.hidden = false;
  formView.hidden = true;
  try {
    loadedRequest = await api(`/api/public/engagements/requests/${encodeURIComponent(editToken)}`);
    populate(loadedRequest);
    const communication = latestInformationRequest(loadedRequest);
    document.querySelector('#page-eyebrow').textContent = 'Host ministry portal · requested update';
    document.querySelector('#form-title').textContent = 'Update your invitation';
    document.querySelector('#form-introduction').textContent = 'The Cynthia Thompson Global ministry team requested additional information. Your original answers are already here—update what is needed and resubmit.';
    requestMessage.innerHTML = `<strong>Message from the ministry team</strong><br>${escapeHtml(communication?.message || 'Please review and update the requested information.')}`;
    requestMessage.hidden = false;
    responseSection.hidden = false;
    form.elements.responseMessage.required = true;
    document.querySelector('#submit-heading').textContent = 'Return the invitation to review';
    document.querySelector('#submit-copy').textContent = 'Your changes will update the same invitation record; you do not need to start over.';
    submitButton.innerHTML = 'Resubmit invitation <span>→</span>';
  } catch (error) {
    formView.hidden = false;
    form.innerHTML = '';
    showError(error.message);
  } finally {
    loading.hidden = true;
    formView.hidden = false;
  }
}

form.addEventListener('input', updateReadiness);
form.addEventListener('change', updateReadiness);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!validate()) return;
  submitButton.disabled = true;
  errorBox.hidden = true;
  try {
    const payload = requestPayload();
    const request = editToken
      ? await api(`/api/public/engagements/requests/${encodeURIComponent(editToken)}`, {
          method: 'PUT',
          body: JSON.stringify({ request: payload, responseMessage: value('responseMessage').trim() }),
        })
      : await api('/api/public/engagements/requests', { method: 'POST', body: JSON.stringify(payload) });
    showConfirmation(request, Boolean(editToken));
  } catch (error) {
    showError(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

function showConfirmation(request, resubmitted) {
  formView.hidden = true;
  confirmation.hidden = false;
  document.querySelector('#confirmation-eyebrow').textContent = resubmitted ? 'Invitation updated' : 'Invitation received';
  document.querySelector('#confirmation-title').textContent = resubmitted ? 'Your updates have been returned to the ministry team.' : 'Thank you for inviting Cynthia Thompson.';
  document.querySelector('#confirmation-copy').textContent = resubmitted
    ? 'The invitation is back in review. The ministry team can see your changes and response without creating a duplicate request.'
    : 'Her ministry team will review the information provided and contact your primary coordinator if additional details are needed.';
  document.querySelector('#confirmation-status').textContent = 'Awaiting review';
  document.querySelector('#summary-event').textContent = request.eventName;
  document.querySelector('#summary-reference').textContent = request.referenceNumber;
  document.querySelector('#summary-host').textContent = request.organizationName;
  document.querySelector('#summary-dates').textContent = `${formatDate(request.startDate)}${request.endDate !== request.startDate ? ` – ${formatDate(request.endDate)}` : ''}`;
  document.querySelector('#summary-location').textContent = [request.city, request.state || request.region, request.country].filter(Boolean).join(', ');
  document.querySelector('#summary-contact').textContent = request.contactName;
  document.querySelector('#summary-submitted').textContent = formatDateTime(request.submittedAtUtc);
  document.querySelector('#summary-readiness').textContent = `${request.readinessPercentage}%`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelector('#submit-another').addEventListener('click', () => {
  window.location.href = '/invite/apostle-cynthia';
});

function formatDate(value) {
  if (!value) return 'Pending';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day));
}
function formatDateTime(value) { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : 'Pending'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]); }

updateReadiness();
loadEditRequest();
