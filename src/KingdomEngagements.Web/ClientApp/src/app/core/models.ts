export interface ProductInfo {
  moduleKey: string;
  shortName: string;
  name: string;
  tenantName: string;
  platformUrl: string;
  careUrl: string;
  careEnabled: boolean;
  boundary: string;
}

export interface EngagementSummary {
  id: string;
  externalAssignmentId: string;
  title: string;
  speakerName: string;
  hostOrganization: string;
  location: string | null;
  startsAtUtc: string | null;
  status: string;
  readinessPercent: number;
  openTasks: number;
  travelStatus: string;
  lodgingStatus: string;
  transportationStatus: string;
  hostStatus: string;
  documentsStatus: string;
  closeoutStatus: string;
  updatedAtUtc: string;
}

export interface EngagementTask {
  id: string;
  assignmentId: string;
  category: string;
  title: string;
  owner: string;
  status: string;
  detail: string | null;
  dueAtUtc: string | null;
  updatedAtUtc: string;
}

export interface EngagementDocument {
  id: string;
  assignmentId: string;
  name: string;
  category: string;
  status: string;
  storageReference: string | null;
  updatedAtUtc: string;
}

export interface EngagementDetails {
  summary: EngagementSummary;
  hostContactName: string | null;
  hostContactEmail: string | null;
  endsAtUtc: string | null;
  notes: string | null;
  tasks: readonly EngagementTask[];
  documents: readonly EngagementDocument[];
}

export interface MinistryResponse {
  id: string;
  type: string;
  typeLabel?: string;
  count: number;
  personName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  requiresFollowUp: boolean;
  followUpStatus: string;
  followUpOwner: string | null;
  followUpDueAtUtc: string | null;
  followUpNotes: string | null;
  followUpCompletedAtUtc: string | null;
  createdAtUtc: string;
  careHandoffCreated: boolean;
}

export interface Closeout {
  eventNotes: string | null;
  testimonySummary: string | null;
  hostFollowUpComplete: boolean;
  hostFollowUpNotes: string | null;
  finalDocumentsComplete: boolean;
  paymentComplete: boolean;
  administrativeFollowUpComplete: boolean;
  outcomesRecorded: boolean;
  allFollowUpsComplete: boolean;
  allReadinessTasksResolved: boolean;
  completedAtUtc: string | null;
}

export interface EngagementCompletion {
  responses: readonly MinistryResponse[];
  closeout: Closeout;
  totalResponses: number;
  followUpsOpen: number;
  canComplete: boolean;
}

export interface CarePartner {
  id: number;
  name: string;
  city: string;
  state: string;
  distanceMiles: number;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
  relationship: string;
  serviceArea: string;
  ministries: readonly string[];
  languages: readonly string[];
  availability: 'available' | 'limited';
  responseSlaHours: number;
  notes: string;
  isActive: boolean;
}

export type CareReferralStatus =
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'connected'
  | 'declined'
  | 'expired'
  | 'cancelled';

export interface CareReferral {
  id: number;
  responseId: string;
  partnerId: number;
  status: CareReferralStatus;
  personalMessage: string;
  sentUtc: string;
  viewedUtc: string | null;
  respondedUtc: string | null;
  connectedUtc: string | null;
  expiresUtc: string;
  lastReminderUtc: string | null;
  reminderCount: number;
  assignedOwner: string;
  nextStep: string;
  declineReason: string;
  connectionConfirmedBy: string;
  connectionNote: string;
}

export interface CareNetworkState {
  assignmentId: string;
  consentByResponse: Record<string, boolean>;
  selectedPartnerByResponse: Record<string, number>;
  partners: readonly CarePartner[];
  referrals: readonly CareReferral[];
}
