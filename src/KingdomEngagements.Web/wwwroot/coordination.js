const stateBox = document.querySelector('#state');
const view = document.querySelector('#coordination-view');
const form = document.querySelector('#coordination-form');
const token = window.location.pathname.split('/').filter(Boolean).pop();
const scheduleList = document.querySelector('#schedule-list');
const contactList = document.querySelector('#contact-list');
const documentList = document.querySelector('#document-list');
const saveProgressButton = document.querySelector('#save-progress');
const collaborationSyncKey = 'apostolos.engagement-collaboration-sync';
let coordination = null;
let saveInFlight = false;
let formDirty = false;
let saveResetTimer = null;
let confirmationTimer = null;

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
function showConfirmation(message, kind = 'success') {
  let toast = document.querySelector('#coordination-save-toast');
  if (!toast) {
    toast = document.createElement('section');
    toast.id = 'coordination-save-toast';
    Object.assign(toast.style, {
      position: 'fixed', right: '20px', bottom: '20px', zIndex: '5000', width: 'min(360px, calc(100vw - 32px))',
      padding: '13px 44px 13px 16px', borderRadius: '10px', border: '1px solid #d9d3c7', background: '#fffdf9',
      color: '#16233b', boxShadow: '0 12px 34px rgba(16,34,61,.16)', fontSize: '.82rem', lineHeight: '1.45'
    });
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss confirmation');
    close.textContent = '×';
    Object.assign(close.style, {
      position: 'absolute', top: '6px', right: '7px', width: '30px', height: '30px', border: '0', borderRadius: '7px',
      background: 'transparent', color: '#6b7280', fontSize: '20px', cursor: 'pointer'
    });
    close.addEventListener('click', () => toast.remove());
    const copy = document.createElement('span');
    copy.dataset.confirmationCopy = 'true';
    toast.append(copy, close);
    document.body.append(toast);
  }
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
  toast.style.borderLeft = `4px solid ${kind === 'error' ? '#b42318' : kind === 'info' ? '#8a6b25' : '#2f7d55'}`;
  const copy = toast.querySelector('[data-confirmation-copy]');
  if (copy) copy.textContent = message;
  window.clearTimeout(confirmationTimer);
  confirmationTimer = window.setTimeout(() => toast?.remove(), kind === 'error' ? 7000 : 4600);
}
function broadcastCollaborationUpdate(source) {
  if (!coordination?.assignmentId) return;
  try {
    localStorage.setItem(collaborationSyncKey, JSON.stringify({
      assignmentId: coordination.assignmentId,
      source,
      at: Date.now()
    }));
  } catch {
    // Persistence still succeeds even when browser storage is unavailable.
  }
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
  row.querySelector('.remove-button').addEventListener('click', () => { row.remove(); formDirty = true; });
  scheduleList.append(row);
}
function addContact(item = {}) {
  const row = document.createElement('article');
  row.className = 'repeat-row contacts';
  row.innerHTML = `<label class="field"><span>Type</span><select data-name="type"><option value="primary">Primary host</option><option value="travel">Travel</option><option value="media">Media</option><option value="emergency">Emergency</option><option value="other">Other</option></select></label>${input('Name','name',item.name)}${input('Email','email',item.email,'email')}${input('Phone','phone',item.phone,'tel')}<button type="button" class="remove-button">Remove</button>`;
  row.querySelector('[data-name="type"]').value = item.type || 'other';
  row.querySelector('.remove-button').addEventListener('click', () => { row.remove(); formDirty = true; });
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
  formDirty = false;
}
async function load(syncMessage = '') {
  try {
    showState('Loading secure host coordination…');
    coordination = await api(`/api/public/engagements/preparation/coordination/${encodeURIComponent(token)}`);
    showState('');
    render();
    if (syncMessage) showConfirmation(syncMessage, 'info');
  } catch (error) {
    view.hidden = true;
    showState(error.message, 'error');
  }
}
async function save(submit) {
  if (saveInFlight) return;
  saveInFlight = true;
  if (!submit && saveProgressButton) {
    window.clearTimeout(saveResetTimer);
    saveProgressButton.disabled = true;
    saveProgressButton.textContent = 'Saving…';
  }
  try {
    if (submit) showState('Submitting host coordination…');
    coordination = await api(`/api/public/engagements/preparation/coordination/${encodeURIComponent(token)}`, { method:'PUT', body:JSON.stringify(payload(submit)) });
    formDirty = false;
    broadcastCollaborationUpdate('host');
    if (submit) {
      showState('Host coordination submitted to Cynthia Thompson Global.', 'success');
      showConfirmation('Host coordination submitted. CTG now sees these details on the engagement.');
    } else {
      showState('');
      if (saveProgressButton) {
        saveProgressButton.textContent = 'Saved ✓';
        saveProgressButton.disabled = false;
        saveResetTimer = window.setTimeout(() => { saveProgressButton.textContent = 'Save progress'; }, 2200);
      }
      showConfirmation('Progress saved to this engagement. CTG can now see the update.');
    }
    render();
    if (submit) window.scrollTo({ top:0, behavior:'smooth' });
  } catch (error) {
    if (!submit && saveProgressButton) {
      saveProgressButton.disabled = false;
      saveProgressButton.textContent = 'Save progress';
    }
    showState(submit ? error.message : '', submit ? 'error' : '');
    showConfirmation(error.message || 'The coordination update could not be saved.', 'error');
  } finally {
    saveInFlight = false;
  }
}
form.addEventListener('input', () => { formDirty = true; });
form.addEventListener('change', () => { formDirty = true; });
document.querySelector('#add-schedule').addEventListener('click', () => { addSchedule({ date: coordination?.eventStartDate }); formDirty = true; });
document.querySelector('#add-contact').addEventListener('click', () => { addContact(); formDirty = true; });
saveProgressButton.addEventListener('click', () => save(false));
form.addEventListener('submit', event => { event.preventDefault(); save(true); });
document.querySelector('#upload-document').addEventListener('click', async () => {
  const input = document.querySelector('#document-file');
  const file = input.files?.[0];
  if (!file) { showConfirmation('Choose a document before uploading.', 'error'); return; }
  try {
    showConfirmation(`Uploading ${file.name}…`, 'info');
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
    broadcastCollaborationUpdate('host');
    showConfirmation('Document uploaded and attached to the same engagement.');
  } catch (error) { showConfirmation(error.message, 'error'); }
});
window.addEventListener('storage', event => {
  if (event.key !== collaborationSyncKey || !event.newValue || !coordination?.assignmentId) return;
  try {
    const update = JSON.parse(event.newValue);
    if (update?.source !== 'ctg' || update?.assignmentId !== coordination.assignmentId) return;
    if (formDirty || saveInFlight) {
      showConfirmation('CTG updated this engagement. Save your current work, then refresh to load their latest changes.', 'info');
      return;
    }
    load('CTG updated this engagement. Latest collaboration details loaded.');
  } catch {
    // Ignore malformed cross-tab collaboration signals.
  }
});
load();
