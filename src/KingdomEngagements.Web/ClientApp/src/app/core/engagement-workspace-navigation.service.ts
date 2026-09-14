import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { EngagementDemoRoleService } from './engagement-demo-role.service';

@Injectable({ providedIn: 'root' })
export class EngagementWorkspaceNavigationService {
  private mounted = false;
  private refreshVersion = 0;

  constructor(
    private readonly router: Router,
    private readonly roles: EngagementDemoRoleService,
  ) {}

  mount(): void {
    if (this.mounted || typeof window === 'undefined' || typeof document === 'undefined') return;
    this.mounted = true;

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.refresh());

    window.setTimeout(() => this.refresh(), 0);
  }

  private refresh(): void {
    this.refreshVersion += 1;
    const version = this.refreshVersion;
    if (!/^\/assignments\/[^/?#]+\/?$/i.test(window.location.pathname)) return;
    this.normalizeBackLink(version);
  }

  private normalizeBackLink(version: number, attempt = 0): void {
    if (version !== this.refreshVersion) return;
    const link = document.querySelector<HTMLAnchorElement>('.legacy-workspace-page .legacy-back-link');
    if (!link) {
      if (attempt < 24) {
        window.setTimeout(() => this.normalizeBackLink(version, attempt + 1), 75);
      }
      return;
    }

    const target = this.roles.isApostle()
      ? '/organization/ctg/apostle'
      : '/assignments';

    link.href = target;
    link.dataset['apostolosBackTarget'] = target;
    link.textContent = this.roles.isApostle()
      ? '← Back to my overview'
      : this.roles.isMinister()
        ? '← Back to assigned engagements'
        : '← Back to engagements';

    if (link.dataset['apostolosBackBound'] === 'true') return;
    link.dataset['apostolosBackBound'] = 'true';
    link.addEventListener('click', event => {
      const anchor = event.currentTarget as HTMLAnchorElement;
      const nextTarget = anchor.dataset['apostolosBackTarget'];
      if (!nextTarget) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(nextTarget);
    }, { capture: true });
  }
}
