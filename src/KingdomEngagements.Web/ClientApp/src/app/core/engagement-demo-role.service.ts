import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export type EngagementDemoRole = 'administrator' | 'coordinator' | 'apostle' | 'minister';

export interface EngagementDemoPersona {
  role: EngagementDemoRole;
  label: string;
  shortLabel: string;
  person: string;
  description: string;
}

interface ManagedEngagementDetails {
  summary: {
    id: string;
    title: string;
    speakerName: string;
    hostOrganization: string;
    location: string | null;
    startsAtUtc: string | null;
    status: string;
    travelStatus: string;
    lodgingStatus: string;
    transportationStatus: string;
    hostStatus: string;
    documentsStatus: string;
    closeoutStatus: string;
  };
  hostContactName: string | null;
  hostContactEmail: string | null;
  endsAtUtc: string | null;
  notes: string | null;
}

const COOKIE_NAME = 'KingdomOS.EngagementsDemoRole';
const ORGANIZATION_COOKIE = 'KingdomOS.DemoOrganization';

const PERSONAS: Record<EngagementDemoRole, EngagementDemoPersona> = {
  administrator: {
    role: 'administrator',
    label: 'Administrator / Executive',
    shortLabel: 'Administrator',
    person: 'Michael Davis',
    description: 'All engagements, assignment control, financials, internal notes, completion, and archive.',
  },
  coordinator: {
    role: 'coordinator',
    label: 'Booking / Engagement Coordinator',
    shortLabel: 'Coordinator',
    person: 'Engagement Coordinator',
    description: 'Invitation intake, booking workflow, scheduling, communication, and assignment preparation.',
  },
  apostle: {
    role: 'apostle',
    label: 'Apostle Cynthia / Executive View',
    shortLabel: 'Apostle Cynthia',
    person: 'Cynthia Thompson',
    description: 'At-a-glance ministry picture: upcoming assignments, readiness, decisions, and movement without operational clutter.',
  },
  minister: {
    role: 'minister',
    label: 'Assigned Team Member / Minister',
    shortLabel: 'Assigned Minister',
    person: 'Assigned Minister',
    description: 'Assigned engagements only: event details, responsibilities, contacts, logistics, and preparation.',
  },
};

@Injectable({ providedIn: 'root' })
export class EngagementDemoRoleService {
  readonly role = signal<EngagementDemoRole>(this.readRole());
  readonly persona = computed(() => PERSONAS[this.role()]);
  readonly isAdministrator = computed(() => this.role() === 'administrator');
  readonly isCoordinator = computed(() => this.role() === 'coordinator');
  readonly isApostle = computed(() => this.role() === 'apostle');
  readonly isMinister = computed(() => this.role() === 'minister');
  readonly canManageBookings = computed(() => this.isAdministrator() || this.isCoordinator());
  readonly canManageAssignments = computed(() => this.isAdministrator() || this.isCoordinator());
  readonly canViewFinancials = computed(() => this.isAdministrator() || this.isCoordinator());
  readonly canViewInternalNotes = computed(() => this.isAdministrator() || this.isCoordinator());
  readonly canCompleteEngagements = computed(() => this.isAdministrator());

