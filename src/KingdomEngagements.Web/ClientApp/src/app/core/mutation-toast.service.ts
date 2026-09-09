import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

type ToastTone = 'success' | 'error';

interface MutationToastEventDetail {
  message: string;
  tone?: ToastTone;
}

@Injectable({ providedIn: 'root' })
export class MutationToastService {
  private readonly hostId = 'apostolos-mutation-toasts';
  private mounted = false;
  private lastKey = '';
  private lastShownAt = 0;

  mount(): void {
    if (this.mounted || typeof window === 'undefined') return;
    this.mounted = true;
    window.addEventListener('apostolos:mutation-confirmation', (event: Event) => {
      const detail = (event as CustomEvent<MutationToastEventDetail>).detail;
      if (!detail?.message) return;
      this.show(detail.message, detail.tone ?? 'success');
    });
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  private show(message: string, tone: ToastTone): void {
    if (typeof document === 'undefined') return;
    this.mount();

    const now = Date.now();
    const key = `${tone}:${message}`;
    if (key === this.lastKey && now - this.lastShownAt < 650) return;
    this.lastKey = key;
    this.lastShownAt = now;

    const host = this.ensureHost();
    while (host.children.length >= 3) {
      host.firstElementChild?.remove();
    }

    const toast = document.createElement('section');
    toast.className = `apostolos-toast apostolos-toast--${tone}`;
    toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');

    const icon = document.createElement('span');
    icon.className = 'apostolos-toast__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = tone === 'success' ? '✓' : '!';

    const copy = document.createElement('div');
    copy.className = 'apostolos-toast__copy';

    const title = document.createElement('strong');
    title.textContent = tone === 'success' ? 'Done' : 'Something went wrong';

    const detail = document.createElement('span');
    detail.textContent = message;

    copy.append(title, detail);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'apostolos-toast__close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '×';
    close.addEventListener('click', () => this.dismiss(toast));

    toast.append(icon, copy, close);
    host.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('apostolos-toast--visible'));
    window.setTimeout(() => this.dismiss(toast), tone === 'error' ? 7500 : 4600);
  }

  private dismiss(toast: HTMLElement): void {
    if (!toast.isConnected) return;
    toast.classList.remove('apostolos-toast--visible');
    window.setTimeout(() => toast.remove(), 180);
  }

  private ensureHost(): HTMLElement {
    const existing = document.getElementById(this.hostId);
    if (existing) return existing;

    const style = document.createElement('style');
    style.id = `${this.hostId}-styles`;
    style.textContent = `
      #${this.hostId}{position:fixed;top:78px;right:18px;z-index:5000;width:min(360px,calc(100vw - 28px));display:flex;flex-direction:column;gap:10px;pointer-events:none}
      .apostolos-toast{pointer-events:auto;display:grid;grid-template-columns:28px minmax(0,1fr) 28px;gap:10px;align-items:start;padding:13px 12px 13px 14px;border:1px solid rgba(23,38,58,.14);border-left:4px solid #2f7d55;border-radius:12px;background:rgba(255,255,255,.97);color:#17263a;box-shadow:0 12px 34px rgba(15,23,42,.14);backdrop-filter:blur(14px);opacity:0;transform:translateY(-8px) scale(.985);transition:opacity .18s ease,transform .18s ease}
      .apostolos-toast--visible{opacity:1;transform:translateY(0) scale(1)}
      .apostolos-toast--error{border-left-color:#b42318}
      .apostolos-toast__icon{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:#eaf6ef;color:#236b48;font-size:14px;font-weight:900;line-height:1}
      .apostolos-toast--error .apostolos-toast__icon{background:#fff0ee;color:#b42318}
      .apostolos-toast__copy{display:flex;min-width:0;flex-direction:column;gap:3px;padding-top:1px}
      .apostolos-toast__copy strong{font-size:.79rem;line-height:1.2;font-weight:850;letter-spacing:-.01em}
      .apostolos-toast__copy span{font-size:.72rem;line-height:1.4;color:#5b6677}
      .apostolos-toast__close{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#6b7280;font:inherit;font-size:20px;line-height:1;cursor:pointer}
      .apostolos-toast__close:hover{background:#f2f4f7;color:#17263a}
      .apostolos-toast__close:focus-visible{outline:2px solid var(--action-primary,#315b87);outline-offset:2px}
      @media(max-width:600px){#${this.hostId}{top:68px;left:12px;right:12px;width:auto}.apostolos-toast{grid-template-columns:26px minmax(0,1fr) 28px}}
      @media(prefers-reduced-motion:reduce){.apostolos-toast{transition:none}}
    `;
    document.head.appendChild(style);

    const host = document.createElement('div');
    host.id = this.hostId;
    host.setAttribute('aria-label', 'Action confirmations');
    document.body.appendChild(host);
    return host;
  }
}

const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const collaborationSyncKey = 'apostolos.engagement-collaboration-sync';

export const mutationToastInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  if (!shouldNotify(request)) return next(request);

  const toasts = inject(MutationToastService);
  let completed = false;

  return next(request).pipe(
    tap({
      next: (event) => {
        if (completed || !(event instanceof HttpResponse)) return;
        completed = true;
        signalCollaborationMutation(request);
        toasts.success(successMessage(request.method));
      },
      error: (error: unknown) => {
        if (completed) return;
        completed = true;
        toasts.error(errorMessage(request.method, error));
      },
    }),
  );
};

function shouldNotify(request: HttpRequest<unknown>): boolean {
  const method = request.method.toUpperCase();
  if (!mutationMethods.has(method)) return false;
  const url = request.url.toLowerCase();
  return url.startsWith('/api/') || url.includes('/api/');
}

function signalCollaborationMutation(request: HttpRequest<unknown>): void {
  if (typeof localStorage === 'undefined') return;
  const url = request.url;
  const lower = url.toLowerCase();
  const sharedWorkspaceMutation =
    lower.includes('/workspace/coordination') ||
    lower.includes('/workspace/documents');
  if (!sharedWorkspaceMutation) return;

  const match = url.match(/\/api\/engagements\/assignments\/([^/?#]+)/i);
  if (!match) return;

  try {
    localStorage.setItem(collaborationSyncKey, JSON.stringify({
      assignmentId: decodeURIComponent(match[1]),
      source: 'ctg',
      at: Date.now(),
    }));
  } catch {
    // The server save remains authoritative when browser storage is unavailable.
  }
}

function successMessage(method: string): string {
  switch (method.toUpperCase()) {
    case 'DELETE': return 'The item was deleted successfully.';
    case 'PUT':
    case 'PATCH': return 'Your changes were saved.';
    default: return 'Your action was completed successfully.';
  }
}

function errorMessage(method: string, error: unknown): string {
  const fallback = method.toUpperCase() === 'DELETE'
    ? 'The item could not be deleted.'
    : method.toUpperCase() === 'PUT' || method.toUpperCase() === 'PATCH'
      ? 'Your changes could not be saved.'
      : 'The action could not be completed.';

  if (!(error instanceof HttpErrorResponse)) return fallback;
  const serverMessage = typeof error.error?.message === 'string' ? error.error.message.trim() : '';
  return serverMessage && serverMessage.length <= 180 ? serverMessage : fallback;
}
