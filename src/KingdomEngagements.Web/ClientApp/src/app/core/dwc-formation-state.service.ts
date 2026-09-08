import { Injectable, computed, signal } from '@angular/core';

export type FormationSource = 'DWCIM' | 'Kingdom Academy';
export type LeadershipStage =
  | 'Member'
  | 'Growing disciple'
  | 'Serving'
  | 'Apprentice leader'
  | 'Co-leader'
  | 'Group leader'
  | 'Multiplying leader'
  | 'Cluster leader';

export interface FormationMedia {
  type: 'video' | 'audio' | 'guide' | 'worksheet';
  title: string;
  source: FormationSource;
  duration?: string;
  url?: string;
}

export interface FormationSession {
  id: string;
  week: number;
  title: string;
  theme: string;
  scripture: string;
  bigIdea: string;
  teaching: string;
  discussion: string[];
  practice: string;
  prayer: string;
  leaderResource: string;
  catchUp: string;
  media: FormationMedia[];
}

export interface FormationTrack {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  description: string;
  source: FormationSource;
  academyProgram?: string;
  prerequisites: string[];
  suggestedNext: string[];
  outcomes: string[];
  sessions: FormationSession[];
  custom?: boolean;
}

export interface FormationHistoryEntry {
  semester: string;
  group: string;
  track: string;
  outcome: string;
}

export interface FormationMember {
  id: string;
  name: string;
  email: string;
  household: string;
  householdNote: string;
  attendance: string;
  reflections: string[];
  testimonies: string[];
  prayerResponses: string[];
  milestones: string[];
  practice: 'Complete' | 'In progress' | 'Not started';
  status: 'On pace' | 'Needs follow-up' | 'Emerging leader';
  leadershipStage: LeadershipStage;
  serviceArea: string;
  nextStep: string;
  missedSessionIds: string[];
  catchUpAssignedIds: string[];
  commissioned: boolean;
  history: FormationHistoryEntry[];
}

export interface FormationGroup {
  id: string;
  name: string;
  leader: string;
  cluster: string;
  members: number;
  pace: 'Weekly' | 'Every other week' | 'Flexible';
  semester: string;
  trackId: string;
  completedSessionIds: string[];
  memberIds: string[];
  meeting: string;
  location: string;
  childcare: boolean;
}

export interface SessionNote {
  groupId: string;
  sessionId: string;
  note: string;
}

export interface SemesterReview {
  groupId: string;
  leaderReview: boolean;
  memberNextSteps: boolean;
  testimoniesCaptured: boolean;
  commissioningPlanned: boolean;
  rolloverReady: boolean;
}

interface PersistedFormationState {
  selectedGroupId: string;
  groups: FormationGroup[];
  members: FormationMember[];
  practices: Record<string, string[]>;
  sessionNotes: SessionNote[];
  customTracks: FormationTrack[];
  questionLibrary: string[];
  semesterReviews: SemesterReview[];
}

@Injectable({ providedIn: 'root' })
export class DwcFormationStateService {
  private readonly storageKey = 'apostolos.engagements.dwc.formation.v4';

  readonly tracks = signal<FormationTrack[]>(this.seedTracks());
  readonly groups = signal<FormationGroup[]>(this.seedGroups());
  readonly members = signal<FormationMember[]>(this.seedMembers());
  readonly selectedGroupId = signal('young-adults');
  readonly practices = signal<Record<string, string[]>>({
    'young-adults': ['Ask two mature believers where they see grace on your life.'],
    'marriage-family': ['Choose one covenant-building conversation to practice before the next gathering.'],
    'men-of-valor': ['Set aside three 15-minute Scripture and listening-prayer blocks this week.'],
    'women-purpose': ['Encourage one woman in the group with a specific truth from Scripture.'],
  });
  readonly sessionNotes = signal<SessionNote[]>([]);
  readonly questionLibrary = signal<string[]>([
    'What is God inviting you to believe or obey because of this Scripture?',
    'Where does this truth confront a pattern you have learned to live from?',
    'What would this look like in your home, work, relationships or service this week?',
    'What do you need from this group to walk this out faithfully?',
    'Where have you already seen grace or growth in this area?',
  ]);
  readonly semesterReviews = signal<SemesterReview[]>(this.seedGroups().map(group => ({
    groupId: group.id,
    leaderReview: false,
    memberNextSteps: false,
    testimoniesCaptured: false,
    commissioningPlanned: false,
    rolloverReady: false,
  })));

