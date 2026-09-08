import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DwcGroupsBrandingService {
  mount(): void {
    if (typeof document === 'undefined' || document.getElementById('dwc-groups-branding-styles')) return;

    const style = document.createElement('style');
    style.id = 'dwc-groups-branding-styles';
    style.textContent = `
      app-dwc-groups-hub .groups-hub {
        --ink: #171612;
        --muted: #706b60;
        --line: rgba(32, 29, 22, .13);
        --paper: #fffdf8;
        --plum: #a67c2e;
        --plum-dark: #171612;
        --dwc-black: #11110f;
        --dwc-charcoal: #201f1b;
        --dwc-gold: #b58a3a;
        --dwc-gold-strong: #9b7024;
        --dwc-gold-soft: #ead9ad;
        --dwc-champagne: #f7f0de;
        --dwc-ivory: #fffdf8;
        background: #fff;
        color: var(--ink);
      }

      app-dwc-groups-hub .eyebrow {
        color: var(--dwc-gold-strong) !important;
      }

      app-dwc-groups-hub .groups-hero {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(181, 138, 58, .22) !important;
        background:
          radial-gradient(circle at 86% 10%, rgba(222, 194, 124, .22), transparent 31%),
          linear-gradient(125deg, #fff 0%, #fffdf8 54%, #f7f0de 100%) !important;
        box-shadow: 0 22px 60px rgba(18, 17, 14, .06) !important;
      }

      app-dwc-groups-hub .groups-hero::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
        background: linear-gradient(90deg, var(--dwc-black), var(--dwc-gold), #dfc580, var(--dwc-black));
      }

      app-dwc-groups-hub .hero-copy h1 {
        color: var(--dwc-black);
      }

      app-dwc-groups-hub .hero-copy h1 em {
        color: var(--dwc-gold-strong) !important;
      }

      app-dwc-groups-hub .hero-lead {
        color: #666156 !important;
      }

      app-dwc-groups-hub .primary,
      app-dwc-groups-hub .primary-link,
      app-dwc-groups-hub .join-button,
      app-dwc-groups-hub .lead-cta > button,
      app-dwc-groups-hub .form-dialog .primary {
        border: 1px solid var(--dwc-black) !important;
        background: var(--dwc-black) !important;
        color: #fff !important;
        box-shadow: 0 7px 18px rgba(17, 17, 15, .12);
        transition: transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease;
      }

      app-dwc-groups-hub .primary:hover,
      app-dwc-groups-hub .primary-link:hover,
      app-dwc-groups-hub .join-button:hover,
      app-dwc-groups-hub .lead-cta > button:hover,
      app-dwc-groups-hub .form-dialog .primary:hover {
        border-color: var(--dwc-gold-strong) !important;
        background: var(--dwc-gold-strong) !important;
        color: #fff !important;
        transform: translateY(-1px);
        box-shadow: 0 9px 22px rgba(155, 112, 36, .18);
      }

      app-dwc-groups-hub .text-link,
      app-dwc-groups-hub .help-link,
      app-dwc-groups-hub .result-line button,
      app-dwc-groups-hub .group-content footer a,
      app-dwc-groups-hub .leader-home-link,
      app-dwc-groups-hub .oversight-panel header a {
        color: var(--dwc-gold-strong) !important;
      }

      app-dwc-groups-hub .hero-semester {
        position: relative;
        z-index: 1;
        border: 1px solid rgba(181, 138, 58, .34) !important;
        border-left: 4px solid var(--dwc-gold) !important;
        border-radius: 18px;
        background: linear-gradient(145deg, #171612, #25231e) !important;
        color: #fff;
        box-shadow: 0 18px 42px rgba(17, 17, 15, .12);
      }

      app-dwc-groups-hub .hero-semester > span,
      app-dwc-groups-hub .hero-semester > p,
      app-dwc-groups-hub .hero-semester small {
        color: #ddd5c3 !important;
      }

      app-dwc-groups-hub .hero-semester > strong {
        color: #fff;
      }

      app-dwc-groups-hub .hero-semester b {
        border: 1px solid rgba(226, 198, 128, .24);
        background: rgba(255, 255, 255, .08) !important;
        color: #efdca9;
      }

      app-dwc-groups-hub .pathway {
        border-color: rgba(31, 29, 24, .13) !important;
      }

      app-dwc-groups-hub .path-card {
        border-right-color: rgba(31, 29, 24, .13) !important;
      }

      app-dwc-groups-hub .path-card:hover {
        background: linear-gradient(135deg, #fffdf8, #f8f1df) !important;
      }

      app-dwc-groups-hub .path-card > span {
        border: 1px solid rgba(181, 138, 58, .27);
        background: var(--dwc-champagne) !important;
        color: var(--dwc-gold-strong) !important;
      }

      app-dwc-groups-hub .path-card > b {
        color: var(--dwc-gold-strong) !important;
      }

      app-dwc-groups-hub .finder-bar {
        border-color: rgba(181, 138, 58, .2) !important;
        background: #fffdf8 !important;
        box-shadow: 0 10px 28px rgba(17, 17, 15, .035);
      }

      app-dwc-groups-hub .finder-bar input,
      app-dwc-groups-hub .finder-bar select,
      app-dwc-groups-hub .check-filter {
        border-color: #ddd5c3 !important;
        background: #fff !important;
      }

      app-dwc-groups-hub .finder-bar input:focus,
      app-dwc-groups-hub .finder-bar select:focus {
        outline: 2px solid rgba(181, 138, 58, .24);
        border-color: var(--dwc-gold) !important;
      }

      app-dwc-groups-hub .group-card {
        border-color: rgba(32, 29, 22, .12) !important;
        background: #fff !important;
        box-shadow: 0 10px 30px rgba(17, 17, 15, .035);
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
      }

      app-dwc-groups-hub .group-card:hover {
        border-color: rgba(181, 138, 58, .42) !important;
        transform: translateY(-2px);
        box-shadow: 0 16px 38px rgba(17, 17, 15, .075);
      }

      app-dwc-groups-hub .group-art {
        background:
          radial-gradient(circle at 22% 20%, rgba(230, 204, 142, .24), transparent 34%),
          linear-gradient(155deg, #26241e, #11110f) !important;
        color: #fff !important;
      }

      app-dwc-groups-hub .group-art[data-group='marriage-family'] {
        background:
          radial-gradient(circle at 22% 20%, rgba(235, 210, 150, .34), transparent 36%),
          linear-gradient(155deg, #8d6a2c, #2a2419) !important;
      }

      app-dwc-groups-hub .group-art[data-group='men-of-valor'] {
        background:
          radial-gradient(circle at 22% 20%, rgba(214, 187, 119, .2), transparent 36%),
          linear-gradient(155deg, #302d25, #0e0e0c) !important;
      }

      app-dwc-groups-hub .group-art[data-group='women-purpose'] {
        background:
          radial-gradient(circle at 22% 20%, rgba(244, 220, 159, .36), transparent 36%),
          linear-gradient(155deg, #a67c2e, #3a2e18) !important;
      }

      app-dwc-groups-hub .group-art span {
        color: #e8d39e;
      }

      app-dwc-groups-hub .group-status span {
        border: 1px solid rgba(181, 138, 58, .22);
        background: #f8f1df !important;
        color: #765519 !important;
      }

      app-dwc-groups-hub .group-card[data-status='Nearly full'] .group-status span {
        background: #fff3d4 !important;
        color: #7c5815 !important;
      }

      app-dwc-groups-hub .group-card[data-status='Waitlist'] .group-status span {
        border-color: rgba(30, 28, 24, .12);
        background: #efede8 !important;
        color: #514d44 !important;
      }

      app-dwc-groups-hub .tags span {
        border: 1px solid rgba(181, 138, 58, .14);
        background: #faf5e8 !important;
        color: #6b5b38 !important;
      }

      app-dwc-groups-hub .my-group-strip {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(226, 198, 128, .22);
        background:
          radial-gradient(circle at 85% 0%, rgba(181, 138, 58, .2), transparent 32%),
          linear-gradient(130deg, #11110f, #211f1a 72%) !important;
        box-shadow: 0 18px 42px rgba(17, 17, 15, .1);
      }

      app-dwc-groups-hub .my-group-strip::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 4px;
        background: var(--dwc-gold);
      }

      app-dwc-groups-hub .my-group-strip .eyebrow {
        color: #e4c980 !important;
      }

      app-dwc-groups-hub .my-group-strip p,
      app-dwc-groups-hub .my-group-next span,
      app-dwc-groups-hub .my-group-next small,
      app-dwc-groups-hub .strip-actions > a:last-child {
        color: #d9d1bf !important;
      }

      app-dwc-groups-hub .primary-link {
        background: #fff !important;
        border-color: #fff !important;
        color: var(--dwc-black) !important;
        box-shadow: none;
      }

      app-dwc-groups-hub .primary-link:hover {
        background: var(--dwc-gold) !important;
        border-color: var(--dwc-gold) !important;
        color: #fff !important;
      }

      app-dwc-groups-hub .tool-grid > a,
      app-dwc-groups-hub .tool-button,
      app-dwc-groups-hub .oversight-panel,
      app-dwc-groups-hub .semester-panel {
        border-color: rgba(32, 29, 22, .12) !important;
        background: #fff !important;
      }

      app-dwc-groups-hub .tool-grid > a:hover,
      app-dwc-groups-hub .tool-button:hover {
        border-color: rgba(181, 138, 58, .42) !important;
        background: linear-gradient(145deg, #fff, #fbf5e7) !important;
        box-shadow: 0 12px 28px rgba(17, 17, 15, .055);
      }

      app-dwc-groups-hub .tool-grid span,
      app-dwc-groups-hub .tool-grid b {
        color: var(--dwc-gold-strong) !important;
      }

      app-dwc-groups-hub .attention-row > span {
        border: 1px solid rgba(181, 138, 58, .22);
        background: var(--dwc-champagne) !important;
        color: var(--dwc-gold-strong) !important;
      }

      app-dwc-groups-hub .semester-row b {
        background: #efede7 !important;
        color: #5d584d !important;
      }

      app-dwc-groups-hub .semester-row.current b {
        border: 1px solid rgba(181, 138, 58, .2);
        background: #f7edcf !important;
        color: #735318 !important;
      }

      app-dwc-groups-hub .lead-cta {
        border: 1px solid rgba(181, 138, 58, .22);
        background:
          radial-gradient(circle at 80% 10%, rgba(220, 191, 117, .18), transparent 30%),
          linear-gradient(125deg, #fffdf8, #f6edd7) !important;
      }

      app-dwc-groups-hub .lead-cta li span {
        border: 1px solid rgba(181, 138, 58, .22);
        background: #fff !important;
        color: var(--dwc-gold-strong) !important;
      }

      app-dwc-groups-hub .form-dialog {
        border: 1px solid rgba(181, 138, 58, .22) !important;
        background: #fffdf8 !important;
        box-shadow: 0 32px 90px rgba(17, 17, 15, .26) !important;
      }

      app-dwc-groups-hub .form-dialog header {
        border-bottom-color: rgba(181, 138, 58, .16) !important;
        background: linear-gradient(135deg, #fff, #fbf5e7);
      }

      app-dwc-groups-hub .form-dialog input,
      app-dwc-groups-hub .form-dialog select,
      app-dwc-groups-hub .form-dialog textarea {
        border-color: #dcd4c2 !important;
        background: #fff !important;
      }

      app-dwc-groups-hub .form-dialog .secondary {
        border-color: #d6d0c2 !important;
        background: #fff !important;
        color: #4e4a42 !important;
      }

      app-dwc-groups-hub .toast {
        border-color: rgba(181, 138, 58, .32) !important;
        background: #fffdf8 !important;
        color: var(--dwc-black) !important;
      }

      app-dwc-groups-hub a:focus-visible,
      app-dwc-groups-hub button:focus-visible,
      app-dwc-groups-hub input:focus-visible,
      app-dwc-groups-hub select:focus-visible,
      app-dwc-groups-hub textarea:focus-visible {
        outline: 2px solid var(--dwc-gold) !important;
        outline-offset: 3px;
      }

      @media (max-width: 760px) {
        app-dwc-groups-hub .groups-hero {
          background: linear-gradient(160deg, #fff, #fbf5e7) !important;
        }

        app-dwc-groups-hub .hero-semester {
          border-left-width: 1px !important;
          border-top: 4px solid var(--dwc-gold) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
