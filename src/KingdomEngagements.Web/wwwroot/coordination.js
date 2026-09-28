const stateBox = document.querySelector('#state');
const view = document.querySelector('#coordination-view');
const form = document.querySelector('#coordination-form');
const legacyTokenMatch = window.location.pathname.match(/^\/host\/coordination\/([^/]+)$/i);
const legacyToken = legacyTokenMatch ? decodeURIComponent(legacyTokenMatch[1]) : null;
const coordinationApiUrl = legacyToken
  ? `/api/public/engagements/preparation/coordination/${encodeURIComponent(legacyToken)}`
  : '/api/host/engagement/coordination';
const messagesApiUrl = `${coordinationApiUrl}/messages`;
const scheduleList = document.querySelector('#schedule-list');
const contactList = document.querySelector('#contact-list');
const documentList = document.querySelector('#document-list');
const saveProgressButton = document.querySelector('#save-progress');
const messageList = document.querySelector('#message-list');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
const realtimeStatus = document.querySelector('#realtime-status');
const messageDeliveryCopy = document.querySelector('#message-delivery-copy');
const messageDrawer = document.querySelector('#message-drawer');
const messageDrawerBackdrop = document.querySelector('#message-drawer-backdrop');
const closeMessageDrawerButton = document.querySelector('#close-message-drawer');
const messageOpenButtons = [...document.querySelectorAll('[data-open-messages]')];
const messageBadges = [...document.querySelectorAll('[data-message-badge]')];
const coordinationSections = [...document.querySelectorAll('.coordination-section')];
const saveState = document.querySelector('#save-state');
const saveStateCopy = document.querySelector('#save-state-copy');
const progressCopy = document.querySelector('#progress-copy');
const progressBar = document.querySelector('#progress-bar');
const collaborationSyncKey = 'apostolos.engagement-collaboration-sync';
let coordination = null;
let saveInFlight = false;
let formDirty = false;
let saveResetTimer = null;
let confirmationTimer = null;
let messageThread = { isClosed: false, messages: [] };
let stopRealtime = null;
let autosaveTimer = null;
let changeVersion = 0;
let unseenMessageCount = 0;
let activeMessageTrigger = null;
let initialSectionOpened = false;
const autosaveDelayMs = 1600;

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
function setSaveState(kind, message) {
  if (!saveState || !saveStateCopy) return;
  saveState.className = `save-state is-${kind}`;
  saveStateCopy.textContent = message;
}
function setSaveControlsDisabled(disabled) {
  form.querySelectorAll('#save-progress, button[type="submit"], [data-save-continue]').forEach(button => {
    button.disabled = disabled;
  });
}
function updateMessageBadges() {
  messageBadges.forEach(badge => {
    badge.hidden = unseenMessageCount === 0;
    badge.textContent = unseenMessageCount > 9 ? '9+' : String(unseenMessageCount);
  });
}
function openMessages(trigger = null) {
  if (!messageDrawer || !messageDrawerBackdrop) return;
  activeMessageTrigger = trigger || document.activeElement;
  messageDrawer.hidden = false;
  messageDrawerBackdrop.hidden = false;
  document.body.classList.add('message-drawer-open');
  messageOpenButtons.forEach(button => button.setAttribute('aria-expanded', 'true'));
  unseenMessageCount = 0;
  updateMessageBadges();
  closeMessageDrawerButton?.focus();
}
function closeMessages() {
  if (!messageDrawer || !messageDrawerBackdrop) return;
  messageDrawer.hidden = true;
  messageDrawerBackdrop.hidden = true;
  document.body.classList.remove('message-drawer-open');
  messageOpenButtons.forEach(button => button.setAttribute('aria-expanded', 'false'));
  if (activeMessageTrigger?.focus) activeMessageTrigger.focus();
}
function setRealtimeState(label, isLive, copy) {
  if (realtimeStatus) {
    realtimeStatus.textContent = label;
    realtimeStatus.classList.toggle('is-live', isLive);
  }
  if (messageDeliveryCopy) messageDeliveryCopy.textContent = copy;
}
function sectionHasData(section) {
  const key = section?.dataset.sectionKey;
  if (key === 'schedule') return collectRows(scheduleList).length > 0;
  if (key === 'contacts') return collectRows(contactList).length > 0;
  if (key === 'documents') return Boolean(coordination?.documents?.length);
  return [...section.querySelectorAll('input, textarea')].some(field => field.type !== 'file' && String(field.value || '').trim());
}
function updateProgress() {
  if (!coordinationSections.length) return;
  let sectionsWithInformation = 0;
  coordinationSections.forEach(section => {
    const hasData = sectionHasData(section);
    if (hasData) sectionsWithInformation += 1;
    const state = section.querySelector('[data-section-state]');
    if (state) {
      state.textContent = hasData ? 'Has details' : 'Not started';
      state.classList.toggle('has-details', hasData);
    }
  });
  if (progressCopy) {
    if (sectionsWithInformation === 0) {
      progressCopy.textContent = 'No sections have information yet. Start wherever you have confirmed details.';
    } else if (sectionsWithInformation === coordinationSections.length) {
      progressCopy.textContent = 'All 6 sections have information. Review anything you want to change before submitting.';
    } else {
      progressCopy.textContent = `${sectionsWithInformation} of ${coordinationSections.length} sections have information.`;
    }
  }
  if (progressBar) progressBar.style.width = `${Math.round((sectionsWithInformation / coordinationSections.length) * 100)}%`;
}
function openSuggestedSection() {
  if (initialSectionOpened || !coordinationSections.length) return;
  const target = coordinationSections.find(section => !sectionHasData(section)) || coordinationSections[0];
  target.open = true;
  initialSectionOpened = true;
}
function renderCoordinationStatus() {
  const submitted = coordination?.coordinationStatus === 'submitted';
  const status = document.querySelector('#coordination-status');
  const statusCopy = document.querySelector('#coordination-status-copy');
  const submittedBanner = document.querySelector('#submitted-banner');
  const submittedHeading = submittedBanner?.querySelector('strong');
  const submittedCopy = document.querySelector('#submitted-copy');

  if (status) status.textContent = submitted ? 'Submitted for ministry review' : "You're still working on this";
  if (statusCopy) {
    statusCopy.textContent = submitted
      ? 'The ministry team has received your information. You can still update details while this link remains active.'
      : 'Your saved information is available to the ministry team. You can leave and return using this link.';
  }
  if (submittedBanner) submittedBanner.hidden = !submitted;
  if (submittedHeading) submittedHeading.textContent = 'Submitted for ministry review';
  if (submitted && submittedCopy) {
    const submittedAt = coordination.submittedAtUtc ? new Date(coordination.submittedAtUtc).toLocaleString() : '';
    submittedCopy.textContent = `${submittedAt ? `Submitted ${submittedAt}. ` : ''}Need to correct something? Message the ministry team.`;
  }
}
function markDirty() {
  changeVersion += 1;
  formDirty = true;
  window.clearTimeout(saveResetTimer);
  setSaveState('dirty', 'Unsaved changes');
  updateProgress();
  scheduleAutosave();
}
function scheduleAutosave() {
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(async () => {
    if (!formDirty) return;
    if (saveInFlight) {
      scheduleAutosave();
      return;
    }
    if (form.querySelector(':invalid')) return;
    await save(false, { automatic: true, quiet: true });
  }, autosaveDelayMs);
}
function initializeSectionNavigation() {
  coordinationSections.forEach((section, index) => {
    section.addEventListener('toggle', () => {
      if (!section.open) return;
      coordinationSections.forEach(other => {
        if (other !== section) other.open = false;
      });
    });

    section.querySelector('[data-save-continue]')?.addEventListener('click', async () => {
      const saved = await save(false, { quiet: true });
      if (!saved) return;
      const nextSection = coordinationSections[index + 1];
      if (!nextSection) {
        showConfirmation('Your progress is saved. Review anything you want to change, then submit when you are ready.', 'info');
        return;
      }
      section.open = false;
      nextSection.open = true;
      nextSection.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    });
  });
}
function initializeMessageDrawer() {
  messageOpenButtons.forEach(button => button.addEventListener('click', () => openMessages(button)));
  closeMessageDrawerButton?.addEventListener('click', closeMessages);
  messageDrawerBackdrop?.addEventListener('click', closeMessages);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && messageDrawer && !messageDrawer.hidden) closeMessages();
  });
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
  row.querySelector('.remove-button').addEventListener('click', () => { row.remove(); markDirty(); });
  scheduleList.append(row);
}
function addContact(item = {}) {
  const row = document.createElement('article');
  row.className = 'repeat-row contacts';
  row.innerHTML = `<label class="field"><span>Type</span><select data-name="type"><option value="primary">Primary host</option><option value="travel">Travel</option><option value="media">Media</option><option value="emergency">Emergency</option><option value="other">Other</option></select></label>${input('Name','name',item.name)}${input('Email','email',item.email,'email')}${input('Phone','phone',item.phone,'tel')}<button type="button" class="remove-button">Remove</button>`;
  row.querySelector('[data-name="type"]').value = item.type || 'other';
  row.querySelector('.remove-button').addEventListener('click', () => { row.remove(); markDirty(); });
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
  documentList.innerHTML = docs.length ? docs.map(doc => `<article class="document-row"><div><a href="${coordinationApiUrl}/documents/${doc.id}" target="_blank" rel="noopener">${escapeHtml(doc.fileName)}</a><small>${Math.max(1, Math.round(doc.length / 1024))} KB · ${new Date(doc.uploadedAtUtc).toLocaleString()}</small></div><strong>Received</strong></article>`).join('') : '<p>No host documents uploaded yet.</p>';
}