  readonly selectedGroup = computed(() =>
    this.groups().find(group => group.id === this.selectedGroupId()) ?? this.groups()[0],
  );
  readonly selectedTrack = computed(() =>
    this.tracks().find(track => track.id === this.selectedGroup().trackId) ?? this.tracks()[0],
  );
  readonly selectedMembers = computed(() => {
    const ids = new Set(this.selectedGroup().memberIds);
    return this.members().filter(member => ids.has(member.id));
  });
  readonly completedCount = computed(() => this.selectedGroup().completedSessionIds.length);
  readonly progressPercent = computed(() => {
    const total = this.selectedTrack().sessions.length || 1;
    return Math.round(this.completedCount() * 100 / total);
  });
  readonly currentSession = computed(() =>
    this.selectedTrack().sessions.find(session => !this.selectedGroup().completedSessionIds.includes(session.id))
      ?? this.selectedTrack().sessions[this.selectedTrack().sessions.length - 1],
  );
  readonly followupCount = computed(() =>
    this.selectedMembers().filter(member => member.status === 'Needs follow-up').length,
  );
  readonly emergingLeaders = computed(() =>
    this.members().filter(member => member.status === 'Emerging leader' || this.stageIndex(member.leadershipStage) >= this.stageIndex('Apprentice leader')),
  );
  readonly myMember = computed(() => this.members().find(member => member.id === 'michael') ?? this.members()[0]);

  constructor() {
    this.restore();
  }

  selectGroup(groupId: string): void {
    if (!this.groups().some(group => group.id === groupId)) return;
    this.selectedGroupId.set(groupId);
    this.persist();
  }

  assignTrack(groupId: string, trackId: string): void {
    if (!this.tracks().some(track => track.id === trackId)) return;
    this.groups.update(groups => groups.map(group =>
      group.id === groupId ? { ...group, trackId, completedSessionIds: [] } : group,
    ));
    this.persist();
  }

  setGroupPace(groupId: string, pace: FormationGroup['pace']): void {
    this.groups.update(groups => groups.map(group => group.id === groupId ? { ...group, pace } : group));
    this.persist();
  }

  completeSession(groupId: string, sessionId: string): void {
    this.groups.update(groups => groups.map(group => {
      if (group.id !== groupId || group.completedSessionIds.includes(sessionId)) return group;
      return { ...group, completedSessionIds: [...group.completedSessionIds, sessionId] };
    }));
    this.persist();
  }

  reopenSession(groupId: string, sessionId: string): void {
    this.groups.update(groups => groups.map(group =>
      group.id === groupId
        ? { ...group, completedSessionIds: group.completedSessionIds.filter(id => id !== sessionId) }
        : group,
    ));
    this.persist();
  }

  addPractice(groupId: string, value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    this.practices.update(state => ({
      ...state,
      [groupId]: [trimmed, ...(state[groupId] ?? []).filter(item => item !== trimmed)],
    }));
    this.persist();
  }

  completeMemberPractice(memberId: string): void {
    this.updateMember(memberId, member => ({ ...member, practice: 'Complete' }));
  }

  addReflection(memberId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.updateMember(memberId, member => ({ ...member, reflections: [trimmed, ...member.reflections] }));
  }

  addTestimony(memberId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.updateMember(memberId, member => ({ ...member, testimonies: [trimmed, ...member.testimonies] }));
  }

  addPrayerResponse(memberId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.updateMember(memberId, member => ({ ...member, prayerResponses: [trimmed, ...member.prayerResponses] }));
  }

  addMilestone(memberId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.updateMember(memberId, member => ({
      ...member,
      milestones: [trimmed, ...member.milestones],
      status: member.status === 'Needs follow-up' ? 'On pace' : 'Emerging leader',
    }));
  }

  setMemberNextStep(memberId: string, nextStep: string): void {
    this.updateMember(memberId, member => ({ ...member, nextStep }));
  }

  setMemberStatus(memberId: string, status: FormationMember['status']): void {
    this.updateMember(memberId, member => ({ ...member, status }));
  }

  assignCatchUp(memberId: string, sessionId: string): void {
    this.updateMember(memberId, member => ({
      ...member,
      catchUpAssignedIds: member.catchUpAssignedIds.includes(sessionId)
        ? member.catchUpAssignedIds
        : [...member.catchUpAssignedIds, sessionId],
    }));
  }

  completeCatchUp(memberId: string, sessionId: string): void {
    this.updateMember(memberId, member => ({
      ...member,
      missedSessionIds: member.missedSessionIds.filter(id => id !== sessionId),
      catchUpAssignedIds: member.catchUpAssignedIds.filter(id => id !== sessionId),
    }));
  }

  moveLeadership(memberId: string, stage: LeadershipStage): void {
    this.updateMember(memberId, member => ({
      ...member,
      leadershipStage: stage,
      status: this.stageIndex(stage) >= this.stageIndex('Apprentice leader') ? 'Emerging leader' : member.status,
      milestones: [`Leadership pathway: ${stage}`, ...member.milestones],
    }));
  }

  nextLeadershipStage(stage: LeadershipStage): LeadershipStage {
    const stages = this.leadershipStages();
    return stages[Math.min(stages.indexOf(stage) + 1, stages.length - 1)];
  }

  leadershipStages(): LeadershipStage[] {
    return [
      'Member',
      'Growing disciple',
      'Serving',
      'Apprentice leader',
      'Co-leader',
      'Group leader',
      'Multiplying leader',
      'Cluster leader',
    ];
  }

