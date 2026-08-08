const stateBox = document.querySelector('#state');
const view = document.querySelector('#coordination-view');
const form = document.querySelector('#coordination-form');
const token = window.location.pathname.split('/').filter(Boolean).pop();
const scheduleList = document.querySelector('#schedule-list');
const contactList = document.querySelector('#contact-list');
const documentList = document.querySelector('#document-list');
let coordination = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}
function formatStatus(value) { return String(value || '').replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase()); }
function formatDate(value) {
  if (!value) return 'Not provided';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { month:'long', day:'numeric', year:'numeric' }).format(date);
}
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
function toInputDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,16);
}
function toIso(value) { return value ? new Date(value).toISOString() : null; }
function setField(name, value) {
  const field = form.elements.namedItem(name);
  if (field) field.value = value ?? '';
}
function read(name) { return String(form.elements.namedItem(name)?.value || '').trim() || null; }
function input(label, name, value = '', type = 'text') {
  return `<label class="field"><span>${escapeHtml(label)}</span><input data-name="${escapeHtml(name)}" type="${type}" value="${escapeHtml(value || '')}" /></label>`;
}
function addSchedule(item = {}) {
  const row = document.createElement('article');
  row.className = 'repeat-row schedule';
  row.style.gridTemplateColumns = '1.2fr .9fr .65fr .65fr 1fr auto';
  row.innerHTML = `${input('Session / responsibility','title',item.title)}${input('Date','date',item.date,'date')}${input('Starts','startsAt',item.startsAt,'time')}${input('Ends','endsAt',item.endsAt,'time')}${input('Location','location',item.location)}<button type="button" class="remove-button">Remove</button><label class="field" style="grid-column:1/-1"><span>Notes</span><textarea data-name="notes" rows="2">${escapeHtml(item.notes || '')}</textarea></label>`;
  row.querySelector('.remove-button').addEventListener('click', () => row.remove());
  scheduleList.append(row);
}
function addContact(item = {}) {
  const row = document.createElement('article');
  row.className = 'repeat-row contacts';
  row.innerHTML = `<label class="field"><span>Type</span><select data-name="type"><option value="primary">Primary host</option><option value="travel">Travel</option><option value="media">Media</option><option value="emergency">Emergency</option><option value="other">Other</option></select></label>${input('Name','name',item.name)}${input('Email','email',item.email,'email')}${input('Phone','phone',item.phone,'tel')}<button type="button" class="remove-button">Remove</button>`;
  row.querySelector('[data-name="type"]').value = item.type || 'other';
  row.querySelector('.remove-button').addEventListener('click', () => row.remove());
  contactList.append(row);
}
function collectRows(container) {
  return [...container.children].map(row => {
    const value = name => String(row.querySelector(`[data-name="${name}"]`)?.value || '').trim() || null;
    return row.classList.contains('contacts')
      ? { type:value('type') || 'other', name:value('name') || '', email:value('email'), phone:value('phone') }
      : { title:value('title') || '', date:value('date'), startsAt:value('startsAt'), endsAt:value('endsAt'), location:value('location'), notes:value('notes') };
  }).filter(item => item.name || item.title);
}
function payload(submit) {
  return {
    outboundAirline:read('outboundAirline'), outboundFlightNumber:read('outboundFlightNumber'), outboundConfirmationNumber:read('outboundConfirmationNumber'),
    outboundDepartureAirport:read('outboundDepartureAirport'), outboundArrivalAirport:read('outboundArrivalAirport'), outboundDepartsAtUtc:toIso(read('outboundDepartsAtUtc')), outboundArrivesAtUtc:toIso(read('outboundArrivesAtUtc')),
    returnAirline:read('returnAirline'), returnFlightNumber:read('returnFlightNumber'), returnConfirmationNumber:read('returnConfirmationNumber'),
    returnDepartureAirport:read('returnDepartureAirport'), returnArrivalAirport:read('returnArrivalAirport'), returnDepartsAtUtc:toIso(read('returnDepartsAtUtc')), returnArrivesAtUtc:toIso(read('returnArrivesAtUtc')),
    hotelName:read('hotelName'), hotelAddress:read('hotelAddress'), hotelConfirmationNumber:read('hotelConfirmationNumber'), hotelCheckInAtUtc:toIso(read('hotelCheckInAtUtc')), hotelCheckOutAtUtc:toIso(read('hotelCheckOutAtUtc')),
    transportationPlan:read('transportationPlan'), pickupContactName:read('pickupContactName'), pickupContactPhone:read('pickupContactPhone'),
    schedule:collectRows(scheduleList), contacts:collectRows(contactList), promotionRequirements:read('promotionRequirements'), prayerFocus:read('prayerFocus'), hostNotes:read('hostNotes'), submit
  };
}
function renderDocuments() {
  const docs = coordination.documents || [];
  documentList.innerHTML = docs.length ? docs.map(doc => `<article class="document-row"><div><a href="/api/public/engagements/preparation/coordination/${encodeURIComponent(token)}/documents/${doc.id}" target="_blank" rel="noopener">${escapeHtml(doc.fileName)}</a><small>${Math.max(1, Math.round(doc.length / 1024))} KB · ${new Date(doc.uploadedAtUtc).toLocaleString()}</small></div><strong>Received</strong></article>`).join('') : '<p>No host documents uploaded yet.</p>';
}
function render() {
  document.querySelector('#reference').textContent = coordination.referenceNumber;
  document.querySelector('#event-name').textContent = coordination.eventName;
  document.querySelector('#event-copy').textContent = `${coordination.hostOrganization} · ${formatDate(coordination.eventStartDate)}${coordination.eventEndDate !== coordination.eventStartDate ? ` – ${formatDate(coordination.eventEndDate)}` : ''}`;
  document.querySelector('#coordination-status').textContent = formatStatus(coordination.coordinationStatus);
  const submitted = coordination.coordinationStatus === 'submitted';
  document.querySelector('#submitted-banner').hidden = !submitted;
  if (submitted) document.querySelector('#submitted-copy').textContent = `Submitted ${coordination.submittedAtUtc ? new Date(coordination.submittedAtUtc).toLocaleString() : ''}. You can continue to update details while this secure link remains active.`;
  [
    'outboundAirline','outboundFlightNumber','outboundConfirmationNumber','outboundDepartureAirport','outboundArrivalAirport',
    'returnAirline','returnFlightNumber','returnConfirmationNumber','returnDepartureAirport','returnArrivalAirport',
    'hotelName','hotelAddress','hotelConfirmationNumber','transportationPlan','pickupContactName','pickupContactPhone','promotionRequirements','prayerFocus','hostNotes'
  ].forEach(name => setField(name, coordination[name]));
  ['outboundDepartsAtUtc','outboundArrivesAtUtc','returnDepartsAtUtc','returnArrivesAtUtc','hotelCheckInAtUtc','hotelCheckOutAtUtc'].forEach(name => setField(name, toInputDateTime(coordination[name])));
  scheduleList.innerHTML = '';
  (coordination.schedule || []).forEach(addSchedule);
  if (!coordination.schedule?.length) addSchedule({ date: coordination.eventStartDate });
  contactList.innerHTML = '';
  (coordination.contacts || []).forEach(addContact);
  if (!coordination.contacts?.length) addContact({ type:'primary' });
  renderDocuments();
  view.hidden = false;
}
async function load() {
  try {
    showState('Loading secure host coordination…');
    coordination = await api(`/api/public/engagements/preparation/coordination/${encodeURIComponent(token)}`);
    showState('');
    render();
  } catch (error) {
    view.hidden = true;
    showState(error.message, 'error');
  }
}
async function save(submit) {
  try {
    showState(submit ? 'Submitting host coordination…' : 'Saving host coordination…');
    coordination = await api(`/api/public/engagements/preparation/coordination/${encodeURIComponent(token)}`, { method:'PUT', body:JSON.stringify(payload(submit)) });
    showState(submit ? 'Host coordination submitted to Cynthia Thompson Global.' : 'Progress saved.', 'success');
    render();
    if (submit) window.scrollTo({ top:0, behavior:'smooth' });
  } catch (error) { showState(error.message, 'error'); }
}
document.querySelector('#add-schedule').addEventListener('click', () => addSchedule({ date: coordination?.eventStartDate }));
document.querySelector('#add-contact').addEventListener('click', () => addContact());
document.querySelector('#save-progress').addEventListener('click', () => save(false));
form.addEventListener('submit', event => { event.preventDefault(); save(true); });
document.querySelector('#upload-document').addEventListener('click', async () => {
  const input = document.querySelector('#document-file');
  const file = input.files?.[0];
  if (!file) { showState('Choose a document before uploading.', 'error'); return; }
  try {
    showState(`Uploading ${file.name}…`);
    const body = new FormData(); body.append('file', file);
    const response = await fetch(`/api/public/engagements/preparation/coordination/${encodeURIComponent(token)}/documents`, { method:'POST', body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const validation = result?.errors ? Object.values(result.errors).flat().join(' ') : '';
      throw new Error(validation || result?.message || `Upload failed (${response.status})`);
    }
    coordination.documents = [result, ...(coordination.documents || [])];
    input.value = '';
    renderDocuments();
    showState('Document uploaded and attached to the assignment.', 'success');
  } catch (error) { showState(error.message, 'error'); }
});
load();
