const completionSelectAssignment = selectAssignment;
selectAssignment = async function(id) {
  await completionSelectAssignment(id);
  await renderCompletionWorkspace();
};

async function renderCompletionWorkspace() {
  if (!state.selectedId || !detail.querySelector('.detail-header')) return;
  try {
    const [completion, workspaceResult] = await Promise.all([
      api(`/api/engagements/assignments/${state.selectedId}/completion`),
      api(`/api/engagements/assignments/${state.selectedId}/workspace`).catch(() => null),
    ]);
    state.completion = completion;
    const coordination = workspaceResult?.workspace?.preparation?.coordination || {};
    const panel = document.createElement('section');
    panel.className = 'completion-workspace';
    panel.innerHTML = `
      <header class="completion-workspace__header">
        <div><p class="eyebrow">Event → response → follow-up → closeout</p><h3>Ministry outcome & closeout</h3><p>Move the assignment from arrival through ministry response and responsible follow-up to a completed record.</p></div>
        <div class="completion-metrics"><span><strong>${completion.totalResponses}</strong> responses</span><span><strong>${completion.followUpsOpen}</strong> follow-ups open</span></div>
      </header>
      <nav class="completion-tabs">
        <button type="button" class="is-active" data-completion-tab="event">Event day</button>
        <button type="button" data-completion-tab="responses">Ministry responses</button>
        <button type="button" data-completion-tab="followup">Follow-up</button>
        <button type="button" data-completion-tab="closeout">Closeout</button>
      </nav>
      <section class="completion-pane is-active" data-completion-pane="event">${eventPane(coordination)}</section>
      <section class="completion-pane" data-completion-pane="responses">${responsesPane(completion.responses)}</section>
      <section class="completion-pane" data-completion-pane="followup">${followUpPane(completion.responses)}</section>
      <section class="completion-pane" data-completion-pane="closeout">${closeoutPane(completion.closeout, completion.canComplete)}</section>`;
    const anchor = detail.querySelector('.assignment-workspace') || detail.querySelector('.detail-header');
    anchor.insertAdjacentElement('afterend', panel);
    bindCompletionWorkspace(panel);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function eventPane(coordination) {
  const schedule = coordination.schedule || [];
  const contacts = coordination.contacts || [];
  return `
    <div class="event-day-grid">
      <section><p class="eyebrow">Run of day</p><h4>Final event schedule</h4>
        <div class="event-schedule">${schedule.length ? schedule.map(item => `<article><time>${escapeHtml(item.startsAt || 'Time pending')}${item.endsAt ? `–${escapeHtml(item.endsAt)}` : ''}</time><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.location || 'Location pending')}</p>${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ''}</div></article>`).join('') : '<p class="completion-empty">No event schedule has been recorded yet.</p>'}</div>
      </section>
      <aside class="event-quick-reference">
        <p class="eyebrow">On the ground</p><h4>Quick reference</h4>
        ${quickReference('Outbound', coordination.outboundAirline ? `${coordination.outboundAirline} ${coordination.outboundFlightNumber || ''} · ${coordination.outboundDepartureAirport || '—'} → ${coordination.outboundArrivalAirport || '—'}` : 'Not recorded')}
        ${quickReference('Hotel', coordination.hotelName || 'Not recorded')}
        ${quickReference('Transportation', coordination.pickupContactName ? `${coordination.pickupContactName}${coordination.pickupContactPhone ? ` · ${coordination.pickupContactPhone}` : ''}` : coordination.transportationPlan || 'Not recorded')}
        ${quickReference('Primary host', primaryContactSummary(contacts))}
        ${quickReference('Prayer focus', coordination.prayerFocus || 'Not recorded')}
      </aside>
    </div>`;
}

function quickReference(label, value) { return `<div class="quick-reference"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`; }

