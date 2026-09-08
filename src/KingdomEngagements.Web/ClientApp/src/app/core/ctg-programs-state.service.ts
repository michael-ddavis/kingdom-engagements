import { Injectable, computed, signal } from '@angular/core';

export type RegistrationStatus = 'registered' | 'checked-in' | 'cancelled';
export type Power12Status = 'applied' | 'review' | 'accepted' | 'waitlist' | 'declined' | 'enrolled';

export interface CtgEventDefinition {
  id: string;
  title: string;
  subtitle: string;
  dates: string;
  location: string;
  capacity: number;
  status: 'open' | 'planning' | 'closed';
  tiers: { id: string; name: string; price: number; detail: string }[];
}

export interface CtgEventRegistration {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  church: string;
  tierId: string;
  accessibility: string;
  status: RegistrationStatus;
  registeredAt: string;
}

export interface Power12Applicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  ministryRole: string;
  calling: string;
  whyNow: string;
  goals: string;
  paymentPreference: 'pay-in-full' | 'installments' | 'undecided';
  status: Power12Status;
  submittedAt: string;
  notes: string;
}

interface PersistedCtgProgramsState {
  registrations: CtgEventRegistration[];
  applicants: Power12Applicant[];
}

@Injectable({ providedIn: 'root' })
export class CtgProgramsStateService {
  private readonly storageKey = 'ApostolOS.CTG.EventsPrograms.v1';

  readonly events = signal<CtgEventDefinition[]>([
    {
      id: 'power-glory-2026',
      title: 'Power & Glory Intensive 2026',
      subtitle: 'The Glory Realm',
      dates: 'September 9–13, 2026',
      location: 'Fort Lauderdale, Florida',
      capacity: 650,
      status: 'open',
      tiers: [
        { id: 'upper', name: 'Upper Level Seating', price: 99, detail: 'General sessions, conference materials, and corporate prayer.' },
        { id: 'lower', name: 'Lower Level Seating', price: 199, detail: 'Premium seating, lifetime replays, and exclusive resources.' },
        { id: 'online', name: 'Online Access', price: 99, detail: 'Virtual access to general sessions with lifetime replays.' },
      ],
    },
    {
      id: 'prophetic-symposium-2026',
      title: 'The Prophetic Symposium',
      subtitle: 'Prophetic Intelligence & Activation',
      dates: '2026 · Date announced by CTG',
      location: 'Deerfield Beach, Florida',
      capacity: 220,
      status: 'open',
      tiers: [
        { id: 'in-person', name: 'In-Person Intensive', price: 197, detail: 'Live prophetic training, activation, and impartation.' },
      ],
    },
  ]);

  readonly registrations = signal<CtgEventRegistration[]>([]);
  readonly applicants = signal<Power12Applicant[]>([]);

  readonly totalRegistrations = computed(() => this.registrations().filter(item => item.status !== 'cancelled').length);
  readonly checkedIn = computed(() => this.registrations().filter(item => item.status === 'checked-in').length);
  readonly power12Active = computed(() => this.applicants().filter(item => !['declined'].includes(item.status)).length);
  readonly power12SeatsCommitted = computed(() => this.applicants().filter(item => ['accepted', 'enrolled'].includes(item.status)).length);

  constructor() {
    this.restore();
  }

  eventById(id: string): CtgEventDefinition | undefined {
    return this.events().find(item => item.id === id);
  }

  registrationsFor(eventId: string): CtgEventRegistration[] {
    return this.registrations().filter(item => item.eventId === eventId);
  }

  register(input: Omit<CtgEventRegistration, 'id' | 'status' | 'registeredAt'>): CtgEventRegistration {
    const record: CtgEventRegistration = {
      ...input,
      id: crypto.randomUUID(),
      status: 'registered',
      registeredAt: new Date().toISOString(),
    };
    this.registrations.update(items => [record, ...items]);
    this.persist();
    return record;
  }

  setRegistrationStatus(id: string, status: RegistrationStatus): void {
    this.registrations.update(items => items.map(item => item.id === id ? { ...item, status } : item));
    this.persist();
  }

  applyToPower12(input: Omit<Power12Applicant, 'id' | 'status' | 'submittedAt' | 'notes'>): Power12Applicant {
    const record: Power12Applicant = {
      ...input,
      id: crypto.randomUUID(),
      status: 'applied',
      submittedAt: new Date().toISOString(),
      notes: '',
    };
    this.applicants.update(items => [record, ...items]);
    this.persist();
    return record;
  }

  updatePower12(id: string, status: Power12Status, notes?: string): void {
    this.applicants.update(items => items.map(item => item.id === id ? {
      ...item,
      status,
      notes: notes ?? item.notes,
    } : item));
    this.persist();
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedCtgProgramsState;
        this.registrations.set(parsed.registrations ?? []);
        this.applicants.set(parsed.applicants ?? []);
        if (this.registrations().length || this.applicants().length) return;
      }
    } catch {
      // Demo persistence is best-effort; seed data below remains available.
    }

    this.registrations.set([
      { id: 'reg-1', eventId: 'power-glory-2026', firstName: 'Monique', lastName: 'Reed', email: 'monique@example.com', phone: '(404) 555-0132', city: 'Atlanta', state: 'GA', church: 'Kingdom Life Center', tierId: 'lower', accessibility: '', status: 'registered', registeredAt: '2026-08-28T15:30:00Z' },
      { id: 'reg-2', eventId: 'power-glory-2026', firstName: 'Andre', lastName: 'Williams', email: 'andre@example.com', phone: '(704) 555-0188', city: 'Charlotte', state: 'NC', church: 'New Covenant Fellowship', tierId: 'upper', accessibility: '', status: 'checked-in', registeredAt: '2026-08-30T18:10:00Z' },
      { id: 'reg-3', eventId: 'power-glory-2026', firstName: 'Tasha', lastName: 'Green', email: 'tasha@example.com', phone: '(954) 555-0119', city: 'Fort Lauderdale', state: 'FL', church: '', tierId: 'online', accessibility: 'Closed captions requested', status: 'registered', registeredAt: '2026-09-01T13:20:00Z' },
    ]);
    this.applicants.set([
      { id: 'p12-1', firstName: 'Danielle', lastName: 'Brooks', email: 'danielle@example.com', phone: '(214) 555-0124', city: 'Dallas', state: 'TX', ministryRole: 'Prophetic ministry leader', calling: 'Equip intercessors and emerging prophetic voices.', whyNow: 'I am entering a season of greater leadership responsibility and need apostolic alignment.', goals: 'Prophetic accuracy, leadership maturity, and clear ministry strategy.', paymentPreference: 'installments', status: 'review', submittedAt: '2026-08-24T16:00:00Z', notes: 'Strong fit. Review leadership references during next cohort meeting.' },
      { id: 'p12-2', firstName: 'Marcus', lastName: 'Coleman', email: 'marcus@example.com', phone: '(301) 555-0164', city: 'Baltimore', state: 'MD', ministryRole: 'Pastor', calling: 'Build an apostolic training culture in the local church.', whyNow: 'Our ministry is shifting from maintenance to equipping and multiplication.', goals: 'Apostolic strategy, prophetic maturity, and legacy building.', paymentPreference: 'pay-in-full', status: 'accepted', submittedAt: '2026-08-20T14:12:00Z', notes: 'Acceptance conversation completed.' },
    ]);
    this.persist();
  }

  private persist(): void {
    const state: PersistedCtgProgramsState = {
      registrations: this.registrations(),
      applicants: this.applicants(),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }
}