function renderMessages() {
  if (!messageList) return;

  const messages = messageThread?.messages || [];
  messageList.innerHTML = messages.length
    ? messages.map(message => `
        <article class="coordination-message ${message.senderType === 'host' ? 'is-host' : ''}">
          <strong>${escapeHtml(message.senderName)}</strong>
          <p>${escapeHtml(message.message)}</p>
          <time>${new Date(message.createdAtUtc).toLocaleString()}</time>
        </article>`).join('')
    : '<p>No coordination messages yet.</p>';

  messageList.scrollTop = messageList.scrollHeight;

  if (messageInput) messageInput.disabled = Boolean(messageThread?.isClosed);
  const sendButton = messageForm?.querySelector('button[type="submit"]');
  if (sendButton) {
    sendButton.disabled = Boolean(messageThread?.isClosed);
    sendButton.textContent = messageThread?.isClosed ? 'Conversation closed' : 'Send message';
  }
}

async function loadMessages() {
  try {
    messageThread = await api(messagesApiUrl);
    renderMessages();
  } catch (error) {
    if (messageList) {
      messageList.innerHTML = `<p>${escapeHtml(error.message || 'Messages are unavailable.')}</p>`;
    }
  }
}

function applyRealtimeMessage(event) {
  if (!event || event.assignmentId !== coordination?.assignmentId || !event.message) return;

  const messages = messageThread?.messages || [];
  if (messages.some(message => message.id === event.message.id)) return;

  messageThread = {
    ...messageThread,
    messages: [...messages, event.message]
  };
  if (messageDrawer?.hidden && event.message.senderType !== 'host') {
    unseenMessageCount += 1;
    updateMessageBadges();
  }
  renderMessages();
}

