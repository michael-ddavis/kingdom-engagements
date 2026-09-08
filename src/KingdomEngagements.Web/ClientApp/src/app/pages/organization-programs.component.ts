import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

type OrgKey = 'dwc' | 'hey-king';

interface Metric { label: string; value: string; note: string; }
interface Row { id: string; title: string; subtitle: string; status: string; meta: string; }
interface PersonRole { name: string; role: string; }
interface Assignment { role: string; person: string; }
interface GroupRow extends Row {
  cluster: string;
  leader: string;
  day: string;
  time: string;
  capacity: number;
  enrolled: number;
  location: string;
  childcare: boolean;
  roster: PersonRole[];
  assignments: Assignment[];
}
interface PlacementRow extends Row { suggestedGroup: string; }
interface RecipientRow extends Row { referral: string; mentor?: string; }
interface ConnectionCard { title: string; heading: string; detail: string; boundary: string; }
interface Milestone { id: string; date: string; text: string; }
interface AttendancePerson { name: string; present: boolean; note: string; }
interface Measurements { jacket: string; shirt: string; waist: string; inseam: string; shoe: string; updated: string; }
interface DrawerState { kind: string; eyebrow: string; title: string; description: string; saveLabel?: string; }
interface ToastState { title: string; detail: string; }
interface DemoForm {
  groupName?: string; cluster?: string; leader?: string; day?: string; time?: string; capacity?: number; location?: string; childcare?: boolean;
  person?: string; role?: string; note?: string; topic?: string; facilitator?: string; notes?: string; guest?: boolean; closeDate?: string;
  keepGroups?: boolean; keepLeaders?: boolean; reinvite?: boolean; resetCapacity?: boolean;
  referral?: string; need?: string; eventDate?: string; appointmentType?: string; date?: string; assigned?: string;
  jacket?: string; shirt?: string; waist?: string; inseam?: string; shoe?: string; item?: string; size?: string; color?: string;
  quantity?: number; partner?: string; condition?: string; status?: string; partnerType?: string; contact?: string; contactInfo?: string;
  mentor?: string; cadence?: string; focus?: string; goal?: string; duration?: string; topics?: string; nextDate?: string; followup?: string;
  category?: string; milestone?: string;
}

@Component({
  selector: 'app-organization-programs',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './organization-programs.component.html',
  styleUrl: './organization-programs.component.scss',
})
export class OrganizationProgramsComponent {
  private readonly dwcStorageKey = 'apostolos.engagements.demo.dwc.v2';
  private readonly heyStorageKey = 'apostolos.engagements.demo.heyyking.v2';

  readonly org = signal<OrgKey>('dwc');
  readonly active = signal('overview');
  readonly drawer = signal<DrawerState | null>(null);
  readonly toast = signal<ToastState | null>(null);
  readonly selectedGroup = signal<GroupRow | null>(null);
  readonly selectedPlacement = signal<PlacementRow | null>(null);
  readonly selectedRecipient = signal<RecipientRow | null>(null);
  readonly selectedRow = signal<Row | null>(null);
  readonly selectedConnection = signal<ConnectionCard | null>(null);
  readonly selectedMilestone = signal<Milestone | null>(null);
  form: DemoForm = {};

  readonly dwcTabs = [
    { key: 'overview', label: 'Overview' }, { key: 'groups', label: 'Groups' }, { key: 'clusters', label: 'Clusters' },
    { key: 'placements', label: 'Placements' }, { key: 'people', label: 'People & Roles' }, { key: 'meetings', label: 'Meetings' },
    { key: 'semesters', label: 'Semesters' }, { key: 'connections', label: 'Connections' },
  ];
  readonly heyTabs = [
    { key: 'overview', label: 'Overview' }, { key: 'journey', label: 'Recipient Journey' }, { key: 'appointments', label: 'Appointments' },
    { key: 'wardrobe', label: 'Outfits & Measurements' }, { key: 'inventory', label: 'Inventory' }, { key: 'partners', label: 'Partners & Referrals' },
    { key: 'mentorship', label: 'Mentorship' }, { key: 'cohorts', label: 'Cohorts & Milestones' }, { key: 'connections', label: 'Connections' },
  ];

  readonly dwcAttention: Row[] = [
    { id: 'dwc-attn-1', title: 'Marriage & Family DEG', subtitle: 'East Cluster · James Smith', status: 'Full', meta: '14/14 · waitlist 3' },
    { id: 'dwc-attn-2', title: 'Young Adults DEG', subtitle: 'Central Cluster · Alicia Brown', status: 'Open', meta: '11/15 · 4 seats' },
    { id: 'dwc-attn-3', title: 'Men of Valor', subtitle: 'South Cluster · Marcus Hill', status: 'Follow-up', meta: '2 absences need care check' },
  ];
  readonly clusters: Row[] = [
    { id: 'central', title: 'Central Cluster', subtitle: 'Alicia Brown · Cluster Leader', status: '5 groups', meta: '61 people · 9 open seats' },
    { id: 'east', title: 'East Cluster', subtitle: 'James Smith · Cluster Leader', status: '4 groups', meta: '52 people · 4 open seats' },
    { id: 'south', title: 'South Cluster', subtitle: 'Marcus Hill · Cluster Leader', status: '5 groups', meta: '58 people · 8 open seats' },
  ];
  readonly dwcConnections: ConnectionCard[] = [
    { title: 'People', heading: 'One person record', detail: 'Roster membership, households, skills and contact data come from ApostolOS People.', boundary: 'Engagements owns the group relationship; People owns the person and household record.' },
    { title: 'Care', heading: 'Safe pastoral handoff', detail: 'Group leaders can flag follow-up without exposing sensitive care records.', boundary: 'A leader can request follow-up and see status, but sensitive pastoral notes remain permission-scoped in Care.' },
    { title: 'Academy', heading: 'Leader readiness', detail: 'Orientation, Transformation Tracks, facilitation and safeguarding requirements.', boundary: 'Academy remains the system of record for training; DEG leadership only sees readiness and missing requirements.' },
    { title: 'Platform Calendar', heading: 'Shared ministry rhythm', detail: 'Meetings, orientations and leader events publish into the organization calendar.', boundary: 'Calendar entries are organization-scoped and must never leak between DWC, CTG or Heyy King.' },
  ];

