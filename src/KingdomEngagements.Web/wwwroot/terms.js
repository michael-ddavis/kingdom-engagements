const stateBox = document.querySelector('#state');
const termsView = document.querySelector('#terms-view');
const form = document.querySelector('#terms-form');
const acceptedView = document.querySelector('#accepted-view');
const coordinationLink = document.querySelector('#coordination-link');
const token = window.location.pathname.split('/').filter(Boolean).pop();
let terms = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}
function formatStatus(value) { return String(value || '').replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function formatDate(value) {
  if (!value) return 'Not provided';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { month:'long', day:'numeric', year:'numeric' }).format(date);
}
function money(amount, currency) {
  if (!amount) return 'No amount specified';
  try { return new Intl.NumberFormat(undefined, { style:'currency', currency:currency || 'USD' }).format(Number(amount)); }
  catch { return `${currency || 'USD'} ${Number(amount).toLocaleString()}`; }
}
function summary(label, value) { return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`; }
function showState(message, kind = '') {
  stateBox.hidden = !message;
  stateBox.className = `portal-state ${kind}`.trim();
  stateBox.textContent = message || '';
}
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type':'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const validation = body?.errors ? Object.values(body.errors).flat().join(' ') : '';
    throw new Error(validation || body?.message || body?.title || `Request failed (${response.status})`);
  }
  return body;
}
function render() {
  document.querySelector('#reference').textContent = terms.referenceNumber;
  document.querySelector('#event-summary').innerHTML = [
    summary('Host ministry', terms.hostOrganization),
    summary('Event', `${terms.eventName} · ${terms.eventType}`),
    summary('Event dates', `${formatDate(terms.eventStartDate)}${terms.eventEndDate !== terms.eventStartDate ? ` – ${formatDate(terms.eventEndDate)}` : ''}`),
    summary('Current terms status', formatStatus(terms.termsStatus)),
  ].join('');
  document.querySelector('#terms-grid').innerHTML = [
    summary('Travel coverage', formatStatus(terms.travelCoverageStatus)),
    summary('Lodging coverage', formatStatus(terms.lodgingCoverageStatus)),
    summary('Primary travel booked by', formatStatus(terms.travelBookedBy)),
    summary('Honorarium', `${formatStatus(terms.honorariumStatus)} · ${money(terms.honorariumAmount, terms.honorariumCurrency)}`),
    summary('Payment status', formatStatus(terms.paymentStatus)),
    summary('Next step', terms.termsStatus === 'accepted' ? 'Host coordination' : 'Host acceptance'),
  ].join('');
  termsView.hidden = false;
  const accepted = terms.termsStatus === 'accepted';
  document.querySelector('#acceptance-section').hidden = accepted;
  acceptedView.hidden = !accepted;
  if (accepted) {
    document.querySelector('#accepted-copy').textContent = `Accepted${terms.termsAcceptedByName ? ` by ${terms.termsAcceptedByName}` : ''}${terms.termsAcceptedAtUtc ? ` on ${new Date(terms.termsAcceptedAtUtc).toLocaleString()}` : ''}. Host coordination is now unlocked.`;
    if (terms.coordinationToken) coordinationLink.href = `/host/coordination/${encodeURIComponent(terms.coordinationToken)}`;
  }
}
async function load() {
  try {
    showState('Loading approved engagement terms…');
    terms = await api(`/api/public/engagements/preparation/terms/${encodeURIComponent(token)}`);
    showState('');
    render();
  } catch (error) {
    termsView.hidden = true;
    showState(error.message, 'error');
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  if (!data.get('accepted')) { showState('Confirm the engagement terms before continuing.', 'error'); return; }
  try {
    showState('Recording host acceptance…');
    const result = await api(`/api/public/engagements/preparation/terms/${encodeURIComponent(token)}/accept`, {
      method:'POST',
      body:JSON.stringify({ accepted:true, signatoryName:data.get('signatoryName'), signatoryEmail:data.get('signatoryEmail'), note:data.get('note') || null })
    });
    terms = result.terms;
    showState('Engagement terms accepted. Host coordination is ready.', 'success');
    render();
    if (result.coordinationUrl) coordinationLink.href = result.coordinationUrl;
  } catch (error) {
    showState(error.message, 'error');
  }
});
load();
