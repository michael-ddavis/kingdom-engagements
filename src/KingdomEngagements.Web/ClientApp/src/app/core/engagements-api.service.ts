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
  HostCoordinationThread,
  ProductInfo,
  ResponsibilityLaneDefinition,
  ResponsibilityLaneState,
  StandingResponsibilityAssignment,
  EngagementResponsibilitySnapshot,
  MyResponsibilityWorkItem,
  TravelLaneDetails,
  LodgingLaneDetails,
  TransportationLaneDetails,
  ProgramLaneDetails,
  MediaLaneDetails,
  MediaAsset,
  DocumentsLaneDetails,
  LaneDocument,
  FinanceLaneDetails,
  MinistryPreparationLaneDetails,
  HospitalityLaneDetails,
  HostCoordinationLaneDetails,
  ExecutiveEngagementBrief,
  HostContact,
  HostScheduleItem,
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

export interface UpdateEngagementInput {
  title: string;
  speakerName: string;
  hostOrganization: string;
  hostContactName: string | null;
  hostContactEmail: string | null;
  location: string | null;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  status: string;
  travelStatus: string;
  lodgingStatus: string;
  transportationStatus: string;
  hostStatus: string;
  documentsStatus: string;
  closeoutStatus: string;
  notes: string | null;
}

export interface CreateEngagementTaskInput {
  category: string;
  title: string;
  owner: string;
  ownerSubject?: string | null;
  detail: string | null;
  dueAtUtc: string | null;
}

export interface StartSpeakingInvitationInput {
  contactName: string;
  contactEmail: string;
  organizationName: string | null;
  eventName: string | null;
  contactPhone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  startDate: string | null;
  endDate: string | null;
  note: string | null;
}

export interface StartedInvitationLinkResult {
  request: SpeakingRequestDetails;
  completionUrl: string;
}


export interface UpdateTravelLaneInput {
  outboundAirline: string | null;
  outboundFlightNumber: string | null;
  outboundConfirmationNumber: string | null;
  outboundDepartureAirport: string | null;
  outboundArrivalAirport: string | null;
  outboundDepartsAtUtc: string | null;
  outboundArrivesAtUtc: string | null;
  returnAirline: string | null;
  returnFlightNumber: string | null;
  returnConfirmationNumber: string | null;
  returnDepartureAirport: string | null;
  returnArrivalAirport: string | null;
  returnDepartsAtUtc: string | null;
  returnArrivesAtUtc: string | null;
  contacts: readonly HostContact[];
}

export interface UpdateLodgingLaneInput {
  hotelName: string | null;
  hotelAddress: string | null;
  hotelConfirmationNumber: string | null;
  hotelCheckInAtUtc: string | null;
  hotelCheckOutAtUtc: string | null;
  contacts: readonly HostContact[];
}

export interface UpdateTransportationLaneInput {
  transportationPlan: string | null;
  pickupContactName: string | null;
  pickupContactPhone: string | null;
  contacts: readonly HostContact[];
}

export interface UpdateProgramLaneInput {
  schedule: readonly HostScheduleItem[];
  contacts: readonly HostContact[];
}

export interface UpdateMediaLaneInput {
  promotionRequirements: string | null;
  contacts: readonly HostContact[];
}

export interface MediaAssetInput {
  name: string;
  assetType: string;
  purpose: string;
  status: string;
  source: string;
  storageReference: string | null;
  externalUrl: string | null;
  notes: string | null;
}

export interface UpdateFinanceLaneInput {
  travelCoverageStatus: string;
  lodgingCoverageStatus: string;
  travelBookedBy: string;
  honorariumStatus: string;
  honorariumAmount: number;
  honorariumCurrency: string;
  paymentStatus: string;
}

export interface UpdateMinistryPreparationLaneInput {
  prayerFocus: string | null;
  ministryPreparationNotes: string | null;
}

export interface UpdateHospitalityLaneInput {
  hospitalityNotes: string | null;
  contacts: readonly HostContact[];
}

export interface UpdateHostCoordinationLaneInput {
  hostNotes: string | null;
  contacts: readonly HostContact[];
}

export interface CreateLaneDocumentInput {
  name: string;
  status: string;
  storageReference: string | null;
}

export interface UpdateLaneDocumentInput {
  status: string;
  storageReference: string | null;
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

  startInvitation(input: StartSpeakingInvitationInput): Observable<StartedInvitationLinkResult> {
    return this.http.post<StartedInvitationLinkResult>('/api/engagements/requests/start', input);
  }

