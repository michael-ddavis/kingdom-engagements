import { Component, OnInit, signal } from '@angular/core';
import { EngagementsApiService } from '../core/engagements-api.service';
import { ProductInfo } from '../core/models';
import { DwcSpaceComponent } from './dwc-space.component';
import { HeyyKingSpaceComponent } from './heyy-king-space.component';

@Component({
  selector: 'app-organization-space',
  standalone: true,
  imports: [DwcSpaceComponent, HeyyKingSpaceComponent],
  template: `
    @if (product(); as p) {
      @switch (p.organizationKey) {
        @case ('divine-world-changers') {
          <app-dwc-space [product]="p" />
        }
        @case ('heyy-king') {
          <app-heyy-king-space [product]="p" />
        }
        @default {
          <section class="org-space" style="--org-accent:#3158d4;--org-soft:#edf2ff">
            <header class="org-hero">
              <div>
                <p class="org-eyebrow">Cynthia Thompson Global · Engagements</p>
                <h1>Engagements</h1>
                <p>Speaking invitations, assignment preparation, host coordination, travel, ministry response, care handoff, and closeout remain in the established CTG workflow.</p>
              </div>
              <div class="org-hero__actions"><a class="org-button org-button--primary" href="/assignments">Open assignments</a></div>
            </header>
            <div class="org-ctg-launch">
              <a href="/assignments"><p class="org-eyebrow">Assignment operations</p><h2>Speaking assignments</h2><p>Readiness, travel, host coordination, documents, response, care network, and closeout.</p></a>
              <a href="/invitations"><p class="org-eyebrow">Invitation intake</p><h2>Speaking requests</h2><p>Review invitation requests and move accepted opportunities into coordinated assignments.</p></a>
            </div>
          </section>
        }
      }
    } @else {
      <section class="org-space"><div class="org-surface org-empty">Loading organization Engagements…</div></section>
    }
  `,
  styleUrl: './organization-space.scss'
})
export class OrganizationSpaceComponent implements OnInit {
  readonly product = signal<ProductInfo | null>(null);
  constructor(private readonly api: EngagementsApiService) {}
  ngOnInit(): void { this.api.getProduct().subscribe({ next: value => this.product.set(value) }); }
}
