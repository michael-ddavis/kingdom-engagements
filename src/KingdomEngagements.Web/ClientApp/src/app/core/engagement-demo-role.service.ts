import { Injectable, computed, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export type EngagementDemoRole = 'administrator' | 'coordinator' | 'minister';

export interface EngagementDemoPersona {
  role: EngagementDemoRole;
  label: string;
  shortLabel: string;
  person: string;
  description: string;
}

const COOKIE_NAME = 'KingdomOS.EngagementsDemoRole';

const PERSONAS: Record<EngagementDemoRole, EngagementDemoPersona> = {
  administrator: {
    role: 'administrator',
    label: 'Administrator / Executive',
    shortLabel: 'Administrator',
    person: 'Michael Davis',
    description: 'All engagements, assignment control, financials, internal notes, and closeout.',
  },
  coordinator: {
    role: 'coordinator',
    label: 'Booking / Engagement Coordinator',
    shortLabel: 'Coordinator',
    person: 'Engagement Coordinator',
    description: 'Invitation intake, booking workflow, scheduling, communication, and assignment preparation.',
  },
  minister: {
    role: 'minister',
    label: 'Assigned Team Member / Minister',
    shortLabel: 'Assigned Minister',
    person: 'Cynthia Thompson',
    description: 'Assigned engagements only: event details, responsibilities, contacts, logistics, and preparation.',
  },
};

@Injectable({ providedIn: 'root' })
export class EngagementDemoRoleService {
  readonly role = signal<EngagementDemoRole>(this.readRole());
  readonly persona = computed(() => PERSONAS[this.role()]);
  readonly isAdministrator = computed(() => this.role() === 'administrator');
  readonly isCoordinator = computed(() => this.role() === 'coordinator');
  readonly isMinister = computed(() => this.role() === 'minister');
  readonly canManageBookings = computed(() => !this.isMinister());
  readonly canManageAssignments = computed(() => !this.isMinister());
  readonly canViewFinancials = computed(() => !this.isMinister());
  readonly canViewInternalNotes = computed(() => !this.isMinister());
  readonly canCompleteEngagements = computed(() => this.isAdministrator());

  switchRole(value: string): void {
    const role = this.normalize(value);
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(role)}; path=/; max-age=604800; SameSite=Lax`;
    this.role.set(role);
    document.body.dataset['engagementDemoRole'] = role;
    window.location.reload();
  }

  mountSwitcher(): void {
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
    document.body.appendChild(container);
  }

  private readRole(): EngagementDemoRole {
    const value = document.cookie
      .split(';')
      .map(item => item.trim())
      .find(item => item.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')
      .slice(1)
      .join('=');

    try {
      return this.normalize(value ? decodeURIComponent(value) : 'administrator');
    } catch {
      return 'administrator';
    }
  }

  private normalize(value: string | null | undefined): EngagementDemoRole {
    if (value === 'coordinator' || value === 'minister') return value;
    return 'administrator';
  }
}

export const engagementBookingGuard: CanActivateFn = () => {
  const roles = inject(EngagementDemoRoleService);
  if (roles.canManageBookings()) return true;

  return inject(Router).createUrlTree(['/assignments'], {
    queryParams: { demoAccess: 'assigned-only' },
  });
};