  refreshStartedInvitationLink(id: string): Observable<StartedInvitationLinkResult> {
    return this.http.post<StartedInvitationLinkResult>(
      `/api/engagements/requests/${encodeURIComponent(id)}/refresh-host-link`,
      {},
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

  updateAssignment(id: string, input: UpdateEngagementInput): Observable<EngagementDetails> {
    return this.http.put<EngagementDetails>(
      `/api/engagements/assignments/${encodeURIComponent(id)}`,
      input,
    );
  }

  archiveAssignment(id: string): Observable<EngagementDetails> {
    return this.http.post<EngagementDetails>(
      `/api/engagements/assignments/${encodeURIComponent(id)}/archive`,
      {},
    );
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

  getMyAssignments(): Observable<readonly EngagementSummary[]> {
    return this.http.get<readonly EngagementSummary[]>('/api/engagements/my-assignments');
  }

  getMyAssignment(id: string): Observable<EngagementDetails> {
    return this.http.get<EngagementDetails>(
      `/api/engagements/my-assignments/${encodeURIComponent(id)}`,
    );
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
        ownerSubject: task.ownerSubject ?? null,
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

  getHostCoordinationMessages(assignmentId: string): Observable<HostCoordinationThread> {
    return this.http.get<HostCoordinationThread>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/preparation/messages`,
    );
  }

  sendHostCoordinationMessage(
    assignmentId: string,
    message: string,
  ): Observable<HostCoordinationThread> {
    return this.http.post<HostCoordinationThread>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/preparation/messages`,
      { message },
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


  getResponsibilityLanes(): Observable<readonly ResponsibilityLaneDefinition[]> {
    return this.http.get<readonly ResponsibilityLaneDefinition[]>('/api/engagements/responsibility-lanes');
  }

  getStandingResponsibilities(): Observable<readonly StandingResponsibilityAssignment[]> {
    return this.http.get<readonly StandingResponsibilityAssignment[]>('/api/engagements/responsibilities/standing');
  }

  setStandingResponsibility(
    laneKey: string,
    userSubject: string,
    displayName: string,
    email: string | null,
  ): Observable<StandingResponsibilityAssignment> {
    return this.http.put<StandingResponsibilityAssignment>(
      `/api/engagements/responsibilities/standing/${encodeURIComponent(laneKey)}`,
      { userSubject, displayName, email },
    );
  }

  clearStandingResponsibility(laneKey: string): Observable<void> {
    return this.http.delete<void>(
      `/api/engagements/responsibilities/standing/${encodeURIComponent(laneKey)}`,
    );
  }

  getAssignmentResponsibilities(assignmentId: string): Observable<readonly ResponsibilityLaneState[]> {
    return this.http.get<readonly ResponsibilityLaneState[]>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/responsibilities`,
    );
  }

  setEngagementResponsibilityOwner(
    assignmentId: string,
    laneKey: string,
    userSubject: string,
    displayName: string,
    email: string | null,
  ): Observable<unknown> {
    return this.http.put(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/responsibilities/${encodeURIComponent(laneKey)}/owner`,
      { userSubject, displayName, email },
    );
  }

  clearEngagementResponsibilityOwner(assignmentId: string, laneKey: string): Observable<void> {
    return this.http.delete<void>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/responsibilities/${encodeURIComponent(laneKey)}/owner`,
    );
  }

  configureEngagementLane(
    assignmentId: string,
    laneKey: string,
    isApplicable: boolean,
    dueAtUtc: string | null,
  ): Observable<ResponsibilityLaneState> {
    return this.http.put<ResponsibilityLaneState>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/responsibilities/${encodeURIComponent(laneKey)}/configuration`,
      { isApplicable, dueAtUtc },
    );
  }

  updateEngagementLaneProgress(
    assignmentId: string,
    laneKey: string,
    status: string,
    detail: string | null,
  ): Observable<ResponsibilityLaneState> {
    return this.http.put<ResponsibilityLaneState>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/responsibilities/${encodeURIComponent(laneKey)}/progress`,
      { status, detail },
    );
  }

  getCommandCenter(): Observable<readonly EngagementResponsibilitySnapshot[]> {
    return this.http.get<readonly EngagementResponsibilitySnapshot[]>('/api/engagements/command-center');
  }

  getMyWork(): Observable<readonly MyResponsibilityWorkItem[]> {
    return this.http.get<readonly MyResponsibilityWorkItem[]>('/api/engagements/my-work');
  }


  getExecutiveBrief(assignmentId: string): Observable<ExecutiveEngagementBrief> {
    return this.http.get<ExecutiveEngagementBrief>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/executive-brief`,
    );
  }

  getTravelLane(assignmentId: string): Observable<TravelLaneDetails> {
    return this.http.get<TravelLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/travel`,
    );
  }

  updateTravelLane(assignmentId: string, input: UpdateTravelLaneInput): Observable<TravelLaneDetails> {
    return this.http.put<TravelLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/travel`,
      input,
    );
  }

  getLodgingLane(assignmentId: string): Observable<LodgingLaneDetails> {
    return this.http.get<LodgingLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/lodging`,
    );
  }

  updateLodgingLane(assignmentId: string, input: UpdateLodgingLaneInput): Observable<LodgingLaneDetails> {
    return this.http.put<LodgingLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/lodging`,
      input,
    );
  }

