import { AfterViewInit, Component, OnDestroy, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { EngagementsApiService } from './core/engagements-api.service';
import { EngagementDemoRoleService } from './core/engagement-demo-role.service';
import { DwcFormationStateService } from './core/dwc-formation-state.service';
import { AccountPanelComponent } from './shared/account-panel.component';
import { ProductInfo } from './core/models';
import { HickmanItinerantPanelComponent } from './shared/hickman-itinerant-panel.component';
import { OrganizationCommandCenterComponent } from './shared/organization-command-center.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AccountPanelComponent, RouterOutlet, OrganizationCommandCenterComponent, HickmanItinerantPanelComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="eng-app">
      @if (!isPublicIntake()) {
        <aside class="apostolos-global-sidebar" aria-label="ApostolOS navigation">
          <a
            class="apostolos-global-brand"
            [href]="platformHref('/')"
            (click)="navigateGlobal($event, platformHref('/'))"
            aria-label="ApostolOS home">
            <span class="apostolos-global-brand__mark" aria-hidden="true">
              <img src="/kingdomos-mark.svg" alt="" />
            </span>
            <span>
              <strong>ApostolOS</strong>
              <small>{{ organizationName() }}</small>
            </span>
          </a>

          <nav class="apostolos-global-nav" aria-label="Core navigation">
            <span class="apostolos-global-label">Core</span>
            <a [href]="platformHref('/')" (click)="navigateGlobal($event, platformHref('/'))">
              <span class="apostolos-global-icon" aria-hidden="true">⌂</span>
              <span>Home</span>
            </a>
            <a [href]="platformHref('/agenda')" (click)="navigateGlobal($event, platformHref('/agenda'))">
              <span class="apostolos-global-icon" aria-hidden="true">◷</span>
              <span>Kingdom Agenda</span>
            </a>
          </nav>

          <nav class="apostolos-global-nav apostolos-global-nav--modules" aria-label="ApostolOS modules">
            <span class="apostolos-global-label">Ministry</span>
            <a class="is-active" href="/" (click)="$event.preventDefault()">
              <span class="apostolos-global-icon" aria-hidden="true">▣</span>
              <span>Engagements</span>
            </a>
            <a [href]="globalModuleHref('academy')" (click)="navigateGlobal($event, globalModuleHref('academy'))">
              <span class="apostolos-global-icon" aria-hidden="true">▤</span>
              <span>Academy</span>
            </a>
            <a [href]="globalModuleHref('missions')" (click)="navigateGlobal($event, globalModuleHref('missions'))">
              <span class="apostolos-global-icon" aria-hidden="true">◎</span>
              <span>Missions</span>
            </a>
          </nav>

          <div class="apostolos-global-footer">
            <span class="eng-avatar apostolos-global-avatar">{{ personaInitials() }}</span>
            <span>
              <strong>{{ roles.persona().person }}</strong>
              <small>{{ roles.persona().label }}</small>
            </span>
          </div>
        </aside>

        <section class="eng-product-shell">
          <header class="eng-modulebar">
            <div class="eng-modulebar__identity">
              <div class="eng-product-title">
                <small>Kingdom Engagements</small>
                <strong>{{ organizationName() }}</strong>
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
                  @if (roles.canManageAssignments()) {
                    <a class="eng-nav-link" [class.current]="isCurrent('/organization/ctg/command-center')" href="/organization/ctg/command-center">Command Center</a>
                    <a class="eng-nav-link" [class.current]="isBookingDeskCurrent()" href="/organization/ctg/bookings">Invitations</a>
                    <a class="eng-nav-link" [class.current]="isCurrentPrefix('/organization/ctg/engagements')" href="/organization/ctg/engagements">Engagements</a>
                    <a class="eng-nav-link" [class.current]="isCurrent('/organization/ctg/team')" href="/organization/ctg/team">Team Setup</a>
                    <a class="eng-nav-link" [class.current]="isCurrent('/organization/ctg/hosts')" href="/organization/ctg/hosts">Host Messages</a>
                    <a class="eng-nav-link" [class.current]="isCurrent('/organization/ctg/programs')" href="/organization/ctg/programs">Programs</a>
                  } @else {
                    <a class="eng-nav-link" [class.current]="isCurrentPrefix('/organization/ctg/engagements')" href="/organization/ctg/engagements">Engagements</a>
                  }
                } @else {
                  <a class="eng-nav-link current" href="/organization/hey-king">Overview</a>
                }
              </nav>

              <div class="eng-modulebar__utilities">
                @if (isCtg() && roles.canManageBookings()) {
                  <a class="eng-start-action" [class.current]="isCurrent('/organization/ctg/start-invitation')" href="/organization/ctg/start-invitation">
                    <span aria-hidden="true">＋</span>
                    <span>Start Invitation</span>
                  </a>
                }
                @if (!isDwcMemberView()) {
                  <button type="button" class="eng-settings-link" (click)="accountPanel.open()">Settings</button>
                }
                <button
                  type="button"
                  class="eng-avatar"
                  (click)="accountPanel.open()"
                  aria-haspopup="dialog"
                  [attr.aria-label]="'Account for ' + roles.persona().person"
                  title="Account">
                  {{ personaInitials() }}
                </button>
                <app-account-panel #accountPanel [name]="roles.persona().person" [role]="roles.persona().label" />
              </div>
            </div>
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
        </section>
      } @else {
        <main class="eng-main eng-main--public">
          <router-outlet />
        </main>
      }
    </div>
  `,
  styles: [`
    .apostolos-global-sidebar{
      position:fixed;
      inset:0 auto 0 0;
      z-index:50;
      display:flex;
      width:224px;
      box-sizing:border-box;
      padding:22px 14px 16px;
      flex-direction:column;
      color:#f4f8f9;
      background:
        radial-gradient(circle at 92% 2%,rgba(74,139,167,.24),transparent 28%),
        linear-gradient(165deg,#0b3042 0%,#082735 66%,#071f2b 100%);
      box-shadow:12px 0 34px rgba(8,39,53,.08)
    }
    .apostolos-global-brand{
      display:flex;
      min-height:48px;
      padding:0 8px 18px;
      align-items:center;
      gap:11px;
      color:inherit;
      text-decoration:none
    }
    .apostolos-global-brand__mark{
      display:grid;
      width:36px;
      height:36px;
      flex:0 0 auto;
      place-items:center;
      overflow:hidden
    }
    .apostolos-global-brand__mark img{width:100%;height:100%;object-fit:contain}
    .apostolos-global-brand>span:last-child{display:grid;min-width:0;gap:2px}
    .apostolos-global-brand strong{font-size:.92rem}
    .apostolos-global-brand small{
      overflow:hidden;
      color:#9fb2bb;
      font-size:.6rem;
      text-overflow:ellipsis;
      white-space:nowrap
    }
    .apostolos-global-nav{display:grid;gap:4px;padding-top:15px;border-top:1px solid rgba(255,255,255,.08)}
    .apostolos-global-nav--modules{margin-top:17px}
    .apostolos-global-label{
      padding:0 10px 7px;
      color:#78909b;
      font-size:.56rem;
      font-weight:800;
      letter-spacing:.12em;
      text-transform:uppercase
    }
    .apostolos-global-nav a{
      display:flex;
      min-height:40px;
      align-items:center;
      gap:9px;
      padding:0 10px;
      border:1px solid transparent;
      border-radius:10px;
      color:#bccbd1;
      font-size:.72rem;
      font-weight:680;
      text-decoration:none
    }
    .apostolos-global-nav a:hover{color:#fff;background:rgba(255,255,255,.055)}
    .apostolos-global-nav a.is-active{
      border-color:rgba(91,159,189,.18);
      color:#fff;
      background:linear-gradient(90deg,rgba(55,111,141,.32),rgba(55,111,141,.10));
      box-shadow:inset 3px 0 0 #6aa0ba
    }
    .apostolos-global-icon{
      display:grid;
      width:24px;
      height:24px;
      flex:0 0 auto;
      place-items:center;
      color:#9fb9c5;
      font-size:.78rem
    }
    .apostolos-global-footer{
      display:grid;
      grid-template-columns:34px minmax(0,1fr);
      align-items:center;
      gap:9px;
      margin-top:auto;
      padding:14px 8px 0;
      border-top:1px solid rgba(255,255,255,.08)
    }
    .apostolos-global-footer>span:last-child{display:grid;min-width:0;gap:2px}
    .apostolos-global-footer strong{
      overflow:hidden;
      color:#f4f8f9;
      font-size:.68rem;
      text-overflow:ellipsis;
      white-space:nowrap
    }
    .apostolos-global-footer small{color:#8fa4ad;font-size:.57rem}
    .apostolos-global-avatar{width:32px!important;height:32px!important;margin:0!important}
    .eng-product-shell{min-height:100vh;margin-left:224px}
    .eng-product-title{display:grid;gap:2px}
    .eng-product-title small{
      color:#d0dde2;
      font-size:.56rem;
      font-weight:800;
      letter-spacing:.08em;
      text-transform:uppercase
    }
    .eng-product-title strong{color:#fff;font-size:.76rem;font-weight:700}

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
      position:sticky;
      z-index:30;
      top:0;
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

    .eng-avatar{text-decoration:none;margin-left:1px;cursor:pointer;font-family:inherit}.eng-settings-link{border:0;cursor:pointer;font-family:inherit}

    @media(max-width:1180px){
      .eng-modulebar{align-items:flex-start;flex-wrap:wrap;padding-top:10px;padding-bottom:9px}
      .eng-modulebar__identity{min-height:42px}
      .eng-modulebar__right{width:100%;flex:1 0 100%;justify-content:space-between;gap:10px}
      .eng-modulebar__primary{max-width:calc(100vw - 250px);overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
      .eng-modulebar__primary::-webkit-scrollbar{display:none}
      .eng-nav-link.current::after{bottom:-9px}
    }

    @media(max-width:980px){
      .apostolos-global-sidebar{display:none}
      .eng-product-shell{margin-left:0}
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
    readonly roles: EngagementDemoRoleService,
  ) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.rememberRoute(event.urlAfterRedirects));
  }

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

  personaInitials(): string {
    return this.roles.persona().person
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'CT';
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

  platformHref(path: string): string {
    const base = this.product()?.platformUrl || 'http://localhost:5100';
    try {
      return new URL(path, `${new URL(base).origin}/`).toString();
    } catch {
      return base;
    }
  }

  globalModuleHref(moduleKey: 'academy' | 'missions'): string {
    const product = this.product();
    const base = moduleKey === 'academy'
      ? product?.academyUrl || 'http://localhost:5102'
      : product?.missionsUrl || 'http://localhost:5108';
    const fallback = moduleKey === 'academy' ? '/app' : '/deployments';
    const remembered = this.readCookie(`ApostolOS.LastRoute.${moduleKey}`);
    const path = remembered?.startsWith('/') ? remembered : fallback;

    try {
      return new URL(path, `${new URL(base).origin}/`).toString();
    } catch {
      return base;
    }
  }

  navigateGlobal(event: Event, url: string): void {
    if (document.body.dataset['apostolosUnsaved'] === 'true') {
      event.preventDefault();
      globalThis.alert(
        'Save your changes before leaving this screen. Once the save finishes, choose the module again.',
      );
      return;
    }

    globalThis.location.assign(url);
  }

  private routePath(): string {
    return this.router.url.split('?')[0].replace(/\/$/, '');
  }

  private rememberRoute(url: string): void {
    const path = url.startsWith('/') ? url : `/${url}`;
    if (path.startsWith('/register/') || path === '/join-the-12') return;
    document.cookie = `ApostolOS.LastRoute.engagements=${encodeURIComponent(path)}; Path=/; Max-Age=2592000; SameSite=Lax`;
  }

  private readCookie(name: string): string | null {
    const prefix = `${name}=`;
    const match = document.cookie
      .split(';')
      .map(value => value.trim())
      .find(value => value.startsWith(prefix));
    if (!match) return null;
    try {
      return decodeURIComponent(match.substring(prefix.length));
    } catch {
      return null;
    }
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
