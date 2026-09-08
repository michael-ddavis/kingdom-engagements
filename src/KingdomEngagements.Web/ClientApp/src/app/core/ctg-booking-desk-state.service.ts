import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';

export type BookingSource = 'website' | 'email' | 'referral' | 'phone' | 'whatsapp' | 'social' | 'apostle-cynthia' | 'team-member' | 'returning-host' | 'other';
export type BookingStage = 'new' | 'needs-information' | 'under-review' | 'date-hold' | 'approved' | 'declined' | 'converted';

export interface ManualBookingRecord {
  id: string;
  hostName: string;
  hostOrganization: string;
  eventName: string;
  eventType: string;
  city: string;
  region: string;
  country: string;
  timeZone: string;
  requestedStartDate: string;
  requestedEndDate: string;
  alternateDates: string;
  source: BookingSource;
  sourceDetail: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
  expectedAttendance: number | null;
  requestedRole: string;
  notes: string;
  stage: BookingStage;
  owner: string;
  lastResponseAtUtc: string | null;
  holdExpiresAtUtc: string | null;
  passportRequired: boolean;
  visaRequired: boolean;
  invitationLetterRequired: boolean;
  entryRequirements: string;
  nearestAirport: string;
  interpreterNeeded: boolean;
  interpreterLanguage: string;
  localTransportation: string;
  securityNotes: string;
  honorariumAmount: number | null;
  honorariumCurrency: string;
  airfareResponsibility: string;
  lodgingResponsibility: string;
  groundResponsibility: string;
  agreementStatus: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

interface PersistedState {
  bookings: ManualBookingRecord[];
}

@Injectable({ providedIn: 'root' })
export class CtgBookingDeskStateService {
  private readonly storageKey = 'ApostolOS.CTG.GlobalBookingDesk.v1';
  private readonly apiUrl = '/api/engagements/global-bookings';
  private readonly legacyIds: Record<string, string> = {
    'booking-lagos': 'c7000000-0000-4000-8000-000000000001',
    'booking-london': 'c7000000-0000-4000-8000-000000000002',
    'booking-kingston': 'c7000000-0000-4000-8000-000000000003',
  };

  readonly bookings = signal<ManualBookingRecord[]>([]);
  readonly active = computed(() => this.bookings().filter(item => !['declined', 'converted'].includes(item.stage)));
  readonly newCount = computed(() => this.bookings().filter(item => item.stage === 'new').length);
  readonly internationalCount = computed(() => this.active().filter(item => !this.isUnitedStates(item.country)).length);
  readonly expiringHolds = computed(() => this.bookings().filter(item => item.stage === 'date-hold' && this.expiresWithinDays(item.holdExpiresAtUtc, 7)).length);
  readonly stalledCount = computed(() => this.active().filter(item => this.daysSince(item.lastResponseAtUtc ?? item.createdAtUtc) >= 5).length);

  constructor(private readonly http: HttpClient) {
    this.restoreFallback();
    this.loadShared();
  }

  add(input: Pick<ManualBookingRecord,
    'hostName' | 'hostOrganization' | 'eventName' | 'eventType' | 'city' | 'region' | 'country' |
    'requestedStartDate' | 'requestedEndDate' | 'source' | 'sourceDetail' | 'contactEmail' | 'contactPhone' | 'notes'>): ManualBookingRecord {
    const now = new Date().toISOString();
    const record: ManualBookingRecord = {
      ...input,
      id: crypto.randomUUID(),
      timeZone: '',
      alternateDates: '',
      whatsapp: '',
      expectedAttendance: null,
      requestedRole: '',
      stage: 'new',
      owner: 'CTG Administration',
      lastResponseAtUtc: null,
      holdExpiresAtUtc: null,
      passportRequired: !this.isUnitedStates(input.country),
      visaRequired: false,
      invitationLetterRequired: false,
      entryRequirements: '',
      nearestAirport: '',
      interpreterNeeded: false,
      interpreterLanguage: '',
      localTransportation: '',
      securityNotes: '',
      honorariumAmount: null,
      honorariumCurrency: this.isUnitedStates(input.country) ? 'USD' : '',
      airfareResponsibility: '',
      lodgingResponsibility: '',
      groundResponsibility: '',
      agreementStatus: 'not-started',
      createdAtUtc: now,
      updatedAtUtc: now,
    };
    this.bookings.update(items => [record, ...items]);
    this.persistFallback();
    this.createShared(record);
    return record;
  }

  update(id: string, changes: Partial<ManualBookingRecord>): void {
    let updated: ManualBookingRecord | undefined;
    this.bookings.update(items => items.map(item => {
      if (item.id !== id) return item;
      updated = { ...item, ...changes, updatedAtUtc: new Date().toISOString() };
      return updated;
    }));
    this.persistFallback();
    if (updated) this.updateShared(updated);
  }