async function connectRealtime() {
  if (stopRealtime || !coordination?.assignmentId) return;

  if (legacyToken) {
    setRealtimeState('Messages available', false, 'Messages are saved with this engagement. Refresh the page to see new replies.');
    return;
  }

  if (!window.ApostolOSRealtime) {
    setRealtimeState('Messages available', false, 'Messages still work. Refresh the page to see new replies from the ministry team.');
    return;
  }

  try {
    stopRealtime = await window.ApostolOSRealtime.connectToEngagement(
      coordination.assignmentId,
      {
        messageCreated: applyRealtimeMessage,
        coordinationUpdated: async event => {
          if (!event || event.assignmentId !== coordination?.assignmentId || event.updatedBy !== 'ministry') return;

          if (formDirty || saveInFlight) {
            showConfirmation('The ministry team updated this engagement. Save your current work before loading their changes.', 'info');
            return;
          }

          await load('The ministry team updated this engagement. Latest details loaded.');
        },
        documentAdded: event => {
          if (!event || event.assignmentId !== coordination?.assignmentId || event.updatedBy !== 'ministry' || !event.document) return;

          const documents = coordination.documents || [];
          if (!documents.some(document => document.id === event.document.id)) {
            coordination.documents = [event.document, ...documents];
            renderDocuments();
            updateProgress();
            showConfirmation('The ministry team added a document to this engagement.', 'info');
          }
        },
        reconnected: async () => {
          await loadMessages();
        }
      }
    );

    setRealtimeState('Live replies on', true, 'New replies appear automatically while this page is open.');
  } catch {
    setRealtimeState('Messages available', false, 'Messages still work. Refresh the page to see new replies from the ministry team.');
  }
}

