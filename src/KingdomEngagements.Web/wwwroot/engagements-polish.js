(() => {
  const accordionSelector = [
    'details.legacy18-stage',
    'details.legacy18-form-section',
    'details.legacy18-contact-card',
    'details.legacy18-source-panel'
  ].join(',');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const contactDrafts = new Map();
  const contactOpenState = new Map();

  function currentAssignmentId() {
    try {
      return typeof state !== 'undefined' && state?.selectedId ? String(state.selectedId) : 'none';
    } catch {
      return 'none';
    }
  }

  function contactKey(detail, fieldName = '') {
    const type = detail?.dataset?.contact || 'contact';
    return `${currentAssignmentId()}:${type}:${fieldName}`;
  }

  function rememberContactFields(scope = document) {
    scope.querySelectorAll?.('.legacy18-contact-card').forEach(detail => {
      detail.querySelectorAll('input[name], textarea[name], select[name]').forEach(field => {
        const key = contactKey(detail, field.name);
        if (contactDrafts.has(key)) field.value = contactDrafts.get(key);
      });
      const openKey = contactKey(detail, '__open');
      if (contactOpenState.has(openKey)) {
        const shouldOpen = contactOpenState.get(openKey);
        detail.open = shouldOpen;
        detail.dataset.accordionExpanded = String(shouldOpen);
        const summary = detail.querySelector(':scope > summary');
        summary?.setAttribute('aria-expanded', String(shouldOpen));
      }
    });
  }

  function finishAccordion(detail, expanded) {
    detail.open = expanded;
    detail.dataset.accordionExpanded = String(expanded);
    delete detail.dataset.accordionAnimating;
    detail.style.removeProperty('height');
    detail.style.removeProperty('overflow');
    detail.querySelector(':scope > summary')?.setAttribute('aria-expanded', String(expanded));
    if (detail.classList.contains('legacy18-contact-card')) {
      contactOpenState.set(contactKey(detail, '__open'), expanded);
    }
  }

  function animateAccordion(detail, expanded) {
    if (detail.dataset.accordionAnimating === 'true') return;
    const summary = detail.querySelector(':scope > summary');
    if (!summary) return;

    if (reducedMotion.matches || typeof detail.animate !== 'function') {
      finishAccordion(detail, expanded);
      return;
    }

    detail.dataset.accordionAnimating = 'true';
    const startHeight = detail.getBoundingClientRect().height || summary.getBoundingClientRect().height;

    if (expanded) {
      detail.open = true;
      detail.dataset.accordionExpanded = 'true';
      summary.setAttribute('aria-expanded', 'true');
      detail.style.height = `${summary.getBoundingClientRect().height}px`;
      detail.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        const endHeight = detail.scrollHeight;
        const animation = detail.animate(
          [{ height: `${summary.getBoundingClientRect().height}px` }, { height: `${endHeight}px` }],
          { duration: 220, easing: 'cubic-bezier(.2,0,0,1)' }
        );
        animation.onfinish = () => finishAccordion(detail, true);
        animation.oncancel = () => finishAccordion(detail, true);
      });
      return;
    }

    detail.dataset.accordionExpanded = 'false';
    summary.setAttribute('aria-expanded', 'false');
    detail.style.height = `${startHeight}px`;
    detail.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const endHeight = summary.getBoundingClientRect().height;
      const animation = detail.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: 190, easing: 'cubic-bezier(.2,0,0,1)' }
      );
      animation.onfinish = () => finishAccordion(detail, false);
      animation.oncancel = () => finishAccordion(detail, false);
    });
  }

  function enhanceAccordion(detail) {
    if (!(detail instanceof HTMLDetailsElement) || detail.dataset.accordionEnhanced === 'true') return;
    const summary = detail.querySelector(':scope > summary');
    if (!summary) return;

    detail.dataset.accordionEnhanced = 'true';
    detail.dataset.accordionExpanded = String(detail.open);
    summary.setAttribute('aria-expanded', String(detail.open));

    if (detail.classList.contains('legacy18-contact-card')) {
      const openKey = contactKey(detail, '__open');
      if (contactOpenState.has(openKey)) {
        detail.open = contactOpenState.get(openKey);
        detail.dataset.accordionExpanded = String(detail.open);
        summary.setAttribute('aria-expanded', String(detail.open));
      }
    }

    summary.addEventListener('click', event => {
      event.preventDefault();
      animateAccordion(detail, !detail.open);
    });
  }

  function enhance(scope = document) {
    if (scope.matches?.(accordionSelector)) enhanceAccordion(scope);
    scope.querySelectorAll?.(accordionSelector).forEach(enhanceAccordion);
    rememberContactFields(scope);
    syncSectionNavigation();
  }

  function syncSectionNavigation() {
    const hash = (window.location.hash || '#overview').toLowerCase();
    document.querySelectorAll('[data-engagements-mode]').forEach(link => {
      const active = link.getAttribute('href') === hash;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.querySelector('.engagement-nav-root')?.classList.add('active');
  }

  document.addEventListener('input', event => {
    const field = event.target.closest?.('.legacy18-contact-card input[name], .legacy18-contact-card textarea[name], .legacy18-contact-card select[name]');
    if (!field) return;
    const detail = field.closest('.legacy18-contact-card');
    contactDrafts.set(contactKey(detail, field.name), field.value);
  }, true);

  document.addEventListener('change', event => {
    const file = event.target.closest?.('.legacy18-upload input[type="file"]');
    if (!file) return;
    const upload = file.closest('.legacy18-upload');
    upload?.classList.toggle('has-file', Boolean(file.files?.length));
  }, true);

  window.addEventListener('hashchange', syncSectionNavigation);
  document.addEventListener('DOMContentLoaded', () => enhance(document));

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) enhance(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
