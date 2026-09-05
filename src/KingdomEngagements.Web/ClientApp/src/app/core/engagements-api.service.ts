import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AssignmentWorkspaceDetails,
  AssignmentWorkspaceEnvelope,
  EngagementCompletion,
  EngagementDetails,
  EngagementSummary,
  EngagementTask,
  HostCoordinationDetails,
  HostCoordinationDocument,
  ProductInfo,
} from './models';
import {
  ApproveSpeakingRequestResult,
  RequestInformationResult,
  SpeakingRequestDetails,
} from './speaking-request.models';

export interface CreateMinistryResponseInput {
  type: string;
  count: number;
  personName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  requiresFollowUp: boolean;
  followUpOwner: string | null;
  followUpDueAtUtc: string | null;
}

export interface CreateEngagementInput {
  externalAssignmentId: string;
  title: string;
  speakerName: string;
  hostOrganization: string;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  location: string | null;
}

export interface CreateEngagementTaskInput {
  category: string;
  title: string;
  owner: string;
  detail: string | null;
  dueAtUtc: string | null;
}

@Injectable({ providedIn: 'root' })
export class EngagementsApiService {
  constructor(private readonly http: HttpClient) {}

  getProduct(): Observable<ProductInfo> {
    return this.http.get<ProductInfo>('/api/product');
  }

  getRequests(): Observable<readonly SpeakingRequestDetails[]> {
    return this.http.get<readonly SpeakingRequestDetails[]>('/api/engagements/requests');
  }

  getRequest(id: string): Observable<SpeakingRequestDetails> {
    return this.http.get<SpeakingRequestDetails>(
      `/api/engagements/requests/${encodeURIComponent(id)}`,
    );
  }

  requestInformation(id: string, message: string): Observable<RequestInformationResult> {
    return this.http.post<RequestInformationResult>(
      `/api/engagements/requests/${encodeURIComponent(id)}/request-information`,
      { message },
    );
  }

  declineRequest(id: string, reason: string): Observable<SpeakingRequestDetails> {
    return this.http.post<SpeakingRequestDetails>(
      `/api/engagements/requests/${encodeURIComponent(id)}/decline`,
      { reason },
    );
  }

  approveRequest(id: string): Observable<ApproveSpeakingRequestResult> {
    return this.http.post<ApproveSpeakingRequestResult>(
      `/api/engagements/requests/${encodeURIComponent(id)}/approve`,
      {},
    );
  }

  getAssignments(): Observable<readonly EngagementSummary[]> {
    return this.http.get<readonly EngagementSummary[]>('/api/engagements/assignments');
  }

  createAssignment(input: CreateEngagementInput): Observable<EngagementDetails> {
    return this.http.post<EngagementDetails>('/api/engagements/assignments', input);
  }

  addAssignmentTask(assignmentId: string, input: CreateEngagementTaskInput): Observable<EngagementDetails> {
    return this.http.post<EngagementDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/tasks`,
      input,
    );
  }

  getAssignment(id: string): Observable<EngagementDetails> {
    return this.http.get<EngagementDetails>(`/api/engagements/assignments/${encodeURIComponent(id)}`);
  }

  getWorkspace(id: string): Observable<AssignmentWorkspaceEnvelope> {
    return this.http.get<AssignmentWorkspaceEnvelope>(
      `/api/engagements/assignments/${encodeURIComponent(id)}/workspace`,
    );
  }

  updateTask(
    assignmentId: string,
    task: EngagementTask,
    status: string,
  ): Observable<EngagementDetails> {
    return this.http.put<EngagementDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/tasks/${encodeURIComponent(task.id)}`,
      {
        status,
        owner: task.owner,
        detail: task.detail,
        dueAtUtc: task.dueAtUtc,
      },
    );
  }

  saveCoordination(
    assignmentId: string,
    coordination: HostCoordinationDetails,
    submit = false,
  ): Observable<AssignmentWorkspaceDetails> {
    return this.http.put<AssignmentWorkspaceDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/workspace/coordination`,
      {
        outboundAirline: coordination.outboundAirline,
        outboundFlightNumber: coordination.outboundFlightNumber,
        outboundConfirmationNumber: coordination.outboundConfirmationNumber,
        outboundDepartureAirport: coordination.outboundDepartureAirport,
        outboundArrivalAirport: coordination.outboundArrivalAirport,
        outboundDepartsAtUtc: coordination.outboundDepartsAtUtc,
        outboundArrivesAtUtc: coordination.outboundArrivesAtUtc,
        returnAirline: coordination.returnAirline,
        returnFlightNumber: coordination.returnFlightNumber,
        returnConfirmationNumber: coordination.returnConfirmationNumber,
        returnDepartureAirport: coordination.returnDepartureAirport,
        returnArrivalAirport: coordination.returnArrivalAirport,
        returnDepartsAtUtc: coordination.returnDepartsAtUtc,
        returnArrivesAtUtc: coordination.returnArrivesAtUtc,
        hotelName: coordination.hotelName,
        hotelAddress: coordination.hotelAddress,
        hotelConfirmationNumber: coordination.hotelConfirmationNumber,
        hotelCheckInAtUtc: coordination.hotelCheckInAtUtc,
        hotelCheckOutAtUtc: coordination.hotelCheckOutAtUtc,
        transportationPlan: coordination.transportationPlan,
        pickupContactName: coordination.pickupContactName,
        pickupContactPhone: coordination.pickupContactPhone,
        schedule: coordination.schedule,
        contacts: coordination.contacts,
        promotionRequirements: coordination.promotionRequirements,
        prayerFocus: coordination.prayerFocus,
        hostNotes: coordination.hostNotes,
        submit,
      },
    );
  }

  uploadWorkspaceDocument(
    assignmentId: string,
    file: File,
  ): Observable<HostCoordinationDocument> {
    const body = new FormData();
    body.set('file', file);
    return this.http.post<HostCoordinationDocument>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/workspace/documents`,
      body,
    );
  }

  deleteWorkspaceDocument(assignmentId: string, documentId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/workspace/documents/${encodeURIComponent(documentId)}`,
    );
  }

  getCompletion(id: string): Observable<EngagementCompletion> {
    return this.http.get<EngagementCompletion>(
      `/api/engagements/assignments/${encodeURIComponent(id)}/completion`,
    );
  }

  createResponse(
    assignmentId: string,
    input: CreateMinistryResponseInput,
  ): Observable<EngagementCompletion> {
    return this.http.post<EngagementCompletion>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/responses`,
      input,
    );
  }

  updateCloseout(
    assignmentId: string,
    completion: EngagementCompletion,
    complete: boolean,
  ): Observable<EngagementCompletion> {
    const closeout = completion.closeout;
    return this.http.put<EngagementCompletion>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/closeout`,
      {
        eventNotes: closeout.eventNotes,
        testimonySummary: closeout.testimonySummary,
        hostFollowUpComplete: closeout.hostFollowUpComplete,
        hostFollowUpNotes: closeout.hostFollowUpNotes,
        finalDocumentsComplete: closeout.finalDocumentsComplete,
        paymentComplete: closeout.paymentComplete,
        administrativeFollowUpComplete: closeout.administrativeFollowUpComplete,
        outcomesRecorded: closeout.outcomesRecorded,
        complete,
      },
    );
  }

  handoffToCare(assignmentId: string, responseId: string): Observable<EngagementCompletion> {
    return this.http.post<EngagementCompletion>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/responses/${encodeURIComponent(responseId)}/handoff-to-care`,
      { consentConfirmed: true },
    );
  }
}