  saveSessionNote(groupId: string, sessionId: string, note: string): void {
    const trimmed = note.trim();
    this.sessionNotes.update(notes => {
      const remaining = notes.filter(item => !(item.groupId === groupId && item.sessionId === sessionId));
      return trimmed ? [{ groupId, sessionId, note: trimmed }, ...remaining] : remaining;
    });
    this.persist();
  }

  sessionNote(groupId: string, sessionId: string): string {
    return this.sessionNotes().find(item => item.groupId === groupId && item.sessionId === sessionId)?.note ?? '';
  }

  addQuestion(question: string): void {
    const trimmed = question.trim();
    if (!trimmed) return;
    this.questionLibrary.update(items => [trimmed, ...items.filter(item => item !== trimmed)]);
    this.persist();
  }

  createTrack(title: string, subtitle: string, source: FormationSource): FormationTrack | null {
    const cleanTitle = title.trim();
    if (!cleanTitle) return null;
    const id = `custom-${Date.now()}`;
    const track: FormationTrack = {
      id,
      number: this.tracks().length + 1,
      title: cleanTitle,
      subtitle: subtitle.trim() || 'Leader-created DEG pathway',
      description: 'A DWCIM leader-created formation track. Add or link session resources as the pathway develops.',
      source,
      prerequisites: ['Coordinator review'],
      suggestedNext: ['Discern after semester review'],
      outcomes: ['Scripture engagement', 'Obedient practice', 'Relational formation'],
      custom: true,
      sessions: [
        {
          id: `${id}-1`, week: 1, title: 'Opening formation session', theme: 'Begin with Scripture, relationship and a concrete response.',
          scripture: '2 Timothy 3:16–17', bigIdea: 'Formation begins by hearing God together and responding faithfully.',
          teaching: 'Use this opening session as a starting point, then customize the track as leaders develop the pathway.',
          discussion: ['What is God forming in us during this season?', 'What would faithful response look like this week?'],
          practice: 'Choose one concrete act of obedience before the next gathering.',
          prayer: 'Ask the Holy Spirit for clarity, humility and responsive obedience.',
          leaderResource: 'Leader-created session notes',
          catchUp: 'Read the Scripture, review the big idea and complete the weekly practice.',
          media: [],
        },
      ],
    };
    this.tracks.update(items => [...items, track]);
    this.persist();
    return track;
  }

  updateSemesterReview(groupId: string, field: keyof Omit<SemesterReview, 'groupId'>, value: boolean): void {
    this.semesterReviews.update(items => items.map(item => item.groupId === groupId ? { ...item, [field]: value } : item));
    this.persist();
  }

  reviewFor(groupId: string): SemesterReview {
    return this.semesterReviews().find(item => item.groupId === groupId) ?? {
      groupId, leaderReview: false, memberNextSteps: false, testimoniesCaptured: false, commissioningPlanned: false, rolloverReady: false,
    };
  }

  commissionMember(memberId: string): void {
    this.updateMember(memberId, member => ({
      ...member,
      commissioned: true,
      milestones: ['Commissioned at semester closeout', ...member.milestones],
    }));
  }

  getSession(trackId: string, sessionId: string): FormationSession | undefined {
    return this.tracks().find(track => track.id === trackId)?.sessions.find(session => session.id === sessionId);
  }

  trackById(trackId: string): FormationTrack | undefined {
    return this.tracks().find(track => track.id === trackId);
  }

  private updateMember(memberId: string, update: (member: FormationMember) => FormationMember): void {
    this.members.update(items => items.map(member => member.id === memberId ? update(member) : member));
    this.persist();
  }

  private stageIndex(stage: LeadershipStage): number {
    return this.leadershipStages().indexOf(stage);
  }

