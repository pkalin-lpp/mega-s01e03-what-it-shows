// What a big ticket really holds, counted the way the desk's own view counts it: `parser` and `hint`
// come from causes.ts, by tenant and channel. A one-day move is neither: swapping day and month never
// moves a date by one day. Only reading the report shows it, so the desk's reading (desk-notes.json)
// decides it. The desk still files those reports under their tenant's cause and counts them there.
import { causeOf, groupByCause, type CauseGroup, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = CauseGroup['cause'] | 'one-day';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count. A guess from the browser, kept to show how often it is wrong.
  taggedAs: Record<string, number>;
  channels: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  // Where the desk's view counts these reports. Empty for a cause, which counts its own.
  filedUnder: CauseGroup['cause'][];
};

const countBy = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

function summarize(problem: Problem, rs: Report[], filedUnder: CauseGroup['cause'][] = []): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    taggedAs: countBy(rs, (r) => r.meta.intakeTag),
    channels: countBy(rs, (r) => r.channel),
    tenants: new Set(rs.map((r) => r.tenant)).size,
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
    filedUnder,
  };
}

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const causes = groupByCause(reports, tenantOf).map((g) => summarize(g.cause, g.reports));
  const oneDay = reports.filter((r) => oneDayMove.includes(r.id));
  if (!oneDay.length) return causes;
  const filedUnder = [...new Set(oneDay.map((r) => causeOf(r, tenantOf(r)) ?? 'unplaced'))];
  return [...causes, summarize('one-day', oneDay, filedUnder)];
}
