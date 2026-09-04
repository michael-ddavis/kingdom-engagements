import { Component } from '@angular/core';
import { CtgProgramsStateService } from '../core/ctg-programs-state.service';

@Component({
  selector: 'app-ctg-engagements-home',
  standalone: true,
  template: `
    <section class="ctg-home">
      <header class="ctg-hero">
        <div>
          <span class="eyebrow">Cynthia Thompson Global · Engagements</span>
          <h1>Where people enter the ministry journey.</h1>
          <p>Invitations, gatherings, and mentorship begin differently. ApostolOS keeps each relationship clear from the first response through the next meaningful step.</p>
        </div>
        <aside>
          <small>Upcoming gathering</small>
          <strong>Power & Glory Intensive</strong>
          <span>September 9–13 · Fort Lauderdale</span>
          <a href="/register/power-glory-2026" target="_blank">View registration experience →</a>
        </aside>
      </header>

      <section class="journey-section">
        <span class="eyebrow">Three ways people connect</span>
        <div class="journey-grid">
          <article>
            <span class="number">01</span>
            <small>Itinerant ministry</small>
            <h2>Invite Apostle Cynthia</h2>
            <p>A church or leader submits an invitation. CTG prayerfully reviews the host, assignment, readiness, travel, and ministry expectations.</p>
            <div class="journey-actions"><a href="/invitations">Review invitations</a><a href="/assignments">Upcoming assignments</a></div>
          </article>

          <article>
            <span class="number">02</span>
            <small>Events & conferences</small>
            <h2>Attend a CTG gathering</h2>
            <p>People register for intensives and conferences, choose access, receive communication, check in, and remain connected after the gathering.</p>
            <div class="journey-signal"><strong>{{ programs.totalRegistrations() }}</strong><span>demo registrations</span></div>
            <div class="journey-actions"><a href="/organization/ctg/programs">Manage events</a><a href="/register/power-glory-2026" target="_blank">Public registration</a></div>
          </article>

          <article class="power-card">
            <span class="number">03</span>
            <small>Private mentorship</small>
            <h2>The Power of 12</h2>
            <p>Applicants move through discernment, acceptance, enrollment, bi-weekly mentorship, activations, resources, formation milestones, and commissioning.</p>
            <div class="journey-signal"><strong>{{ programs.power12SeatsCommitted() }} / 12</strong><span>seats committed</span></div>
            <div class="journey-actions"><a href="/organization/ctg/programs">Open mentorship</a><a href="/join-the-12" target="_blank">Public application</a></div>
          </article>
        </div>
      </section>

      <section class="movement-section">
        <header><div><span class="eyebrow">Right now</span><h2>What is moving across CTG</h2></div></header>
        <div class="movement-list">
          <a href="/organization/ctg/programs">
            <span class="movement-mark gold"></span>
            <span><small>Power & Glory Intensive</small><strong>Registration is open</strong><em>Attendee access, accommodations, check-in and follow-up</em></span>
            <b>Open →</b>
          </a>
          <a href="/organization/ctg/programs">
            <span class="movement-mark plum"></span>
            <span><small>Power of 12</small><strong>{{ programs.applicants().length }} people in the mentorship pipeline</strong><em>Application, discernment, seat decisions and enrollment</em></span>
            <b>Review →</b>
          </a>
          <a href="/invitations">
            <span class="movement-mark blue"></span>
            <span><small>Apostle Cynthia</small><strong>Speaking invitation review</strong><em>Host readiness, prayerful decision and assignment creation</em></span>
            <b>Review →</b>
          </a>
        </div>
      </section>
    </section>
  `,
  styles: [`
    :host{display:block}.ctg-home{max-width:1320px;margin:0 auto;padding:32px 34px 70px;color:#1d2430}.eyebrow{display:block;color:#986f32;font-size:.62rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.ctg-hero{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:42px;align-items:end;padding:22px 0 34px;border-bottom:1px solid #dedfe3}.ctg-hero h1{max-width:850px;margin:8px 0 10px;font-size:clamp(2.6rem,5vw,4.6rem);line-height:.98;letter-spacing:-.06em}.ctg-hero p{max-width:760px;margin:0;color:#747980;line-height:1.65}.ctg-hero aside{display:grid;gap:6px;padding:20px;border-left:3px solid #c2934b;background:#f5f0e7}.ctg-hero aside small{color:#8a7558;font-size:.63rem;text-transform:uppercase;font-weight:900}.ctg-hero aside strong{font-size:1rem}.ctg-hero aside span{color:#686d74;font-size:.72rem}.ctg-hero aside a{margin-top:8px;color:#2e5b92;text-decoration:none;font-size:.7rem;font-weight:850}.journey-section{padding-top:30px}.journey-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.journey-grid article{display:flex;min-height:320px;padding:22px;border:1px solid #dfe0e3;border-radius:14px;flex-direction:column;background:#fff}.journey-grid article.power-card{background:#26212a;color:#f9f3e9;border-color:#26212a}.number{color:#b48238;font-size:1.4rem;font-family:Georgia,serif}.journey-grid small{margin-top:26px;color:#8a8d92;font-size:.6rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.power-card small{color:#baaa9d}.journey-grid h2{margin:6px 0;font-size:1.35rem;letter-spacing:-.04em}.journey-grid p{margin:0;color:#71767d;font-size:.75rem;line-height:1.65}.power-card p{color:#c9c0c8}.journey-signal{display:grid;gap:2px;margin-top:20px}.journey-signal strong{font-size:1.4rem}.journey-signal span{color:#82868c;font-size:.63rem}.power-card .journey-signal span{color:#aaa0a9}.journey-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:24px}.journey-actions a{padding:9px 11px;border:1px solid #d9dade;border-radius:8px;color:#2f5b91;text-decoration:none;font-size:.67rem;font-weight:850}.power-card .journey-actions a{border-color:#544b55;color:#efd7ad}.movement-section{margin-top:36px}.movement-section h2{margin:5px 0 12px;font-size:1.45rem;letter-spacing:-.035em}.movement-list{border:1px solid #dedfe3;border-radius:14px;overflow:hidden;background:#fff}.movement-list>a{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:14px;align-items:center;padding:16px 18px;border-bottom:1px solid #e7e8ea;color:inherit;text-decoration:none}.movement-list>a:last-child{border-bottom:0}.movement-list>a:hover{background:#f8f8f7}.movement-mark{width:5px;height:42px;border-radius:999px}.movement-mark.gold{background:#bd8a3d}.movement-mark.plum{background:#674469}.movement-mark.blue{background:#426b9f}.movement-list>a>span:nth-child(2){display:grid;gap:3px}.movement-list small{color:#85898f;font-size:.6rem;text-transform:uppercase;font-weight:900}.movement-list strong{font-size:.82rem}.movement-list em{color:#777c82;font-size:.67rem;font-style:normal}.movement-list b{color:#315d92;font-size:.66rem}@media(max-width:900px){.ctg-hero,.journey-grid{grid-template-columns:1fr}.journey-grid article{min-height:260px}}@media(max-width:650px){.ctg-home{padding:22px 18px 60px}.movement-list>a{grid-template-columns:7px 1fr}.movement-list b{display:none}}
  `],
})
export class CtgEngagementsHomeComponent {
  constructor(readonly programs: CtgProgramsStateService) {}
}
