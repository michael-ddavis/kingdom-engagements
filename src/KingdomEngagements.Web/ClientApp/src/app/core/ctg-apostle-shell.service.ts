import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CtgApostleShellService {
  private readonly className = 'ctg-apostle-shell';
  private readonly styleId = 'ctg-apostle-shell-styles';
  private mounted = false;
  private anchorVersion = 0;

  constructor(private readonly router: Router) {}

  mount(): void {
    if (this.mounted || typeof document === 'undefined') return;
    this.mounted = true;
    this.ensureStyles();
    this.installImageFallback();
    this.sync();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.sync());
  }

  private sync(): void {
    const route = this.router.url.split('?')[0].split('#')[0].replace(/\/$/, '');
    const executive = route.startsWith('/organization/ctg/apostle');
    document.body.classList.toggle(this.className, executive);

    this.anchorVersion += 1;
    if (route === '/organization/ctg/apostle') {
      this.ensureRoadAheadAnchor(this.anchorVersion);
    }
  }

  private ensureRoadAheadAnchor(version: number, attempt = 0): void {
    if (version !== this.anchorVersion) return;
    const road = document.querySelector<HTMLElement>('.executive-view .road-ahead');
    if (!road) {
      if (attempt < 24) window.setTimeout(() => this.ensureRoadAheadAnchor(version, attempt + 1), 75);
      return;
    }
    road.id = 'road-ahead';
    if (window.location.hash === '#road-ahead') road.scrollIntoView({ block: 'start' });
  }

  private installImageFallback(): void {
    document.addEventListener('error', event => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      if (!target.src.includes('images.unsplash.com')) return;
      if (!target.closest('.executive-view, .apostle-engagement-brief')) return;

      target.style.display = 'none';
      target.parentElement?.classList.add('ctg-city-image-fallback');
    }, true);
  }

  private ensureStyles(): void {
    if (document.getElementById(this.styleId)) return;
    const style = document.createElement('style');
    style.id = this.styleId;
    style.textContent = `
      body.${this.className} .eng-modulebar__primary{display:none!important}
      body.${this.className} .eng-start-action,
      body.${this.className} .eng-settings-link{display:none!important}
      body.${this.className} .eng-modulebar__utilities{border-left:0!important;padding-left:0!important}
      body.${this.className} .eng-avatar{font-size:0!important;background:#172a46 url('/ctg-apostle-cynthia.webp') center 12%/cover no-repeat!important;color:transparent!important;box-shadow:0 0 0 1px rgba(23,42,70,.12)}
      body.${this.className} .eng-avatar::after{display:none!important;content:''}
      body.${this.className} .eng-tenant small{display:block!important;font-size:0!important}
      body.${this.className} .eng-tenant small::before{content:'Executive View';color:#858b84;font-size:.56rem;font-weight:750;letter-spacing:.02em;text-transform:none}
      body.${this.className} .eng-tenant strong{font-size:0!important;font-family:Georgia,'Times New Roman',serif;font-weight:500}
      body.${this.className} .eng-tenant strong::before{content:'Apostle Cynthia Thompson';color:#232a25;font-size:.72rem;font-weight:600}
      body.${this.className} .eng-modulebar{background:rgba(250,248,244,.98)}
      body.${this.className} .ctg-city-image-fallback{background:#243447 url('/ctg-world-route.svg') center/cover no-repeat!important}
      body.${this.className} #road-ahead{scroll-margin-top:92px}
      @media(max-width:760px){body.${this.className} .eng-modulebar__right{width:auto;flex:0 0 auto}body.${this.className} .eng-modulebar{flex-wrap:nowrap}}
    `;
    document.head.appendChild(style);
  }
}
