import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { EngagementsApiService } from '../core/engagements-api.service';
import { EngagementDemoRoleService } from '../core/engagement-demo-role.service';
import {
  EngagementResponsibilitySnapshot,
  EngagementSummary,
  ResponsibilityLaneState,
} from '../core/models';

type EngagementFilter = 'active' | 'attention' | 'upcoming' | 'completed';

@Component({
  selector: 'app-ctg-director-engagements',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="director-engagements">
      <header class="page-heading">
        <h1>Engagements</h1>
        @if (isDirector()) {
          <div class="heading-actions">
            <a class="secondary" routerLink="/organization/ctg/command-center">Command Center</a>
            <a class="primary" routerLink="/organization/ctg/stand-up">Stand-up →</a>
          </div>
        }
      </header>

      @if (loading()) {
        <div class="state">Loading engagements…</div>
      } @else if (error()) {
        <div class="state error">{{ error() }}</div>
      } @else {
        <section class="summary">
          <button type="button" [class.selected]="filter() === 'active'" (click)="filter.set('active')">
            <small>Active</small><strong>{{ activeCount() }}</strong><span>Approved work in motion</span>
          </button>
          <button type="button" [class.selected]="filter() === 'attention'" (click)="filter.set('attention')">
            <small>Need attention</small><strong>{{ attentionCount() }}</strong><span>Blocked, overdue or unassigned</span>
          </button>
          <button type="button" [class.selected]="filter() === 'upcoming'" (click)="filter.set('upcoming')">
            <small>Next 30 days</small><strong>{{ upcomingCount() }}</strong><span>Immediate road ahead</span>
          </button>
          <button type="button" [class.selected]="filter() === 'completed'" (click)="filter.set('completed')">
            <small>Completed</small><strong>{{ completedCount() }}</strong><span>Past engagement records</span>
          </button>
        </section>

        @if (responsibilityDataUnavailable()) {
          <div class="state warning">Engagements are available, but responsibility/readiness details are temporarily unavailable. Rebuild the Engagements Docker container after pulling the latest branch.</div>
        }

        <section class="engagement-list">
          <header>
            <div>
              <p class="eyebrow">{{ filterLabel() }}</p>
              <h2>{{ visible().length }} engagement{{ visible().length === 1 ? '' : 's' }}</h2>
            </div>
            @if (isDirector()) {
              <a routerLink="/organization/ctg/bookings">Booking Desk →</a>
            }
          </header>

          @if (visible().length === 0) {
            <div class="empty">No engagements match this view.</div>
          } @else {
            <div class="rows">
              @for (item of visible(); track item.assignment.id) {
                <article>
                  <div class="identity">
                    <span class="date-block">
                      <b>{{ month(item.assignment.startsAtUtc) }}</b>
                      <strong>{{ day(item.assignment.startsAtUtc) }}</strong>
                    </span>
                    <div>
                      <small>{{ item.assignment.hostOrganization }}</small>
                      <h3>{{ item.assignment.title }}</h3>
                      <p>{{ item.assignment.location || 'Location pending' }} · {{ dateLabel(item.assignment.startsAtUtc) }}</p>
                    </div>
                  </div>

                  <div class="readiness">
                    <div class="readiness-ring">{{ item.snapshot?.responsibilityReadinessPercent ?? item.assignment.readinessPercent }}%</div>
                    <span>Operational readiness</span>
                  </div>

                  <div class="lane-strip">
                    @for (laneKey of importantLaneKeys; track laneKey) {
                      @if (lane(item.snapshot, laneKey); as laneItem) {
                        <span
                          [class.complete]="laneItem.status === 'complete'"
                          [class.waiting]="laneItem.status === 'waiting-on-host'"
                          [class.danger]="laneItem.isOverdue || laneItem.status === 'blocked' || !laneItem.owner"
                          [title]="laneItem.label + ': ' + laneStatus(laneItem)">
                          <b>{{ shortLane(laneKey) }}</b>
                          <small>{{ laneStatus(laneItem) }}</small>
                        </span>
                      }
                    }
                  </div>

                  <div class="exceptions">
                    @if (item.snapshot; as snapshot) {
                      @if (snapshot.overdueLaneCount > 0) {
                        <span class="danger">{{ snapshot.overdueLaneCount }} overdue</span>
                      }
                      @if (snapshot.unassignedLaneCount > 0) {
                        <span class="warning">{{ snapshot.unassignedLaneCount }} unassigned</span>
                      }
                      @if (waitingCount(snapshot) > 0) {
                        <span>{{ waitingCount(snapshot) }} waiting on host</span>
                      }
                      @if (snapshot.overdueLaneCount === 0 && snapshot.unassignedLaneCount === 0 && waitingCount(snapshot) === 0) {
                        <span class="good">On track</span>
                      }
                    } @else {
                      <span>{{ label(item.assignment.status) }}</span>
                    }
                  </div>

                  <a class="open" [routerLink]="['/organization/ctg/engagements', item.assignment.id]">Open engagement →</a>
                </article>
              }
            </div>
          }
        </section>
      }
    </section>
  `,
  styles: [`
    :host{display:block}.director-engagements{width:min(1380px,calc(100% - 42px));margin:0 auto;padding:28px 0 64px;color:#17202b}
    .page-heading{display:flex;align-items:center;justify-content:space-between;gap:26px;margin-bottom:18px;padding:4px 0 14px;border-bottom:1px solid #dde1df}
    .page-heading h1,.engagement-list h2,.identity h3{font-family:Georgia,'Times New Roman',serif;color:#17243a;font-weight:500}.page-heading h1{margin:0;font-size:clamp(1.8rem,2.6vw,2.5rem)}
    .eyebrow{margin:0!important;color:#7c6b38!important;font:800 .66rem/1.2 system-ui,sans-serif!important;letter-spacing:.11em;text-transform:uppercase}.heading-actions{display:flex;gap:8px;flex-wrap:wrap}.heading-actions a{display:inline-flex;min-height:40px;align-items:center;padding:0 14px;border-radius:9px;font-size:.72rem;font-weight:850;text-decoration:none}.heading-actions .primary{background:#172a46;color:#fff}.heading-actions .secondary{border:1px solid #d6dbe0;background:#fff;color:#172a46}
    .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.summary button{appearance:none;padding:16px 18px;border:1px solid #dde1df;border-radius:12px;background:#fffdfa;color:inherit;text-align:left;cursor:pointer}.summary button.selected{border-color:#9d7438;box-shadow:0 0 0 2px rgba(157,116,56,.11)}.summary small,.summary strong,.summary span{display:block}.summary small{color:#7b827e;font-size:.62rem;font-weight:850;text-transform:uppercase}.summary strong{margin:5px 0 2px;font-size:1.5rem}.summary span{color:#858b87;font-size:.64rem}
    .engagement-list{overflow:hidden;border:1px solid #dde1df;border-radius:16px;background:#fffdfa}.engagement-list>header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 20px;border-bottom:1px solid #e4e6e4}.engagement-list h2{margin:4px 0 0;font-size:1.3rem}.engagement-list>header>a{color:#315faf;font-size:.71rem;font-weight:850;text-decoration:none}
    .rows{display:flex;flex-direction:column}.rows article{display:grid;grid-template-columns:minmax(280px,1.4fr) 105px minmax(360px,1.3fr) minmax(130px,.6fr) auto;gap:15px;align-items:center;padding:16px 18px;border-bottom:1px solid #eceeeb}.rows article:last-child{border-bottom:0}
    .identity{display:flex;gap:12px;align-items:center}.date-block{display:grid;flex:0 0 50px;min-height:54px;place-items:center;border:1px solid #dfe2df;border-radius:9px;background:#f7f6f2}.date-block b{margin-top:5px;color:#8c7335;font-size:.55rem;text-transform:uppercase}.date-block strong{margin-top:-4px;font-size:1.12rem}.identity small{color:#7d847f;font-size:.6rem;font-weight:750}.identity h3{margin:2px 0;font-size:1rem}.identity p{margin:0;color:#7b827e;font-size:.65rem}
    .readiness{text-align:center}.readiness-ring{display:grid;width:58px;height:58px;margin:0 auto 4px;place-items:center;border:6px solid #e5e9e5;border-top-color:#5d7553;border-radius:50%;font-weight:900}.readiness span{font-size:.57rem;color:#828985}
    .lane-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.lane-strip>span{padding:7px;border-radius:7px;background:#f5f4f0}.lane-strip b,.lane-strip small{display:block}.lane-strip b{font-size:.56rem;text-transform:uppercase}.lane-strip small{margin-top:2px;color:#7e8581;font-size:.54rem}.lane-strip .complete{background:#eef6f1;color:#2d6d52}.lane-strip .waiting{background:#fbf5e8;color:#8a641e}.lane-strip .danger{background:#fbefed;color:#9a433f}
    .exceptions{display:flex;flex-direction:column;gap:3px}.exceptions span{font-size:.62rem;color:#707873}.exceptions .danger{color:#a84642;font-weight:850}.exceptions .warning{color:#956d25;font-weight:850}.exceptions .good{color:#2d6d52;font-weight:850}.open{white-space:nowrap;color:#315faf;font-size:.69rem;font-weight:850;text-decoration:none}.empty,.state{padding:34px;text-align:center;color:#747c78}.state{border:1px solid #dde1df;border-radius:14px;background:#fff}.state.error{color:#a84642}.state.warning{margin-bottom:12px;padding:14px 18px;color:#7b6227;background:#fff8e8;border-color:#ead9ab;text-align:left}
    @media(max-width:1150px){.rows article{grid-template-columns:minmax(280px,1fr) 100px 1fr auto}.exceptions{display:none}.lane-strip{grid-template-columns:repeat(3,1fr)}}@media(max-width:820px){.page-heading{flex-direction:column}.summary{grid-template-columns:1fr 1fr}.rows article{grid-template-columns:1fr auto}.lane-strip{grid-column:1/-1}.readiness{grid-row:1;grid-column:2}.open{grid-column:1/-1}}@media(max-width:560px){.director-engagements{width:min(100% - 24px,1380px)}.summary{grid-template-columns:1fr}.lane-strip{grid-template-columns:1fr 1fr}}
  `],
})
export class CtgDirectorEngagementsComponent implements OnInit {
  readonly assignments = signal<readonly EngagementSummary[]>([]);
  readonly snapshots = signal<readonly EngagementResponsibilitySnapshot[]>([]);
  readonly filter = signal<EngagementFilter>('active');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly responsibilityDataUnavailable = signal(false);
  readonly importantLaneKeys = ['host-coordination','travel','lodging','transportation','media','program','documents','finance'];

  readonly rows = computed(() => {
    const byId = new Map(this.snapshots().map(item => [item.assignment.id, item]));
    return this.assignments()
      .map(assignment => ({ assignment, snapshot: byId.get(assignment.id) ?? null }))
      .sort((a,b) => this.dateValue(a.assignment.startsAtUtc) - this.dateValue(b.assignment.startsAtUtc));
  });

  readonly activeCount = computed(() => this.rows().filter(item => !this.isComplete(item.assignment)).length);
  readonly completedCount = computed(() => this.rows().filter(item => this.isComplete(item.assignment)).length);
  readonly upcomingCount = computed(() => this.rows().filter(item => !this.isComplete(item.assignment) && this.withinDays(item.assignment.startsAtUtc,30)).length);
  readonly attentionCount = computed(() => this.rows().filter(item => this.needsAttention(item)).length);

  readonly visible = computed(() => {
    switch(this.filter()){
      case 'completed': return this.rows().filter(item => this.isComplete(item.assignment));
      case 'upcoming': return this.rows().filter(item => !this.isComplete(item.assignment) && this.withinDays(item.assignment.startsAtUtc,30));
      case 'attention': return this.rows().filter(item => this.needsAttention(item));
      default: return this.rows().filter(item => !this.isComplete(item.assignment));
    }
  });

  constructor(
    private readonly api:EngagementsApiService,
    private readonly roles:EngagementDemoRoleService,
  ){}

  ngOnInit():void{
    const director = this.roles.canManageAssignments();

    forkJoin({
      assignments:director ? this.api.getAssignments() : this.api.getMyAssignments(),
      snapshots:director
        ? this.api.getCommandCenter().pipe(
            catchError(() => {
              this.responsibilityDataUnavailable.set(true);
              return of([] as readonly EngagementResponsibilitySnapshot[]);
            }),
          )
        : of([] as readonly EngagementResponsibilitySnapshot[]),
    }).subscribe({
      next:result=>{
        this.assignments.set(result.assignments);
        this.snapshots.set(result.snapshots);
        this.loading.set(false);
      },
      error:()=>{
        this.error.set('Engagements could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  isDirector():boolean{return this.roles.canManageAssignments();}

  needsAttention(item:{assignment:EngagementSummary;snapshot:EngagementResponsibilitySnapshot|null}):boolean{
    const snapshot=item.snapshot;
    if(snapshot){
      return snapshot.overdueLaneCount>0 ||
        snapshot.unassignedLaneCount>0 ||
        snapshot.lanes.some(lane=>lane.status==='blocked');
    }
    return item.assignment.openTasks>0 || item.assignment.readinessPercent<100;
  }

  lane(snapshot:EngagementResponsibilitySnapshot|null,key:string):ResponsibilityLaneState|null{
    return snapshot?.lanes.find(item=>item.key===key&&item.isApplicable)??null;
  }
  waitingCount(snapshot:EngagementResponsibilitySnapshot):number{
    return snapshot.lanes.filter(item=>item.isApplicable&&item.status==='waiting-on-host').length;
  }
  laneStatus(lane:ResponsibilityLaneState):string{
    if(!lane.owner) return 'Unassigned';
    if(lane.isOverdue) return 'Overdue';
    return this.label(lane.status);
  }
  shortLane(key:string):string{
    return ({'host-coordination':'Host',travel:'Travel',lodging:'Stay',transportation:'Transport',media:'Media',program:'Program',documents:'Docs',finance:'Finance'} as Record<string,string>)[key]??key;
  }
  filterLabel():string{
    return ({active:'Active engagements',attention:'Needs attention',upcoming:'Next 30 days',completed:'Completed engagements'} as Record<EngagementFilter,string>)[this.filter()];
  }
  label(value:string):string{return value.replaceAll('-',' ').replace(/\b\w/g,char=>char.toUpperCase());}
  dateLabel(value:string|null):string{
    if(!value)return 'Date pending';
    return new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  }
  month(value:string|null):string{return value?new Date(value).toLocaleDateString(undefined,{month:'short'}):'TBD';}
  day(value:string|null):string{return value?String(new Date(value).getDate()):'—';}
  private isComplete(item:EngagementSummary):boolean{return ['complete','completed','archived','cancelled'].includes(item.status);}
  private withinDays(value:string|null,days:number):boolean{
    if(!value)return false;
    const date=new Date(value).getTime(),now=Date.now();
    return date>=now-86_400_000&&date<=now+days*86_400_000;
  }
  private dateValue(value:string|null):number{return value?new Date(value).getTime():Number.MAX_SAFE_INTEGER;}
}
