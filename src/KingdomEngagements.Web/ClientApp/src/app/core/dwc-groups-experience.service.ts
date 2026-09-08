import { Injectable, computed, signal } from '@angular/core';

export type DivineGroupType = 'Young Adults' | 'Marriage & Family' | 'Men' | 'Women' | 'Prayer' | 'Formation';
export type DivineJoinStatus = 'Pending leader review' | 'Accepted' | 'Waitlisted' | 'Alternative suggested';

export interface DivineGroupDiscoveryProfile {
  groupId: string;
  type: DivineGroupType;
  lifeStage: string;
  description: string;
  capacity: number;
  meetingMode: 'In person' | 'Hybrid' | 'Online';
  joinPolicy: 'Request to join' | 'Open enrollment';
  acceptingMembers: boolean;
  neighborhood: string;
  tags: string[];
}

export interface DivineGroupJoinRequest {
  id: string;
  groupId: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  createdAtUtc: string;
  status: DivineJoinStatus;
}

export interface DivineGroupFinderRequest {
  id: string;
  name: string;
  email: string;
  dayPreference: string;
  areaPreference: string;
  groupPreference: string;
  childcareNeeded: boolean;
  note: string;
  createdAtUtc: string;
  status: 'Needs placement' | 'Connected';
}

export interface DivineGroupLeaderInterest {
  id: string;
  name: string;
  email: string;
  groupIdea: string;
  availability: string;
  experience: string;
  createdAtUtc: string;
  stage: 'Interest received' | 'Training' | 'Approved' | 'Group draft';
}

interface PersistedGroupsExperience {
  joinRequests: DivineGroupJoinRequest[];
  finderRequests: DivineGroupFinderRequest[];
  leaderInterests: DivineGroupLeaderInterest[];
}

@Injectable({ providedIn: 'root' })
export class DwcGroupsExperienceService {
  private readonly storageKey = 'apostolos.engagements.dwc.groups-experience.v1';

  readonly profiles: readonly DivineGroupDiscoveryProfile[] = [
    {
      groupId: 'young-adults', type: 'Young Adults', lifeStage: 'Ages 18–30', capacity: 15,
      description: 'Build real friendships, grow in Scripture and prayer, and learn to carry your calling into everyday life with people in the same season.',
      meetingMode: 'In person', joinPolicy: 'Request to join', acceptingMembers: true, neighborhood: 'Richmond West',
      tags: ['Young Adults', 'Formation', 'Calling'],
    },
    {
      groupId: 'marriage-family', type: 'Marriage & Family', lifeStage: 'Couples & families', capacity: 14,
      description: 'A covenant-centered group for strengthening marriages, households, communication and spiritual rhythms at home.',
      meetingMode: 'In person', joinPolicy: 'Request to join', acceptingMembers: false, neighborhood: 'Richmond East',
      tags: ['Marriage', 'Family', 'Childcare'],
    },
    {
      groupId: 'men-of-valor', type: 'Men', lifeStage: 'Men 18+', capacity: 12,
      description: 'Men growing in prayer, Scripture, integrity, brotherhood and courageous Kingdom responsibility.',
      meetingMode: 'In person', joinPolicy: 'Open enrollment', acceptingMembers: true, neighborhood: 'Richmond South',
      tags: ['Men', 'Prayer', 'Brotherhood'],
    },
    {
      groupId: 'women-purpose', type: 'Women', lifeStage: 'Women 18+', capacity: 15,
      description: 'Women building spiritual friendship, discovering purpose and practicing faithful obedience together.',
      meetingMode: 'Hybrid', joinPolicy: 'Request to join', acceptingMembers: true, neighborhood: 'Richmond Central',
      tags: ['Women', 'Purpose', 'Hybrid'],
    },
  ];

