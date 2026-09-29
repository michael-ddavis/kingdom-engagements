import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { OrganizationLandingComponent } from './pages/organization-landing.component';
import {
  EngagementDemoRoleService,
  engagementBookingGuard,
  engagementDirectorGuard,
  engagementExecutiveGuard,
  engagementHomeGuard,
  engagementWorkspaceGuard,
} from './core/engagement-demo-role.service';
import {
  engagementAssignmentDetailGuard,
  engagementAssignmentListGuard,
} from './core/engagement-apostle-route.guards';
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
      mutationToastInterceptor,
    ])),
    provideAppInitializer(() => inject(EngagementDemoRoleService).initialize()),
    provideAppInitializer(() => inject(CtgApostleShellService).mount()),
    provideAppInitializer(() => inject(EngagementWorkspaceNavigationService).mount()),
    provideAppInitializer(() => inject(CtgHostResponseEnhancementService).mount()),
    provideAppInitializer(() => inject(CtgBookingDeskPolishService).mount()),
    provideAppInitializer(() => inject(DwcGroupsBrandingService).mount()),
    provideAppInitializer(() => inject(MutationToastService).mount()),
    provideAppInitializer(() => inject(HostCollaborationLinkService).mount()),
    provideRouter([
      { path: '', component: OrganizationLandingComponent, pathMatch: 'full', canActivate: [engagementHomeGuard] },
      { path: 'invitations', loadComponent: () => import('./pages/invitations.component').then(m => m.InvitationsComponent), canActivate: [engagementBookingGuard] },
      { path: 'assignments', loadComponent: () => import('./pages/assignment-list.component').then(m => m.AssignmentListComponent), canActivate: [engagementAssignmentListGuard] },
      { path: 'assignments/:id', loadComponent: () => import('./pages/assignment-workspace.component').then(m => m.AssignmentWorkspaceComponent), canActivate: [engagementAssignmentDetailGuard] },
      { path: 'organization/ctg/apostle/engagements/:id', loadComponent: () => import('./pages/ctg-apostle-engagement-brief.component').then(m => m.CtgApostleEngagementBriefComponent), canActivate: [engagementExecutiveGuard] },
      { path: 'organization/ctg/apostle', loadComponent: () => import('./pages/ctg-apostle-dashboard.component').then(m => m.CtgApostleDashboardComponent), canActivate: [engagementExecutiveGuard] },
      { path: 'organization/ctg/command-center', loadComponent: () => import('./pages/ctg-command-center.component').then(m => m.CtgCommandCenterComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/stand-up', loadComponent: () => import('./pages/ctg-stand-up.component').then(m => m.CtgStandUpComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/team', loadComponent: () => import('./pages/ctg-team-responsibilities.component').then(m => m.CtgTeamResponsibilitiesComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/hosts', loadComponent: () => import('./pages/ctg-host-activity.component').then(m => m.CtgHostActivityComponent), canActivate: [engagementDirectorGuard] },
      { path: 'organization/ctg/engagements', loadComponent: () => import('./pages/ctg-director-engagements.component').then(m => m.CtgDirectorEngagementsComponent), canActivate: [engagementWorkspaceGuard] },
      { path: 'organization/ctg/engagements/:id', loadComponent: () => import('./pages/ctg-director-engagement.component').then(m => m.CtgDirectorEngagementComponent), canActivate: [engagementWorkspaceGuard] },
      { path: 'organization/ctg', component: OrganizationLandingComponent, canActivate: [engagementHomeGuard] },
      { path: 'organization/ctg/bookings', loadComponent: () => import('./pages/ctg-booking-desk.component').then(m => m.CtgBookingDeskComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/ctg/start-invitation', loadComponent: () => import('./pages/ctg-start-invitation.component').then(m => m.CtgStartInvitationComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/ctg/programs', loadComponent: () => import('./pages/ctg-programs.component').then(m => m.CtgProgramsComponent), canActivate: [engagementBookingGuard] },
      { path: 'register/:eventId', loadComponent: () => import('./pages/ctg-event-registration.component').then(m => m.CtgEventRegistrationComponent) },
      { path: 'join-the-12', loadComponent: () => import('./pages/ctg-power12-application.component').then(m => m.CtgPower12ApplicationComponent) },
      { path: 'organization/dwc/formation', loadComponent: () => import('./pages/dwc-formation-home-context.component').then(m => m.DwcFormationHomeContextComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc/formation/tools', loadComponent: () => import('./pages/dwc-formation-tools.component').then(m => m.DwcFormationToolsComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc/my-group', loadComponent: () => import('./pages/dwc-my-group-context.component').then(m => m.DwcMyGroupContextComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc/groups', loadComponent: () => import('./pages/dwc-groups-hub.component').then(m => m.DwcGroupsHubComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc/admin', loadComponent: () => import('./pages/organization-programs.component').then(m => m.OrganizationProgramsComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/dwc', loadComponent: () => import('./pages/dwc-groups-hub.component').then(m => m.DwcGroupsHubComponent), canActivate: [engagementBookingGuard] },
      { path: 'organization/:org', loadComponent: () => import('./pages/organization-programs.component').then(m => m.OrganizationProgramsComponent), canActivate: [engagementBookingGuard] },
      { path: '**', redirectTo: '' },
    ]),
  ],
};
