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

          <div class="eng-modulebar__right">
            <nav class="eng-modulebar__primary" aria-label="Engagements navigation">
              @if (isDwc()) {
                @if (isDwcMemberView()) {
                  <span class="eng-view-chip">Member view · {{ formationState.selectedGroup().name }}</span>
                  <a class="eng-nav-link eng-nav-link--exit" [href]="groupHref('/organization/dwc/formation')">Exit preview</a>
                } @else {
                  <a class="eng-nav-link" [class.current]="isCurrent('/organization/dwc')" [href]="groupHref('/organization/dwc')">DEG Overview</a>
                  <a class="eng-nav-link" [class.current]="isCurrentPrefix('/organization/dwc/formation')" [href]="groupHref('/organization/dwc/formation')">Formation</a>
                  <a class="eng-nav-link" [class.current]="isCurrent('/organization/dwc/my-group')" [href]="groupHref('/organization/dwc/my-group')">Member Preview</a>
                }
              } @else if (isCtg()) {
                <a class="eng-nav-link" [class.current]="isCurrent('/organization/ctg')" href="/organization/ctg">Overview</a>
                <a class="eng-nav-link" [class.current]="isBookingDeskCurrent()" href="/organization/ctg/bookings">Booking Desk</a>
                <a class="eng-nav-link" [class.current]="isCurrentPrefix('/assignments')" href="/assignments">Engagements</a>
                <a class="eng-nav-link" [class.current]="isCurrent('/organization/ctg/programs')" href="/organization/ctg/programs">Events & Programs</a>
              } @else {
                <a class="eng-nav-link current" href="/organization/hey-king">Overview</a>
              }
            </nav>

            <div class="eng-modulebar__utilities">
              @if (isCtg()) {
                <a class="eng-start-action" [class.current]="isCurrent('/organization/ctg/start-invitation')" href="/organization/ctg/start-invitation">
                  <span aria-hidden="true">＋</span>
                  <span>Start Invitation</span>
                </a>
              }
              @if (!isDwcMemberView()) {
                <a class="eng-settings-link" [href]="(product()?.platformUrl || 'http://localhost:5100') + '/appearance'">Settings</a>
              }
              <span class="eng-avatar" aria-label="Signed in as Michael Davis">MD</span>
            </div>
          </div>
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
    :root{
      --kos-action-primary:#172A46;
      --kos-action-secondary:#6D5BD0;
      --action-primary:var(--kos-action-primary);
      --action-secondary:var(--kos-action-secondary)
    }

    .eng-main--public{max-width:none!important;padding:0!important;margin:0!important}

    /*
      Engagements shell navigation only.
      Page-level tabs keep their own component styles so Formation, Booking Desk,
      Programs, and legacy assignment filters do not bleed into one another.
    */
    .eng-modulebar{
      min-height:72px;
      padding:0 28px;
      gap:24px;
      border-bottom:1px solid rgba(18,26,44,.10);
      background:rgba(250,248,244,.96);
      box-shadow:0 1px 0 rgba(18,26,44,.025);
    }

    .eng-modulebar__identity{flex:0 1 auto;gap:14px}
    .eng-modulebar__right{
      display:flex;
      min-width:0;
      flex:1 1 auto;
      align-items:center;
      justify-content:flex-end;
      gap:16px;
    }

    .eng-modulebar__primary{
      display:flex;
      min-width:0;
      align-items:center;
      gap:2px;
    }

    .eng-nav-link{
      position:relative;
      display:inline-flex;
      min-height:42px;
      align-items:center;
      padding:0 11px;
      border-radius:8px;
      color:#596476;
      font-size:.69rem;
      font-weight:800;
      line-height:1;
      text-decoration:none;
      white-space:nowrap;
      transition:color .16s ease,background .16s ease;
    }

    .eng-nav-link:hover{
      color:var(--kos-action-primary);
      background:color-mix(in srgb,var(--kos-action-primary) 5%,transparent);
      text-decoration:none;
    }

    .eng-nav-link.current{
      color:var(--kos-action-primary);
      background:color-mix(in srgb,var(--kos-action-primary) 7%,#fff);
    }

    .eng-nav-link.current::after{
      position:absolute;
      right:11px;
      bottom:-15px;
      left:11px;
      height:2px;
      border-radius:999px 999px 0 0;
      background:var(--kos-action-primary);
      content:'';
    }

    .eng-nav-link--exit{
      color:var(--kos-action-primary);
      background:color-mix(in srgb,var(--kos-action-primary) 6%,#fff);
    }

    .eng-modulebar__utilities{
      display:flex;
      flex:0 0 auto;
      align-items:center;
      gap:7px;
      padding-left:14px;
      border-left:1px solid rgba(18,26,44,.10);
    }

    .eng-start-action,
    .eng-settings-link{
      display:inline-flex;
      min-height:38px;
      align-items:center;
      justify-content:center;
      border-radius:8px;
      font-size:.67rem;
      font-weight:850;
      line-height:1;
      text-decoration:none;
      white-space:nowrap;
    }

    .eng-start-action{
      gap:5px;
      padding:0 13px;
      color:#fff;
      background:var(--kos-action-primary);
      box-shadow:0 4px 12px color-mix(in srgb,var(--kos-action-primary) 14%,transparent);
    }

    .eng-start-action:hover{
      color:#fff;
      filter:brightness(.96);
      text-decoration:none;
    }

    .eng-start-action.current{
      box-shadow:0 0 0 3px color-mix(in srgb,var(--kos-action-primary) 14%,transparent);
    }

    .eng-settings-link{
      padding:0 9px;
      color:#6b7482;
      background:transparent;
    }

    .eng-settings-link:hover{
      color:var(--eng-ink);
      background:rgba(255,255,255,.72);
      text-decoration:none;
    }

    .eng-view-chip{
      display:inline-flex;
      min-height:34px;
      align-items:center;
      padding:0 11px;
      border:1px solid color-mix(in srgb,var(--kos-action-primary) 24%,#d7dce3);
      border-radius:999px;
      color:var(--kos-action-primary);
      background:color-mix(in srgb,var(--kos-action-primary) 5%,#fff);
      font-size:.61rem;
      font-weight:850;
      letter-spacing:.04em;
      text-transform:uppercase;
      white-space:nowrap;
    }

    .eng-avatar{margin-left:1px}

    @media(max-width:1180px){
      .eng-modulebar{align-items:flex-start;flex-wrap:wrap;padding-top:10px;padding-bottom:9px}
      .eng-modulebar__identity{min-height:42px}
      .eng-modulebar__right{width:100%;flex:1 0 100%;justify-content:space-between;gap:10px}
      .eng-modulebar__primary{max-width:calc(100vw - 250px);overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
      .eng-modulebar__primary::-webkit-scrollbar{display:none}
      .eng-nav-link.current::after{bottom:-9px}
    }

    @media(max-width:760px){
      .eng-modulebar{padding-right:16px;padding-left:16px}
      .eng-modulebar__divider,.eng-presence{display:none}
      .eng-tenant strong{max-width:190px}
      .eng-modulebar__right{align-items:flex-start}
      .eng-modulebar__primary{max-width:calc(100vw - 92px)}
      .eng-modulebar__utilities{padding-left:8px;border-left:0}
      .eng-settings-link{display:none}
      .eng-start-action{width:38px;padding:0}
      .eng-start-action span:last-child{display:none}
      .eng-view-chip{max-width:220px;overflow:hidden;text-overflow:ellipsis}
    }
  `],
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  readonly product = signal<ProductInfo | null>(null);
  private overlayObserver?: MutationObserver;
  private readonly refreshAppearance = () => this.syncSavedAppearance();
  private readonly refreshVisibleAppearance = () => {
    if (document.visibilityState === 'visible') this.syncSavedAppearance();
  };

  constructor(
    private readonly api: EngagementsApiService,
    private readonly router: Router,
    readonly formationState: DwcFormationStateService,
  ) {}

  ngOnInit(): void {
    this.syncSavedAppearance();
    window.addEventListener('focus', this.refreshAppearance);
    window.addEventListener('pageshow', this.refreshAppearance);
    document.addEventListener('visibilitychange', this.refreshVisibleAppearance);
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
    window.removeEventListener('focus', this.refreshAppearance);
    window.removeEventListener('pageshow', this.refreshAppearance);
    document.removeEventListener('visibilitychange', this.refreshVisibleAppearance);
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

  isBookingDeskCurrent(): boolean {
    const current = this.routePath();
    return current === '/organization/ctg/bookings' || current === '/invitations';
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
      try {
        return match ? decodeURIComponent(match.substring(match.indexOf('=') + 1)) : null;
      } catch {
        return null;
      }
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