  readonly groups = signal<GroupRow[]>([
    { id: 'young-adults', title: 'Young Adults DEG', subtitle: 'Central · Alicia Brown · Wed 6:30 PM', status: 'Open', meta: '11/15 · Richmond West · childcare no', cluster: 'Central', leader: 'Alicia Brown', day: 'Wednesday', time: '6:30 PM', capacity: 15, enrolled: 11, location: 'Richmond West', childcare: false, roster: [{ name: 'Alicia Brown', role: 'Group Leader' }, { name: 'Michael Davis', role: 'Member' }, { name: 'Sarah Jones', role: 'Member' }], assignments: [{ role: 'Facilitator', person: 'Alicia Brown' }, { role: 'Prayer Lead', person: 'Michael Davis' }] },
    { id: 'marriage-family', title: 'Marriage & Family DEG', subtitle: 'East · James Smith · Mon 6:30 PM', status: 'Full', meta: '14/14 · waitlist 3 · childcare yes', cluster: 'East', leader: 'James Smith', day: 'Monday', time: '6:30 PM', capacity: 14, enrolled: 14, location: 'Richmond East', childcare: true, roster: [{ name: 'James Smith', role: 'Group Leader' }, { name: 'Jordan Hill', role: 'Co-Leader' }, { name: 'Marcus Carter', role: 'Host' }, { name: 'Ashley Martin', role: 'Member' }], assignments: [{ role: 'Facilitator', person: 'James Smith' }, { role: 'Hospitality', person: 'Jordan Hill' }, { role: 'Childcare Coordinator', person: 'Marcus Carter' }] },
    { id: 'men-of-valor', title: 'Men of Valor', subtitle: 'South · Marcus Hill · Wed 6:30 PM', status: 'Open', meta: '9/12 · Richmond South', cluster: 'South', leader: 'Marcus Hill', day: 'Wednesday', time: '6:30 PM', capacity: 12, enrolled: 9, location: 'Richmond South', childcare: false, roster: [{ name: 'Marcus Hill', role: 'Group Leader' }, { name: 'Andre Lewis', role: 'Member' }], assignments: [{ role: 'Facilitator', person: 'Marcus Hill' }] },
    { id: 'women-purpose', title: 'Women of Purpose', subtitle: 'Central · Jordan Davis · Tue 7:00 PM', status: 'Nearly full', meta: '13/15 · virtual option', cluster: 'Central', leader: 'Jordan Davis', day: 'Tuesday', time: '7:00 PM', capacity: 15, enrolled: 13, location: 'Hybrid · Richmond Central', childcare: false, roster: [{ name: 'Jordan Davis', role: 'Group Leader' }, { name: 'Alicia Brown', role: 'Apprentice Leader' }], assignments: [{ role: 'Facilitator', person: 'Jordan Davis' }] },
  ]);
  readonly placements = signal<PlacementRow[]>([
    { id: 'pl-michael', title: 'Michael Davis', subtitle: 'Young Adults · Wednesday preferred · Richmond West', status: 'Suggested', meta: 'Young Adults DEG', suggestedGroup: 'Young Adults DEG' },
    { id: 'pl-sarah', title: 'Sarah Jones', subtitle: 'Marriage & Family · Monday preferred', status: 'Waitlist', meta: 'Marriage & Family East', suggestedGroup: 'Marriage & Family DEG' },
    { id: 'pl-andre', title: 'Andre Lewis', subtitle: 'Men · Wednesday · Richmond South', status: 'Suggested', meta: 'Men of Valor', suggestedGroup: 'Men of Valor' },
  ]);
  readonly groupPeople = signal<Row[]>([
    { id: 'gp-james', title: 'James Smith', subtitle: 'Group Leader', status: 'Leader', meta: 'Academy requirements complete' },
    { id: 'gp-jordan', title: 'Jordan Hill', subtitle: 'Co-Leader', status: 'Leadership', meta: '13 meetings attended' },
    { id: 'gp-marcus', title: 'Marcus Carter', subtitle: 'Host', status: 'Host', meta: 'Home location verified' },
    { id: 'gp-ashley', title: 'Ashley Martin', subtitle: 'Member', status: 'Active', meta: 'Joined Jan 2027' },
  ]);
  readonly meetingAssignments = signal<Row[]>([
    { id: 'ma-facilitator', title: 'Facilitator', subtitle: 'Marcus Hill', status: 'Assigned', meta: '' },
    { id: 'ma-prayer', title: 'Opening prayer', subtitle: 'Michael Davis', status: 'Assigned', meta: '' },
    { id: 'ma-hospitality', title: 'Hospitality', subtitle: 'Alicia Brown', status: 'Assigned', meta: '' },
    { id: 'ma-refreshments', title: 'Refreshments', subtitle: 'Carter Family', status: 'Assigned', meta: '' },
    { id: 'ma-childcare', title: 'Childcare', subtitle: 'Unassigned', status: 'Needs owner', meta: '' },
  ]);
  readonly attendanceSummary = signal('11 of 13 present');
  readonly summerRolloverPrepared = signal(false);
  readonly attendancePeople: AttendancePerson[] = [
    { name: 'Marcus Hill', present: true, note: 'Leader' }, { name: 'Jordan Hill', present: true, note: 'Co-Leader' },
    { name: 'James Carter', present: true, note: 'Member' }, { name: 'Ashley Martin', present: false, note: 'Member' },
    { name: 'Alicia Brown', present: true, note: 'Member' }, { name: 'Derrick Lewis', present: true, note: 'Member' },
  ];
  readonly waitingPlacementCount = computed(() => this.placements().filter(item => item.status !== 'Approved').length + 5);
  readonly dwcMetrics = computed<Metric[]>(() => [
    { label: 'Groups', value: '18', note: 'Spring 2027' }, { label: 'Enrolled', value: '214', note: 'across all clusters' },
    { label: 'Open seats', value: '27', note: '8 groups accepting' }, { label: 'Waiting placement', value: String(this.waitingPlacementCount()), note: 'need coordinator review' },
  ]);

