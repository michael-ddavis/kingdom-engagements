import { Injectable } from '@angular/core';
import {
  CareNetworkState,
  CarePartner,
  CareReferral,
  CareReferralStatus,
  EngagementDetails,
} from './models';

@Injectable({ providedIn: 'root' })
export class CareNetworkStoreService {
  private readonly storageKey = 'kingdomos-angular-care-network-v1';

  get(assignment: EngagementDetails): CareNetworkState {
    const all = this.readAll();
    const id = assignment.summary.id;
    const existing = all[id];
    if (existing) return existing;

    const seeded = this.seed(assignment);
    all[id] = seeded;
    this.writeAll(all);
    return seeded;
  }

  setConsent(assignmentId: string, responseId: string, confirmed: boolean): CareNetworkState {
    const state = this.requireState(assignmentId);
    const updated: CareNetworkState = {
      ...state,
      consentByResponse: {
        ...state.consentByResponse,
        [responseId]: confirmed,
      },
    };
    this.save(updated);
    return updated;
  }

  selectPartner(assignmentId: string, responseId: string, partnerId: number): CareNetworkState {
    const state = this.requireState(assignmentId);
    const updated: CareNetworkState = {
      ...state,
      selectedPartnerByResponse: {
        ...state.selectedPartnerByResponse,
        [responseId]: partnerId,
      },
    };
    this.save(updated);
    return updated;
  }

  sendReferral(
    assignmentId: string,
    responseId: string,
    personalMessage: string,
  ): CareNetworkState {
    const state = this.requireState(assignmentId);
    const partnerId = state.selectedPartnerByResponse[responseId] ?? 302;
    const now = new Date();
    const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const referral: CareReferral = {
      id: Date.now(),
      responseId,
      partnerId,
      status: 'sent',
      personalMessage: personalMessage.trim(),
      sentUtc: now.toISOString(),
      viewedUtc: null,
      respondedUtc: null,
      connectedUtc: null,
      expiresUtc: expires.toISOString(),
      lastReminderUtc: null,
      reminderCount: 0,
      assignedOwner: '',
      nextStep: '',
      declineReason: '',
      connectionConfirmedBy: '',
      connectionNote: '',
    };
    const updated = { ...state, referrals: [...state.referrals, referral] };
    this.save(updated);
    return updated;
  }

  updateReferral(
    assignmentId: string,
    referralId: number,
    status: CareReferralStatus,
  ): CareNetworkState {
    const state = this.requireState(assignmentId);
    const now = new Date().toISOString();
    const referrals = state.referrals.map((item) => {
      if (item.id !== referralId) return item;
      return {
        ...item,
        status,
        viewedUtc: status === 'viewed' && !item.viewedUtc ? now : item.viewedUtc,
        respondedUtc: ['accepted', 'declined'].includes(status) ? now : item.respondedUtc,
        connectedUtc: status === 'connected' ? now : item.connectedUtc,
        assignedOwner: status === 'accepted' ? 'Jordan Ellis' : item.assignedOwner,
        nextStep: status === 'accepted' ? 'Schedule first connection within 48 hours.' : item.nextStep,
      };
    });
    const updated = { ...state, referrals };
    this.save(updated);
    return updated;
  }

  remind(assignmentId: string, referralId: number): CareNetworkState {
    const state = this.requireState(assignmentId);
    const now = new Date().toISOString();
    const referrals = state.referrals.map((item) =>
      item.id === referralId
        ? {
            ...item,
            lastReminderUtc: now,
            reminderCount: item.reminderCount + 1,
          }
        : item,
    );
    const updated = { ...state, referrals };
    this.save(updated);
    return updated;
  }

  latestReferral(state: CareNetworkState, responseId: string): CareReferral | null {
    return [...state.referrals]
      .reverse()
      .find((item) => item.responseId === responseId && !['declined', 'expired', 'cancelled'].includes(item.status)) ?? null;
  }

  partner(state: CareNetworkState, partnerId: number | undefined): CarePartner | null {
    return state.partners.find((item) => item.id === partnerId) ?? null;
  }