  readonly joinRequests = signal<DivineGroupJoinRequest[]>([
    { id: 'join-001', groupId: 'young-adults', name: 'Nia Robinson', email: 'nia@example.com', phone: '804-555-0134', note: 'New to DWC and hoping to connect with other young adults.', createdAtUtc: '2026-09-07T18:00:00Z', status: 'Pending leader review' },
    { id: 'join-002', groupId: 'marriage-family', name: 'Aaron & Kiara Bell', email: 'bellfamily@example.com', phone: '804-555-0121', note: 'Interested in the next available marriage group if this one remains full.', createdAtUtc: '2026-09-06T14:15:00Z', status: 'Waitlisted' },
  ]);
  readonly finderRequests = signal<DivineGroupFinderRequest[]>([
    { id: 'find-001', name: 'Devin Parker', email: 'devin@example.com', dayPreference: 'Wednesday', areaPreference: 'South', groupPreference: 'Men', childcareNeeded: false, note: 'Looking for prayer and accountability.', createdAtUtc: '2026-09-07T16:30:00Z', status: 'Needs placement' },
  ]);
  readonly leaderInterests = signal<DivineGroupLeaderInterest[]>([
    { id: 'lead-001', name: 'Derrick Lewis', email: 'derrick@example.com', groupIdea: 'Men’s prayer and discipleship', availability: 'Saturday mornings', experience: 'Currently serving with the men’s prayer team and apprenticing in Men of Valor.', createdAtUtc: '2026-09-05T12:00:00Z', stage: 'Training' },
  ]);

  readonly pendingJoinCount = computed(() => this.joinRequests().filter(item => item.status === 'Pending leader review').length);
  readonly placementCount = computed(() => this.finderRequests().filter(item => item.status === 'Needs placement').length);
  readonly leaderPipelineCount = computed(() => this.leaderInterests().filter(item => item.stage !== 'Approved').length);

  constructor() { this.restore(); }

  profileFor(groupId: string): DivineGroupDiscoveryProfile | undefined {
    return this.profiles.find(profile => profile.groupId === groupId);
  }

  requestJoin(input: Omit<DivineGroupJoinRequest, 'id' | 'createdAtUtc' | 'status'>): DivineGroupJoinRequest {
    const profile = this.profileFor(input.groupId);
    const item: DivineGroupJoinRequest = {
      ...input,
      id: crypto.randomUUID(),
      createdAtUtc: new Date().toISOString(),
      status: profile?.acceptingMembers ? 'Pending leader review' : 'Waitlisted',
    };
    this.joinRequests.update(items => [item, ...items]);
    this.persist();
    return item;
  }

  requestFinderHelp(input: Omit<DivineGroupFinderRequest, 'id' | 'createdAtUtc' | 'status'>): DivineGroupFinderRequest {
    const item: DivineGroupFinderRequest = { ...input, id: crypto.randomUUID(), createdAtUtc: new Date().toISOString(), status: 'Needs placement' };
    this.finderRequests.update(items => [item, ...items]);
    this.persist();
    return item;
  }

  expressLeaderInterest(input: Omit<DivineGroupLeaderInterest, 'id' | 'createdAtUtc' | 'stage'>): DivineGroupLeaderInterest {
    const item: DivineGroupLeaderInterest = { ...input, id: crypto.randomUUID(), createdAtUtc: new Date().toISOString(), stage: 'Interest received' };
    this.leaderInterests.update(items => [item, ...items]);
    this.persist();
    return item;
  }

  updateJoinStatus(id: string, status: DivineJoinStatus): void {
    this.joinRequests.update(items => items.map(item => item.id === id ? { ...item, status } : item));
    this.persist();
  }

  private persist(): void {
    try {
      const state: PersistedGroupsExperience = {
        joinRequests: this.joinRequests(), finderRequests: this.finderRequests(), leaderInterests: this.leaderInterests(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch { /* demo persistence is best-effort */ }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const state = JSON.parse(raw) as Partial<PersistedGroupsExperience>;
      if (state.joinRequests?.length) this.joinRequests.set(state.joinRequests);
      if (state.finderRequests?.length) this.finderRequests.set(state.finderRequests);
      if (state.leaderInterests?.length) this.leaderInterests.set(state.leaderInterests);
    } catch { /* keep deterministic seed data */ }
  }
}