  switchRole(value: string): void {
    const role = this.normalize(value);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(role)}; path=/; max-age=604800; SameSite=Lax`;
    this.role.set(role);
    document.body.dataset['engagementDemoRole'] = role;

    const organization = this.readCookie(ORGANIZATION_COOKIE)?.toLowerCase() ?? 'ctg';
    if (organization === 'ctg') {
      if (role === 'apostle') {
        window.location.assign('/organization/ctg/apostle');
        return;
      }
      if (role === 'minister') {
        window.location.assign('/assignments');
        return;
      }
      if (window.location.pathname === '/organization/ctg/apostle') {
        window.location.assign('/organization/ctg/bookings');
        return;
      }
    }

    window.location.reload();
  }

  mountSwitcher(): void {
    if (!this.shouldShowDemoControls()) return;

    document.body.dataset['engagementDemoRole'] = this.role();
    if (document.getElementById('engagement-demo-role-switcher')) return;

    const container = document.createElement('aside');
    container.id = 'engagement-demo-role-switcher';
    container.className = 'eng-demo-role-switcher';
    container.setAttribute('aria-label', 'Engagements demo role');

    const caption = document.createElement('span');
    caption.className = 'eng-demo-role-switcher__caption';
    caption.textContent = 'Demo as';

    const select = document.createElement('select');
    select.className = 'eng-demo-role-switcher__select';
    select.setAttribute('aria-label', 'Switch Engagements demo role');

    (Object.keys(PERSONAS) as EngagementDemoRole[]).forEach(role => {
      const option = document.createElement('option');
      option.value = role;
      option.textContent = PERSONAS[role].label;
      option.selected = role === this.role();
      select.appendChild(option);
    });

    const detail = document.createElement('span');
    detail.className = 'eng-demo-role-switcher__detail';
    detail.textContent = this.persona().description;

    select.addEventListener('change', event => {
      this.switchRole((event.target as HTMLSelectElement).value);
    });

    container.append(caption, select, detail);

    const assignmentId = this.assignmentIdFromPath();
    if (assignmentId && this.canManageAssignments()) {
      const manage = document.createElement('button');
      manage.type = 'button';
      manage.className = 'eng-demo-role-switcher__manage';
      manage.textContent = 'Manage engagement';
      manage.addEventListener('click', () => void this.openAssignmentManager(assignmentId));
      container.appendChild(manage);
    }

    document.body.appendChild(container);
  }

  private async openAssignmentManager(assignmentId: string): Promise<void> {
    let details: ManagedEngagementDetails;
    try {
      const response = await fetch(`/api/engagements/assignments/${encodeURIComponent(assignmentId)}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('The engagement could not be loaded.');
      details = await response.json() as ManagedEngagementDetails;
    } catch {
      window.alert('The engagement could not be loaded for editing.');
      return;
    }

    document.getElementById('engagement-demo-manage-dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'engagement-demo-manage-dialog';
    dialog.className = 'eng-demo-manage-dialog';

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'eng-demo-manage-form';

    const currentStatus = details.summary.status || 'planning';
    const statuses = ['planning', 'approved', 'confirmed', 'in-progress', 'cancelled'];
    if (!statuses.includes(currentStatus) && currentStatus !== 'complete' && currentStatus !== 'archived') {
      statuses.push(currentStatus);
    }

    form.innerHTML = `
      <header>
        <div><small>Engagement administration</small><h2>Edit assignment</h2><p>Update the schedule, assigned minister, host details, status, and internal coordination note in one place.</p></div>
        <button type="button" class="eng-demo-manage-close" aria-label="Close">×</button>
      </header>
      <div class="eng-demo-manage-grid">
        <label class="wide"><span>Engagement name</span><input name="title" required value="${this.escapeAttribute(details.summary.title)}"></label>
        <label><span>Assigned minister / speaker</span><input name="speakerName" required value="${this.escapeAttribute(details.summary.speakerName)}"></label>
        <label><span>Status</span><select name="status" ${currentStatus === 'complete' || currentStatus === 'archived' ? 'disabled' : ''}>${statuses.map(status => `<option value="${this.escapeAttribute(status)}" ${status === currentStatus ? 'selected' : ''}>${this.statusLabel(status)}</option>`).join('')}</select></label>
        <label class="wide"><span>Host organization</span><input name="hostOrganization" required value="${this.escapeAttribute(details.summary.hostOrganization)}"></label>
        <label><span>Host contact</span><input name="hostContactName" value="${this.escapeAttribute(details.hostContactName ?? '')}"></label>
        <label><span>Host email</span><input name="hostContactEmail" type="email" value="${this.escapeAttribute(details.hostContactEmail ?? '')}"></label>
        <label class="wide"><span>Location</span><input name="location" value="${this.escapeAttribute(details.summary.location ?? '')}"></label>
        <label><span>Start date</span><input name="startsAtUtc" type="date" value="${this.dateInput(details.summary.startsAtUtc)}"></label>
        <label><span>End date</span><input name="endsAtUtc" type="date" value="${this.dateInput(details.endsAtUtc)}"></label>
        <label class="wide"><span>Internal coordination note</span><textarea name="notes" rows="5">${this.escapeText(details.notes ?? '')}</textarea><small>Visible to administrators and coordinators; hidden from executive and assigned-minister views.</small></label>
      </div>
      <footer><span class="eng-demo-manage-message" aria-live="polite"></span><button type="button" class="secondary eng-demo-manage-cancel">Cancel</button><button type="submit" class="primary">Save engagement</button></footer>
    `;

    dialog.appendChild(form);
    document.body.appendChild(dialog);

    const close = () => dialog.close();
    form.querySelector<HTMLButtonElement>('.eng-demo-manage-close')?.addEventListener('click', close);
    form.querySelector<HTMLButtonElement>('.eng-demo-manage-cancel')?.addEventListener('click', close);
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    form.addEventListener('submit', event => {
      event.preventDefault();
      void this.saveManagedAssignment(assignmentId, details, form, dialog);
    });

    dialog.showModal();
  }

  private async saveManagedAssignment(
    assignmentId: string,
    existing: ManagedEngagementDetails,
    form: HTMLFormElement,
    dialog: HTMLDialogElement,
  ): Promise<void> {
    const data = new FormData(form);
    const message = form.querySelector<HTMLElement>('.eng-demo-manage-message');
    const saveButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const value = (name: string): string => String(data.get(name) ?? '').trim();
    const optional = (name: string): string | null => value(name) || null;
    const iso = (name: string): string | null => {
      const date = value(name);
      return date ? new Date(`${date}T12:00:00Z`).toISOString() : null;
    };

    const statusControl = form.elements.namedItem('status') as HTMLSelectElement | null;
    const payload = {
      title: value('title'),
      speakerName: value('speakerName'),
      hostOrganization: value('hostOrganization'),
      hostContactName: optional('hostContactName'),
      hostContactEmail: optional('hostContactEmail'),
      location: optional('location'),
      startsAtUtc: iso('startsAtUtc'),
      endsAtUtc: iso('endsAtUtc'),
      status: statusControl?.disabled ? existing.summary.status : value('status'),
      travelStatus: existing.summary.travelStatus,
      lodgingStatus: existing.summary.lodgingStatus,
      transportationStatus: existing.summary.transportationStatus,
      hostStatus: existing.summary.hostStatus,
      documentsStatus: existing.summary.documentsStatus,
      closeoutStatus: existing.summary.closeoutStatus,
      notes: optional('notes'),
    };

    if (!payload.title || !payload.speakerName || !payload.hostOrganization) {
      if (message) message.textContent = 'Engagement name, assigned minister, and host organization are required.';
      return;
    }

    if (saveButton) saveButton.disabled = true;
    if (message) message.textContent = 'Saving…';
    try {
      const response = await fetch(`/api/engagements/assignments/${encodeURIComponent(assignmentId)}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Save failed');
      if (message) message.textContent = 'Engagement updated.';
      window.setTimeout(() => {
        dialog.close();
        window.location.reload();
      }, 250);
    } catch {
      if (saveButton) saveButton.disabled = false;
      if (message) message.textContent = 'The engagement could not be saved.';
    }
  }

  private shouldShowDemoControls(): boolean {
    const path = window.location.pathname;
    if (path.startsWith('/register/') || path === '/join-the-12') return false;
    const organization = this.readCookie(ORGANIZATION_COOKIE)?.toLowerCase() ?? 'ctg';
    return organization === 'ctg';
  }

  private assignmentIdFromPath(): string | null {
    const match = window.location.pathname.match(/^\/assignments\/([0-9a-fA-F-]{36})\/?$/);
    return match?.[1] ?? null;
  }

  private readRole(): EngagementDemoRole {
    try {
      return this.normalize(this.readCookie(COOKIE_NAME));
    } catch {
      return 'administrator';
    }
  }

  private readCookie(name: string): string | null {
    const value = document.cookie
      .split(';')
      .map(item => item.trim())
      .find(item => item.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=');
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private normalize(value: string | null | undefined): EngagementDemoRole {
    if (value === 'coordinator' || value === 'apostle' || value === 'minister') return value;
    return 'administrator';
  }

  private dateInput(value: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  private statusLabel(value: string): string {
    return value.replaceAll('-', ' ').replace(/\b\w/g, character => character.toUpperCase());
  }

  private escapeAttribute(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  private escapeText(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}

export const engagementBookingGuard: CanActivateFn = () => {
  const roles = inject(EngagementDemoRoleService);
  if (roles.canManageBookings()) return true;

  if (roles.isApostle()) {
    return inject(Router).createUrlTree(['/organization/ctg/apostle']);
  }

  return inject(Router).createUrlTree(['/assignments'], {
    queryParams: { demoAccess: 'assigned-only' },
  });
};