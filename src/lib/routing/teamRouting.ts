// Team routing: the owning team of a crypto object decides where its ticket goes.
// This is the config a customer sets up once (team -> ServiceNow assignment group,
// team -> Jira project key). Grouping by team drives routing, not ticket count:
// every object still gets its own ticket for audit, routed by its team.

export interface TeamRoute {
  assignmentGroup: string; // ServiceNow
  projectKey: string;      // Jira
}

const TEAM_ROUTING: Record<string, TeamRoute> = {
  'Payments Engineering': { assignmentGroup: 'Payments Platform Ops', projectKey: 'PAY' },
  'Platform Engineering': { assignmentGroup: 'Platform Engineering', projectKey: 'PLAT' },
  'Infrastructure':       { assignmentGroup: 'Infrastructure Ops', projectKey: 'INFRA' },
  'Data Engineering':     { assignmentGroup: 'Data Platform Ops', projectKey: 'DATA' },
  'DevOps':               { assignmentGroup: 'DevOps', projectKey: 'DEVOPS' },
  'Identity & Access':    { assignmentGroup: 'IAM Operations', projectKey: 'IAM' },
  'Security Operations':  { assignmentGroup: 'Security Operations', projectKey: 'SECOPS' },
  'Site Reliability':     { assignmentGroup: 'SRE', projectKey: 'SRE' },
  'IT Operations':        { assignmentGroup: 'IT Operations', projectKey: 'ITOPS' },
  'Database Operations':  { assignmentGroup: 'Database Ops', projectKey: 'DBA' },
  'Customer Experience':  { assignmentGroup: 'CX Engineering', projectKey: 'CX' },
  'QA Engineering':       { assignmentGroup: 'QA Engineering', projectKey: 'QA' },
};

const FALLBACK: TeamRoute = { assignmentGroup: 'Crypto Governance', projectKey: 'SEC' };

export function routingForTeam(team?: string): TeamRoute {
  if (!team) return FALLBACK;
  return TEAM_ROUTING[team] ?? FALLBACK;
}