  readonly heyAttention: Row[] = [
    { id: 'hey-attn-marcus', title: 'Marcus Johnson', subtitle: 'Alteration returned · outfit ready', status: 'Pickup', meta: 'schedule by Friday' },
    { id: 'hey-attn-andre', title: 'Andre Lewis', subtitle: 'Approved · no appointment yet', status: 'Needs scheduling', meta: 'interview Sep 18' },
    { id: 'hey-attn-james', title: 'James Carter', subtitle: 'Mentorship goal overdue', status: 'Follow-up', meta: 'Pastor Hickman' },
  ];
  readonly heyConnections: ConnectionCard[] = [
    { title: 'People', heading: 'One young man, one record', detail: 'Recipient, volunteer, mentee and future leader identities remain connected.', boundary: 'Heyy King relationships and journeys reference People; they do not create duplicate person identities.' },
    { title: 'Operations', heading: 'Suit fulfillment', detail: 'Appointments, measurements, inventory, outfits, alterations and pickup.', boundary: 'Engagements owns the relationship journey while Operations owns physical fulfillment work.' },
    { title: 'Care', heading: 'Privacy boundary', detail: 'Sensitive pastoral issues leave general mentorship notes and move into permission-scoped Care.', boundary: 'Mentorship notes are intentionally different from sensitive pastoral-care documentation.' },
    { title: 'Impact', heading: 'Beyond distribution', detail: 'Employment, leadership, service, mentorship and long-term milestones.', boundary: 'Impact receives outcomes and aggregate measures without becoming the system of record for recipient details.' },
  ];
  readonly journey = signal([
    { label: 'New', value: '12' }, { label: 'Review', value: '8' }, { label: 'Approved', value: '6' }, { label: 'Scheduled', value: '6' },
    { label: 'Fitting', value: '4' }, { label: 'Ready', value: '7' }, { label: 'Mentorship', value: '24' },
  ]);
  readonly recipients = signal<RecipientRow[]>([
    { id: 'rcp-marcus', title: 'Marcus Johnson', subtitle: 'Job interview attire · referred by Workforce Center', status: 'Ready for pickup', meta: 'Navy suit · mentorship active', referral: 'ABC Workforce Center', mentor: 'Pastor Hickman' },
    { id: 'rcp-andre', title: 'Andre Lewis', subtitle: 'Interview Sep 18 · transportation requested', status: 'Approved', meta: 'Needs appointment', referral: 'Community referral' },
    { id: 'rcp-james', title: 'James Carter', subtitle: 'Career transition · returning recipient', status: 'Fitting', meta: 'Charcoal suit reserved', referral: 'Heyy King alumni', mentor: 'Pastor Hickman' },
  ]);
  readonly appointments = signal<Row[]>([
    { id: 'appt-james', title: '10:00 AM · James Carter', subtitle: 'First fitting', status: 'Confirmed', meta: 'Stylist: Alicia' },
    { id: 'appt-andre', title: '11:30 AM · Andre Lewis', subtitle: 'Measurements', status: 'Confirmed', meta: 'Intake: Marcus' },
    { id: 'appt-michael', title: '1:00 PM · Michael Brown', subtitle: 'Pickup', status: 'Ready', meta: 'Outfit complete' },
    { id: 'appt-marcus', title: '2:30 PM · Marcus Johnson', subtitle: 'Alteration fitting', status: 'Confirmed', meta: 'Tailor returned' },
  ]);
  readonly outfit = signal<Row[]>([
    { id: 'out-suit', title: 'Navy Suit', subtitle: '44R · excellent', status: 'Ready', meta: '' },
    { id: 'out-shirt', title: 'White Shirt', subtitle: '17 / 34 · new', status: 'Ready', meta: '' },
    { id: 'out-tie', title: 'Blue Tie', subtitle: 'silk', status: 'Ready', meta: '' },
    { id: 'out-belt', title: 'Black Belt', subtitle: '36–40', status: 'Ready', meta: '' },
    { id: 'out-shoes', title: 'Black Shoes', subtitle: '11 · good', status: 'Ready', meta: '' },
  ]);
  readonly measurements = signal<Measurements>({ jacket: '44R', shirt: '17 / 34', waist: '36', inseam: '32', shoe: '11', updated: 'Sep 14, 2026' });
  readonly inventory = signal<Row[]>([
    { id: 'inv-44r', title: 'Suit · 44R', subtitle: 'Navy · excellent condition', status: 'Available', meta: '3 in stock' },
    { id: 'inv-42l', title: 'Suit · 42L', subtitle: 'Charcoal · good condition', status: 'Assigned', meta: 'James Carter' },
    { id: 'inv-shirt', title: 'Dress Shirt · 17/34', subtitle: 'White · new', status: 'Available', meta: '8 in stock' },
    { id: 'inv-shoe', title: 'Dress Shoes · 11', subtitle: 'Black · good', status: 'Low', meta: '1 available' },
  ]);
  readonly partners = signal<Row[]>([
    { id: 'partner-tailor', title: 'Smith Tailoring', subtitle: 'Alteration Partner', status: '3 open', meta: '17 completed · 4 day avg' },
    { id: 'partner-workforce', title: 'ABC Workforce Center', subtitle: 'Referral Partner', status: '23 referrals', meta: '18 services completed' },
    { id: 'partner-donor', title: 'Men’s Wear Partner', subtitle: 'Clothing Donor', status: 'Active', meta: '82 items donated YTD' },
  ]);
  readonly mentees = signal<Row[]>([
    { id: 'mentee-marcus', title: 'Marcus Johnson', subtitle: 'Employment · spiritual growth · leadership', status: 'On track', meta: 'Next Sep 11' },
    { id: 'mentee-james', title: 'James Carter', subtitle: 'Character · family · work', status: 'Follow-up', meta: 'Last Aug 25' },
    { id: 'mentee-andre', title: 'Andre Lewis', subtitle: 'Employment · life skills', status: 'On track', meta: 'Next Sep 13' },
  ]);
  readonly goals = signal<Row[]>([
    { id: 'goal-resume', title: 'Complete résumé', subtitle: 'Employment', status: 'Complete', meta: '' },
    { id: 'goal-apps', title: 'Submit 5 applications', subtitle: 'Employment', status: 'In progress', meta: '' },
    { id: 'goal-prayer', title: 'Establish prayer rhythm', subtitle: 'Spiritual development', status: 'Complete', meta: '' },
    { id: 'goal-budget', title: 'Develop monthly budget', subtitle: 'Life development', status: 'Next', meta: '' },
    { id: 'goal-serve', title: 'Serve at one Heyy King event', subtitle: 'Leadership', status: 'Planned', meta: '' },
  ]);
  readonly milestones = signal<Milestone[]>([
    { id: 'ms-1', date: 'Sep 3', text: 'First suit fitting completed' }, { id: 'ms-2', date: 'Sep 18', text: 'Résumé completed' },
    { id: 'ms-3', date: 'Oct 2', text: 'First job interview' }, { id: 'ms-4', date: 'Oct 17', text: 'Accepted new position' },
    { id: 'ms-5', date: 'Nov 5', text: 'Began serving at Heyy King' },
  ]);
  readonly meetingsThisWeek = signal(3);
  readonly outfitReadyCount = computed(() => this.outfit().filter(item => item.status === 'Ready').length);
  readonly heyMetrics = computed<Metric[]>(() => [
    { label: 'New applications', value: this.journey()[0]?.value ?? '12', note: '4 need review today' }, { label: 'Appointments', value: String(this.appointments().length + 2), note: 'this week' },
    { label: 'Ready for pickup', value: '7', note: 'outfits complete' }, { label: 'Mentorship', value: String(this.mentees().length + 21), note: 'active matches' },
  ]);

