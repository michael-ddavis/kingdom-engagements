import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  EngagementCompletion,
  EngagementDetails,
  EngagementSummary,
  ProductInfo,
} from './models';

@Injectable({ providedIn: 'root' })
export class EngagementsApiService {
  constructor(private readonly http: HttpClient) {}

  getProduct(): Observable<ProductInfo> {
    return this.http.get<ProductInfo>('/api/product');
  }

  getAssignments(): Observable<readonly EngagementSummary[]> {
    return this.http.get<readonly EngagementSummary[]>('/api/engagements/assignments');
  }

  getAssignment(id: string): Observable<EngagementDetails> {
    return this.http.get<EngagementDetails>(`/api/engagements/assignments/${encodeURIComponent(id)}`);
  }

  getCompletion(id: string): Observable<EngagementCompletion> {
    return this.http.get<EngagementCompletion>(
      `/api/engagements/assignments/${encodeURIComponent(id)}/completion`,
    );
  }

  handoffToCare(assignmentId: string, responseId: string): Observable<EngagementCompletion> {
    return this.http.post<EngagementCompletion>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/responses/${encodeURIComponent(responseId)}/handoff-to-care`,
      { consentConfirmed: true },
    );
  }
}
