import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { InvitationsComponent } from './pages/invitations.component';
import { AssignmentListComponent } from './pages/assignment-list.component';
import { AssignmentWorkspaceComponent } from './pages/assignment-workspace.component';
import { OrganizationProgramsComponent } from './pages/organization-programs.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter([
      { path: '', redirectTo: 'assignments', pathMatch: 'full' },
      { path: 'invitations', component: InvitationsComponent },
      { path: 'assignments', component: AssignmentListComponent },
      { path: 'assignments/:id', component: AssignmentWorkspaceComponent },
      { path: 'organization/:org', component: OrganizationProgramsComponent },
      { path: '**', redirectTo: 'assignments' },
    ]),
  ],
};
