let installed = false;
let locked = false;
let saved: Record<string, string> | null = null;

const semanticOverlaySelector = '[role="dialog"][aria-modal="true"],dialog[open],[data-kos-scroll-lock="true"],[data-kos-overlay="drawer"],[data-kos-overlay="modal"],[data-kos-overlay="sheet"]';
const backdropSelector = '[class*="backdrop"],[class*="scrim"],[data-kos-backdrop]';
const drawerSelector = '[class*="drawer"],[class*="side-panel"],[class*="sidepanel"],[class*="sheet"]';

function visible(element: Element): boolean {
  if (!(element instanceof HTMLElement) || element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
  const style = getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;
}

function overlayOpen(): boolean {
  if (Array.from(document.querySelectorAll(semanticOverlaySelector)).some(visible)) return true;
  const backdropOpen = Array.from(document.querySelectorAll(backdropSelector)).some(visible);
  return backdropOpen && Array.from(document.querySelectorAll(drawerSelector)).some(visible);
}

function lock(): void {
  if (locked || !document.body) return;
  locked = true;
  const body = document.body;
  const html = document.documentElement;
  const gap = Math.max(0, innerWidth - html.clientWidth);
  const padding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
  saved = { htmlOverflow: html.style.overflow, htmlOverscrollBehavior: html.style.overscrollBehavior, overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  html.style.overflow = 'hidden';
  html.style.overscrollBehavior = 'none';
  body.style.overflow = 'hidden';
  if (gap) body.style.paddingRight = `${padding + gap}px`;
  body.dataset['kosOverlayScrollLocked'] = 'true';
}

function unlock(): void {
  if (!locked || !saved || !document.body) return;
  const body = document.body;
  const html = document.documentElement;
  html.style.overflow = saved['htmlOverflow'];
  html.style.overscrollBehavior = saved['htmlOverscrollBehavior'];
  body.style.overflow = saved['overflow'];
  body.style.paddingRight = saved['paddingRight'];
  delete body.dataset['kosOverlayScrollLocked'];
  locked = false;
  saved = null;
}

function sync(): void {
  if (overlayOpen()) lock();
  else unlock();
}

export function installPlatformOverlayScrollLock(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const start = () => {
    sync();
    const observer = new MutationObserver(() => requestAnimationFrame(sync));
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-modal', 'open'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
