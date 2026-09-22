import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export type EngagementDemoRole = 'administrator' | 'coordinator' | 'apostle' | 'minister';

export interface EngagementDemoPersona {
  role: EngagementDemoRole;
  label: string;
  shortLabel: string;
  person: string;
  description: string;
}

interface EngagementSession {
  role: EngagementDemoRole;
  name: string;
  subject: string;
  tenantId: string;
  canViewAllEngagements: boolean;
  canManageBookings: boolean;
  canManageAssignments: boolean;
  canDirectEngagements: boolean;
  canViewFinancials: boolean;
  canViewInternalNotes: boolean;
  canCompleteEngagements: boolean;
}

const PERSONA_COPY: Record<EngagementDemoRole, Omit<EngagementDemoPersona, 'person'>> = {
  administrator: {
    role: 'administrator',
    label: 'Administrator',
    shortLabel: 'Administrator',
    description: 'Organization-wide Engagements administration.',
  },
  coordinator: {
    role: 'coordinator',
    label: 'Engagement Director',
    shortLabel: 'Engagement Director',
    description: 'Full engagement direction and accountability.',
  },
  apostle: {
    role: 'apostle',
    label: 'Executive View',
    shortLabel: 'Executive',
    description: 'Read-only executive engagement view.',
  },
  minister: {
    role: 'minister',
    label: 'Team Member',
    shortLabel: 'Team Member',
    description: 'Assigned engagement responsibilities.',
  },
};

@Injectable({ providedIn: 'root' })
export class EngagementDemoRoleService {
  private readonly sessionState = signal<EngagementSession | null>(null);
  private readonly initialized = signal(false);

  readonly role = computed<EngagementDemoRole>(() => this.sessionState()?.role ?? 'minister');
  readonly persona = computed<EngagementDemoPersona>(() => {
    const role = this.role();
    return {
      ...PERSONA_COPY[role],
      person: this.sessionState()?.name ?? 'ApostolOS user',
    };
  });

  readonly isAdministrator = computed(() => this.role() === 'administrator');
  readonly isCoordinator = computed(() => this.role() === 'coordinator');
  readonly isApostle = computed(() => this.role() === 'apostle');
  readonly isMinister = computed(() => this.role() === 'minister');
  readonly canManageBookings = computed(() => this.sessionState()?.canManageBookings ?? false);
  readonly canManageAssignments = computed(() => this.sessionState()?.canManageAssignments ?? false);
  readonly canViewFinancials = computed(() => this.sessionState()?.canViewFinancials ?? false);
  readonly canViewInternalNotes = computed(() => this.sessionState()?.canViewInternalNotes ?? false);
  readonly canCompleteEngagements = computed(() => this.sessionState()?.canCompleteEngagements ?? false);

  constructor(private readonly http: HttpClient) {}

  async initialize(): Promise<void> {
    if (this.initialized()) return;

    if (this.isPublicRoute()) {
      this.initialized.set(true);
      return;
    }

    try {
      const session = await firstValueFrom(
        this.http.get<EngagementSession>('/api/engagements/session'),
      );
      this.sessionState.set(session);
      this.initialized.set(true);
    } catch (error) {
      this.initialized.set(true);

      if (error instanceof HttpErrorResponse && error.status === 403) {
        await this.redirectToPlatform();
        return;
      }

      await this.redirectToPlatformLogin();
    }
  }

  defaultRoute(): string {
    if (this.isApostle()) return '/organization/ctg/apostle';
    if (this.canManageAssignments()) return '/organization/ctg/command-center';
    return '/organization/ctg/engagements';
  }

  private isPublicRoute(): boolean {
    const path = globalThis.location?.pathname ?? '';
    return path.startsWith('/register/') ||
      path === '/join-the-12';
  }

  private async redirectToPlatform(): Promise<void> {
    let platformUrl = 'http://localhost:5100';

    try {
      const product = await firstValueFrom(
        this.http.get<{ platformUrl?: string }>('/api/product'),
      );
      platformUrl = product.platformUrl || platformUrl;
    } catch {
      // Use the local Platform URL as the development fallback.
    }

    globalThis.location.assign(platformUrl.replace(/\/$/, ''));
  }

  private async redirectToPlatformLogin(): Promise<void> {
    let platformUrl = 'http://localhost:5100';

    try {
      const product = await firstValueFrom(
        this.http.get<{ platformUrl?: string }>('/api/product'),
      );
      platformUrl = product.platformUrl || platformUrl;
    } catch {
      // Use the local Platform URL as the development fallback.
    }

    const returnUrl = globalThis.location.href;
    const loginUrl = `${platformUrl.replace(/\/$/, '')}/login`;
    globalThis.location.assign(
      `${loginUrl}?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  }
}

export const engagementHomeGuard: CanActivateFn = () => {
  const roles = inject(EngagementDemoRoleService);
  const router = inject(Router);

  if (roles.isApostle()) {
    return router.createUrlTree(['/organization/ctg/apostle']);
  }

  if (roles.canManageAssignments()) {
    return router.createUrlTree(['/organization/ctg/command-center']);
  }

  return router.createUrlTree(['/organization/ctg/engagements']);
};

export const engagementExecutiveGuard: CanActivateFn = () => {
  const roles = inject(EngagementDemoRoleService);

  if (roles.isApostle() || roles.isAdministrator()) {
    return true;
  }

  if (roles.canManageAssignments()) {
    return inject(Router).createUrlTree(['/organization/ctg/command-center']);
  }

  return inject(Router).createUrlTree(['/organization/ctg/engagements']);
};

export const engagementWorkspaceGuard: CanActivateFn = () => {
  const roles = inject(EngagementDemoRoleService);

  if (roles.isApostle()) {
    return inject(Router).createUrlTree(['/organization/ctg/apostle']);
  }

  return true;
};

export const engagementDirectorGuard: CanActivateFn = () => {
  const roles = inject(EngagementDemoRoleService);
  if (roles.canManageAssignments()) return true;

  if (roles.isApostle()) {
    return inject(Router).createUrlTree(['/organization/ctg/apostle']);
  }

  return inject(Router).createUrlTree(['/organization/ctg/engagements']);
};

export const engagementBookingGuard: CanActivateFn = () => {
  const roles = inject(EngagementDemoRoleService);
  if (roles.canManageBookings()) return true;

  if (roles.isApostle()) {
    return inject(Router).createUrlTree(['/organization/ctg/apostle']);
  }

  return inject(Router).createUrlTree(['/organization/ctg/engagements']);
};