  constructor(route: ActivatedRoute) {
    this.loadPersistedState();
    route.paramMap.subscribe(params => {
      const org: OrgKey = params.get('org') === 'hey-king' ? 'hey-king' : 'dwc';
      this.org.set(org);
      this.active.set('overview');
      this.closeDrawer();
    });
  }

  openCreateGroup(): void {
    this.form = { cluster: 'Central', day: 'Wednesday', time: '6:30 PM', capacity: 12, childcare: false, location: 'Richmond' };
    this.showDrawer('dwc-create-group', 'Group setup', 'Create an Empowerment Group', 'Create the group, assign a cluster and leader, then track roster, capacity and assignments.', 'Create group');
  }

  openGroup(group: GroupRow): void {
    this.selectedGroup.set(group);
    this.showDrawer('dwc-group', `${group.cluster} Cluster`, group.title, 'See availability, leadership, roster and recurring responsibilities in one place.');
  }

  openCluster(row: Row): void { this.selectedRow.set(row); this.showDrawer('dwc-cluster', 'Cluster leadership', row.title, 'Cluster leaders can see the health of the groups they oversee without receiving organization-wide authority.'); }
  openPlacement(row: PlacementRow): void { this.selectedPlacement.set(row); this.showDrawer('dwc-placement', 'Placement review', row.title, 'Make a placement decision from preferences, group capacity and leader readiness.'); }
  openPlacementRules(): void { this.showDrawer('dwc-rules', 'Placement', 'Placement rules', 'A consistent decision framework keeps placement pastoral, practical and visible.'); }
  openLeadershipRhythm(): void { this.showDrawer('dwc-leadership', 'Leadership', 'This week', 'A shared rhythm helps cluster leaders and DEG leaders know what is expected.'); }
  openAttention(row: Row): void { const group = this.groups().find(item => item.title === row.title); if (group) this.openGroup(group); else this.active.set('groups'); }

  openManageAssignments(): void {
    this.form = { role: 'Apprentice Leader', note: 'Spring 2027' };
    this.showDrawer('dwc-assignments', 'Marriage & Family DEG', 'Manage group roles', 'Assign leadership and recurring group responsibilities without changing organization-level permissions.', 'Add assignment');
  }
  openPersonRole(row: Row): void { this.selectedRow.set(row); this.showDrawer('dwc-person-role', 'People & roles', row.title, 'Review this person’s group role and the permission boundary around it.'); }
  openMeetingPlan(): void { this.form = { topic: 'Transformation Track discussion', facilitator: 'James Smith' }; this.showDrawer('dwc-meeting-plan', 'Meeting plan', 'Plan Wednesday’s group', 'Capture the focus and leadership plan without turning the meeting into a heavy event-management workflow.', 'Save plan'); }
  openMeetingAssignment(row: Row): void { this.selectedRow.set(row); this.form = { person: row.subtitle === 'Unassigned' ? '' : row.subtitle }; this.showDrawer('dwc-meeting-assignment', 'Meeting assignment', row.title, 'Change the owner for this meeting responsibility.', 'Save assignment'); }
  openAttendance(): void { this.form = { guest: true }; this.showDrawer('dwc-attendance', 'Meeting attendance', 'Take attendance', 'Fast attendance keeps the group record useful and can surface follow-up without exposing private Care notes.', 'Save attendance'); }
  openSemester(mode: 'current' | 'rollover' | 'history'): void {
    if (mode === 'current') { this.form = { closeDate: '2027-05-15' }; this.showDrawer('dwc-semester-current', 'Semester', 'Spring 2027', 'Manage the current semester and its enrollment window.', 'Save semester'); }
    if (mode === 'rollover') { this.form = { keepGroups: true, keepLeaders: true, reinvite: true, resetCapacity: true }; this.showDrawer('dwc-semester-rollover', 'Semester rollover', 'Prepare Summer 2027', 'Carry forward structure without overwriting Spring history.', 'Prepare rollover'); }
    if (mode === 'history') this.showDrawer('dwc-semester-history', 'Historical report', 'Fall 2026', 'Review participation, leadership multiplication and semester closeout.');
  }

