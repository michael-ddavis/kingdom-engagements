(() => {
  const terminal = new Set(['complete', 'completed', 'waived']);

  function norm(value) {
    return String(value || '').trim().toLowerCase();
  }

  function selected() {
    try {
      return typeof state !== 'undefined' ? state?.selected : null;
    } catch {
      return null;
    }
  }

  function openPane(key) {
    const button = document.querySelector(`[data-legacy-pane="${key}"]`);
    if (button instanceof HTMLElement) button.click();
  }

  function percentageFromRow(row) {
    const values = [...row.querySelectorAll('strong')]
      .map(node => String(node.textContent || '').trim())
      .filter(value => /^\d+%$/.test(value));
    return values[values.length - 1] || '—';
  }

  function readinessLookup(overview) {
    const rows = [...overview.querySelectorAll('.legacy18-readiness-row')];
    const find = (...terms) => rows.find(row => {
      const label = norm(row.querySelector(':scope > div:first-child > strong')?.textContent);
      return terms.some(term => label.includes(term));
    });
    const travelRows = rows.filter(row => {
      const label = norm(row.querySelector(':scope > div:first-child > strong')?.textContent);
      return ['travel', 'lodging', 'transportation'].some(term => label.includes(term));
    });
    const travelValues = travelRows
      .map(row => Number(percentageFromRow(row).replace('%', '')))
      .filter(Number.isFinite);
    const travelPercent = travelValues.length
      ? `${Math.round(travelValues.reduce((sum, value) => sum + value, 0) / travelValues.length)}%`
      : '—';

    return {
      travel: travelPercent,
      contacts: percentageFromRow(find('host', 'contact') || document.createElement('div')),
      documents: percentageFromRow(find('document', 'file') || document.createElement('div')),
    };
  }

  function shortcut(key, label, value, note) {
    return `<button type="button" class="engagements-brief-shortcut" data-brief-pane="${key}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
      <i aria-hidden="true">→</i>
    </button>`;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function enhanceBrief(overview) {
    if (!(overview instanceof HTMLElement) || overview.dataset.assignmentBrief === 'true') return;
    overview.dataset.assignmentBrief = 'true';

    const tab = document.querySelector('[data-legacy-pane="overview"]');
    setText(tab?.querySelector('strong'), 'Brief');
    setText(tab?.querySelector('small'), 'Assignment brief');

    if (!overview.querySelector('.engagements-brief-heading')) {
      const heading = document.createElement('header');
      heading.className = 'engagements-brief-heading';
      heading.innerHTML = `<div><p class="eyebrow">Assignment brief</p><h2>At a glance</h2><p>See what needs attention, how the host is progressing, and where to continue the work.</p></div>`;
      overview.prepend(heading);
    }

    const source = overview.querySelector('.legacy18-source-panel');
    if (source instanceof HTMLDetailsElement) {
      source.open = false;
      const summary = source.querySelector(':scope > summary');
      const eyebrow = summary?.querySelector('small');
      const title = summary?.querySelector('strong');
      const note = summary?.querySelector('em');
      setText(eyebrow, 'Engagement details');
      if (title?.textContent.includes('Approved terms retained')) {
        title.textContent = title.textContent.replace('Approved terms retained', 'Accepted invitation and terms');
      }
      setText(note, 'View source record');
    }

    const radar = overview.querySelector('.legacy18-readiness-panel');
    if (radar) {
      setText(radar.querySelector('header .eyebrow'), 'Preparation status');
      setText(radar.querySelector('header h2'), 'Readiness by work area');
    }

    if (!overview.querySelector('.engagements-brief-shortcuts')) {
      const item = selected();
      const openTasks = (item?.tasks || []).filter(task => !terminal.has(norm(task.status))).length;
      const readiness = readinessLookup(overview);
      const shortcuts = document.createElement('section');
      shortcuts.className = 'engagements-brief-shortcuts';
      shortcuts.setAttribute('aria-label', 'Continue assignment work');
      shortcuts.innerHTML = [
        shortcut('checklist', 'Checklist', openTasks ? `${openTasks} open` : 'Complete', 'Responsibilities and deadlines'),
        shortcut('travel', 'Travel', readiness.travel, 'Flights, lodging and transportation'),
        shortcut('contacts', 'Contacts', readiness.contacts, 'Host and assignment contacts'),
        shortcut('documents', 'Documents', readiness.documents, 'Files, schedules and resources'),
      ].join('');
      const insertBefore = source || radar;
      if (insertBefore) overview.insertBefore(shortcuts, insertBefore);
      else overview.append(shortcuts);
      shortcuts.querySelectorAll('[data-brief-pane]').forEach(button => {
        button.addEventListener('click', () => openPane(button.dataset.briefPane));
      });
    }
  }

  function sync() {
    document.querySelectorAll('[data-legacy-pane="overview"]').forEach(tab => {
      setText(tab.querySelector('strong'), 'Brief');
      setText(tab.querySelector('small'), 'Assignment brief');
    });
    document.querySelectorAll('.exact18-overview').forEach(enhanceBrief);
  }

  document.addEventListener('DOMContentLoaded', sync);
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-legacy-pane="overview"]')) requestAnimationFrame(sync);
  }, true);

  const observer = new MutationObserver(() => sync());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
