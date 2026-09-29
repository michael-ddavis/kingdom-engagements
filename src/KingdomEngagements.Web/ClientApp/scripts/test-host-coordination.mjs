import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

const html = await readFile(new URL('../../wwwroot/coordination.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../../wwwroot/coordination.js', import.meta.url), 'utf8');

async function setup(t, failSave = false) {
  const dom = new JSDOM(html, { url: 'https://example.test/host/coordination', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  const calls = [];
  let record = {
    referenceNumber: 'TEST-1', eventName: 'Test gathering', hostOrganization: 'Test host',
    eventStartDate: '2026-10-30', eventEndDate: '2026-10-30', coordinationStatus: 'draft',
    hotelName: 'Existing hotel', contacts: [], schedule: [], documents: [],
  };
  window.fetch = async (url, options = {}) => {
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body);
      calls.push(body);
      if (failSave) return { ok: false, json: async () => ({ message: 'Could not save. Try again.' }) };
      record = { ...record, ...body, coordinationStatus: body.submit ? 'submitted' : 'draft' };
    }
    return { ok: true, json: async () => url.endsWith('/messages') ? { messages: [], isClosed: false } : record };
  };
  window.eval(script);
  await new Promise(resolve => setImmediate(resolve));
  // Let initial native details toggle events settle before simulating user input.
  await new Promise(resolve => window.setTimeout(resolve, 0));
  return { window, document: window.document, calls };
}

test('saving retains values from closed sections and keeps the current section open', async t => {
  const { window, document, calls } = await setup(t);
  const hotel = document.querySelector('[name="hotelName"]');
  const prayer = document.querySelector('[name="prayerFocus"]');
  assert.equal(hotel.closest('details').open, false);
  prayer.closest('details').open = true;
  prayer.value = 'Unity';
  prayer.dispatchEvent(new window.Event('input', { bubbles: true }));
  document.querySelector('#save-progress').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[0].hotelName, 'Existing hotel');
  assert.equal(calls[0].prayerFocus, 'Unity');
  assert.equal(calls[0].submit, false);
  assert.equal(prayer.closest('details').open, true);
  assert.equal(document.querySelector('#save-state-copy').textContent, 'Saved just now');
});

test('invalid email in a closed section reveals the field and prevents submission', async t => {
  const { document, calls } = await setup(t);
  document.querySelector('#add-contact').click();
  const email = document.querySelector('#contact-list [data-name="email"]');
  email.value = 'not-an-email';
  assert.equal(email.closest('details').open, false);
  document.querySelector('#coordination-form button[type="submit"]').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(email.closest('details').open, true);
  assert.equal(calls.length, 0);
});

test('submission includes closed-section values and shows confirmation', async t => {
  const { document, calls } = await setup(t);
  document.querySelector('#coordination-form button[type="submit"]').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[0].submit, true);
  assert.equal(calls[0].hotelName, 'Existing hotel');
  assert.equal(document.querySelector('#submitted-banner').hidden, false);
});

test('failed save keeps entered values and allows retry', async t => {
  const { window, document } = await setup(t, true);
  const hotel = document.querySelector('[name="hotelName"]');
  hotel.value = 'Updated hotel';
  hotel.dispatchEvent(new window.Event('input', { bubbles: true }));
  document.querySelector('#save-progress').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(hotel.value, 'Updated hotel');
  assert.equal(document.querySelector('#save-progress').disabled, false);
  assert.match(document.querySelector('#coordination-save-toast').textContent, /Could not save/);
});


test('message team is available without scrolling to the bottom', async t => {
  const { document } = await setup(t);
  const drawer = document.querySelector('#message-drawer');
  assert.equal(drawer.hidden, true);

  document.querySelector('[data-open-messages]').click();

  assert.equal(drawer.hidden, false);
  assert.equal(document.querySelector('#message-drawer-backdrop').hidden, false);
  assert.equal(document.querySelector('[data-open-messages]').getAttribute('aria-expanded'), 'true');

  document.querySelector('#close-message-drawer').click();
  assert.equal(drawer.hidden, true);
});

test('editing makes save state and section progress obvious', async t => {
  const { window, document } = await setup(t);
  const prayer = document.querySelector('[name="prayerFocus"]');
  prayer.value = 'Unity and healing';
  prayer.dispatchEvent(new window.Event('input', { bubbles: true }));

  assert.equal(document.querySelector('#save-state-copy').textContent, 'Unsaved changes');
  assert.equal(prayer.closest('details').querySelector('[data-section-state]').textContent, 'Has details');
  assert.match(document.querySelector('#progress-copy').textContent, /sections have information/);
});


test('empty schedule and contacts do not create blank rows', async t => {
  const { document } = await setup(t);
  assert.equal(document.querySelectorAll('#schedule-list .repeat-row').length, 0);
  assert.equal(document.querySelectorAll('#contact-list .repeat-row').length, 0);
  assert.match(document.querySelector('#schedule-list').textContent, /Nothing added yet/);
  assert.match(document.querySelector('#contact-list').textContent, /Nothing added yet/);
});

test('secondary booking details stay tucked away until they contain a value', async t => {
  const { document } = await setup(t);
  const outboundConfirmation = document.querySelector('[name="outboundConfirmationNumber"]');
  assert.equal(outboundConfirmation.closest('.optional-details').open, false);
});
