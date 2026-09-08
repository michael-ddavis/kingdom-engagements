import { AfterViewInit, Component, OnDestroy, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { EngagementsApiService } from './core/engagements-api.service';
import { DwcFormationStateService } from './core/dwc-formation-state.service';
import { ProductInfo } from './core/models';
import { HickmanItinerantPanelComponent } from './shared/hickman-itinerant-panel.component';
import { OrganizationCommandCenterComponent } from './shared/organization-command-center.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OrganizationCommandCenterComponent, HickmanItinerantPanelComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="eng-app">
      @if (!isPublicIntake()) {
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

          <nav class="eng-modulebar__actions" aria-label="Engagements navigation">
            @if (isDwc()) {
              @if (isDwcMemberView()) {
                <span class="eng-view-chip">Member view · {{ formationState.selectedGroup().name }}</span>
                <a [href]="groupHref('/organization/dwc/formation')">Exit preview</a>
              } @else {
                <a [class.current]="isCurrent('/organization/dwc')" [href]="groupHref('/organization/dwc')">DEG Overview</a>
                <a [class.current]="isCurrentPrefix('/organization/dwc/formation')" [href]="groupHref('/organization/dwc/formation')">Formation</a>
                <a [class.current]="isCurrent('/organization/dwc/my-group')" [href]="groupHref('/organization/dwc/my-group')">Member Preview</a>
              }
            } @else if (isCtg()) {
              <a [class.current]="isCurrent('/organization/ctg')" href="/organization/ctg">Overview</a>
              <a [class.current]="isCurrent('/organization/ctg/bookings')" href="/organization/ctg/bookings">Booking Desk</a>
              <a [class.current]="isCurrentPrefix('/assignments')" href="/assignments">Engagements</a>
              <a [class.current]="isCurrent('/organization/ctg/programs')" href="/organization/ctg/programs">Events & Programs</a>
              <a class="eng-primary-action" [class.current]="isCurrent('/organization/ctg/start-invitation')" href="/organization/ctg/start-invitation">+ Start Invitation</a>
            }
            @if (!isDwcMemberView()) {
              <a [href]="(product()?.platformUrl || 'http://localhost:5100') + '/appearance'">Settings</a>
            }
            <span class="eng-avatar" aria-label="Signed in as Michael Davis">MD</span>
          </nav>
        </header>
      }

      <main class="eng-main" [class.eng-main--public]="isPublicIntake()">
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
  styles: [`
    :root{--kos-action-primary:#172A46;--kos-action-secondary:#6D5BD0;--action-primary:var(--kos-action-primary);--action-secondary:var(--kos-action-secondary)}
    .eng-view-chip{display:inline-flex;min-height:32px;padding:0 10px;border:1px solid var(--kos-action-primary);border-radius:999px;align-items:center;color:var(--kos-action-primary);background:#fff;font-size:.62rem;font-weight:850;letter-spacing:.04em;text-transform:uppercase}
    .eng-main--public{max-width:none!important;padding:0!important;margin:0!important}

    /* Engagements navigation: clear contrast, with the selected destination outlined in the saved Primary Action color. */
    .eng-modulebar__actions{gap:.42rem!important}
    .eng-modulebar__actions a{min-height:38px!important;padding:0 .78rem!important;border:1px solid #c8d0da!important;border-radius:999px!important;color:#26364d!important;background:#fff!important;box-shadow:0 1px 2px rgba(17,28,45,.04);font-weight:850!important;transition:border-color .16s ease,background .16s ease,color .16s ease,box-shadow .16s ease}
    .eng-modulebar__actions a:hover{border-color:#8f9baa!important;color:#111c2d!important;background:#f8fafc!important}
    .eng-modulebar__actions a.current{border-color:var(--kos-action-primary)!important;color:var(--kos-action-primary)!important;background:#fff!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--kos-action-primary) 12%,transparent)!important}
    .eng-modulebar__actions a.eng-primary-action{border-color:var(--kos-action-primary)!important;color:#fff!important;background:var(--kos-action-primary)!important;box-shadow:none!important}
    .eng-modulebar__actions a.eng-primary-action:hover{filter:brightness(.96)}
    .eng-modulebar__actions a.eng-primary-action.current{border-color:var(--kos-action-primary)!important;color:var(--kos-action-primary)!important;background:#fff!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--kos-action-primary) 12%,transparent)!important}

    /* One active-pill language across DWC and CTG. No underline or overline indicators. */
    .section-nav{gap:6px!important;padding:2px 0!important;border-bottom:0!important}
    .section-nav button{border:1px solid #d2d8df!important;border-radius:999px!important;padding:9px 13px!important;background:#fff!important;color:#344054!important}
    .section-nav button:hover{border-color:#aeb8c4!important;background:#fafbfc!important;color:#1e293b!important}
    .section-nav button.active{border-color:var(--kos-action-primary)!important;background:#fff!important;color:var(--kos-action-primary)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--kos-action-primary) 10%,transparent)!important}

    .program-tabs{gap:6px!important;border-bottom:0!important}
    .program-tabs button{border:1px solid #d2d8df!important;border-radius:999px!important;padding:10px 15px!important;background:#fff!important;color:#344054!important}
    .program-tabs button:hover{border-color:#aeb8c4!important;background:#fafbfc!important;color:#1e293b!important}
    .program-tabs button.active{border-color:var(--kos-action-primary)!important;background:#fff!important;color:var(--kos-action-primary)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--kos-action-primary) 10%,transparent)!important}

    .tools-tabs button.active{border-color:var(--kos-action-primary)!important;color:var(--kos-action-primary)!important;background:#fff!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--kos-action-primary) 10%,transparent)!important}
    .tools-tabs button.active>span{background:var(--kos-action-primary)!important;color:#fff!important}

    .filters button.active{border-color:var(--kos-action-primary)!important;color:var(--kos-action-primary)!important;background:#fff!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--kos-action-primary) 8%,transparent)!important}

    .legacy-filter-group button.selected{border-color:var(--kos-action-primary)!important;color:var(--kos-action-primary)!important;background:#fff!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--kos-action-primary) 10%,transparent)!important}
    .legacy-filter-group button.selected span{color:var(--kos-action-primary)!important;background:color-mix(in srgb,var(--kos-action-primary) 9%,white)!important}

    @media(max-width:980px){.eng-modulebar{align-items:flex-start;flex-wrap:wrap;padding-top:.65rem;padding-bottom:.65rem}.eng-modulebar__actions{max-width:100%;overflow-x:auto;padding-bottom:2px}.eng-modulebar__actions a{white-space:nowrap}}
  `],
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  readonly product = signal<ProductInfo | null>(null);
  private overlayObserver?: MutationObserver;

  constructor(
    private readonly api: EngagementsApiService,
    private readonly router: Router,
    readonly formationState: DwcFormationStateService,
  ) {}

  ngOnInit(): void {
    this.syncSavedAppearance();
    this.syncOrganizationBodyClass();

    const requestedGroup = this.router.parseUrl(this.router.url).queryParams['group'];
    if (typeof requestedGroup === 'string' && this.formationState.groups().some(group => group.id === requestedGroup)) {
      this.formationState.selectGroup(requestedGroup);
    }

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
    document.body.classList.remove(
      'apostolos-org-drawer-open',
      'apostolos-org-drawer-heyyking',
      'eng-org-ctg',
      'eng-org-dwc',
      'eng-org-heyy',
    );
  }

  isDwc(): boolean {
    return this.currentOrganizationKey() === 'divine-world-changers';
  }

  isCtg(): boolean {
    return this.currentOrganizationKey() === 'ctg';
  }

  isDwcMemberView(): boolean {
    return this.routePath() === '/organization/dwc/my-group';
  }

  isPublicIntake(): boolean {
    const path = this.routePath();
    return path.startsWith('/register/') || path === '/join-the-12';
  }

  isCurrent(path: string): boolean {
    return this.routePath() === path;
  }

  isCurrentPrefix(path: string): boolean {
    const current = this.routePath();
    return current === path || current.startsWith(`${path}/`);
  }

  showOrganizationCommandCenter(): boolean {
    const url = this.routePath();
    return url === '/organization/dwc' || url === '/organization/hey-king';
  }

  showHickmanItinerantPanel(): boolean {
    return this.routePath() === '/organization/hey-king';
  }

  groupHref(path: string): string {
    return `${path}?group=${encodeURIComponent(this.formationState.selectedGroupId())}`;
  }

  private routePath(): string {
    return this.router.url.split('?')[0].replace(/\/$/, '');
  }

  private syncSavedAppearance(): void {
    const readCookie = (name: string): string | null => {
      const match = document.cookie
        .split(';')
        .map(value => value.trim())
        .find(value => value.startsWith(`${name}=`));
      return match
        ? decodeURIComponent(match.substring(match.indexOf('=') + 1))
        : null;
    };

    const primary = readCookie('KingdomOS.ActionPrimary');
    const secondary = readCookie('KingdomOS.ActionSecondary');
    const root = document.documentElement;

    if (/^#[0-9a-fA-F]{6}$/.test(primary ?? '')) {
      root.style.setProperty('--kos-action-primary', primary!);
      root.style.setProperty('--action-primary', primary!);
    }
    if (/^#[0-9a-fA-F]{6}$/.test(secondary ?? '')) {
      root.style.setProperty('--kos-action-secondary', secondary!);
      root.style.setProperty('--action-secondary', secondary!);
    }
  }

  private syncOrganizationBodyClass(): void {
    document.body.classList.remove('eng-org-ctg', 'eng-org-dwc', 'eng-org-heyy');
    const organization = this.currentOrganizationKey();
    document.body.classList.add(
      organization === 'divine-world-changers'
        ? 'eng-org-dwc'
        : organization === 'heyy-king'
          ? 'eng-org-heyy'
          : 'eng-org-ctg',
    );
  }

  private syncOrganizationDrawerPortal(): void {
    const routedBackdrop = document.querySelector<HTMLElement>('app-organization-programs .drawer-backdrop');
    const routedDrawer = document.querySelector<HTMLElement>('app-organization-programs .demo-drawer');

    this.syncDwcGroupFromDrawer(routedDrawer);

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

    const activeDrawer = document.body.querySelector<HTMLElement>(':scope > .demo-drawer.apostolos-body-drawer');
    this.syncDwcGroupFromDrawer(activeDrawer);

    const hasDrawer = !!activeDrawer;
    const isHeyyKing = hasDrawer && this.currentOrganizationKey() === 'heyy-king';

    document.body.classList.toggle('apostolos-org-drawer-open', hasDrawer);
    document.body.classList.toggle('apostolos-org-drawer-heyyking', isHeyyKing);
  }

  private syncDwcGroupFromDrawer(drawer: HTMLElement | null): void {
    if (!drawer || this.currentOrganizationKey() !== 'divine-world-changers') return;

    const label = (drawer.getAttribute('aria-label') || '').trim().toLowerCase();
    if (!label) return;

    const group = this.formationState.groups().find(
      item => item.name.trim().toLowerCase() === label,
    );

    if (group && this.formationState.selectedGroupId() !== group.id) {
      this.formationState.selectGroup(group.id);
    }
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
