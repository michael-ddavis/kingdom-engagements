import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AssignmentListComponent } from './pages/assignment-list.component';
import { AssignmentWorkspaceComponent } from './pages/assignment-workspace.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter([
      { path: '', component: AssignmentListComponent },
      { path: 'assignments/:id', component: AssignmentWorkspaceComponent },
      { path: '**', redirectTo: '' },
    ]),
  ],
};