  setStage(id: string, stage: BookingStage): void {
    this.update(id, {
      stage,
      holdExpiresAtUtc: stage === 'date-hold'
        ? new Date(Date.now() + 7 * 86400000).toISOString()
        : null,
    });
  }

  touchResponse(id: string): void {
    this.update(id, { lastResponseAtUtc: new Date().toISOString() });
  }

  refresh(): void {
    this.loadShared();
  }

  private loadShared(): void {
    this.http.get<ManualBookingRecord[]>(this.apiUrl).subscribe({
      next: records => {
        if (records.length) {
          this.bookings.set(records.map(record => this.normalizeRecord(record)));
          this.persistFallback();
          return;
        }
        this.seedSharedFromFallback();
      },
      error: () => {
        // The local fallback keeps the demo usable if the connected runtime is unavailable.
      },
    });
  }

  private seedSharedFromFallback(): void {
    for (const record of this.bookings()) this.createShared(record, false);
  }

  private createShared(record: ManualBookingRecord, reloadOnConflict = true): void {
    this.http.post<ManualBookingRecord>(this.apiUrl, record).subscribe({
      error: error => {
        if (reloadOnConflict && error?.status === 409) this.loadShared();
      },
    });
  }

  private updateShared(record: ManualBookingRecord): void {
    this.http.put<ManualBookingRecord>(`${this.apiUrl}/${encodeURIComponent(record.id)}`, record).subscribe({
      error: error => {
        if (error?.status === 404) this.createShared(record);
      },
    });
  }

  private restoreFallback(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (Array.isArray(parsed.bookings) && parsed.bookings.length) {
          this.bookings.set(parsed.bookings.map(record => this.normalizeRecord(record)));
          this.persistFallback();
          return;
        }
      }
    } catch {
      // Fall through to the deterministic demo seed.
    }