  statusLabel(status: CareReferralStatus): string {
    const labels: Record<CareReferralStatus, string> = {
      sent: 'Awaiting church response',
      viewed: 'Church reviewing',
      accepted: 'Accepted by church',
      connected: 'Person connected',
      declined: 'Unable to accept',
      expired: 'Response overdue',
      cancelled: 'Returned for reassignment',
    };
    return labels[status];
  }

  private seed(assignment: EngagementDetails): CareNetworkState {
    const location = assignment.summary.location ?? 'Atlanta, GA';
    const atlanta = /atlanta/i.test(location);
    const city = atlanta ? 'Atlanta' : location.split(',')[0]?.trim() || 'Local area';
    const stateName = atlanta ? 'GA' : location.split(',')[1]?.trim() || '';
    const hostName = assignment.summary.hostOrganization || 'Host church';

    return {
      assignmentId: assignment.summary.id,
      consentByResponse: {},
      selectedPartnerByResponse: {},
      partners: [
        {
          id: 301,
          name: atlanta ? 'New Covenant Global Church' : hostName,
          city,
          state: stateName,
          distanceMiles: 0,
          contactName: 'Pastor Simone Reed',
          contactRole: 'Discipleship pastor',
          contactEmail: 'simone@newcovenant.example',
          contactPhone: '(404) 555-0110',
          relationship: 'host-church',
          serviceArea: `${city} and nearby communities`,
          ministries: ['New believer pathway', 'Young adults', 'Prayer care'],
          languages: ['English', 'Spanish'],
          availability: 'available',
          responseSlaHours: 24,
          notes: 'Host church with an established new-believer pathway.',
          isActive: true,
        },
        {
          id: 302,
          name: atlanta ? 'Greater Atlanta Community Church' : `${city} Community Church`,
          city: atlanta ? 'Decatur' : city,
          state: stateName,
          distanceMiles: atlanta ? 5 : 4,
          contactName: 'Jordan Ellis',
          contactRole: 'Connections director',
          contactEmail: 'jordan@communitychurch.example',
          contactPhone: '(404) 555-0148',
          relationship: 'verified-partner',
          serviceArea: atlanta
            ? 'Decatur, East Atlanta and Avondale Estates'
            : `${city} and surrounding communities`,
          ministries: ['Foundations small groups', 'Young professionals', 'Family support'],
          languages: ['English'],
          availability: 'available',
          responseSlaHours: 48,
          notes: 'Strong fit for young adults and foundations groups.',
          isActive: true,
        },
        {
          id: 303,
          name: 'Eastside Fellowship',
          city: atlanta ? 'Stone Mountain' : city,
          state: stateName,
          distanceMiles: atlanta ? 13 : 9,
          contactName: 'Minister Leah Grant',
          contactRole: 'Care team lead',
          contactEmail: 'leah@eastsidefellowship.example',
          contactPhone: '(770) 555-0162',
          relationship: 'verified-partner',
          serviceArea: atlanta ? 'Stone Mountain and eastern DeKalb County' : `${city} metro area`,
          ministries: ['Prayer follow-up', "Women's care groups"],
          languages: ['English'],
          availability: 'limited',
          responseSlaHours: 72,
          notes: 'Confirm capacity before sending more than one referral.',
          isActive: true,
        },
      ],
      referrals: [],
    };
  }

  private requireState(assignmentId: string): CareNetworkState {
    const state = this.readAll()[assignmentId];
    if (!state) throw new Error('Care Network state has not been initialized for this assignment.');
    return state;
  }

  private save(state: CareNetworkState): void {
    const all = this.readAll();
    all[state.assignmentId] = state;
    this.writeAll(all);
  }

  private readAll(): Record<string, CareNetworkState> {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? '{}') as Record<string, CareNetworkState>;
    } catch {
      return {};
    }
  }

  private writeAll(value: Record<string, CareNetworkState>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(value));
    } catch {
      // The Angular migration remains usable in memory even if storage is unavailable.
    }
  }
}
