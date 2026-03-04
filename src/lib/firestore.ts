import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
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
  InspectionAnswer,
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
