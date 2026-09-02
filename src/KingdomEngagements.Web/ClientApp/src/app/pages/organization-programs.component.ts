import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Metric { label: string; value: string; note: string; }
interface Row { title: string; subtitle: string; status: string; meta: string; }

@Component({
  selector: 'app-organization-programs',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="org-space" [class.org-space--heyking]="org() === 'hey-king'">
      @if (org() === 'dwc') {
        <header class="org-hero">
          <div><p class="eyebrow">Divine World Changers · Engagements</p><h1>Divine Empowerment Groups</h1><p>One operating space for semesters, clusters, groups, placements, people, attendance, assignments, care handoffs, training readiness and measurable discipleship.</p></div>
          <div class="hero-actions"><button (click)="active.set('groups')">Find a group</button><button class="secondary" (click)="active.set('placements')">Placement inbox</button></div>
        </header>
        <nav class="section-nav">
          @for (item of dwcTabs; track item.key) { <button [class.active]="active()===item.key" (click)="active.set(item.key)">{{ item.label }}</button> }
        </nav>

        @if (active()==='overview') {
          <div class="metric-grid">@for(m of dwcMetrics; track m.label){<article class="metric"><span>{{m.label}}</span><strong>{{m.value}}</strong><small>{{m.note}}</small></article>}</div>
          <div class="two-col">
            <article class="panel"><div class="panel-head"><div><p class="eyebrow">Needs attention</p><h2>Group health</h2></div><button (click)="active.set('groups')">Open directory</button></div>
              @for(r of dwcAttention; track r.title){<div class="list-row"><div><strong>{{r.title}}</strong><span>{{r.subtitle}}</span></div><div class="row-meta"><b>{{r.status}}</b><small>{{r.meta}}</small></div></div>}
            </article>
            <article class="panel"><p class="eyebrow">This week</p><h2>Leadership rhythm</h2><div class="agenda"><div><b>Mon</b><span>Cluster leaders prayer & review</span></div><div><b>Wed</b><span>11 empowerment groups meeting</span></div><div><b>Thu</b><span>Leader development · Transformation Track</span></div><div><b>Sat</b><span>New member placement orientation</span></div></div></article>
          </div>
        }

        @if(active()==='groups'){
          <article class="panel"><div class="panel-head"><div><p class="eyebrow">Spring 2027</p><h2>Empowerment Group directory</h2><p>Filterable by cluster, meeting day, audience, location, availability and leader.</p></div><button>+ Create group</button></div>
            @for(g of groups; track g.title){<div class="list-row rich"><div><strong>{{g.title}}</strong><span>{{g.subtitle}}</span><small>{{g.meta}}</small></div><div class="row-meta"><b>{{g.status}}</b><small>Open group →</small></div></div>}
          </article>
        }

        @if(active()==='clusters'){
          <div class="card-grid">@for(c of clusters; track c.title){<article class="panel cluster"><p class="eyebrow">{{c.status}}</p><h2>{{c.title}}</h2><p>{{c.subtitle}}</p><strong>{{c.meta}}</strong><button>Open cluster</button></article>}</div>
        }

        @if(active()==='placements'){
          <div class="two-col"><article class="panel"><p class="eyebrow">Placement inbox</p><h2>8 people waiting for a group</h2>@for(p of placements; track p.title){<div class="list-row"><div><strong>{{p.title}}</strong><span>{{p.subtitle}}</span></div><div class="row-meta"><b>{{p.status}}</b><small>{{p.meta}}</small></div></div>}</article><article class="panel"><p class="eyebrow">Workflow</p><h2>Request → connected</h2><ol class="steps"><li>Request received</li><li>Coordinator reviews preferences</li><li>Capacity and cluster checked</li><li>Leader notified</li><li>Approved, waitlisted or alternative suggested</li><li>Person added to People-backed roster</li><li>Welcome communication sent</li></ol></article></div>
        }

        @if(active()==='people'){
          <article class="panel"><div class="panel-head"><div><p class="eyebrow">Roster & roles</p><h2>Marriage & Family DEG</h2></div><button>Manage assignments</button></div>@for(p of groupPeople; track p.title){<div class="list-row"><div><strong>{{p.title}}</strong><span>{{p.subtitle}}</span></div><div class="row-meta"><b>{{p.status}}</b><small>{{p.meta}}</small></div></div>}</article>
        }

        @if(active()==='meetings'){
          <div class="two-col"><article class="panel"><p class="eyebrow">Next meeting</p><h2>Wednesday · 6:30 PM</h2><p>Marriage & Family DEG · East Cluster</p>@for(a of meetingAssignments; track a.title){<div class="list-row"><div><strong>{{a.title}}</strong><span>{{a.subtitle}}</span></div><b>{{a.status}}</b></div>}</article><article class="panel"><p class="eyebrow">Attendance</p><h2>11 of 13 present</h2><div class="attendance">✓ Marcus Hill<br>✓ Jordan Hill<br>✓ James Carter<br>○ Ashley Martin<br>✓ Alicia Brown<br>+ 1 first-time guest</div><button>Save attendance</button></article></div>
        }

        @if(active()==='semesters'){
          <div class="card-grid"><article class="panel"><p class="eyebrow">Current</p><h2>Spring 2027</h2><p>18 groups · 214 enrolled · 27 open seats</p><button>Manage semester</button></article><article class="panel"><p class="eyebrow">Next</p><h2>Summer 2027</h2><p>Planning opens May 1</p><button>Prepare rollover</button></article><article class="panel"><p class="eyebrow">History</p><h2>Fall 2026</h2><p>197 participants · 16 groups</p><button>View report</button></article></div>
        }

        @if(active()==='connections'){
          <div class="card-grid"><article class="panel"><p class="eyebrow">People</p><h2>One person record</h2><p>Roster membership, households, skills and contact data come from ApostolOS People.</p></article><article class="panel"><p class="eyebrow">Care</p><h2>Safe pastoral handoff</h2><p>Group leaders can flag follow-up without exposing sensitive care records.</p></article><article class="panel"><p class="eyebrow">Academy</p><h2>Leader readiness</h2><p>Orientation, Transformation Tracks, facilitation and safeguarding requirements.</p></article><article class="panel"><p class="eyebrow">Platform Calendar</p><h2>Shared ministry rhythm</h2><p>Meetings, orientations and leader events publish into the organization calendar.</p></article></div>
        }
      } @else {
        <header class="org-hero hey"><div><p class="eyebrow">Hey King · Engagements + Operations</p><h1>Beyond the Suit</h1><p>Follow each young man from application through appointment, outfit fulfillment, mentorship, goals, milestones and long-term relationship.</p></div><div class="hero-actions"><button (click)="active.set('journey')">Open recipient journey</button><button class="secondary" (click)="active.set('mentorship')">Mentorship</button></div></header>
        <nav class="section-nav">@for(item of heyTabs; track item.key){<button [class.active]="active()===item.key" (click)="active.set(item.key)">{{item.label}}</button>}</nav>

        @if(active()==='overview'){
          <div class="metric-grid">@for(m of heyMetrics; track m.label){<article class="metric"><span>{{m.label}}</span><strong>{{m.value}}</strong><small>{{m.note}}</small></article>}</div>
          <div class="two-col"><article class="panel"><p class="eyebrow">Today</p><h2>What needs action</h2>@for(r of heyAttention; track r.title){<div class="list-row"><div><strong>{{r.title}}</strong><span>{{r.subtitle}}</span></div><div class="row-meta"><b>{{r.status}}</b><small>{{r.meta}}</small></div></div>}</article><article class="panel"><p class="eyebrow">Impact</p><h2>2027 snapshot</h2><div class="impact-big">186 <span>men served</span></div><p>164 complete outfits · 24 active partners · 18 employment milestones · 31 men enrolled in mentorship.</p></article></div>
        }

        @if(active()==='journey'){
          <article class="panel"><div class="panel-head"><div><p class="eyebrow">Recipient pipeline</p><h2>Application → relationship</h2></div><button>+ New application</button></div><div class="pipeline">@for(s of journey; track s.label){<div><strong>{{s.value}}</strong><span>{{s.label}}</span></div>}</div>@for(r of recipients; track r.title){<div class="list-row rich"><div><strong>{{r.title}}</strong><span>{{r.subtitle}}</span><small>{{r.meta}}</small></div><div class="row-meta"><b>{{r.status}}</b><small>Open journey →</small></div></div>}</article>
        }

        @if(active()==='appointments'){
          <article class="panel"><div class="panel-head"><div><p class="eyebrow">Today's appointments</p><h2>Suit Operations</h2></div><button>+ Schedule</button></div>@for(a of appointments; track a.title){<div class="list-row"><div><strong>{{a.title}}</strong><span>{{a.subtitle}}</span></div><div class="row-meta"><b>{{a.status}}</b><small>{{a.meta}}</small></div></div>}</article>
        }

        @if(active()==='wardrobe'){
          <div class="two-col"><article class="panel"><p class="eyebrow">Assigned outfit</p><h2>Marcus Johnson · Interview Outfit</h2>@for(i of outfit; track i.title){<div class="list-row"><div><strong>{{i.title}}</strong><span>{{i.subtitle}}</span></div><b>{{i.status}}</b></div>}<p class="success">5 of 5 required items ready</p></article><article class="panel"><p class="eyebrow">Measurements</p><h2>Current fit profile</h2><dl class="measure"><div><dt>Jacket</dt><dd>44R</dd></div><div><dt>Shirt</dt><dd>17 / 34</dd></div><div><dt>Waist</dt><dd>36</dd></div><div><dt>Inseam</dt><dd>32</dd></div><div><dt>Shoe</dt><dd>11</dd></div></dl><small>Updated Sep 14, 2026 · history preserved</small></article></div>
        }

        @if(active()==='inventory'){
          <article class="panel"><div class="panel-head"><div><p class="eyebrow">Inventory</p><h2>What Hey King has right now</h2></div><button>Record donation</button></div>@for(i of inventory; track i.title){<div class="list-row"><div><strong>{{i.title}}</strong><span>{{i.subtitle}}</span></div><div class="row-meta"><b>{{i.status}}</b><small>{{i.meta}}</small></div></div>}<div class="needs"><strong>Needs forecast</strong><span>HIGH · 44R–48R navy/charcoal suits</span><span>HIGH · Size 11–13 dress shoes</span><span>MEDIUM · 17–18 neck white shirts</span></div></article>
        }

        @if(active()==='partners'){
          <div class="two-col"><article class="panel"><p class="eyebrow">Service partners</p><h2>Relationship network</h2>@for(p of partners; track p.title){<div class="list-row"><div><strong>{{p.title}}</strong><span>{{p.subtitle}}</span></div><div class="row-meta"><b>{{p.status}}</b><small>{{p.meta}}</small></div></div>}</article><article class="panel"><p class="eyebrow">Referral portal</p><h2>Refer a young man</h2><p>Partners submit a secure referral and can see only referral status—not private measurements, mentorship notes or internal care information.</p><button>Preview partner portal</button></article></div>
        }

        @if(active()==='mentorship'){
          <div class="metric-grid"><article class="metric"><span>Active mentees</span><strong>8</strong><small>Pastor Hickman</small></article><article class="metric"><span>Meetings this week</span><strong>3</strong><small>2 confirmed</small></article><article class="metric"><span>Need follow-up</span><strong>2</strong><small>one overdue goal</small></article><article class="metric"><span>Program enrolled</span><strong>31</strong><small>24 active matches</small></article></div>
          <div class="two-col"><article class="panel"><div class="panel-head"><div><p class="eyebrow">Pastor Hickman</p><h2>My mentees</h2></div><button>+ New match</button></div>@for(m of mentees; track m.title){<div class="list-row"><div><strong>{{m.title}}</strong><span>{{m.subtitle}}</span></div><div class="row-meta"><b>{{m.status}}</b><small>{{m.meta}}</small></div></div>}</article><article class="panel"><p class="eyebrow">Marcus Johnson</p><h2>Current goals</h2>@for(g of goals; track g.title){<div class="list-row"><div><strong>{{g.title}}</strong><span>{{g.subtitle}}</span></div><b>{{g.status}}</b></div>}<button>Record mentorship meeting</button></article></div>
        }

        @if(active()==='cohorts'){
          <div class="two-col"><article class="panel"><p class="eyebrow">Fall 2027</p><h2>Hey King Brotherhood Cohort</h2><p>12 young men · Pastor Hickman</p><div class="chips"><span>Identity</span><span>Discipline</span><span>Work</span><span>Money</span><span>Prayer</span><span>Leadership</span><span>Purpose</span></div><button>Open cohort</button></article><article class="panel"><p class="eyebrow">Milestones</p><h2>Marcus' story</h2><div class="timeline"><div><b>Sep 3</b> First suit fitting completed</div><div><b>Sep 18</b> Résumé completed</div><div><b>Oct 2</b> First job interview</div><div><b>Oct 17</b> Accepted new position</div><div><b>Nov 5</b> Began serving at Hey King</div></div></article></div>
        }

        @if(active()==='connections'){
          <div class="card-grid"><article class="panel"><p class="eyebrow">People</p><h2>One young man, one record</h2><p>Recipient, volunteer, mentee and future leader identities remain connected.</p></article><article class="panel"><p class="eyebrow">Operations</p><h2>Suit fulfillment</h2><p>Appointments, measurements, inventory, outfits, alterations and pickup.</p></article><article class="panel"><p class="eyebrow">Care</p><h2>Privacy boundary</h2><p>Sensitive pastoral issues leave general mentorship notes and move into permission-scoped Care.</p></article><article class="panel"><p class="eyebrow">Impact</p><h2>Beyond distribution</h2><p>Employment, leadership, service, mentorship and long-term milestones.</p></article></div>
        }
      }
    </section>
  `,
  styles: [`
    :host{display:block}.org-space{--accent:#5a328a;--soft:#f5f0fa;max-width:1460px;margin:0 auto;padding:38px 42px 70px;color:#172035}.org-space--heyking{--accent:#9a6c23;--soft:#fbf6ea}.org-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:30px;align-items:end;padding:34px 36px;border:1px solid #e2e5ea;border-radius:20px;background:linear-gradient(115deg,var(--soft),#fff 64%);box-shadow:0 16px 45px rgba(15,23,42,.05)}.org-hero h1{margin:7px 0 12px;font-size:clamp(2.4rem,5vw,4.7rem);letter-spacing:-.06em;line-height:.95}.org-hero p{max-width:850px;margin:0;color:#647089;line-height:1.6}.eyebrow{margin:0;color:var(--accent);font-size:.68rem;font-weight:850;letter-spacing:.11em;text-transform:uppercase}.hero-actions,.panel-head{display:flex;gap:9px;align-items:center;justify-content:space-between}.hero-actions button,.panel button{border:0;border-radius:9px;padding:11px 14px;background:var(--accent);color:#fff;font-weight:750;cursor:pointer}.hero-actions .secondary,.panel button.secondary{background:#eef0f4;color:#33415f}.section-nav{display:flex;gap:5px;margin:17px 0 22px;padding:5px;border:1px solid #e0e3e8;border-radius:12px;background:#fff;overflow:auto}.section-nav button{white-space:nowrap;border:0;border-radius:8px;padding:9px 12px;background:transparent;color:#68758a;font-size:.72rem;font-weight:760;cursor:pointer}.section-nav button.active{background:var(--soft);color:var(--accent)}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.metric,.panel{border:1px solid #e0e3e8;border-radius:14px;background:#fff;box-shadow:0 8px 28px rgba(15,23,42,.035)}.metric{padding:20px}.metric span,.metric small{display:block;color:#7b879d;font-size:.66rem}.metric strong{display:block;margin:7px 0 5px;font-size:1.8rem}.two-col{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:18px}.panel{padding:24px}.panel h2{margin:5px 0 10px}.panel p{color:#68758a;line-height:1.55}.list-row{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:14px 0;border-top:1px solid #eceef1}.list-row:first-of-type{margin-top:12px}.list-row strong,.list-row span,.list-row small{display:block}.list-row strong{font-size:.8rem}.list-row span{margin-top:4px;color:#69758a;font-size:.7rem}.list-row small{margin-top:4px;color:#8a94a6;font-size:.62rem}.row-meta{text-align:right}.row-meta b,.list-row>b{color:var(--accent);font-size:.68rem}.rich{padding:17px 0}.agenda div{display:grid;grid-template-columns:48px 1fr;gap:10px;padding:13px 0;border-top:1px solid #eceef1}.agenda b{color:var(--accent)}.card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.cluster strong{display:block;margin:14px 0}.steps{display:grid;gap:10px;padding-left:20px;color:#59677e;font-size:.74rem}.attendance{margin:16px 0;line-height:1.8;color:#52617d}.pipeline{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin:18px 0 24px}.pipeline div{padding:13px 10px;border-radius:10px;background:var(--soft);text-align:center}.pipeline strong,.pipeline span{display:block}.pipeline strong{font-size:1.3rem}.pipeline span{margin-top:4px;color:#6f7c95;font-size:.6rem}.impact-big{font-size:3.2rem;font-weight:850;color:var(--accent)}.impact-big span{font-size:.85rem;color:#68758a}.success{padding:10px 12px;border-radius:8px;background:#eef7f1!important;color:#2e6d48!important;font-weight:750}.measure{margin:14px 0}.measure div{display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid #eceef1}.measure dt{color:#7b879d}.measure dd{margin:0;font-weight:800}.needs{display:grid;gap:7px;margin-top:20px;padding:16px;border-radius:10px;background:#faf8f2}.needs span{font-size:.7rem;color:#59677e}.chips{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0}.chips span{padding:6px 9px;border-radius:99px;background:var(--soft);color:var(--accent);font-size:.66rem;font-weight:700}.timeline{display:grid;gap:0}.timeline div{padding:12px 0;border-top:1px solid #eceef1;color:#59677e;font-size:.72rem}.timeline b{display:inline-block;width:65px;color:var(--accent)}@media(max-width:900px){.org-hero{grid-template-columns:1fr}.metric-grid,.card-grid{grid-template-columns:1fr 1fr}.two-col{grid-template-columns:1fr}.pipeline{grid-template-columns:repeat(3,1fr)}}@media(max-width:600px){.org-space{padding:24px 16px 50px}.metric-grid,.card-grid{grid-template-columns:1fr}.pipeline{grid-template-columns:1fr 1fr}.org-hero{padding:26px 22px}.hero-actions{align-items:stretch;flex-direction:column}}
  `]
})
export class OrganizationProgramsComponent {
  readonly org = signal<'dwc'|'hey-king'>('dwc');
  readonly active = signal('overview');
  constructor(route: ActivatedRoute){ route.paramMap.subscribe(p=>{ const org=p.get('org')==='hey-king'?'hey-king':'dwc'; this.org.set(org); this.active.set('overview'); }); }
  readonly dwcTabs=[{key:'overview',label:'Overview'},{key:'groups',label:'Groups'},{key:'clusters',label:'Clusters'},{key:'placements',label:'Placements'},{key:'people',label:'People & Roles'},{key:'meetings',label:'Meetings'},{key:'semesters',label:'Semesters'},{key:'connections',label:'Connections'}];
  readonly heyTabs=[{key:'overview',label:'Overview'},{key:'journey',label:'Recipient Journey'},{key:'appointments',label:'Appointments'},{key:'wardrobe',label:'Outfits & Measurements'},{key:'inventory',label:'Inventory'},{key:'partners',label:'Partners & Referrals'},{key:'mentorship',label:'Mentorship'},{key:'cohorts',label:'Cohorts & Milestones'},{key:'connections',label:'Connections'}];
  readonly dwcMetrics:Metric[]=[{label:'Groups',value:'18',note:'Spring 2027'},{label:'Enrolled',value:'214',note:'across all clusters'},{label:'Open seats',value:'27',note:'8 groups accepting'},{label:'Waiting placement',value:'8',note:'need coordinator review'}];
  readonly dwcAttention:Row[]=[{title:'Marriage & Family DEG',subtitle:'East Cluster · James Smith',status:'Full',meta:'14/14 · waitlist 3'},{title:'Young Adults DEG',subtitle:'Central Cluster · Alicia Brown',status:'Open',meta:'11/15 · 4 seats'},{title:'Men of Valor',subtitle:'South Cluster · Marcus Hill',status:'Follow-up',meta:'2 absences need care check'}];
  readonly groups:Row[]=[{title:'Young Adults DEG',subtitle:'Central · Alicia Brown · Wed 6:30 PM',status:'Open',meta:'11/15 · Richmond West · childcare no'},{title:'Marriage & Family DEG',subtitle:'East · James Smith · Mon 6:30 PM',status:'Full',meta:'14/14 · waitlist 3 · childcare yes'},{title:'Men of Valor',subtitle:'South · Marcus Hill · Wed 6:30 PM',status:'Open',meta:'9/12 · Richmond South'},{title:'Women of Purpose',subtitle:'Central · Jordan Davis · Tue 7:00 PM',status:'Nearly full',meta:'13/15 · virtual option'}];
  readonly clusters:Row[]=[{title:'Central Cluster',subtitle:'Alicia Brown · Cluster Leader',status:'5 groups',meta:'61 people · 9 open seats'},{title:'East Cluster',subtitle:'James Smith · Cluster Leader',status:'4 groups',meta:'52 people · 4 open seats'},{title:'South Cluster',subtitle:'Marcus Hill · Cluster Leader',status:'5 groups',meta:'58 people · 8 open seats'}];
  readonly placements:Row[]=[{title:'Michael Davis',subtitle:'Young Adults · Wednesday preferred · Richmond West',status:'Suggested',meta:'Young Adults DEG'},{title:'Sarah Jones',subtitle:'Marriage & Family · Monday preferred',status:'Waitlist',meta:'Marriage & Family East'},{title:'Andre Lewis',subtitle:'Men · Wednesday · Richmond South',status:'Suggested',meta:'Men of Valor'}];
  readonly groupPeople:Row[]=[{title:'James Smith',subtitle:'Group Leader',status:'Leader',meta:'Academy requirements complete'},{title:'Jordan Hill',subtitle:'Co-Leader',status:'Leadership',meta:'13 meetings attended'},{title:'Marcus Carter',subtitle:'Host',status:'Host',meta:'Home location verified'},{title:'Ashley Martin',subtitle:'Member',status:'Active',meta:'Joined Jan 2027'}];
  readonly meetingAssignments:Row[]=[{title:'Facilitator',subtitle:'Marcus Hill',status:'Assigned',meta:''},{title:'Opening prayer',subtitle:'Michael Davis',status:'Assigned',meta:''},{title:'Hospitality',subtitle:'Alicia Brown',status:'Assigned',meta:''},{title:'Refreshments',subtitle:'Carter Family',status:'Assigned',meta:''},{title:'Childcare',subtitle:'Unassigned',status:'Needs owner',meta:''}];
  readonly heyMetrics:Metric[]=[{label:'New applications',value:'12',note:'4 need review today'},{label:'Appointments',value:'6',note:'this week'},{label:'Ready for pickup',value:'7',note:'outfits complete'},{label:'Mentorship',value:'24',note:'active matches'}];
  readonly heyAttention:Row[]=[{title:'Marcus Johnson',subtitle:'Alteration returned · outfit ready',status:'Pickup',meta:'schedule by Friday'},{title:'Andre Lewis',subtitle:'Approved · no appointment yet',status:'Needs scheduling',meta:'interview Sep 18'},{title:'James Carter',subtitle:'Mentorship goal overdue',status:'Follow-up',meta:'Pastor Hickman'}];
  readonly journey=[{label:'New',value:'12'},{label:'Review',value:'8'},{label:'Approved',value:'6'},{label:'Scheduled',value:'6'},{label:'Fitting',value:'4'},{label:'Ready',value:'7'},{label:'Mentorship',value:'24'}];
  readonly recipients:Row[]=[{title:'Marcus Johnson',subtitle:'Job interview attire · referred by Workforce Center',status:'Ready for pickup',meta:'Navy suit · mentorship active'},{title:'Andre Lewis',subtitle:'Interview Sep 18 · transportation requested',status:'Approved',meta:'Needs appointment'},{title:'James Carter',subtitle:'Career transition · returning recipient',status:'Fitting',meta:'Charcoal suit reserved'}];
  readonly appointments:Row[]=[{title:'10:00 AM · James Carter',subtitle:'First fitting',status:'Confirmed',meta:'Stylist: Alicia'},{title:'11:30 AM · Andre Lewis',subtitle:'Measurements',status:'Confirmed',meta:'Intake: Marcus'},{title:'1:00 PM · Michael Brown',subtitle:'Pickup',status:'Ready',meta:'Outfit complete'},{title:'2:30 PM · Marcus Johnson',subtitle:'Alteration fitting',status:'Confirmed',meta:'Tailor returned'}];
  readonly outfit:Row[]=[{title:'Navy Suit',subtitle:'44R · excellent',status:'Ready',meta:''},{title:'White Shirt',subtitle:'17 / 34 · new',status:'Ready',meta:''},{title:'Blue Tie',subtitle:'silk',status:'Ready',meta:''},{title:'Black Belt',subtitle:'36–40',status:'Ready',meta:''},{title:'Black Shoes',subtitle:'11 · good',status:'Ready',meta:''}];
  readonly inventory:Row[]=[{title:'Suit · 44R',subtitle:'Navy · excellent condition',status:'Available',meta:'3 in stock'},{title:'Suit · 42L',subtitle:'Charcoal · good condition',status:'Assigned',meta:'James Carter'},{title:'Dress Shirt · 17/34',subtitle:'White · new',status:'Available',meta:'8 in stock'},{title:'Dress Shoes · 11',subtitle:'Black · good',status:'Low',meta:'1 available'}];
  readonly partners:Row[]=[{title:'Smith Tailoring',subtitle:'Alteration Partner',status:'3 open',meta:'17 completed · 4 day avg'},{title:'ABC Workforce Center',subtitle:'Referral Partner',status:'23 referrals',meta:'18 services completed'},{title:'Men’s Wear Partner',subtitle:'Clothing Donor',status:'Active',meta:'82 items donated YTD'}];
  readonly mentees:Row[]=[{title:'Marcus Johnson',subtitle:'Employment · spiritual growth · leadership',status:'On track',meta:'Next Sep 11'},{title:'James Carter',subtitle:'Character · family · work',status:'Follow-up',meta:'Last Aug 25'},{title:'Andre Lewis',subtitle:'Employment · life skills',status:'On track',meta:'Next Sep 13'}];
  readonly goals:Row[]=[{title:'Complete résumé',subtitle:'Employment',status:'Complete',meta:''},{title:'Submit 5 applications',subtitle:'Employment',status:'In progress',meta:''},{title:'Establish prayer rhythm',subtitle:'Spiritual development',status:'Complete',meta:''},{title:'Develop monthly budget',subtitle:'Life development',status:'Next',meta:''},{title:'Serve at one Hey King event',subtitle:'Leadership',status:'Planned',meta:''}];
}