function responsesPane(responses) {
  return `
    <div class="section-intro"><p class="eyebrow">Ministry responses</p><h4>Record what happened</h4><p>Use counts for aggregate ministry outcomes and individual records only when personal follow-up is actually needed.</p></div>
    <form id="response-form" class="response-form">
      <label><span>Response type</span><select name="type"><option value="salvation">Salvation</option><option value="recommitment">Recommitment</option><option value="prayer-request">Prayer request</option><option value="healing-testimony">Healing / testimony</option><option value="discipleship">Discipleship interest</option><option value="pastoral-follow-up">Pastoral follow-up</option><option value="ministry-interest">Ministry interest</option><option value="other">Other</option></select></label>
      <label><span>Count</span><input type="number" name="count" min="1" value="1" required /></label>
      <label><span>Name (only if follow-up needed)</span><input name="personName" /></label>
      <label><span>Email</span><input type="email" name="email" /></label>
      <label><span>Phone</span><input type="tel" name="phone" /></label>
      <label><span>Follow-up owner</span><input name="followUpOwner" placeholder="Pastoral care, local church, engagement coordinator..." /></label>
      <label><span>Follow-up due</span><input type="datetime-local" name="followUpDueAtUtc" /></label>
      <label class="response-form__wide"><span>Notes</span><textarea name="notes" rows="3" maxlength="4000"></textarea></label>
      <label class="response-followup-check"><input type="checkbox" name="requiresFollowUp" /><span>This response needs individual follow-up</span></label>
      <button type="submit" class="primary-save">Add response</button>
    </form>
    <div class="response-list">${responses.length ? responses.map(responseCard).join('') : '<p class="completion-empty">No ministry responses have been recorded yet.</p>'}</div>`;
}

function responseCard(item) {
  return `<article class="response-card"><div><span>${escapeHtml(formatStatus(item.type))}</span><strong>${item.count}</strong></div><section>${item.personName ? `<b>${escapeHtml(item.personName)}</b>` : ''}<p>${escapeHtml(item.notes || 'No notes')}</p><small>${item.requiresFollowUp ? `Follow-up: ${escapeHtml(formatStatus(item.followUpStatus))}` : 'No individual follow-up required'} · ${escapeHtml(formatDateTime(item.createdAtUtc))}</small></section></article>`;
}

function followUpPane(responses) {
  const items = responses.filter(item => item.requiresFollowUp);
  return `<div class="section-intro"><p class="eyebrow">Responsible follow-up</p><h4>People should not disappear after the altar</h4><p>Track ownership and completion without turning every aggregate ministry count into a person record.</p></div>
    <div class="followup-list">${items.length ? items.map(item => `
      <form class="followup-card" data-followup-id="${item.id}">
        <header><div><span>${escapeHtml(formatStatus(item.type))}</span><strong>${escapeHtml(item.personName || 'Follow-up response')}</strong></div><b>${escapeHtml(formatStatus(item.followUpStatus))}</b></header>
        <div class="followup-grid">
          <label><span>Status</span><select name="status">${['needs-follow-up','assigned','in-progress','completed'].map(status => `<option value="${status}" ${status === item.followUpStatus ? 'selected' : ''}>${formatStatus(status)}</option>`).join('')}</select></label>
          <label><span>Owner</span><input name="owner" value="${escapeHtml(item.followUpOwner || '')}" /></label>
          <label><span>Due</span><input type="datetime-local" name="dueAtUtc" value="${dateTimeLocal(item.followUpDueAtUtc)}" /></label>
          <label class="followup-notes"><span>Follow-up notes</span><textarea name="notes" rows="2">${escapeHtml(item.followUpNotes || '')}</textarea></label>
        </div><button type="submit" class="secondary-save">Save follow-up</button>
      </form>`).join('') : '<p class="completion-empty">There are no individual follow-ups waiting.</p>'}</div>`;
}

