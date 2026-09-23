import { Component, ElementRef, Input, ViewChild, signal } from '@angular/core';

@Component({
  selector: 'app-account-panel', standalone: true,
  template: `
    <dialog #panel aria-labelledby="account-panel-title" (click)="backdrop($event)">
      <header><div><small>ACCOUNT & SETTINGS</small><h2 id="account-panel-title">{{ name }}</h2><p>{{ role }}</p></div><button type="button" aria-label="Close account settings" (click)="panel.close()">×</button></header>
      <section><h3>Appearance</h3><p>Make Engagements comfortable for you. Changes save automatically on this browser.</p>
        <label>Primary action color <input type="color" [value]="primary()" (input)="setColor('Primary', $any($event.target).value)"></label>
        <label>Secondary action color <input type="color" [value]="secondary()" (input)="setColor('Secondary', $any($event.target).value)"></label>
        <label>Text size <select [value]="textSize()" (change)="setTextSize($any($event.target).value)"><option value="100">Standard</option><option value="112">Large</option><option value="125">Extra large</option></select></label>
        <p class="saved" role="status">{{ saved() }}</p>
      </section>
      <footer><button type="button" (click)="reset()">Reset appearance</button><button type="button" class="done" (click)="panel.close()">Done</button></footer>
    </dialog>
  `,
  styles: [`
    dialog{position:fixed;inset:72px 18px auto auto;margin:0;width:min(420px,calc(100vw - 36px));box-sizing:border-box;max-height:calc(100dvh - 100px);overflow:auto;border:1px solid #d9ddd7;border-radius:18px;background:#fff;color:#23312b;padding:24px;box-shadow:0 24px 80px #14271d44;font-family:inherit}
    dialog::backdrop{background:#071b1533}header{display:flex;justify-content:space-between;gap:12px}h2{font-size:22px;margin:8px 0}h3{font-size:17px}small{letter-spacing:.13em;font-size:10px;color:#58674e}p{color:#66706a;font-size:13px;line-height:1.5}header button{background:transparent;border:0;font-size:27px;cursor:pointer;align-self:start}section{border-top:1px solid #e5e8e3;margin-top:15px}label{display:flex;align-items:center;justify-content:space-between;gap:18px;margin:18px 0;font-size:14px}input[type=color]{width:55px;height:34px;border:1px solid #d4dad2;border-radius:6px;padding:2px}select{padding:8px;border:1px solid #d4dad2;border-radius:7px;background:white}footer{display:flex;justify-content:space-between;gap:12px}footer button{padding:10px 15px;border:1px solid #cdd5ca;background:#fff;border-radius:8px;cursor:pointer}.done{background:#28432e!important;color:white}.saved{min-height:20px;color:#345b39}
  `],
})
export class AccountPanelComponent {
  @Input() name = '';
  @Input() role = '';
  @ViewChild('panel') panel!: ElementRef<HTMLDialogElement>;
  readonly primary = signal('#365d3f');
  readonly secondary = signal('#94732d');
  readonly textSize = signal('100');
  readonly saved = signal('');
  constructor() {
    try { this.setTextSize(localStorage.getItem('engagements.text-size') || '100', false); } catch { /* Browser storage may be unavailable. */ }
  }
  open(): void {
    for (const name of ['Primary', 'Secondary'] as const) {
      const cookie = document.cookie.split(';').map(v => v.trim()).find(v => v.startsWith(`KingdomOS.Action${name}=`));
      const value = cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
      if (/^#[0-9a-f]{6}$/i.test(value)) (name === 'Primary' ? this.primary : this.secondary).set(value);
    }
    this.saved.set('');
    this.panel.nativeElement.showModal();
  }
  backdrop(event: MouseEvent): void { if (event.target === this.panel.nativeElement) { const box = this.panel.nativeElement.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) this.panel.nativeElement.close(); } }
  setColor(name: 'Primary' | 'Secondary', value: string): void {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    (name === 'Primary' ? this.primary : this.secondary).set(value);
    document.cookie = `KingdomOS.Action${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax${location.protocol === 'https:' ? ';Secure' : ''}`;
    document.documentElement.style.setProperty(`--kos-action-${name.toLowerCase()}`, value);
    document.documentElement.style.setProperty(`--action-${name.toLowerCase()}`, value);
    this.saved.set('Appearance saved.');
  }
  setTextSize(value: string, save = true): void {
    if (!['100', '112', '125'].includes(value)) return;
    this.textSize.set(value);
    document.documentElement.style.fontSize = `${value}%`;
    if (save) { try { localStorage.setItem('engagements.text-size', value); } catch { /* Keep the change for this session. */ } this.saved.set('Appearance saved.'); }
  }
  reset(): void { this.setColor('Primary', '#365d3f'); this.setColor('Secondary', '#94732d'); this.setTextSize('100'); }
}
