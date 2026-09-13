// src/pages/dashboard/shared/metrics.ts
export type AnyRow = Record<string, any>;

function pickNumber(row: AnyRow | undefined, keys: string[], fallback = 0) {
  if (!row) return fallback;
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return fallback;
}

function pickPercent(row: AnyRow | undefined, keys: string[]) {
  if (!row) return null as number | null;
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

export function normalizeElectionSummary(row?: AnyRow) {
  // works with your ElectionStatsDto fields (registeredVoters, ballotsCast, validVotes, invalidTotal, turnoutPct, invalidPct)
  // and tolerates minor backend variations.
  return {
    registeredVoters: pickNumber(row, [
      "registeredVoters",
      "registered_voters",
    ]),
    ballotsCast: pickNumber(row, ["ballotsCast", "ballots_cast"]),
    validVotes: pickNumber(row, ["validVotes", "valid_votes"]),
    invalidTotal: pickNumber(row, ["invalidTotal", "invalid_total"]),
    turnoutPct: pickPercent(row, ["turnoutPct", "turnout_pct"]),
    invalidPct: pickPercent(row, ["invalidPct", "invalid_pct"]),
  };
}
