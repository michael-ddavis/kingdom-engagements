import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
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

interface AssignmentListItem {
  status?: string;
}

function withoutArchived(source: Observable<HttpEvent<unknown>>): Observable<HttpEvent<unknown>> {
  return source.pipe(map(event => {
    if (!(event instanceof HttpResponse) || !Array.isArray(event.body)) return event;
    const body = (event.body as AssignmentListItem[])
      .filter(item => item.status?.toLowerCase() !== 'archived');
    return event.clone({ body });
  }));
}

export const engagementDemoRoleInterceptor: HttpInterceptorFn = (request, next) => {
  const roles = inject(EngagementDemoRoleService);
  const url = request.url.split('?')[0];

  if (request.method === 'GET' && url === '/api/engagements/assignments') {
    if (roles.isMinister()) {
      return withoutArchived(next(request.clone({ url: '/api/engagements/my-assignments' })));
    }
    return withoutArchived(next(request));
  }

  if (!roles.isMinister()) return next(request);

  if (request.method === 'GET' && url === '/api/engagements/requests') {
    return of(new HttpResponse({ status: 200, body: [] }));
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