  openConnection(card: ConnectionCard): void { this.selectedConnection.set(card); this.showDrawer('connection', `${this.org() === 'dwc' ? 'DWC' : 'Heyy King'} connection`, card.heading, 'See what this module contributes and what remains owned elsewhere.'); }

  openHeyAttention(row: Row): void {
    const recipient = this.recipients().find(item => item.title === row.title);
    if (recipient) { this.openRecipient(recipient); return; }
    const mentee = this.mentees().find(item => item.title === row.title);
    if (mentee) this.openMentee(mentee);
  }
  openImpactSnapshot(): void { this.showDrawer('hey-impact', 'Impact', '2027 impact story', 'Connect service delivery to employment, mentorship, service and leadership outcomes.'); }
  openNewApplication(): void { this.form = { need: 'Job interview attire', referral: 'Community referral' }; this.showDrawer('hey-new-application', 'Recipient intake', 'New Heyy King application', 'Capture enough information to begin the journey without duplicating the person record.', 'Create application'); }
  openRecipient(row: RecipientRow): void { this.selectedRecipient.set(row); this.showDrawer('hey-recipient', 'Recipient journey', row.title, 'Move from service request to fulfillment, mentorship and longer-term relationship.'); }
  openSchedule(person?: string): void { this.form = { person: person ?? '', appointmentType: 'Measurements', date: '2026-09-14', time: '10:00', assigned: 'Alicia', location: 'Heyy King' }; this.showDrawer('hey-schedule', 'Suit Operations', 'Schedule appointment', 'Schedule intake, measurements, fitting, pickup or mentorship while keeping the journey connected.', 'Schedule'); }
  openAppointment(row: Row): void { this.selectedRow.set(row); this.showDrawer('hey-appointment', 'Appointment', row.title, 'Review what this appointment is for and move it forward without losing context.'); }
  openOutfit(): void { this.showDrawer('hey-outfit', 'Wardrobe', 'Manage Marcus’ outfit', 'Track the full outfit as one fulfillment package while each item keeps its own status.', 'Save outfit'); }
  openOutfitItem(row: Row): void { this.selectedRow.set(row); this.form = { status: row.status }; this.showDrawer('hey-outfit-item', 'Outfit item', row.title, 'Change this item’s fulfillment status.', 'Save item'); }
  openMeasurements(): void { const current = this.measurements(); this.form = { jacket: current.jacket, shirt: current.shirt, waist: current.waist, inseam: current.inseam, shoe: current.shoe }; this.showDrawer('hey-measurements', 'Fit profile', 'Update measurements', 'Keep the current fit profile while preserving the idea of measurement history.', 'Save measurements'); }
  openDonation(): void { this.form = { item: 'Suit', color: 'Navy', quantity: 1, condition: 'Excellent' }; this.showDrawer('hey-donation', 'Inventory intake', 'Record clothing donation', 'Turn a donor handoff into inventory that can immediately support recipient needs.', 'Record donation'); }
  openInventoryItem(row: Row): void { this.selectedRow.set(row); this.form = { status: row.status === 'Low' ? 'Available' : row.status }; this.showDrawer('hey-inventory-item', 'Inventory', row.title, 'Change availability without losing the inventory story.', 'Save status'); }
  openNeedsForecast(): void { this.showDrawer('hey-needs', 'Inventory intelligence', 'Needs forecast', 'Use current recipient demand and inventory gaps to guide donation asks.'); }
  openAddPartner(): void { this.form = { partnerType: 'Referral Partner' }; this.showDrawer('hey-add-partner', 'Partner network', 'Add partner', 'Track tailors, donors, workforce agencies, employers, churches and other referral relationships.', 'Add partner'); }
  openPartner(row: Row): void { this.selectedRow.set(row); this.showDrawer('hey-partner', 'Partner relationship', row.title, 'See the relationship and handoff workload without exposing private recipient information.'); }
  openPartnerPortal(): void { this.form = { need: 'Interview attire' }; this.showDrawer('hey-partner-portal', 'External partner experience', 'Referral portal', 'Preview the limited information a trusted referral partner can submit and see.', 'Submit referral'); }
  openNewMatch(): void { this.form = { mentor: 'Pastor Hickman', cadence: 'Every other week', focus: 'Employment' }; this.showDrawer('hey-new-match', 'Mentorship', 'Create mentorship match', 'Create a real relationship record with cadence, focus and a starting goal.', 'Create match'); }
  openMentee(row: Row): void { this.selectedRow.set(row); this.showDrawer('hey-mentee', 'Mentorship', row.title, 'Review mentorship progress without exposing private Care information.'); }
  openMentorshipMeeting(person = 'Marcus Johnson'): void { this.form = { person, duration: '45 minutes', topics: 'Employment, prayer, family', nextDate: '2026-09-25', followup: 'Check in after interview' }; this.showDrawer('hey-meeting', 'Mentorship meeting', person, 'Record the conversation, follow-up and next meeting while keeping sensitive pastoral details out of general activity.', 'Record meeting'); }
  openAddGoal(): void { this.form = { category: 'Leadership', date: '2026-10-30' }; this.showDrawer('hey-add-goal', 'Mentorship goals', 'Add goal for Marcus', 'Goals make mentorship progress visible without reducing the relationship to notes.', 'Add goal'); }
  openCohort(): void { this.showDrawer('hey-cohort', 'Mentorship cohort', 'Heyy King Brotherhood Cohort', 'One-to-many formation can live alongside personal mentorship relationships.'); }
  openAddMilestone(): void { this.form = { date: '2026-11-20' }; this.showDrawer('hey-add-milestone', 'Impact milestone', 'Add milestone', 'Record a meaningful step in a young man’s journey.', 'Add milestone'); }
  openMilestone(milestone: Milestone): void { this.selectedMilestone.set(milestone); this.showDrawer('hey-milestone', 'Journey milestone', milestone.text, 'See how service, mentorship and outcomes connect over time.'); }

