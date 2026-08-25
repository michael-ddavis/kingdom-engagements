export interface SpeakingRequestCommunication {
  id: string;
  type: string;
  message: string;
  actor: string;
  createdAtUtc: string;
}

export interface SpeakingRequestDetails {
  id: string;
  tenantId: string;
  referenceNumber: string;
  editToken: string;
  editTokenExpiresAtUtc: string | null;
  organizationName: string;
  eventName: string;
  eventType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  state: string | null;
  country: string;
  region: string | null;
  timeZone: string;
  venueAddress: string;
  venueName: string;
  startDate: string;
  endDate: string;
  ministryRequest: string;
  expectedAttendance: number;
  travelCoverageStatus: string;
  lodgingCoverageStatus: string;
  honorariumStatus: string;
  travelBookedBy: string;
  honorariumAmount: number;
  honorariumCurrency: string;
  paymentStatus: string;
  agreementStatus: string;
  engagementStatus: string;
  readinessPercentage: number;
  status: string;
  declineReason: string | null;
  assignmentId: string | null;
  submittedAtUtc: string;
  updatedAtUtc: string;
  communications: readonly SpeakingRequestCommunication[];
}

export interface RequestInformationResult {
  request: SpeakingRequestDetails;
  editUrl: string;
}

export interface ApproveSpeakingRequestResult {
  request: SpeakingRequestDetails;
  assignmentId: string;
}
