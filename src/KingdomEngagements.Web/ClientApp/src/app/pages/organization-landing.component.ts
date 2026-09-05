import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-organization-landing',
  standalone: true,
  template: `<section class="org-loading">Opening the selected organization…</section>`,
  styles: [`
    .org-loading{max-width:1100px;margin:60px auto;padding:32px;border:1px solid #e0e3e8;border-radius:14px;background:#fff;color:#647089;text-align:center}
  `],
})
export class OrganizationLandingComponent implements OnInit {
  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    const organization = this.selectedOrganization();
    if (organization === 'divine-world-changers') {
      void this.router.navigate(['/organization', 'dwc'], { replaceUrl: true });
      return;
    }
    if (organization === 'heyy-king') {
      void this.router.navigate(['/organization', 'hey-king'], { replaceUrl: true });
      return;
    }
    void this.router.navigate(['/organization', 'ctg'], { replaceUrl: true });
  }

  private selectedOrganization(): string {
    const cookie = document.cookie
      .split(';')
      .map(value => value.trim())
      .find(value => value.startsWith('KingdomOS.DemoOrganization='));
    return cookie ? decodeURIComponent(cookie.substring(cookie.indexOf('=') + 1)).toLowerCase() : 'ctg';
  }
}
