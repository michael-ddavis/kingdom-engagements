import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { InvitationsComponent } from './pages/invitations.component';
import { AssignmentListComponent } from './pages/assignment-list.component';
import { AssignmentWorkspaceComponent } from './pages/assignment-workspace.component';
import { DwcFormationHomeContextComponent } from './pages/dwc-formation-home-context.component';
import { DwcFormationToolsComponent } from './pages/dwc-formation-tools.component';
import { DwcMyGroupContextComponent } from './pages/dwc-my-group-context.component';
import { OrganizationLandingComponent } from './pages/organization-landing.component';
import { OrganizationProgramsComponent } from './pages/organization-programs.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter([
      { path: '', component: OrganizationLandingComponent, pathMatch: 'full' },
      { path: 'invitations', component: InvitationsComponent },
      { path: 'assignments', component: AssignmentListComponent },
      { path: 'assignments/:id', component: AssignmentWorkspaceComponent },
      { path: 'organization/dwc/formation', component: DwcFormationHomeContextComponent },
      { path: 'organization/dwc/formation/tools', component: DwcFormationToolsComponent },
      { path: 'organization/dwc/my-group', component: DwcMyGroupContextComponent },
      { path: 'organization/:org', component: OrganizationProgramsComponent },
      { path: '**', redirectTo: '' },
    ]),
  ],
};
