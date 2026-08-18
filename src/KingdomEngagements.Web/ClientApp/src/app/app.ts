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
        <a class="eng-brand" [href]="product()?.platformUrl || 'http://localhost:5100'" aria-label="Back to KingdomOS">
          <span class="eng-brand__mark">K</span>
          <span class="eng-brand__text"><strong>KingdomOS</strong><small>Engagements</small></span>
        </a>

        <a class="eng-module-link" [href]="product()?.platformUrl || 'http://localhost:5100'">← All KingdomOS modules</a>

        <div class="eng-tenant">
          <span class="eng-tenant__badge">CTG</span>
          <div>
            <small>Organization</small>
            <strong>{{ product()?.tenantName || 'Cynthia Thompson Global' }}</strong>
          </div>
        </div>

        <nav class="eng-nav" aria-label="Engagements navigation">
          <a routerLink="/assignments" routerLinkActive="active">Engagements</a>
        </nav>

        <div class="eng-sidebar__footer">
          <strong>Engagement lifecycle</strong>
          <span>Invitation → preparation → ministry → closeout</span>
        </div>
      </aside>

      <main class="eng-main">
        <header class="eng-topbar">
          <div>
            <span class="eng-presence"></span>
            <strong>{{ product()?.tenantName || 'Cynthia Thompson Global' }}</strong>
          </div>
          <a [href]="product()?.platformUrl || 'http://localhost:5100'">KingdomOS</a>
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
      next: product => this.product.set(product),
    });
  }
}
