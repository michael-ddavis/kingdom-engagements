import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CtgApostleShellService {
  private readonly className = 'ctg-apostle-shell';
  private readonly styleId = 'ctg-apostle-shell-styles';
  private mounted = false;

  constructor(private readonly router: Router) {}

  mount(): void {
    if (this.mounted || typeof document === 'undefined') return;
    this.mounted = true;
    this.ensureStyles();
    this.sync();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.sync());
  }

  private sync(): void {
    const executive = this.router.url.split('?')[0].replace(/\/$/, '') === '/organization/ctg/apostle';
    document.body.classList.toggle(this.className, executive);
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
      body.${this.className} .eng-avatar{font-size:0!important;background:#172a46!important;color:#fff!important}
      body.${this.className} .eng-avatar::after{content:'CT';font-size:.68rem;font-weight:900;letter-spacing:.02em}
      body.${this.className} .eng-tenant small{display:none}
      body.${this.className} .eng-tenant strong{font-family:Georgia,'Times New Roman',serif;font-weight:500}
      body.${this.className} .eng-modulebar{background:rgba(250,248,244,.98)}
      @media(max-width:760px){body.${this.className} .eng-modulebar__right{width:auto;flex:0 0 auto}body.${this.className} .eng-modulebar{flex-wrap:nowrap}}
    `;
    document.head.appendChild(style);
  }
}