    this.bookings.set(this.seedBookings());
    this.persistFallback();
  }

  private normalizeRecord(record: ManualBookingRecord): ManualBookingRecord {
    const migratedId = this.legacyIds[record.id] ?? record.id;
    return {
      ...record,
      id: migratedId,
      region: record.region ?? '',
      timeZone: record.timeZone ?? '',
      alternateDates: record.alternateDates ?? '',
      sourceDetail: record.sourceDetail ?? '',
      contactEmail: record.contactEmail ?? '',
      contactPhone: record.contactPhone ?? '',
      whatsapp: record.whatsapp ?? '',
      expectedAttendance: record.expectedAttendance ?? null,
      requestedRole: record.requestedRole ?? '',
      notes: record.notes ?? '',
      owner: record.owner || 'CTG Administration',
      lastResponseAtUtc: record.lastResponseAtUtc ?? null,
      holdExpiresAtUtc: record.holdExpiresAtUtc ?? null,
      passportRequired: !!record.passportRequired,
      visaRequired: !!record.visaRequired,
      invitationLetterRequired: !!record.invitationLetterRequired,
      entryRequirements: record.entryRequirements ?? '',
      nearestAirport: record.nearestAirport ?? '',
      interpreterNeeded: !!record.interpreterNeeded,
      interpreterLanguage: record.interpreterLanguage ?? '',
      localTransportation: record.localTransportation ?? '',
      securityNotes: record.securityNotes ?? '',
      honorariumAmount: record.honorariumAmount ?? null,
      honorariumCurrency: record.honorariumCurrency ?? '',
      airfareResponsibility: record.airfareResponsibility ?? '',
      lodgingResponsibility: record.lodgingResponsibility ?? '',
      groundResponsibility: record.groundResponsibility ?? '',
      agreementStatus: record.agreementStatus || 'not-started',
      createdAtUtc: record.createdAtUtc || new Date().toISOString(),
      updatedAtUtc: record.updatedAtUtc || new Date().toISOString(),
    };
  }

  private seedBookings(): ManualBookingRecord[] {
    return [
      {
        id: 'c7000000-0000-4000-8000-000000000001',
        hostName: 'Pastor James Okoro', hostOrganization: 'Kingdom Leadership Network', eventName: 'Leadership Conference', eventType: 'Leadership Conference',
        city: 'Lagos', region: 'Lagos State', country: 'Nigeria', timeZone: 'Africa/Lagos', requestedStartDate: '2027-03-18', requestedEndDate: '2027-03-21', alternateDates: 'March 25–28, 2027',
        source: 'apostle-cynthia', sourceDetail: 'Spoke with Apostle after service. Formal information pending.', contactEmail: 'pastor.okoro@example.org', contactPhone: '+234 800 555 0142', whatsapp: '+234 800 555 0142', expectedAttendance: 1200,
        requestedRole: 'Keynote teaching, apostolic impartation, and leadership session', notes: 'Warm invitation. Host is preparing the formal ministry letter and complete schedule.', stage: 'needs-information', owner: 'CTG Administration',
        lastResponseAtUtc: '2026-09-01T15:00:00Z', holdExpiresAtUtc: null, passportRequired: true, visaRequired: true, invitationLetterRequired: true,
        entryRequirements: 'Confirm Nigerian entry visa documentation and passport validity before approval.', nearestAirport: 'LOS · Murtala Muhammed International Airport', interpreterNeeded: false, interpreterLanguage: '',
        localTransportation: 'Host proposes dedicated airport and ministry transportation.', securityNotes: 'Host to provide local protocol/security contact and transportation plan.', honorariumAmount: null, honorariumCurrency: 'USD',
        airfareResponsibility: 'Host proposed', lodgingResponsibility: 'Host proposed', groundResponsibility: 'Host proposed', agreementStatus: 'not-started', createdAtUtc: '2026-08-30T19:15:00Z', updatedAtUtc: '2026-09-01T15:00:00Z',
      },
      {
        id: 'c7000000-0000-4000-8000-000000000002',
        hostName: 'Dr. Naomi Clarke', hostOrganization: 'Kingdom Embassy Europe', eventName: 'Prophetic & Apostolic Summit', eventType: 'Summit',
        city: 'London', region: 'England', country: 'United Kingdom', timeZone: 'Europe/London', requestedStartDate: '2027-06-10', requestedEndDate: '2027-06-13', alternateDates: '',
        source: 'email', sourceDetail: 'Invitation received by the CTG office email.', contactEmail: 'naomi.clarke@example.org', contactPhone: '+44 20 7946 0191', whatsapp: '', expectedAttendance: 850,
        requestedRole: 'Opening keynote and prophetic activation', notes: 'Host has provided venue and preliminary itinerary.', stage: 'date-hold', owner: 'CTG Administration', lastResponseAtUtc: new Date(Date.now() - 86400000).toISOString(),
        holdExpiresAtUtc: new Date(Date.now() + 4 * 86400000).toISOString(), passportRequired: true, visaRequired: false, invitationLetterRequired: false, entryRequirements: 'Confirm UK ETA/entry requirements closer to travel.',
        nearestAirport: 'LHR · London Heathrow Airport', interpreterNeeded: false, interpreterLanguage: '', localTransportation: 'Executive car service proposed by host.', securityNotes: '', honorariumAmount: 7500, honorariumCurrency: 'USD',
        airfareResponsibility: 'Host', lodgingResponsibility: 'Host', groundResponsibility: 'Host', agreementStatus: 'drafting', createdAtUtc: '2026-08-20T12:00:00Z', updatedAtUtc: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'c7000000-0000-4000-8000-000000000003',
        hostName: 'Bishop Alton Reid', hostOrganization: 'Kingdom Dominion Fellowship', eventName: 'Caribbean Prophetic Gathering', eventType: 'Conference',
        city: 'Kingston', region: '', country: 'Jamaica', timeZone: 'America/Jamaica', requestedStartDate: '2027-04-22', requestedEndDate: '2027-04-25', alternateDates: '',
        source: 'returning-host', sourceDetail: 'Returning host reached out directly to CTG administration.', contactEmail: 'bishop.reid@example.org', contactPhone: '+1 876 555 0180', whatsapp: '+1 876 555 0180', expectedAttendance: 600,
        requestedRole: 'Evening ministry and leaders gathering', notes: 'Previous host relationship. Dates appear workable pending calendar review.', stage: 'under-review', owner: 'CTG Administration', lastResponseAtUtc: new Date(Date.now() - 2 * 86400000).toISOString(),
        holdExpiresAtUtc: null, passportRequired: true, visaRequired: false, invitationLetterRequired: false, entryRequirements: '', nearestAirport: 'KIN · Norman Manley International Airport', interpreterNeeded: false, interpreterLanguage: '',
        localTransportation: '', securityNotes: '', honorariumAmount: null, honorariumCurrency: 'USD', airfareResponsibility: '', lodgingResponsibility: '', groundResponsibility: '', agreementStatus: 'not-started',
        createdAtUtc: '2026-08-29T17:00:00Z', updatedAtUtc: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ];
  }

  private persistFallback(): void {
    localStorage.setItem(this.storageKey, JSON.stringify({ bookings: this.bookings() } satisfies PersistedState));
  }

  private isUnitedStates(country: string): boolean {
    return ['united states', 'united states of america', 'usa', 'us', 'u.s.'].includes((country || '').trim().toLowerCase());
  }

  private expiresWithinDays(value: string | null, days: number): boolean {
    if (!value) return false;
    const time = new Date(value).getTime();
    return time >= Date.now() && time <= Date.now() + days * 86400000;
  }

  private daysSince(value: string): number {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? Math.max(0, Math.floor((Date.now() - time) / 86400000)) : 0;
  }
}
