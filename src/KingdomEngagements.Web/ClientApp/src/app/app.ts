import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EngagementsApiService } from './core/engagements-api.service';
import { ProductInfo } from './core/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="eng-app">
      <header class="eng-modulebar">
        <div class="eng-modulebar__identity">
          <a
            class="eng-brand"
            [href]="product()?.platformUrl || 'http://localhost:5100'"
            aria-label="Return to KingdomOS"
            title="Return to KingdomOS">
            <span class="eng-brand__mark" aria-hidden="true">▦</span>
            <span class="eng-brand__text">
              <strong>KingdomOS</strong>
              <small>Engagements</small>
            </span>
          </a>

          <span class="eng-modulebar__divider" aria-hidden="true"></span>

          <div class="eng-tenant">
            <span class="eng-presence" aria-hidden="true"></span>
            <span>
              <small>Organization</small>
              <strong>{{ product()?.tenantName || 'Cynthia Thompson Global' }}</strong>
            </span>
          </div>
        </div>

        <nav class="eng-modulebar__actions" aria-label="Engagements utilities">
          <a [href]="(product()?.platformUrl || 'http://localhost:5100') + '/appearance'">Settings</a>
          <span class="eng-avatar" aria-label="Signed in as Michael Davis">MD</span>
        </nav>
      </header>

      <main class="eng-main">
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