  updatePlacement(status: string): void {
    const selected = this.selectedPlacement();
    if (!selected) return;
    this.placements.set(this.placements().map(item => item.id === selected.id ? { ...item, status, meta: status === 'Approved' ? `${item.suggestedGroup} · leader notified` : item.meta } : item));
    if (status === 'Approved') {
      const group = this.groups().find(item => item.title === selected.suggestedGroup);
      if (group && !group.roster.some(person => person.name === selected.title)) {
        group.roster.push({ name: selected.title, role: 'Member' });
        group.enrolled = Math.min(group.capacity, group.enrolled + 1);
        group.meta = `${group.enrolled}/${group.capacity} · ${group.location}`;
        group.status = group.enrolled >= group.capacity ? 'Full' : group.enrolled >= group.capacity - 2 ? 'Nearly full' : 'Open';
        this.groups.set([...this.groups()]);
      }
    }
    this.persistDwc();
    this.closeDrawer();
    this.notify('Placement updated', `${selected.title} is now ${status.toLowerCase()}.`);
  }

  advanceRecipient(): void {
    const selected = this.selectedRecipient();
    if (!selected) return;
    const stages = ['New', 'Under Review', 'Approved', 'Scheduled', 'Fitting', 'Ready for pickup', 'Fulfilled', 'Mentorship active'];
    const current = Math.max(0, stages.findIndex(stage => stage.toLowerCase() === selected.status.toLowerCase()));
    const next = stages[Math.min(stages.length - 1, current + 1)];
    this.recipients.set(this.recipients().map(item => item.id === selected.id ? { ...item, status: next, meta: `Journey advanced · ${next}` } : item));
    this.persistHey();
    this.closeDrawer();
    this.notify('Journey advanced', `${selected.title} moved to ${next}.`);
  }

  scheduleSelectedRecipient(): void { const selected = this.selectedRecipient(); if (!selected) return; const name = selected.title; this.closeDrawer(); this.openSchedule(name); }
  matchSelectedRecipient(): void {
    const selected = this.selectedRecipient(); if (!selected) return;
    if (!this.mentees().some(item => item.title === selected.title)) this.mentees.set([...this.mentees(), { id: this.id('mentee'), title: selected.title, subtitle: 'Employment · spiritual growth · life skills', status: 'New match', meta: 'Pastor Hickman' }]);
    this.recipients.set(this.recipients().map(item => item.id === selected.id ? { ...item, mentor: 'Pastor Hickman', meta: 'Mentorship active · Pastor Hickman' } : item));
    this.persistHey(); this.closeDrawer(); this.notify('Mentorship started', `${selected.title} is now matched with Pastor Hickman.`);
  }

  toggleGoal(row: Row): void {
    const status = row.status === 'Complete' ? 'In progress' : 'Complete';
    this.goals.set(this.goals().map(item => item.id === row.id ? { ...item, status } : item)); this.persistHey(); this.notify('Goal updated', `${row.title}: ${status}.`);
  }
  toggleOutfitItem(row: Row): void { this.outfit.set(this.outfit().map(item => item.id === row.id ? { ...item, status: item.status === 'Ready' ? 'Missing' : 'Ready' } : item)); this.persistHey(); }

