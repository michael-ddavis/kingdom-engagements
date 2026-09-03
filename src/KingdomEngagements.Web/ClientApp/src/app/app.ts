import { AfterViewInit, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { EngagementsApiService } from './core/engagements-api.service';
import { ProductInfo } from './core/models';
import { HickmanItinerantPanelComponent } from './shared/hickman-itinerant-panel.component';
import { OrganizationCommandCenterComponent } from './shared/organization-command-center.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OrganizationCommandCenterComponent, HickmanItinerantPanelComponent],
  template: `
    <div class="eng-app">
      <header class="eng-modulebar">
        <div class="eng-modulebar__identity">
          <a
            class="eng-brand"
            [href]="product()?.platformUrl || 'http://localhost:5100'"
            aria-label="Return to ApostolOS"
            title="Return to ApostolOS">
            <span class="eng-brand__mark" aria-hidden="true">
              <img src="/kingdomos-mark.svg" alt="" />
            </span>
            <span class="eng-brand__text">
              <strong>ApostolOS</strong>
              <small>Engagements</small>
            </span>
          </a>

          <span class="eng-modulebar__divider" aria-hidden="true"></span>

          <div class="eng-tenant">
            <span class="eng-presence" aria-hidden="true"></span>
            <span>
              <small>Organization</small>
              <strong>{{ organizationName() }}</strong>
            </span>
          </div>
        </div>

        <nav class="eng-modulebar__actions" aria-label="Engagements utilities">
          @if (isDwc()) {
            <a href="/organization/dwc">DEG Overview</a>
            <a href="/organization/dwc/formation">Formation</a>
            <a href="/organization/dwc/my-group">My Group</a>
          }
          <a [href]="(product()?.platformUrl || 'http://localhost:5100') + '/appearance'">Settings</a>
          <span class="eng-avatar" aria-label="Signed in as Michael Davis">MD</span>
        </nav>
      </header>

      <main class="eng-main">
        <router-outlet />
        @if (showOrganizationCommandCenter()) {
          <app-organization-command-center />
        }
        @if (showHickmanItinerantPanel()) {
          <app-hickman-itinerant-panel />
        }
      </main>
    </div>
  `,
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  readonly product = signal<ProductInfo | null>(null);
  private overlayObserver?: MutationObserver;

  constructor(
    private readonly api: EngagementsApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.api.getProduct().subscribe({
      next: product => this.product.set(product),
    });
  }

  ngAfterViewInit(): void {
    this.overlayObserver = new MutationObserver(() => this.syncOrganizationDrawerPortal());
    this.overlayObserver.observe(document.body, { childList: true, subtree: true });
    queueMicrotask(() => this.syncOrganizationDrawerPortal());
  }

  ngOnDestroy(): void {
    this.overlayObserver?.disconnect();
    document.body.classList.remove('apostolos-org-drawer-open', 'apostolos-org-drawer-heyyking');
  }

  isDwc(): boolean {
    return this.currentOrganizationKey() === 'divine-world-changers';
  }

  showOrganizationCommandCenter(): boolean {
    const url = this.router.url.split('?')[0].replace(/\/$/, '');
    return url === '/organization/dwc' || url === '/organization/hey-king';
  }

  showHickmanItinerantPanel(): boolean {
    const url = this.router.url.split('?')[0].replace(/\/$/, '');
    return url === '/organization/hey-king';
  }

  private syncOrganizationDrawerPortal(): void {
    const routedBackdrop = document.querySelector<HTMLElement>('app-organization-programs .drawer-backdrop');
    const routedDrawer = document.querySelector<HTMLElement>('app-organization-programs .demo-drawer');

    // Routed content can establish its own containing block. Move the live overlay
    // nodes to <body> so fixed positioning is always browser-viewport relative.
    if (routedBackdrop && routedBackdrop.parentElement !== document.body) {
      routedBackdrop.classList.add('apostolos-body-overlay');
      document.body.appendChild(routedBackdrop);
    }

    if (routedDrawer && routedDrawer.parentElement !== document.body) {
      routedDrawer.classList.add('apostolos-body-drawer');
      const isHeyyKing = this.currentOrganizationKey() === 'heyy-king';
      routedDrawer.style.setProperty('--accent', isHeyyKing ? '#9a6c23' : '#5a328a');
      document.body.appendChild(routedDrawer);
    }

    const activeDrawer = document.body.querySelector(':scope > .demo-drawer.apostolos-body-drawer');
    const hasDrawer = !!activeDrawer;
    const isHeyyKing = hasDrawer && this.currentOrganizationKey() === 'heyy-king';

    document.body.classList.toggle('apostolos-org-drawer-open', hasDrawer);
    document.body.classList.toggle('apostolos-org-drawer-heyyking', isHeyyKing);
  }

  private currentOrganizationKey(): 'divine-world-changers' | 'heyy-king' | 'ctg' {
    const key = document.cookie
      .split(';')
      .map(value => value.trim())
      .find(value => value.startsWith('KingdomOS.DemoOrganization='));
    const organization = key
      ? decodeURIComponent(key.substring(key.indexOf('=') + 1)).toLowerCase()
      : 'ctg';

    if (organization === 'divine-world-changers' || organization === 'heyy-king') {
      return organization;
    }
    return 'ctg';
  }

  organizationName(): string {
    const organization = this.currentOrganizationKey();

    if (organization === 'divine-world-changers') {
      return 'Divine World Changers International Ministries';
    }
    if (organization === 'heyy-king') {
      return 'Heyy King, Inc.';
    }
    return this.product()?.tenantName || 'Cynthia Thompson Global';
  }
}
