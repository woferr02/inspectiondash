// ─── TypeScript types mirroring Dart/Firestore models ───
// Field names match Firestore document keys exactly.

// ─── Enums ───

export type InspectionStatus =
  | "draft"
  | "inProgress"
  | "completed"
  | "submitted"
  | "archived";

export type OrgRole = "admin" | "manager" | "inspector";

export type ActionSeverity = "low" | "medium" | "high" | "critical";

export type ActionStatus = "open" | "inProgress" | "resolved" | "closed";

export type AuditAction =
  | "inspectionCreated"
  | "inspectionDeleted"
  | "inspectionSubmitted"
  | "inspectionArchived"
  | "actionCreated"
  | "actionResolved"
  | "actionClosed"
  | "siteCreated"
  | "siteUpdated"
  | "siteDeleted"
  | "scheduleCreated"
  | "scheduleDeleted"
  | "memberInvited"
  | "memberRemoved"
  | "memberRoleChanged";

// ─── Models ───

export interface InspectionSection {
  id: string;
  name: string;
  questionCount: number;
  completedCount: number;
  score: number | null;
}

export interface Inspection {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  siteAddress: string;
  date: string; // ISO 8601
  status: InspectionStatus;
  score: number | null;
  inspectorName: string;
  sections: InspectionSection[];
  userId?: string;
  templateId?: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  contactName: string | null;
  contactPhone: string | null;
  inspectionCount: number;
  lastInspectionDate: string | null; // ISO 8601
  notes: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string; // ISO 8601
}

export interface OrgMember {
  userId: string;
  email: string;
  displayName: string;
  role: OrgRole;
  joinedAt: string; // ISO 8601
}

export interface CorrectiveAction {
  id: string;
  inspectionId: string;
  sectionId: string;
  questionId: string;
  title: string;
  description: string;
  severity: ActionSeverity;
  status: ActionStatus;
  assignee: string;
  dueDate: string | null; // ISO 8601
  createdAt: string; // ISO 8601
  resolvedAt: string | null; // ISO 8601
  photoIds: string[];
}

export interface AuditEntry {
  id: string;
  action: AuditAction;
  userId: string;
  userEmail: string;
  targetId: string;
  description: string;
  timestamp: string; // ISO 8601
}

export interface Template {
  id: string;
  name: string;
  industry: string;
  category: string;
  questionCount: number;
  isFavourite: boolean;
  description: string;
  lastUpdated: string;
  country: string;
}

export interface Schedule {
  id: string;
  templateId: string;
  siteId: string;
  frequency: string; // "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "biannual" | "annual"
  nextDue: string; // ISO 8601
  assignee: string;
  templateName?: string;
  siteName?: string;
  assigneeId?: string;
  assigneeName?: string;
  lastCompleted?: string | null; // ISO 8601
  isActive?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  jobTitle: string;
  industry: string;
  country: string;
  orgId: string;
  onboardingComplete: boolean;
  company?: string;
  photoUrl?: string;
  /** Written by Cloud Function on RevenueCat webhook — checked at dashboard gate */
  subscriptionTier?: "free" | "pro" | "business";
}

// ─── Inspection answers (subcollection) ───

export type AnswerValue = "pass" | "fail" | "na" | string;

export interface InspectionAnswer {
  id: string; // same as sectionId
  sectionId: string;
  answers: Record<string, AnswerValue>; // questionId → value
  notes: Record<string, string>;        // questionId → note text
  photos: Record<string, string[]>;     // questionId → photo paths
}

// ─── Incidents ───

export type IncidentType = "accident" | "near_miss" | "dangerous_occurrence" | "ill_health" | "environmental" | "property_damage" | "other";
export type IncidentSeverity = "minor" | "moderate" | "major" | "fatal";
export type IncidentStatus = "reported" | "investigating" | "corrective_action" | "closed";

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  siteId: string;
  siteName: string;
  reportedBy: string;
  reportedByEmail: string;
  reportedAt: string; // ISO 8601
  occurredAt: string; // ISO 8601
  injuredPersons: number;
  riddorReportable: boolean;
  immediateActions: string;
  rootCause: string;
  assignee: string;
  closedAt: string | null; // ISO 8601
}

// ─── Dashboard-specific derived types ───

export interface KpiData {
  label: string;
  value: string | number;
  change: number; // percentage change
  trend: "up" | "down" | "neutral";
}

export interface ComplianceTrendPoint {
  date: string;
  score: number;
  inspectionCount: number;
}