  saveDrawer(): void {
    const kind = this.drawer()?.kind;
    if (!kind) return;
    switch (kind) {
      case 'dwc-create-group': {
        const title = this.form.groupName?.trim();
        if (!title) return this.notify('Group name required', 'Enter a name before creating the group.');
        const capacity = Number(this.form.capacity ?? 12);
        const cluster = this.form.cluster ?? 'Central';
        const leader = this.form.leader?.trim() || 'Leader to assign';
        const day = this.form.day ?? 'Wednesday';
        const time = this.form.time ?? '6:30 PM';
        const location = this.form.location?.trim() || 'Richmond';
        this.groups.set([...this.groups(), { id: this.id('group'), title, subtitle: `${cluster} · ${leader} · ${day} ${time}`, status: 'Open', meta: `0/${capacity} · ${location}`, cluster, leader, day, time, capacity, enrolled: 0, location, childcare: !!this.form.childcare, roster: [{ name: leader, role: 'Group Leader' }], assignments: [{ role: 'Facilitator', person: leader }] }]);
        this.persistDwc(); this.closeDrawer(); this.notify('Group created', `${title} is ready for roster and placement work.`); break;
      }
      case 'dwc-assignments': {
        const person = this.form.person?.trim(); if (!person) return this.notify('Person required', 'Choose or enter the person receiving this role.');
        this.groupPeople.set([...this.groupPeople(), { id: this.id('role'), title: person, subtitle: this.form.role ?? 'Group assignment', status: 'Assigned', meta: this.form.note || 'Spring 2027' }]);
        this.persistDwc(); this.closeDrawer(); this.notify('Assignment added', `${person} was assigned as ${this.form.role}.`); break;
      }
      case 'dwc-meeting-plan': this.closeDrawer(); this.notify('Meeting plan saved', `${this.form.topic || 'Meeting focus'} is now on the Wednesday plan.`); break;
      case 'dwc-meeting-assignment': {
        const row = this.selectedRow(); const person = this.form.person?.trim(); if (!row || !person) return;
        this.meetingAssignments.set(this.meetingAssignments().map(item => item.id === row.id ? { ...item, subtitle: person, status: 'Assigned' } : item));
        this.persistDwc(); this.closeDrawer(); this.notify('Assignment saved', `${row.title} is assigned to ${person}.`); break;
      }
      case 'dwc-attendance': {
        const present = this.attendancePeople.filter(person => person.present).length + (this.form.guest ? 1 : 0);
        this.attendanceSummary.set(`${present} of ${this.attendancePeople.length + 1} present`); this.persistDwc(); this.closeDrawer(); this.notify('Attendance saved', `${present} attendees recorded; follow-up can now be surfaced where appropriate.`); break;
      }
      case 'dwc-semester-current': this.closeDrawer(); this.notify('Semester updated', `Spring enrollment closes ${this.form.closeDate || 'on the configured date'}.`); break;
      case 'dwc-semester-rollover': this.summerRolloverPrepared.set(true); this.persistDwc(); this.closeDrawer(); this.notify('Rollover prepared', 'Summer 2027 now has groups, leader teams, re-enrollment invitations and capacity confirmation queued.'); break;
      case 'hey-new-application': {
        const person = this.form.person?.trim(); if (!person) return this.notify('Name required', 'Enter the young man’s name before creating the application.');
        this.recipients.set([{ id: this.id('recipient'), title: person, subtitle: `${this.form.need || 'Professional wardrobe'} · referred by ${this.form.referral || 'Community referral'}`, status: 'New', meta: this.form.eventDate ? `Important date ${this.form.eventDate}` : 'Needs review', referral: this.form.referral || 'Community referral' }, ...this.recipients()]);
        const stages = [...this.journey()]; stages[0] = { ...stages[0], value: String(Number(stages[0].value) + 1) }; this.journey.set(stages);
        this.persistHey(); this.closeDrawer(); this.notify('Application created', `${person} is now in the Heyy King recipient pipeline.`); break;
      }
      case 'hey-schedule': {
        const person = this.form.person?.trim(); if (!person) return this.notify('Name required', 'Choose a young man before scheduling.');
        const displayTime = this.form.time || '10:00';
        this.appointments.set([...this.appointments(), { id: this.id('appointment'), title: `${displayTime} · ${person}`, subtitle: this.form.appointmentType || 'Appointment', status: 'Confirmed', meta: `Assigned: ${this.form.assigned || 'Team'} · ${this.form.date || 'date pending'}` }]);
        this.recipients.set(this.recipients().map(item => item.title === person && item.status === 'Approved' ? { ...item, status: 'Scheduled', meta: `${this.form.appointmentType || 'Appointment'} scheduled ${this.form.date || ''}` } : item));
        this.persistHey(); this.closeDrawer(); this.notify('Appointment scheduled', `${person} is scheduled for ${this.form.appointmentType}.`); break;
      }
      case 'hey-outfit': this.persistHey(); this.closeDrawer(); this.notify('Outfit updated', `${this.outfitReadyCount()} of ${this.outfit().length} required items are ready.`); break;
      case 'hey-outfit-item': {
        const row = this.selectedRow(); if (!row) return; this.outfit.set(this.outfit().map(item => item.id === row.id ? { ...item, status: this.form.status || item.status } : item)); this.persistHey(); this.closeDrawer(); this.notify('Outfit item updated', `${row.title} is now ${this.form.status}.`); break;
      }
      case 'hey-measurements': {
        this.measurements.set({ jacket: this.form.jacket || '', shirt: this.form.shirt || '', waist: this.form.waist || '', inseam: this.form.inseam || '', shoe: this.form.shoe || '', updated: 'today' }); this.persistHey(); this.closeDrawer(); this.notify('Measurements updated', 'The current fit profile was updated while the prior history remains conceptually preserved.'); break;
      }
      case 'hey-donation': {
        const qty = Number(this.form.quantity ?? 1); const item = this.form.item?.trim() || 'Clothing'; const size = this.form.size?.trim() || 'Size pending'; const color = this.form.color?.trim() || 'Assorted';
        this.inventory.set([{ id: this.id('inventory'), title: `${item} · ${size}`, subtitle: `${color} · ${(this.form.condition || 'Good').toLowerCase()} condition`, status: 'Available', meta: `${qty} received · ${this.form.partner || 'Direct donor'}` }, ...this.inventory()]);
        this.persistHey(); this.closeDrawer(); this.notify('Donation recorded', `${qty} ${item.toLowerCase()} item${qty === 1 ? '' : 's'} added to inventory.`); break;
      }
      case 'hey-inventory-item': {
        const row = this.selectedRow(); if (!row) return; this.inventory.set(this.inventory().map(item => item.id === row.id ? { ...item, status: this.form.status || item.status } : item)); this.persistHey(); this.closeDrawer(); this.notify('Inventory status updated', `${row.title} is now ${this.form.status}.`); break;
      }
      case 'hey-add-partner': {
        const partner = this.form.partner?.trim(); if (!partner) return this.notify('Partner name required', 'Enter the organization or partner name.');
        this.partners.set([...this.partners(), { id: this.id('partner'), title: partner, subtitle: this.form.partnerType || 'Community Partner', status: 'Active', meta: this.form.contact ? `Contact: ${this.form.contact}` : 'Relationship started' }]);
        this.persistHey(); this.closeDrawer(); this.notify('Partner added', `${partner} is now in the Heyy King relationship network.`); break;
      }
      case 'hey-partner-portal': {
        const person = this.form.person?.trim(); if (!person) return this.notify('Name required', 'The partner referral needs a recipient name.');
        this.recipients.set([{ id: this.id('referral'), title: person, subtitle: `${this.form.need || 'Referral'} · partner referral`, status: 'New', meta: this.form.eventDate ? `Important date ${this.form.eventDate}` : 'Partner referral received', referral: 'Partner portal' }, ...this.recipients()]);
        this.persistHey(); this.closeDrawer(); this.notify('Referral submitted', `${person} is now visible to the Heyy King intake team.`); break;
      }
      case 'hey-new-match': {
        const person = this.form.person?.trim(); if (!person) return this.notify('Mentee required', 'Choose the young man receiving mentorship.');
        this.mentees.set([...this.mentees(), { id: this.id('mentee'), title: person, subtitle: `${this.form.focus || 'Life development'} · ${this.form.cadence || 'Every other week'}`, status: 'New match', meta: this.form.mentor || 'Pastor Hickman' }]);
        if (this.form.goal?.trim()) this.goals.set([...this.goals(), { id: this.id('goal'), title: this.form.goal, subtitle: this.form.focus || 'Development', status: 'Planned', meta: person }]);
        this.persistHey(); this.closeDrawer(); this.notify('Mentorship match created', `${person} is matched with ${this.form.mentor || 'Pastor Hickman'}.`); break;
      }
      case 'hey-meeting': {
        const person = this.form.person?.trim() || 'Mentee'; this.meetingsThisWeek.set(this.meetingsThisWeek() + 1);
        this.mentees.set(this.mentees().map(item => item.title === person ? { ...item, status: 'On track', meta: this.form.nextDate ? `Next ${this.form.nextDate}` : 'Meeting recorded' } : item));
        this.persistHey(); this.closeDrawer(); this.notify('Mentorship meeting recorded', `${person}: ${this.form.followup || 'follow-up captured'}.`); break;
      }
      case 'hey-add-goal': {
        const goal = this.form.goal?.trim(); if (!goal) return this.notify('Goal required', 'Enter the goal before saving.');
        this.goals.set([...this.goals(), { id: this.id('goal'), title: goal, subtitle: this.form.category || 'Development', status: 'Planned', meta: this.form.date || '' }]); this.persistHey(); this.closeDrawer(); this.notify('Goal added', `${goal} is now part of Marcus’ mentorship plan.`); break;
      }
      case 'hey-add-milestone': {
        const text = this.form.milestone?.trim(); if (!text) return this.notify('Milestone required', 'Describe the milestone before saving.');
        this.milestones.set([...this.milestones(), { id: this.id('milestone'), date: this.form.date || 'New', text }]); this.persistHey(); this.closeDrawer(); this.notify('Milestone recorded', text); break;
      }
      default: this.closeDrawer();
    }
  }