  private persist(): void {
    try {
      const customTracks = this.tracks().filter(track => track.custom);
      const state: PersistedFormationState = {
        selectedGroupId: this.selectedGroupId(),
        groups: this.groups(),
        members: this.members(),
        practices: this.practices(),
        sessionNotes: this.sessionNotes(),
        customTracks,
        questionLibrary: this.questionLibrary(),
        semesterReviews: this.semesterReviews(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch { /* Demo persistence is best-effort. */ }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const state = JSON.parse(raw) as Partial<PersistedFormationState>;
      if (state.groups?.length) this.groups.set(state.groups);
      if (state.members?.length) this.members.set(state.members);
      if (state.practices) this.practices.set(state.practices);
      if (state.sessionNotes) this.sessionNotes.set(state.sessionNotes);
      if (state.questionLibrary?.length) this.questionLibrary.set(state.questionLibrary);
      if (state.semesterReviews?.length) this.semesterReviews.set(state.semesterReviews);
      if (state.customTracks?.length) this.tracks.update(items => [...items.filter(track => !track.custom), ...state.customTracks!]);
      if (state.selectedGroupId && this.groups().some(group => group.id === state.selectedGroupId)) this.selectedGroupId.set(state.selectedGroupId);
    } catch { /* Keep deterministic seed data when stored state is invalid. */ }
  }

  private seedGroups(): FormationGroup[] {
    return [
      { id: 'young-adults', name: 'Young Adults DEG', leader: 'Alicia Brown', cluster: 'Central Cluster', members: 11, pace: 'Weekly', semester: 'Spring 2027', trackId: 'track-2', completedSessionIds: ['t2-created', 't2-christ', 't2-gifts'], memberIds: ['michael', 'sarah', 'andre', 'ashley', 'derrick'], meeting: 'Wednesday · 6:30 PM', location: 'Richmond West', childcare: false },
      { id: 'marriage-family', name: 'Marriage & Family DEG', leader: 'James Smith', cluster: 'East Cluster', members: 14, pace: 'Every other week', semester: 'Spring 2027', trackId: 'track-3', completedSessionIds: ['t3-covenant', 't3-communication'], memberIds: ['james', 'jordan', 'marcus', 'ashley'], meeting: 'Monday · 6:30 PM', location: 'Richmond East', childcare: true },
      { id: 'men-of-valor', name: 'Men of Valor', leader: 'Marcus Hill', cluster: 'South Cluster', members: 9, pace: 'Weekly', semester: 'Spring 2027', trackId: 'track-1', completedSessionIds: ['t1-gospel', 't1-scripture', 't1-prayer', 't1-community'], memberIds: ['andre', 'derrick', 'marcus'], meeting: 'Wednesday · 6:30 PM', location: 'Richmond South', childcare: false },
      { id: 'women-purpose', name: 'Women of Purpose', leader: 'Jordan Davis', cluster: 'Central Cluster', members: 13, pace: 'Flexible', semester: 'Spring 2027', trackId: 'track-2', completedSessionIds: ['t2-created', 't2-christ', 't2-gifts', 't2-hear'], memberIds: ['sarah', 'ashley', 'jordan'], meeting: 'Tuesday · 7:00 PM', location: 'Hybrid · Richmond Central', childcare: false },
    ];
  }

  private seedMembers(): FormationMember[] {
    return [
      { id: 'michael', name: 'Michael Davis', email: 'michael@example.com', household: 'Davis household', householdNote: 'Spouse linked in People · household scheduling should stay visible when recommending next steps.', attendance: '4/4', reflections: ['God is teaching me to obey from identity instead of striving.', 'I see more clearly that calling is stewardship, not platform.', 'Psalm 139 challenged several labels I have carried.'], testimonies: ['Shared a testimony publicly during DEG prayer and encouraged two newer members.'], prayerResponses: ['Praying for clarity and courage around serving and leadership.'], milestones: ['Facilitated discussion for the first time', 'Started serving consistently', 'Identified teaching and encouragement gifts'], practice: 'Complete', status: 'Emerging leader', leadershipStage: 'Apprentice leader', serviceArea: 'Worship & discipleship', nextStep: 'Co-facilitate Weeks 5–6 and complete Academy Facilitation Foundations.', missedSessionIds: [], catchUpAssignedIds: [], commissioned: false, history: [{ semester: 'Fall 2026', group: 'Young Adults DEG', track: 'Transformation Track 1', outcome: 'Completed · Serving' }] },
      { id: 'sarah', name: 'Sarah Jones', email: 'sarah@example.com', household: 'Jones household', householdNote: 'No household constraints recorded.', attendance: '4/4', reflections: ['I am learning to receive belonging rather than prove it.', 'Community has become more concrete for me.'], testimonies: [], prayerResponses: ['Praying for restored confidence in prayer.'], milestones: ['Joined hospitality rotation'], practice: 'Complete', status: 'On pace', leadershipStage: 'Serving', serviceArea: 'Hospitality', nextStep: 'Continue serving and consider Transformation Track 3.', missedSessionIds: [], catchUpAssignedIds: [], commissioned: false, history: [{ semester: 'Fall 2026', group: 'Foundations DEG', track: 'Transformation Track 1', outcome: 'Completed' }] },
      { id: 'andre', name: 'Andre Lewis', email: 'andre@example.com', household: 'Lewis household', householdNote: 'Transportation support may affect meeting recommendations.', attendance: '3/4', reflections: ['I want my obedience to be more immediate.'], testimonies: [], prayerResponses: ['Praying for discipline in Scripture.'], milestones: ['Began serving with outreach'], practice: 'In progress', status: 'On pace', leadershipStage: 'Serving', serviceArea: 'Community outreach', nextStep: 'Complete missed-session catch-up and continue outreach service.', missedSessionIds: ['t2-gifts'], catchUpAssignedIds: [], commissioned: false, history: [] },
      { id: 'ashley', name: 'Ashley Martin', email: 'ashley@example.com', household: 'Martin household', householdNote: 'Childcare requested when in-person meetings extend past 8 PM.', attendance: '2/4', reflections: ['I am trying to rebuild consistency.'], testimonies: [], prayerResponses: ['Requested prayer for family rhythm and consistency.'], milestones: [], practice: 'Not started', status: 'Needs follow-up', leadershipStage: 'Growing disciple', serviceArea: 'Not selected', nextStep: 'Leader care conversation before assigning additional formation work.', missedSessionIds: ['t2-christ', 't2-gifts'], catchUpAssignedIds: ['t2-christ'], commissioned: false, history: [{ semester: 'Fall 2026', group: 'Women of Purpose', track: 'Open-topic semester', outcome: 'Partial participation' }] },
      { id: 'derrick', name: 'Derrick Lewis', email: 'derrick@example.com', household: 'Lewis household', householdNote: 'No additional scheduling notes.', attendance: '4/4', reflections: ['Serving is helping calling become practical.', 'Prayer is becoming a daily rhythm.'], testimonies: ['Invited a coworker to church after the Live Sent practice.'], prayerResponses: [], milestones: ['Joined men’s prayer team'], practice: 'Complete', status: 'Emerging leader', leadershipStage: 'Apprentice leader', serviceArea: 'Prayer', nextStep: 'Shadow a Men of Valor co-leader.', missedSessionIds: [], catchUpAssignedIds: [], commissioned: false, history: [{ semester: 'Fall 2026', group: 'Men of Valor', track: 'Transformation Track 1', outcome: 'Completed · Serving' }] },
      { id: 'james', name: 'James Smith', email: 'james@example.com', household: 'Smith household', householdNote: 'Leader household · hosts one group gathering each month.', attendance: '4/4', reflections: [], testimonies: [], prayerResponses: [], milestones: ['Leading Marriage & Family DEG'], practice: 'Complete', status: 'Emerging leader', leadershipStage: 'Group leader', serviceArea: 'Marriage & family', nextStep: 'Develop apprentice leader and prepare group multiplication plan.', missedSessionIds: [], catchUpAssignedIds: [], commissioned: false, history: [{ semester: 'Fall 2026', group: 'Marriage & Family DEG', track: 'Covenant Foundations', outcome: 'Leader' }] },
      { id: 'jordan', name: 'Jordan Davis', email: 'jordan@example.com', household: 'Davis household', householdNote: 'Spouse linked in People · childcare considerations may be shared across household calendar.', attendance: '4/4', reflections: ['Healthy community requires both truth and gentleness.'], testimonies: [], prayerResponses: [], milestones: ['Began co-leading formation discussion'], practice: 'Complete', status: 'Emerging leader', leadershipStage: 'Co-leader', serviceArea: 'Women & discipleship', nextStep: 'Lead two sessions and complete leader review.', missedSessionIds: [], catchUpAssignedIds: [], commissioned: false, history: [] },
      { id: 'marcus', name: 'Marcus Carter', email: 'marcus@example.com', household: 'Carter household', householdNote: 'Host household · home location verified.', attendance: '3/4', reflections: [], testimonies: [], prayerResponses: [], milestones: ['Opened home for group hospitality'], practice: 'Complete', status: 'On pace', leadershipStage: 'Serving', serviceArea: 'Hospitality', nextStep: 'Explore host-team leadership.', missedSessionIds: [], catchUpAssignedIds: [], commissioned: false, history: [] },
    ];
  }

  private seedTracks(): FormationTrack[] {
    return [
      {
        id: 'track-1', number: 1, title: 'Transformation Track 1', subtitle: 'Foundations of Life With Jesus', source: 'DWCIM',
        description: 'A first formation pathway for people establishing gospel, Scripture, prayer, community, obedience, service and witness rhythms.',
        prerequisites: ['DEG orientation or leader conversation'], suggestedNext: ['Transformation Track 2 · Identity, Calling & Kingdom Life'],
        outcomes: ['Gospel confidence', 'Scripture rhythm', 'Prayer rhythm', 'Community', 'Obedience', 'Service', 'Witness'],
        sessions: [
          this.session('t1-gospel', 1, 'The Gospel & New Life', 'Grace becomes the foundation.', 'Ephesians 2:1–10', 'We begin with what God has done, not what we can perform.', 'Name the difference between earning and receiving grace.', ['Where do you still try to earn what Jesus has already given?', 'What does grace make possible this week?'], 'Share the gospel in your own words with one trusted believer.', 'Thank Jesus for grace and new life.', 'Foundations Leader Guide · Gospel', 'Read Ephesians 2:1–10 and write a short gospel summary.'),
          this.session('t1-scripture', 2, 'Scripture as Formation', 'The Word renews how we see and live.', '2 Timothy 3:14–17', 'Scripture forms disciples who can recognize truth and obey it.', 'Practice reading for relationship, truth, correction and obedience.', ['What makes Scripture difficult to approach consistently?', 'What helps truth move from information into obedience?'], 'Read one Gospel chapter daily and write one response.', 'Ask for hunger and teachability.', 'Foundations Leader Guide · Scripture', 'Read the session passage and complete one SOAP-style reflection.'),
          this.session('t1-prayer', 3, 'Prayer & Presence', 'Relationship with God becomes a rhythm.', 'Matthew 6:5–13', 'Prayer is communion before it is performance.', 'Use the Lord’s Prayer as a relational pattern rather than a formula.', ['Where does prayer feel most natural or most difficult?', 'What would a sustainable prayer rhythm look like?'], 'Practice the Lord’s Prayer pattern three times this week.', 'Pray for desire and consistency.', 'Foundations Leader Guide · Prayer', 'Use the Lord’s Prayer once and record what stood out.'),
          this.session('t1-community', 4, 'Life in Community', 'Disciples are formed with people.', 'Acts 2:42–47', 'Belonging becomes formative when people practice presence and care.', 'Move from attendance to mutual responsibility and encouragement.', ['What helps you feel known?', 'What makes spiritual community difficult?'], 'Encourage and practically care for one person in the group.', 'Pray for trust and durable friendship.', 'Foundations Leader Guide · Community', 'Connect with one group member and review Acts 2:42–47.'),
          this.session('t1-obedience', 5, 'Hearing & Obeying', 'Truth becomes a lived response.', 'James 1:22–25', 'Maturity is measured by responsive obedience.', 'Keep discernment biblical, humble and accountable.', ['What has God already made clear?', 'Where is delayed obedience showing up?'], 'Take one clear biblical obedience step.', 'Pray for courage and quick obedience.', 'Foundations Leader Guide · Obedience', 'Name one biblical next step and act on it.'),
          this.session('t1-service', 6, 'Serve With Grace', 'Every believer contributes.', '1 Peter 4:10–11', 'Grace received becomes grace stewarded for others.', 'Connect gifts and availability to real needs.', ['Where do you naturally strengthen others?', 'What need could you help meet now?'], 'Serve once in a ministry, household or community need.', 'Ask for a servant heart.', 'Foundations Leader Guide · Service', 'Complete one act of service and reflect on what you learned.'),
          this.session('t1-witness', 7, 'Tell the Story', 'Disciples carry good news.', '2 Corinthians 5:17–20', 'Every believer can bear witness to Jesus with humility and courage.', 'Practice testimony and relational evangelism.', ['What part of your story points clearly to Jesus?', 'Who has God already placed near you?'], 'Write and share a three-minute testimony.', 'Pray for compassion and boldness.', 'Foundations Leader Guide · Witness', 'Write your testimony in three movements: before, Jesus, now.'),
          this.session('t1-next', 8, 'Keep Growing', 'Formation continues beyond a semester.', 'Philippians 1:3–6', 'Healthy discipleship ends with a next faithful step.', 'Review rhythms, relationships, service and next-track readiness.', ['What changed this semester?', 'What rhythm must continue?'], 'Create a 30-day formation plan.', 'Commission the group into continued growth.', 'Foundations Commissioning Guide', 'Review the semester and choose one rhythm to continue.'),
        ],
      },
      {
        id: 'track-2', number: 2, title: 'Transformation Track 2', subtitle: 'Identity, Calling & Kingdom Life', source: 'Kingdom Academy', academyProgram: 'Transformation Tracks · Kingdom Academy',
        description: 'Eight guided gatherings move the group from identity in Christ into calling, community, service and mission. Academy owns the formal lesson/media; DEG owns the relational formation around it.',
        prerequisites: ['Transformation Track 1 or leader approval'], suggestedNext: ['Transformation Track 3 · Covenant, Character & Relationships', 'Ministry service placement', 'Academy Facilitation Foundations for emerging leaders'],
        outcomes: ['Identity', 'Discernment', 'Calling', 'Community', 'Service', 'Mission', 'Multiplication'],
        sessions: [
          this.session('t2-created', 1, 'Created & Known', 'Identity begins with the God who formed us.', 'Psalm 139:13–18 · Genesis 1:26–27', 'Before calling, gifting or achievement, we receive the dignity of being created and known by God.', 'Explore identity as something received from God rather than assembled from performance, approval or circumstance.', ['Where do you most often look for identity besides God?', 'What changes when you believe God knows you completely and still draws near?'], 'Begin each morning by praying Psalm 139:23–24 and writing one truth God says about you.', 'Pray for freedom from false labels and confidence in the Father’s love.', 'Academy Lesson · Created & Known', 'Watch or review the Academy lesson, read Psalm 139 and write one truth you are receiving.', true),
          this.session('t2-christ', 2, 'Identity in Christ', 'We learn to live from union, not striving.', 'Ephesians 1:3–14 · Colossians 3:1–4', 'The gospel gives us a new center: who Christ is and what God has done in Him.', 'Name the difference between trying to earn spiritual identity and learning to live from what Christ has already secured.', ['Which truth in Ephesians 1 is hardest for you to receive personally?', 'How would living from belovedness change one area of your week?'], 'Choose one “in Christ” truth and speak it aloud in prayer every day.', 'Thank Jesus for adoption, redemption and belonging.', 'Academy Lesson · Identity in Christ', 'Review Ephesians 1 and the lesson summary, then write the truth you most need to receive.', true),
          this.session('t2-gifts', 3, 'Gifts, Grace & Calling', 'Grace equips every believer to contribute.', 'Romans 12:3–8 · 1 Peter 4:10–11', 'Calling is not a platform; it is faithful stewardship of grace for the good of others.', 'Help members notice spiritual gifts, natural strengths, burdens and recurring fruit without forcing premature labels.', ['Where have other people consistently seen grace on your life?', 'What need or burden repeatedly moves you toward action?'], 'Ask two mature believers where they see grace on your life and record what you hear.', 'Ask the Spirit for humility, clarity and courage to steward gifts as service.', 'Academy Worksheet · Gifts & Calling Reflection', 'Complete the gifts reflection and bring one observation to the next gathering.', true),
          this.session('t2-hear', 4, 'Hearing & Obeying God', 'Discipleship becomes concrete through responsive obedience.', 'John 10:27 · James 1:22–25 · Acts 13:1–3', 'We mature by learning to recognize God’s voice through Scripture and the Spirit, then responding faithfully.', 'Keep discernment anchored in Scripture, community and the character of God while creating room for testimony and practice.', ['How do you currently discern whether a prompting is from God?', 'What is one clear act of obedience already in front of you?'], 'Set aside 15 quiet minutes three times this week: read Scripture, listen, write, then obey the clearest biblical next step.', 'Pray for clean motives, sharpened discernment and grace to obey quickly.', 'Academy Video · Hearing & Obeying God', 'Review the session video/summary and complete one listen-write-obey practice.', true),
          this.session('t2-community', 5, 'Covenant Community', 'Formation happens with people, not around them.', 'Acts 2:42–47 · Hebrews 10:23–25', 'Jesus forms a people who practice presence, honesty, encouragement, generosity and mutual responsibility.', 'Move beyond attendance toward a biblical vision of people who know, strengthen and carry one another.', ['What makes it difficult for you to be truly known?', 'What would healthy spiritual responsibility look like in this group?'], 'Make one intentional encouragement or practical act of care for another group member this week.', 'Pray for trust, reconciliation, courage and durable spiritual friendship.', 'Academy Lesson · Covenant Community', 'Read Acts 2:42–47 and connect with one group member before the next meeting.', true),
          this.session('t2-service', 6, 'Serve With Purpose', 'Calling takes shape through faithful service.', 'Mark 10:42–45 · Ephesians 2:10', 'Kingdom leadership begins with serving what God loves, not building personal importance.', 'Connect gifts and burdens to tangible service inside the church, neighborhood and everyday vocation.', ['Where is there a real need your gifts could meet now?', 'What keeps service from becoming performance or burnout?'], 'Take one concrete service step before the next gathering and come ready to share what you learned.', 'Ask Jesus for His servant heart and wisdom about sustainable obedience.', 'Academy Resource · Service & Ministry Next-Step Map', 'Choose one service opportunity and prepare to discuss what you learned.', true),
          this.session('t2-mission', 7, 'Live Sent', 'Every disciple carries the Kingdom into ordinary places.', 'Matthew 28:18–20 · 2 Corinthians 5:17–20', 'Mission is not an occasional event; it is the posture of people sent by Jesus.', 'Help the group name the people and places God has already entrusted to them.', ['Who is already in your life that God may be inviting you to love intentionally?', 'What would good news look like in your workplace, school or neighborhood?'], 'Pray daily for one person and create one natural opportunity to listen, serve or share your story.', 'Pray for compassion, boldness and sensitivity to the Spirit.', 'Academy Lesson · Live Sent', 'Review the Live Sent lesson and identify one person or place God has entrusted to you.', true),
          this.session('t2-commission', 8, 'Commissioned for the Next Step', 'Formation should move into ongoing obedience.', 'Philippians 1:3–6 · 2 Timothy 2:1–2', 'A semester ends, but discipleship continues through clear next steps, relationships and multiplication.', 'Celebrate growth, name remaining formation needs, identify service and leadership steps, and make room for testimony and commissioning prayer.', ['Where have you seen God change you during this semester?', 'What is the next faithful step you do not want to lose after this group ends?'], 'Write a 90-day formation plan with one rhythm, one relationship and one Kingdom assignment.', 'Commission one another with thanksgiving, blessing and prayer for endurance.', 'Academy + DEG · 90-Day Formation & Commissioning Guide', 'Complete the 90-day formation plan and prepare one testimony to share.', true),
        ],
      },
      {
        id: 'track-3', number: 3, title: 'Transformation Track 3', subtitle: 'Covenant, Character & Relationships', source: 'DWCIM',
        description: 'A relational maturity pathway focused on covenant, communication, forgiveness, family systems, integrity, conflict and durable Kingdom relationships.',
        prerequisites: ['Transformation Track 2 or leader approval'], suggestedNext: ['Leadership apprenticeship', 'Marriage & Family intensives', 'Academy Leader Formation'],
        outcomes: ['Covenant', 'Communication', 'Forgiveness', 'Integrity', 'Healthy boundaries', 'Family health', 'Conflict repair'],
        sessions: [
          this.session('t3-covenant', 1, 'Covenant Before Convenience', 'Kingdom relationships carry commitment.', 'John 13:34–35', 'Love becomes durable when it moves beyond preference into covenant faithfulness.', 'Explore commitment, truth, patience and responsibility in Christian relationships.', ['Where does convenience shape your relationships?', 'What does covenant faithfulness require?'], 'Choose one relationship where consistent presence is needed.', 'Pray for faithful love.', 'Covenant Track Leader Guide', 'Read John 13 and identify one covenant practice.'),
          this.session('t3-communication', 2, 'Truth With Grace', 'Healthy people learn to speak and listen.', 'Ephesians 4:15, 25–32', 'Truth and grace are partners, not opposites.', 'Practice listening, clarity, emotional regulation and direct communication.', ['What makes hard conversations difficult?', 'Where do you default to avoidance or intensity?'], 'Have one needed conversation using truth, grace and curiosity.', 'Pray for humility and wisdom in speech.', 'Communication Practice Guide', 'Review Ephesians 4 and prepare one healthy sentence for a needed conversation.'),
          this.session('t3-forgiveness', 3, 'Forgiveness & Repair', 'Freedom requires truthful release and wise repair.', 'Colossians 3:12–15', 'Forgiveness releases vengeance while wisdom still names truth, safety and boundaries.', 'Distinguish forgiveness, reconciliation, trust and access.', ['What do people often confuse with forgiveness?', 'What might healthy repair require?'], 'Pray through one unresolved offense and identify a wise next step.', 'Pray for freedom from bitterness.', 'Forgiveness & Repair Guide', 'Review the forgiveness framework and identify one next step.'),
          this.session('t3-integrity', 4, 'Wholehearted Integrity', 'Character is who we are across contexts.', 'Psalm 15 · Titus 2:7–8', 'Integrity brings private and public life under the same Lordship.', 'Invite honest inventory without shame or performance.', ['Where are you tempted to compartmentalize?', 'What does integrity look like in ordinary decisions?'], 'Choose one area for accountable alignment this week.', 'Ask for clean hands and a pure heart.', 'Integrity Inventory', 'Complete a private integrity inventory and choose one accountable action.'),
          this.session('t3-boundaries', 5, 'Love & Boundaries', 'Healthy love is not limitless access.', 'Galatians 6:1–5', 'Biblical love carries burdens without erasing responsibility.', 'Explore responsibility, limits, generosity, consequences and wise access.', ['Where do you over-carry others?', 'Where do you avoid healthy responsibility?'], 'Practice one clear, gracious boundary.', 'Pray for courage and compassion.', 'Healthy Boundaries Guide', 'Identify one boundary or responsibility that needs clarity.'),
          this.session('t3-family', 6, 'Households & Formation', 'Discipleship touches the home.', 'Deuteronomy 6:4–9', 'Spiritual formation should become visible in household rhythms.', 'Help singles, couples and families identify contextual household practices without forcing one family model.', ['What rhythm would help your household remember God?', 'What household pressure needs grace and support?'], 'Choose one household formation rhythm for seven days.', 'Pray blessing over households represented.', 'Household Formation Guide', 'Choose and practice one household rhythm.'),
          this.session('t3-conflict', 7, 'Conflict That Matures Us', 'Repair can become formation.', 'Matthew 18:15–20', 'Healthy conflict can deepen truth, humility and trust.', 'Practice direct conversation, ownership, listening and repair.', ['What is your conflict pattern?', 'What would mature repair look like?'], 'Use the repair framework in one low-risk conflict.', 'Pray for peacemaking courage.', 'Conflict Repair Guide', 'Review the repair framework and identify your default conflict pattern.'),
          this.session('t3-commission', 8, 'Relationships That Multiply Health', 'Mature relationships create healthy culture.', '2 Timothy 2:2', 'What God forms in us should strengthen the people and environments around us.', 'Review growth and commission members into healthier households, ministry teams and leadership.', ['What relational pattern has changed?', 'Where can you now model health for others?'], 'Write one relational rule of life for the next 90 days.', 'Commission members into relational maturity.', 'Track 3 Commissioning Guide', 'Prepare a testimony and 90-day relational rule of life.'),
        ],
      },
    ];
  }

  private session(
    id: string,
    week: number,
    title: string,
    theme: string,
    scripture: string,
    bigIdea: string,
    teaching: string,
    discussion: string[],
    practice: string,
    prayer: string,
    leaderResource: string,
    catchUp: string,
    academyMedia = false,
  ): FormationSession {
    const media: FormationMedia[] = academyMedia
      ? [
          { type: 'video', title: `${title} · Academy lesson`, source: 'Kingdom Academy', duration: '8–14 min', url: 'http://localhost:5102/media/character-of-god-demo.mp4' },
          { type: 'guide', title: `${title} · Leader facilitation notes`, source: 'Kingdom Academy' },
        ]
      : [{ type: 'guide', title: leaderResource, source: 'DWCIM' }];
    return { id, week, title, theme, scripture, bigIdea, teaching, discussion, practice, prayer, leaderResource, catchUp, media };
  }
}