function closeoutPane(closeout, canComplete) {
  return `<form id="closeout-form" class="closeout-form">
    <div class="section-intro"><p class="eyebrow">Closeout</p><h4>Finish the assignment responsibly</h4><p>Closeout is only available after ministry outcomes, follow-up, administrative work, and assignment tasks are resolved.</p></div>
    <div class="closeout-notes">
      <label><span>Event notes</span><textarea name="eventNotes" rows="4">${escapeHtml(closeout.eventNotes || '')}</textarea></label>
      <label><span>Testimony / outcome summary</span><textarea name="testimonySummary" rows="4">${escapeHtml(closeout.testimonySummary || '')}</textarea></label>
      <label><span>Host follow-up notes</span><textarea name="hostFollowUpNotes" rows="4">${escapeHtml(closeout.hostFollowUpNotes || '')}</textarea></label>
    </div>
    <div class="closeout-checklist">
      ${closeoutCheck('hostFollowUpComplete','Host follow-up complete',closeout.hostFollowUpComplete)}
      ${closeoutCheck('finalDocumentsComplete','Final documents received / filed',closeout.finalDocumentsComplete)}
      ${closeoutCheck('paymentComplete','Honorarium / payment reconciled',closeout.paymentComplete)}
      ${closeoutCheck('administrativeFollowUpComplete','Administrative follow-up complete',closeout.administrativeFollowUpComplete)}
      ${closeoutCheck('outcomesRecorded','Ministry outcomes recorded',closeout.outcomesRecorded)}
      ${systemCheck('Individual follow-ups complete',closeout.allFollowUpsComplete)}
      ${systemCheck('Assignment tasks resolved',closeout.allReadinessTasksResolved)}
    </div>
    <footer class="closeout-actions"><div><strong>${closeout.completedAtUtc ? `Closed ${escapeHtml(formatDateTime(closeout.completedAtUtc))}` : canComplete ? 'Ready to close' : 'Closeout requirements remain'}</strong></div><div><button type="submit" class="secondary-save" data-closeout-complete="false">Save closeout</button><button type="submit" class="primary-save" data-closeout-complete="true" ${canComplete ? '' : 'disabled'}>Complete assignment</button></div></footer>
  </form>`;
}
function closeoutCheck(name,label,checked){return `<label class="closeout-check"><input type="checkbox" name="${name}" ${checked?'checked':''}/><span>${escapeHtml(label)}</span></label>`;}
function systemCheck(label,checked){return `<div class="closeout-check system-check ${checked?'is-complete':''}"><span>${checked?'✓':'○'} ${escapeHtml(label)}</span></div>`;}

function bindCompletionWorkspace(panel) {
  panel.querySelectorAll('[data-completion-tab]').forEach(button => button.addEventListener('click', () => {
    panel.querySelectorAll('[data-completion-tab]').forEach(x => x.classList.toggle('is-active', x === button));
    panel.querySelectorAll('[data-completion-pane]').forEach(x => x.classList.toggle('is-active', x.dataset.completionPane === button.dataset.completionTab));
  }));
  panel.querySelector('#response-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    try {
      await api(`/api/engagements/assignments/${state.selectedId}/responses`, { method:'POST', body:JSON.stringify({
        type:data.get('type'), count:Number(data.get('count')||1), personName:data.get('personName')||null, email:data.get('email')||null, phone:data.get('phone')||null,
        notes:data.get('notes')||null, requiresFollowUp:data.get('requiresFollowUp')==='on', followUpOwner:data.get('followUpOwner')||null,
        followUpDueAtUtc:data.get('followUpDueAtUtc')?new Date(data.get('followUpDueAtUtc')).toISOString():null }) });
      showMessage('Ministry response recorded.'); await selectAssignment(state.selectedId);
    } catch(error){showMessage(error.message,true);}
  });
  panel.querySelectorAll('[data-followup-id]').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault(); const data=new FormData(form);
    try { await api(`/api/engagements/assignments/${state.selectedId}/responses/${form.dataset.followupId}/follow-up`, {method:'PUT',body:JSON.stringify({status:data.get('status'),owner:data.get('owner')||null,dueAtUtc:data.get('dueAtUtc')?new Date(data.get('dueAtUtc')).toISOString():null,notes:data.get('notes')||null})}); showMessage('Follow-up updated.'); await selectAssignment(state.selectedId); }
    catch(error){showMessage(error.message,true);}
  }));
  panel.querySelector('#closeout-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const data=new FormData(event.currentTarget); const complete=event.submitter?.dataset.closeoutComplete==='true';
    if (complete && !await window.kingdomConfirm({
      title: 'Complete this assignment?',
      message: 'This closes the active work and moves the assignment into the archive. The record remains available for reference.',
      confirmLabel: 'Complete & archive',
    })) return;
    try { await api(`/api/engagements/assignments/${state.selectedId}/closeout`, {method:'PUT',body:JSON.stringify({eventNotes:data.get('eventNotes')||null,testimonySummary:data.get('testimonySummary')||null,hostFollowUpComplete:data.get('hostFollowUpComplete')==='on',hostFollowUpNotes:data.get('hostFollowUpNotes')||null,finalDocumentsComplete:data.get('finalDocumentsComplete')==='on',paymentComplete:data.get('paymentComplete')==='on',administrativeFollowUpComplete:data.get('administrativeFollowUpComplete')==='on',outcomesRecorded:data.get('outcomesRecorded')==='on',complete})}); showMessage(complete?'Assignment completed and closed out.':'Closeout saved.'); await loadAssignments(true); }
    catch(error){showMessage(error.message,true);}
  });
}