  getTransportationLane(assignmentId: string): Observable<TransportationLaneDetails> {
    return this.http.get<TransportationLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/transportation`,
    );
  }

  updateTransportationLane(
    assignmentId: string,
    input: UpdateTransportationLaneInput,
  ): Observable<TransportationLaneDetails> {
    return this.http.put<TransportationLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/transportation`,
      input,
    );
  }

  getProgramLane(assignmentId: string): Observable<ProgramLaneDetails> {
    return this.http.get<ProgramLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/program`,
    );
  }

  updateProgramLane(assignmentId: string, input: UpdateProgramLaneInput): Observable<ProgramLaneDetails> {
    return this.http.put<ProgramLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/program`,
      input,
    );
  }

  getMediaLane(assignmentId: string): Observable<MediaLaneDetails> {
    return this.http.get<MediaLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/media`,
    );
  }

  updateMediaLane(assignmentId: string, input: UpdateMediaLaneInput): Observable<MediaLaneDetails> {
    return this.http.put<MediaLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/media`,
      input,
    );
  }

  createMediaAsset(assignmentId: string, input: MediaAssetInput): Observable<MediaAsset> {
    return this.http.post<MediaAsset>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/media/assets`,
      input,
    );
  }

  updateMediaAsset(assignmentId: string, assetId: string, input: MediaAssetInput): Observable<MediaAsset> {
    return this.http.put<MediaAsset>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/media/assets/${encodeURIComponent(assetId)}`,
      input,
    );
  }

  deleteMediaAsset(assignmentId: string, assetId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/media/assets/${encodeURIComponent(assetId)}`,
    );
  }

  getDocumentsLane(assignmentId: string): Observable<DocumentsLaneDetails> {
    return this.http.get<DocumentsLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/documents`,
    );
  }

  createLaneDocument(
    assignmentId: string,
    laneKey: string,
    input: CreateLaneDocumentInput,
  ): Observable<LaneDocument> {
    return this.http.post<LaneDocument>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/${encodeURIComponent(laneKey)}/documents`,
      input,
    );
  }

  updateLaneDocument(
    assignmentId: string,
    laneKey: string,
    documentId: string,
    input: UpdateLaneDocumentInput,
  ): Observable<LaneDocument> {
    return this.http.put<LaneDocument>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/${encodeURIComponent(laneKey)}/documents/${encodeURIComponent(documentId)}`,
      input,
    );
  }

  deleteLaneDocument(assignmentId: string, laneKey: string, documentId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/${encodeURIComponent(laneKey)}/documents/${encodeURIComponent(documentId)}`,
    );
  }

  getFinanceLane(assignmentId: string): Observable<FinanceLaneDetails> {
    return this.http.get<FinanceLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/finance`,
    );
  }

  updateFinanceLane(assignmentId: string, input: UpdateFinanceLaneInput): Observable<FinanceLaneDetails> {
    return this.http.put<FinanceLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/finance`,
      input,
    );
  }

  getMinistryPreparationLane(assignmentId: string): Observable<MinistryPreparationLaneDetails> {
    return this.http.get<MinistryPreparationLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/ministry-preparation`,
    );
  }

  updateMinistryPreparationLane(
    assignmentId: string,
    input: UpdateMinistryPreparationLaneInput,
  ): Observable<MinistryPreparationLaneDetails> {
    return this.http.put<MinistryPreparationLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/ministry-preparation`,
      input,
    );
  }

  getHospitalityLane(assignmentId: string): Observable<HospitalityLaneDetails> {
    return this.http.get<HospitalityLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/hospitality`,
    );
  }

  updateHospitalityLane(
    assignmentId: string,
    input: UpdateHospitalityLaneInput,
  ): Observable<HospitalityLaneDetails> {
    return this.http.put<HospitalityLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/hospitality`,
      input,
    );
  }

  getHostCoordinationLane(assignmentId: string): Observable<HostCoordinationLaneDetails> {
    return this.http.get<HostCoordinationLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/host-coordination`,
    );
  }

  updateHostCoordinationLane(
    assignmentId: string,
    input: UpdateHostCoordinationLaneInput,
  ): Observable<HostCoordinationLaneDetails> {
    return this.http.put<HostCoordinationLaneDetails>(
      `/api/engagements/assignments/${encodeURIComponent(assignmentId)}/lanes/host-coordination`,
      input,
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