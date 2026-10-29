// What a big ticket really holds: one problem per cause. causes.ts tells `parser` from `hint` by
// tenant and channel. A one-day move is neither: swapping day and month never moves a date by one
// day. Only reading the report shows it, so the desk's reading (desk-notes.json) decides it.
import { causeOf, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day' | 'unplaced';

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count. A guess from the browser, kept to show how often it is wrong.
  taggedAs: Record<string, number>;
  channels: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
};

const countBy = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  for (const r of reports) {
    const problem = problemOf(r, tenantOf(r), oneDayMove);
    byProblem.set(problem, [...(byProblem.get(problem) ?? []), r]);
  }
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: countBy(rs, (r) => r.meta.intakeTag),
        channels: countBy(rs, (r) => r.channel),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
