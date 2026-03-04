import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  type DocumentData,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Inspection,
  Site,
  CorrectiveAction,
  AuditEntry,
  Schedule,
  Incident,
  InspectionAnswer,
  ActionStatus,
  ActionSeverity,
  IncidentStatus,
  OrgRole,
} from "./types";

// ─── Helpers ───

/**
 * Returns a collection reference scoped under organizations/{orgId}/{sub}.
 * The mobile app stores ALL data as subcollections of the org document —
 * orgId is NOT stored as a field on individual documents.
 */
function orgCollection(orgId: string, sub: string) {
  return collection(db, "organizations", orgId, sub);
}

function normalizeDoc<T>(data: DocumentData, id: string): T {
  const normalized: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      normalized[key] = value.toDate().toISOString();
    } else {
      normalized[key] = value;
    }
  }
  return normalized as T;
}

// ─── Real-time listeners ───

export function listenInspections(
  orgId: string,
  onData: (data: Inspection[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    orgCollection(orgId, "inspections"),
    orderBy("date", "desc"),
    limit(500)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const inspections = snapshot.docs.map((d) =>
        normalizeDoc<Inspection>(d.data(), d.id)
      );
      onData(inspections);
    },
    onError
  );
}

export function listenSites(
  orgId: string,
  onData: (data: Site[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    orgCollection(orgId, "sites"),
    orderBy("name", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const sites = snapshot.docs.map((d) =>
        normalizeDoc<Site>(d.data(), d.id)
      );
      onData(sites);
    },
    onError
  );
}

export function listenActions(
  orgId: string,
  onData: (data: CorrectiveAction[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    orgCollection(orgId, "corrective_actions"),
    orderBy("createdAt", "desc"),
    limit(500)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const actions = snapshot.docs.map((d) =>
        normalizeDoc<CorrectiveAction>(d.data(), d.id)
      );
      onData(actions);
    },
    onError
  );
}

export function listenAuditLog(
  orgId: string,
  onData: (data: AuditEntry[]) => void,
  limitCount = 100,
  onError?: (error: Error) => void
) {
  const q = query(
    orgCollection(orgId, "audit_log"),
    orderBy("timestamp", "desc"),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs.map((d) =>
        normalizeDoc<AuditEntry>(d.data(), d.id)
      );
      onData(entries);
    },
    onError
  );
}

export function listenSchedules(
  orgId: string,
  onData: (data: Schedule[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    orgCollection(orgId, "schedules"),
    orderBy("nextDue", "asc")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const schedules = snapshot.docs.map((d) =>
        normalizeDoc<Schedule>(d.data(), d.id)
      );
      onData(schedules);
    },
    onError
  );
}

// ─── Single-document fetchers ───

export async function getInspectionById(
  orgId: string,
  inspectionId: string
): Promise<Inspection | null> {
  const snap = await getDoc(
    doc(db, "organizations", orgId, "inspections", inspectionId)
  );
  if (!snap.exists()) return null;
  return normalizeDoc<Inspection>(snap.data(), snap.id);
}

/**
 * Reads all answer sub-documents for an inspection.
 * Mobile writes: organizations/{orgId}/inspections/{id}/answers/{sectionId}
 * Each doc: { sectionId, answers: {qId: "pass"|"fail"|"na"}, notes: {qId: ""}, photos: {qId: [""]} }
 */
export async function getInspectionAnswers(
  orgId: string,
  inspectionId: string
): Promise<InspectionAnswer[]> {
  const snap = await getDocs(
    collection(
      db,
      "organizations",
      orgId,
      "inspections",
      inspectionId,
      "answers"
    )
  );
  return snap.docs.map((d) => normalizeDoc<InspectionAnswer>(d.data(), d.id));
}

// ─── Write operations ───

/** Update a corrective action's status (and resolvedAt when applicable). */
export async function updateActionStatus(
  orgId: string,
  actionId: string,
  status: ActionStatus,
  resolvedAt?: string | null
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "corrective_actions", actionId);
  const updates: Record<string, unknown> = { status };
  if (status === "resolved" && !resolvedAt) {
    updates.resolvedAt = new Date().toISOString();
  } else if (resolvedAt !== undefined) {
    updates.resolvedAt = resolvedAt;
  }
  await updateDoc(ref, updates);
}

/** Update a corrective action's assignee. */
export async function updateActionAssignee(
  orgId: string,
  actionId: string,
  assignee: string
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "corrective_actions", actionId);
  await updateDoc(ref, { assignee });
}

/** Invite a member (creates a pending member doc). */
export async function inviteMember(
  orgId: string,
  email: string,
  role: OrgRole
): Promise<string> {
  const memberId = `pending-${Date.now()}`;
  const ref = doc(db, "organizations", orgId, "members", memberId);
  await setDoc(ref, {
    userId: memberId,
    email,
    displayName: "",
    role,
    joinedAt: new Date().toISOString(),
  });
  return memberId;
}

/** Update a member's role. */
export async function updateMemberRole(
  orgId: string,
  memberId: string,
  role: OrgRole
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "members", memberId);
  await updateDoc(ref, { role });
}

/** Remove a member from the organization. */
export async function removeMember(
  orgId: string,
  memberId: string
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "members", memberId);
  await deleteDoc(ref);
}

