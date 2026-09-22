import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { InvitationsComponent } from './pages/invitations.component';
import { AssignmentListComponent } from './pages/assignment-list.component';
import { AssignmentWorkspaceComponent } from './pages/assignment-workspace.component';
import { CtgApostleDashboardComponent } from './pages/ctg-apostle-dashboard.component';
import { CtgApostleEngagementBriefComponent } from './pages/ctg-apostle-engagement-brief.component';
import { CtgEngagementsHomeComponent } from './pages/ctg-engagements-home.component';
import { CtgEventRegistrationComponent } from './pages/ctg-event-registration.component';
import { CtgPower12ApplicationComponent } from './pages/ctg-power12-application.component';
import { DwcFormationHomeContextComponent } from './pages/dwc-formation-home-context.component';
import { DwcFormationToolsComponent } from './pages/dwc-formation-tools.component';
import { DwcGroupsHubComponent } from './pages/dwc-groups-hub.component';
import { DwcMyGroupContextComponent } from './pages/dwc-my-group-context.component';
import { OrganizationLandingComponent } from './pages/organization-landing.component';
import { OrganizationProgramsComponent } from './pages/organization-programs.component';
import {
  EngagementDemoRoleService,
  engagementBookingGuard,
  engagementDirectorGuard,
  engagementWorkspaceGuard,
} from './core/engagement-demo-role.service';
import {
  engagementAssignmentDetailGuard,
  engagementAssignmentListGuard,
} from './core/engagement-apostle-route.guards';
import { engagementDemoRoleInterceptor } from './core/engagement-demo-role.interceptor';
import { EngagementWorkspaceNavigationService } from './core/engagement-workspace-navigation.service';
import { CtgApostleShellService } from './core/ctg-apostle-shell.service';
import { CtgHostResponseEnhancementService } from './core/ctg-host-response-enhancement.service';
import { CtgBookingDeskPolishService } from './core/ctg-booking-desk-polish.service';
import { DwcGroupsBrandingService } from './core/dwc-groups-branding.service';
import { HostCollaborationLinkService } from './core/host-collaboration-link.service';
import {
  MutationToastService,
  mutationToastInterceptor,
} from './core/mutation-toast.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([
      engagementDemoRoleInterceptor,
      mutationToastInterceptor,
    ])),
    provideAppInitializer(() => inject(EngagementDemoRoleService).mountSwitcher()),
    provideAppInitializer(() => inject(CtgApostleShellService).mount()),
    provideAppInitializer(() => inject(EngagementWorkspaceNavigationService).mount()),
    provideAppInitializer(() => inject(CtgHostResponseEnhancementService).mount()),
    provideAppInitializer(() => inject(CtgBookingDeskPolishService).mount()),
    provideAppInitializer(() => inject(DwcGroupsBrandingService).mount()),
    provideAppInitializer(() => inject(MutationToastService).mount()),
    provideAppInitializer(() => inject(HostCollaborationLinkService).mount()),
    provideRouter([
      { path: '', component: OrganizationLandingComponent, pathMatch: 'full' },
      { path: 'invitations', component: InvitationsComponent, canActivate: [engagementBookingGuard] },
      { path: 'assignments', component: AssignmentListComponent, canActivate: [engagementAssignmentListGuard] },
      { path: 'assignments/:id', component: AssignmentWorkspaceComponent, canActivate: [engagementAssignmentDetailGuard] },
      { path: 'organization/ctg/apostle/engagements/:id', component: CtgApostleEngagementBriefComponent },
      { path: 'organization/ctg/apostle', component: CtgApostleDashboardComponent },
      { path: 'organization/ctg/command-center', loadComponent: () => import('./pages/ctg-command-center.component').then(m => m.CtgCommandCenterComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/stand-up', loadComponent: () => import('./pages/ctg-stand-up.component').then(m => m.CtgStandUpComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/team', loadComponent: () => import('./pages/ctg-team-responsibilities.component').then(m => m.CtgTeamResponsibilitiesComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/hosts', loadComponent: () => import('./pages/ctg-host-activity.component').then(m => m.CtgHostActivityComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/engagements', loadComponent: () => import('./pages/ctg-director-engagements.component').then(m => m.CtgDirectorEngagementsComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/engagements/:id', loadComponent: () => import('./pages/ctg-director-engagement.component').then(m => m.CtgDirectorEngagementComponent), canActivate: [engagementWorkspaceGuard] },
      { path: 'organization/ctg', loadComponent: () => import('./pages/ctg-command-center.component').then(m => m.CtgCommandCenterComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/bookings', loadComponent: () => import('./pages/ctg-booking-desk.component').then(m => m.CtgBookingDeskComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/ctg/start-invitation', loadComponent: () => import('./pages/ctg-start-invitation.component').then(m => m.CtgStartInvitationComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/ctg/programs', loadComponent: () => import('./pages/ctg-programs.component').then(m => m.CtgProgramsComponent), canActivate: [engagementBookingGuard] },
      { path: 'register/:eventId', component: CtgEventRegistrationComponent },
      { path: 'join-the-12', component: CtgPower12ApplicationComponent },
      { path: 'organization/dwc/formation', component: DwcFormationHomeContextComponent, canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc/formation/tools', component: DwcFormationToolsComponent, canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc/my-group', component: DwcMyGroupContextComponent, canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc/groups', component: DwcGroupsHubComponent, canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc/admin', component: OrganizationProgramsComponent, canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc', component: DwcGroupsHubComponent, canActivate: [engagementBookingGuard] },
      { path: 'organization/:org', component: OrganizationProgramsComponent, canActivate: [engagementBookingGuard] },
      { path: '**', redirectTo: '' },
    ]),
  ],
};
