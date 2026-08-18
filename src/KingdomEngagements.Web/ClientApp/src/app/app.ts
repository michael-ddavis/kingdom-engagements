import { Component, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EngagementsApiService } from './core/engagements-api.service';
import { ProductInfo } from './core/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="eng-app">
      <aside class="eng-sidebar">
        <div class="eng-brand">
          <span class="eng-brand__mark">K</span>
          <span><strong>KingdomOS</strong><small>Engagements</small></span>
        </div>

        <a class="eng-module-link" [href]="product()?.platformUrl || 'http://localhost:5100'">← All KingdomOS modules</a>

        <div class="eng-tenant">
          <span class="eng-tenant__badge">CTG</span>
          <div>
            <small>Organization</small>
            <strong>{{ product()?.tenantName || 'Cynthia Thompson Global' }}</strong>
          </div>
        </div>

        <nav class="eng-nav" aria-label="Engagements navigation">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Assignments</a>
          <a href="/#requests">Invitations <small>legacy during migration</small></a>
        </nav>

        <div class="eng-sidebar__footer">
          Angular migration preview · current APIs, new client architecture
        </div>
      </aside>

      <main class="eng-main">
        <header class="eng-topbar">
          <strong>{{ product()?.name || 'Kingdom Engagements' }}</strong>
          <span>Angular 21 migration preview</span>
        </header>
        <router-outlet />
      </main>
    </div>
  `,
})
export class App implements OnInit {
  readonly product = signal<ProductInfo | null>(null);

  constructor(private readonly api: EngagementsApiService) {}

  ngOnInit(): void {
    this.api.getProduct().subscribe({
      next: (product) => this.product.set(product),
    });
  }
}