  closeDrawer(): void { this.drawer.set(null); this.selectedGroup.set(null); this.selectedPlacement.set(null); this.selectedRecipient.set(null); this.selectedRow.set(null); this.selectedConnection.set(null); this.selectedMilestone.set(null); this.form = {}; }

  private showDrawer(kind: string, eyebrow: string, title: string, description: string, saveLabel?: string): void { this.drawer.set({ kind, eyebrow, title, description, saveLabel }); }
  private notify(title: string, detail: string): void { this.toast.set({ title, detail }); globalThis.setTimeout?.(() => { if (this.toast()?.title === title) this.toast.set(null); }, 5000); }
  private id(prefix: string): string { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`; }

  private persistDwc(): void {
    globalThis.localStorage?.setItem(this.dwcStorageKey, JSON.stringify({ groups: this.groups(), placements: this.placements(), groupPeople: this.groupPeople(), meetingAssignments: this.meetingAssignments(), attendanceSummary: this.attendanceSummary(), summerRolloverPrepared: this.summerRolloverPrepared() }));
  }
  private persistHey(): void {
    globalThis.localStorage?.setItem(this.heyStorageKey, JSON.stringify({ journey: this.journey(), recipients: this.recipients(), appointments: this.appointments(), outfit: this.outfit(), measurements: this.measurements(), inventory: this.inventory(), partners: this.partners(), mentees: this.mentees(), goals: this.goals(), milestones: this.milestones(), meetingsThisWeek: this.meetingsThisWeek() }));
  }
  private loadPersistedState(): void {
    try {
      const dwc = JSON.parse(globalThis.localStorage?.getItem(this.dwcStorageKey) || 'null');
      if (dwc) {
        if (Array.isArray(dwc.groups)) this.groups.set(dwc.groups); if (Array.isArray(dwc.placements)) this.placements.set(dwc.placements);
        if (Array.isArray(dwc.groupPeople)) this.groupPeople.set(dwc.groupPeople); if (Array.isArray(dwc.meetingAssignments)) this.meetingAssignments.set(dwc.meetingAssignments);
        if (typeof dwc.attendanceSummary === 'string') this.attendanceSummary.set(dwc.attendanceSummary); if (typeof dwc.summerRolloverPrepared === 'boolean') this.summerRolloverPrepared.set(dwc.summerRolloverPrepared);
      }
      const hey = JSON.parse(globalThis.localStorage?.getItem(this.heyStorageKey) || 'null');
      if (hey) {
        if (Array.isArray(hey.journey)) this.journey.set(hey.journey); if (Array.isArray(hey.recipients)) this.recipients.set(hey.recipients);
        if (Array.isArray(hey.appointments)) this.appointments.set(hey.appointments); if (Array.isArray(hey.outfit)) this.outfit.set(hey.outfit);
        if (hey.measurements) this.measurements.set(hey.measurements); if (Array.isArray(hey.inventory)) this.inventory.set(hey.inventory);
        if (Array.isArray(hey.partners)) this.partners.set(hey.partners); if (Array.isArray(hey.mentees)) this.mentees.set(hey.mentees);
        if (Array.isArray(hey.goals)) this.goals.set(hey.goals); if (Array.isArray(hey.milestones)) this.milestones.set(hey.milestones);
        if (typeof hey.meetingsThisWeek === 'number') this.meetingsThisWeek.set(hey.meetingsThisWeek);
      }
    } catch {
      // A stale browser demo payload should never prevent the organization space from loading.
    }
  }
}