function render() {
  document.querySelector('#reference').textContent = coordination.referenceNumber;
  document.querySelector('#event-name').textContent = coordination.eventName;
  document.querySelector('#event-copy').textContent = `${coordination.hostOrganization} · ${formatDate(coordination.eventStartDate)}${coordination.eventEndDate !== coordination.eventStartDate ? ` – ${formatDate(coordination.eventEndDate)}` : ''}`;
  renderCoordinationStatus();
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
  window.clearTimeout(autosaveTimer);
  setSaveState('saved', 'All changes saved');
  updateProgress();
  openSuggestedSection();
}
async function load(syncMessage = '') {
  try {
    showState('Loading secure host coordination…');
    coordination = await api(coordinationApiUrl);
    showState('');
    render();
    await loadMessages();
    await connectRealtime();
    if (syncMessage) showConfirmation(syncMessage, 'info');
  } catch (error) {
    view.hidden = true;
    showState(error.message, 'error');
  }
}
async function save(submit, options = {}) {
  const { automatic = false, quiet = false } = options;
  if (saveInFlight) {
    if (!submit) scheduleAutosave();
    return false;
  }

  if (!submit) {
    const invalidField = form.querySelector(':invalid');
    if (invalidField) {
      invalidField.closest('details')?.setAttribute('open', '');
      if (!automatic) {
        invalidField.reportValidity?.();
        showConfirmation('Check the highlighted field before saving.', 'error');
      }
      return false;
    }
    if (!formDirty) {
      setSaveState('saved', 'All changes saved');
      if (!automatic && !quiet) showConfirmation('Everything is already saved.');
      return true;
    }
  }

  saveInFlight = true;
  window.clearTimeout(autosaveTimer);
  window.clearTimeout(saveResetTimer);
  const versionAtStart = changeVersion;
  setSaveControlsDisabled(true);
  setSaveState('saving', submit ? 'Submitting…' : 'Saving…');

  try {
    if (submit) showState('Submitting for ministry review…');
    coordination = await api(coordinationApiUrl, { method:'PUT', body:JSON.stringify(payload(submit)) });
    const unchangedSinceSaveStarted = changeVersion === versionAtStart;
    if (unchangedSinceSaveStarted) formDirty = false;
    broadcastCollaborationUpdate('host');
    renderCoordinationStatus();
    updateProgress();

    if (submit) {
      showState('Submitted for ministry review.', 'success');
      setSaveState('saved', unchangedSinceSaveStarted ? 'Submitted and saved' : 'Submitted · newer changes not saved');
      showConfirmation('Submitted for ministry review. The ministry team can now review these details.');
      window.scrollTo({ top:0, behavior:'smooth' });
    } else if (unchangedSinceSaveStarted) {
      setSaveState('saved', 'Saved just now');
      saveResetTimer = window.setTimeout(() => setSaveState('saved', 'All changes saved'), 3200);
      if (!automatic && !quiet) showConfirmation('Progress saved. The ministry team can see your updates.');
    } else {
      setSaveState('dirty', 'Unsaved changes');
      scheduleAutosave();
    }
    return true;
  } catch (error) {
    setSaveState('error', 'Could not save');
    showState(submit ? error.message : '', submit ? 'error' : '');
    if (!automatic || !quiet) showConfirmation(error.message || 'The coordination update could not be saved.', 'error');
    return false;
  } finally {
    saveInFlight = false;
    setSaveControlsDisabled(false);
  }
}

form.addEventListener('invalid', event => {
  const section = event.target.closest('details');
  if (section) section.open = true;
}, true);
form.addEventListener('input', event => {
  if (event.target?.type === 'file') return;
  markDirty();
});
form.addEventListener('change', event => {
  if (event.target?.type === 'file' || !event.target?.matches('select')) return;
  markDirty();
});
document.querySelector('#add-schedule').addEventListener('click', () => { addSchedule({ date: coordination?.eventStartDate }); markDirty(); });
document.querySelector('#add-contact').addEventListener('click', () => { addContact(); markDirty(); });
saveProgressButton.addEventListener('click', () => save(false));
form.addEventListener('submit', event => { event.preventDefault(); save(true); });


messageForm?.addEventListener('submit', async event => {
  event.preventDefault();

  const message = String(messageInput?.value || '').trim();
  if (!message || messageThread?.isClosed) return;

  const sendButton = messageForm.querySelector('button[type="submit"]');
  if (sendButton) sendButton.disabled = true;

  try {
    const body = legacyToken
      ? { senderName: 'Host', message }
      : { message };

    messageThread = await api(messagesApiUrl, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (messageInput) messageInput.value = '';
    renderMessages();
  } catch (error) {
    showConfirmation(error.message || 'The message could not be sent.', 'error');
  } finally {
    if (sendButton && !messageThread?.isClosed) sendButton.disabled = false;
  }
});
document.querySelector('#upload-document').addEventListener('click', async () => {
  const input = document.querySelector('#document-file');
  const file = input.files?.[0];
  if (!file) { showConfirmation('Choose a document before uploading.', 'error'); return; }
  try {
    showConfirmation(`Uploading ${file.name}…`, 'info');
    const body = new FormData(); body.append('file', file);
    const response = await fetch(`${coordinationApiUrl}/documents`, { method:'POST', body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const validation = result?.errors ? Object.values(result.errors).flat().join(' ') : '';
      throw new Error(validation || result?.message || `Upload failed (${response.status})`);
    }
    coordination.documents = [result, ...(coordination.documents || [])];
    input.value = '';
    renderDocuments();
    updateProgress();
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
initializeSectionNavigation();
initializeMessageDrawer();
updateMessageBadges();
load();
