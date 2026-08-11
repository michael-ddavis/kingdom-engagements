(() => {
  const MAX_ATTEMPTS = 4;
  const RETRY_DELAY_MS = 1500;

  async function refreshEmptyDemoCollections(attempt = 1) {
    try {
      const current = typeof state !== 'undefined' ? state : null;
      if (!current) return;

      const work = [];
      if (Array.isArray(current.requests) && current.requests.length === 0 && typeof loadRequests === 'function') {
        work.push(loadRequests(false));
      }
      if (Array.isArray(current.assignments) && current.assignments.length === 0 && typeof loadAssignments === 'function') {
        work.push(loadAssignments(false));
      }

      if (work.length === 0) return;
      await Promise.all(work);

      const stillEmpty =
        (Array.isArray(current.requests) && current.requests.length === 0) ||
        (Array.isArray(current.assignments) && current.assignments.length === 0);

      if (stillEmpty && attempt < MAX_ATTEMPTS) {
        window.setTimeout(() => refreshEmptyDemoCollections(attempt + 1), RETRY_DELAY_MS);
      }
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        window.setTimeout(() => refreshEmptyDemoCollections(attempt + 1), RETRY_DELAY_MS);
      }
    }
  }

  window.addEventListener('load', () => {
    window.setTimeout(() => refreshEmptyDemoCollections(), RETRY_DELAY_MS);
  }, { once: true });
})();
