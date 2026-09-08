import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { InvitationsComponent } from './pages/invitations.component';
import { AssignmentListComponent } from './pages/assignment-list.component';
import { AssignmentWorkspaceComponent } from './pages/assignment-workspace.component';
import { CtgBookingDeskComponent } from './pages/ctg-booking-desk.component';
import { CtgEngagementsHomeComponent } from './pages/ctg-engagements-home.component';
import { CtgEventRegistrationComponent } from './pages/ctg-event-registration.component';
import { CtgPower12ApplicationComponent } from './pages/ctg-power12-application.component';
import { CtgProgramsComponent } from './pages/ctg-programs.component';
import { CtgStartInvitationComponent } from './pages/ctg-start-invitation.component';
import { DwcFormationHomeContextComponent } from './pages/dwc-formation-home-context.component';
import { DwcFormationToolsComponent } from './pages/dwc-formation-tools.component';
import { DwcGroupsHubComponent } from './pages/dwc-groups-hub.component';
import { DwcMyGroupContextComponent } from './pages/dwc-my-group-context.component';
import { OrganizationLandingComponent } from './pages/organization-landing.component';
import { OrganizationProgramsComponent } from './pages/organization-programs.component';
import {
  EngagementDemoRoleService,
  engagementBookingGuard,
} from './core/engagement-demo-role.service';
import { engagementDemoRoleInterceptor } from './core/engagement-demo-role.interceptor';
import { CtgHostResponseEnhancementService } from './core/ctg-host-response-enhancement.service';
import { CtgBookingDeskPolishService } from './core/ctg-booking-desk-polish.service';
import { DwcGroupsBrandingService } from './core/dwc-groups-branding.service';
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
    provideAppInitializer(() => inject(CtgHostResponseEnhancementService).mount()),
    provideAppInitializer(() => inject(CtgBookingDeskPolishService).mount()),
    provideAppInitializer(() => inject(DwcGroupsBrandingService).mount()),
    provideAppInitializer(() => inject(MutationToastService).mount()),
    provideRouter([
      { path: '', component: OrganizationLandingComponent, pathMatch: 'full' },
      { path: 'invitations', component: InvitationsComponent, canActivate: [engagementBookingGuard] },
      { path: 'assignments', component: AssignmentListComponent },
      { path: 'assignments/:id', component: AssignmentWorkspaceComponent },
      { path: 'organization/ctg', component: CtgEngagementsHomeComponent, canActivate: [engagementBookingGuard] },
      { path: 'organization/ctg/bookings', component: CtgBookingDeskComponent, canActivate: [engagementBookingGuard] },
      { path: 'organization/ctg/start-invitation', component: CtgStartInvitationComponent, canActivate: [engagementBookingGuard] },
      { path: 'organization/ctg/programs', component: CtgProgramsComponent, canActivate: [engagementBookingGuard] },
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
