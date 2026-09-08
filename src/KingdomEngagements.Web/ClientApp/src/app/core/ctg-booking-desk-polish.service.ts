import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CtgBookingDeskPolishService {
  private mounted = false;
  private observer: MutationObserver | null = null;

  mount(): void {
    if (this.mounted || typeof document === 'undefined') return;
    this.mounted = true;
    this.installStyles();

    this.observer = new MutationObserver(() => this.polish());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.polish();
  }

  private polish(): void {
    if (!window.location.pathname.startsWith('/organization/ctg/bookings')) return;

    const actions = document.querySelector<HTMLElement>('.desk-hero .hero-actions');
    if (!actions) return;

    actions.classList.add('ctg-polished-actions');

    const quickAdd = actions.querySelector<HTMLButtonElement>('button');
    if (quickAdd) {
      quickAdd.classList.add('ctg-quick-add');
      if (quickAdd.getAttribute('aria-label') !== 'Quick add booking') {
        quickAdd.setAttribute('aria-label', 'Quick add booking');
      }
    }

    const review = actions.querySelector<HTMLAnchorElement>('a[href="/invitations"]');
    if (review) {
      review.classList.add('ctg-formal-review-link');

      const reviewLabel = 'Review formal invitations →';
      if (review.textContent?.trim() !== reviewLabel) {
        review.textContent = reviewLabel;
      }

      const reviewTitle = 'Open formal invitations that need booking review';
      if (review.title !== reviewTitle) {
        review.title = reviewTitle;
      }
    }
  }

  private installStyles(): void {
    if (document.getElementById('ctg-booking-desk-polish-styles')) return;

    const style = document.createElement('style');
    style.id = 'ctg-booking-desk-polish-styles';
    style.textContent = `
      .desk-hero .hero-actions.ctg-polished-actions{
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end;
        gap:14px!important;
      }

      .desk-hero .hero-actions .ctg-quick-add{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-height:48px!important;
        padding:0 20px!important;
        border:1px solid #17263a!important;
        border-radius:10px!important;
        background:#17263a!important;
        color:#fff!important;
        font:inherit!important;
        font-size:.72rem!important;
        font-weight:850!important;
        line-height:1!important;
        letter-spacing:0!important;
        text-align:center!important;
        white-space:nowrap;
        box-shadow:0 6px 16px rgba(23,38,58,.14);
        transition:transform .16s ease,box-shadow .16s ease,background .16s ease;
      }

      .desk-hero .hero-actions .ctg-quick-add:hover{
        background:#223852!important;
        box-shadow:0 8px 20px rgba(23,38,58,.18);
        transform:translateY(-1px);
      }

      .desk-hero .hero-actions .ctg-quick-add:active{
        transform:translateY(0);
        box-shadow:0 4px 10px rgba(23,38,58,.14);
      }

      .desk-hero .hero-actions .ctg-formal-review-link{
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-height:44px!important;
        padding:0 4px!important;
        border:0!important;
        border-radius:6px!important;
        background:transparent!important;
        color:#315b87!important;
        font:inherit!important;
        font-size:.69rem!important;
        font-weight:850!important;
        line-height:1.15!important;
        text-align:center!important;
        text-decoration:none!important;
        white-space:nowrap;
        transition:color .16s ease,background .16s ease;
      }

      .desk-hero .hero-actions .ctg-formal-review-link:hover{
        color:#17263a!important;
        text-decoration:underline!important;
        text-underline-offset:4px;
      }

      .desk-hero .hero-actions .ctg-quick-add:focus-visible,
      .desk-hero .hero-actions .ctg-formal-review-link:focus-visible{
        outline:2px solid var(--action-primary,#315b87)!important;
        outline-offset:3px!important;
      }

      @media(max-width:850px){
        .desk-hero .hero-actions.ctg-polished-actions{
          justify-content:flex-start!important;
        }
      }

      @media(max-width:600px){
        .desk-hero .hero-actions.ctg-polished-actions{
          display:flex!important;
          flex-wrap:wrap;
          align-items:center!important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