/** Write an audit log entry from the dashboard. */
export async function writeAuditEntry(
  orgId: string,
  entry: {
    action: string;
    userId: string;
    userEmail: string;
    targetId: string;
    description: string;
  }
): Promise<void> {
  const colRef = collection(db, "organizations", orgId, "audit_log");
  await addDoc(colRef, {
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

// ─── Site write operations ───

/** Create a new site. Returns the generated document ID. */
export async function addSite(
  orgId: string,
  data: {
    name: string;
    address: string;
    contactName?: string;
    contactPhone?: string;
    notes?: string;
  }
): Promise<string> {
  const colRef = orgCollection(orgId, "sites");
  const docRef = await addDoc(colRef, {
    ...data,
    contactName: data.contactName ?? "",
    contactPhone: data.contactPhone ?? "",
    notes: data.notes ?? "",
    inspectionCount: 0,
    lastInspectionDate: null,
    createdAt: new Date().toISOString(),
  });
  // Write the Firestore document ID into the `id` field so the Flutter app
  // can read it via Site.fromJson (expects json['id']).
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

/** Update an existing site. */
export async function updateSite(
  orgId: string,
  siteId: string,
  data: {
    name?: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
    notes?: string;
  }
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "sites", siteId);
  await updateDoc(ref, data);
}

/** Delete a site. */
export async function deleteSite(
  orgId: string,
  siteId: string
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "sites", siteId);
  await deleteDoc(ref);
}

// ─── Corrective action write operations ───

/** Create a new corrective action from the dashboard. */
export async function addAction(
  orgId: string,
  data: {
    title: string;
    description: string;
    severity: ActionSeverity;
    assignee?: string;
    dueDate?: string;
    siteId?: string;
    siteName?: string;
  }
): Promise<string> {
  const colRef = orgCollection(orgId, "corrective_actions");
  const docRef = await addDoc(colRef, {
    inspectionId: "",
    sectionId: "",
    questionId: "",
    title: data.title,
    description: data.description,
    severity: data.severity,
    status: "open" as ActionStatus,
    assignee: data.assignee ?? "",
    dueDate: data.dueDate ?? null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    photoIds: [],
    siteId: data.siteId ?? "",
    siteName: data.siteName ?? "",
    source: "dashboard",
  });
  return docRef.id;
}

/** Update a corrective action's due date. */
export async function updateActionDueDate(
  orgId: string,
  actionId: string,
  dueDate: string | null
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "corrective_actions", actionId);
  await updateDoc(ref, { dueDate });
}

// ─── Schedule write operations ───

/** Create a new schedule. Returns the generated document ID. */
export async function addSchedule(
  orgId: string,
  data: {
    templateId: string;
    templateName: string;
    siteId: string;
    siteName: string;
    frequency: string;
    assignee: string;
    nextDue: string;
  }
): Promise<string> {
  const colRef = orgCollection(orgId, "schedules");
  const docRef = await addDoc(colRef, {
    ...data,
    isActive: true,
    lastCompleted: null,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/** Toggle a schedule's active/paused state. */
export async function toggleScheduleActive(
  orgId: string,
  scheduleId: string,
  isActive: boolean
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "schedules", scheduleId);
  await updateDoc(ref, { isActive });
}

/** Delete a schedule. */
export async function deleteSchedule(
  orgId: string,
  scheduleId: string
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "schedules", scheduleId);
  await deleteDoc(ref);
}

// ─── Incident operations ───

/** Listen to incidents in real time. */
export function listenIncidents(
  orgId: string,
  callback: (incidents: Incident[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    orgCollection(orgId, "incidents"),
    orderBy("reportedAt", "desc"),
    limit(500)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => normalizeDoc<Incident>(d.data(), d.id))),
    onError
  );
}

/** Create a new incident. Returns the generated document ID. */
export async function addIncident(
  orgId: string,
  data: Omit<Incident, "id" | "closedAt"> & { closedAt?: string | null }
): Promise<string> {
  const colRef = orgCollection(orgId, "incidents");
  const docRef = await addDoc(colRef, {
    ...data,
    closedAt: null,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/** Update an incident's status. */
export async function updateIncidentStatus(
  orgId: string,
  incidentId: string,
  status: IncidentStatus
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "incidents", incidentId);
  const updates: Record<string, unknown> = { status };
  if (status === "closed") {
    updates.closedAt = new Date().toISOString();
  }
  await updateDoc(ref, updates);
}

/** Update incident fields (partial update). */
export async function updateIncident(
  orgId: string,
  incidentId: string,
  data: Partial<Omit<Incident, "id">>
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "incidents", incidentId);
  await updateDoc(ref, data as DocumentData);
}

/** Delete an incident. */
export async function deleteIncident(
  orgId: string,
  incidentId: string
): Promise<void> {
  const ref = doc(db, "organizations", orgId, "incidents", incidentId);
  await deleteDoc(ref);
}

// ─── Profile update ───

/** Update the current user's profile fields. */
export async function updateUserProfile(
  uid: string,
  data: Partial<{ displayName: string; jobTitle: string; company: string; country: string; industry: string }>
): Promise<void> {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, data as DocumentData);
}

/** Update organization name. */
export async function updateOrgName(
  orgId: string,
  name: string
): Promise<void> {
  const ref = doc(db, "organizations", orgId);
  await updateDoc(ref, { name });
}
