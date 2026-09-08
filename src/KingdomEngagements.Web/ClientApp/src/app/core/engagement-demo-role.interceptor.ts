import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { EngagementDemoRoleService } from './engagement-demo-role.service';

const emptyCompletion = {
  responses: [],
  closeout: {
    eventNotes: null,
    testimonySummary: null,
    hostFollowUpComplete: false,
    hostFollowUpNotes: null,
    finalDocumentsComplete: false,
    paymentComplete: false,
    administrativeFollowUpComplete: false,
    outcomesRecorded: false,
    allFollowUpsComplete: false,
    allReadinessTasksResolved: false,
    completedAtUtc: null,
  },
  totalResponses: 0,
  followUpsOpen: 0,
  canComplete: false,
};

export const engagementDemoRoleInterceptor: HttpInterceptorFn = (request, next) => {
  const roles = inject(EngagementDemoRoleService);
  if (!roles.isMinister()) return next(request);

  const url = request.url.split('?')[0];

  if (request.method === 'GET' && url === '/api/engagements/requests') {
    return of(new HttpResponse({ status: 200, body: [] }));
  }

  if (request.method === 'GET' && url === '/api/engagements/assignments') {
    return next(request.clone({ url: '/api/engagements/my-assignments' }));
  }

  const assignmentDetail = url.match(/^\/api\/engagements\/assignments\/([^/]+)$/);
  if (request.method === 'GET' && assignmentDetail) {
    return next(request.clone({
      url: `/api/engagements/my-assignments/${encodeURIComponent(assignmentDetail[1])}`,
    }));
  }

  if (request.method === 'GET' && /\/completion$/.test(url)) {
    return of(new HttpResponse({ status: 200, body: emptyCompletion }));
  }

  return next(request);
};
