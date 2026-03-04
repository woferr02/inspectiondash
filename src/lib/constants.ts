// ─── Route paths ───
export const routes = {
  dashboard: "/",
  inspections: "/inspections",
  inspectionDetail: (id: string) => `/inspections/${id}`,
  sites: "/sites",
  siteDetail: (id: string) => `/sites/${id}`,
  actions: "/actions",
  findings: "/findings",
  analytics: "/analytics",
  team: "/team",
  templates: "/templates",
  reports: "/reports",
  schedules: "/schedules",
  settings: "/settings",
  auditLog: "/audit-log",
  login: "/login",
} as const;

// ─── Firestore collection names ───
export const collections = {
  users: "users",
  organizations: "organizations",
  members: "members", // subcollection of organizations
  inspections: "inspections",
  sites: "sites",
  correctiveActions: "corrective_actions",
  schedules: "schedules",
  auditLog: "audit_log",
} as const;

// ─── Layout constants ───
export const layout = {
  sidebarWidth: 256,
  sidebarCollapsedWidth: 64,
  headerHeight: 64,
  contentPadding: 32,
  maxContentWidth: 1440,
} as const;
