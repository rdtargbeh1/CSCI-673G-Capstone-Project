/**
 * src/shared/lib/validateSubmission.ts
 *
 * Client-side validation helper for vote submission payloads.
 * Mirrors backend validateTally / validateTallyInternal logic so the UI
 * can surface friendly field-level errors before sending requests.
 *
 * Exports:
 *  - ValidationResult: typed result with `valid` boolean and `errors` map.
 *  - validateSubmissionPayload(payload, allocation?): ValidationResult
 *
 * Usage:
 *  import { validateSubmissionPayload } from "../shared/lib/validateSubmission";
 *
 *  const { valid, errors } = validateSubmissionPayload(payload, {
 *     registered: 1000,
 *     ballotsIssued: 950
 *  });
 *
 *  if (!valid) show errors to user; otherwise call mutation hook.
 *
 * Place this file at: src/shared/lib/validateSubmission.ts
 */

import type {
  CandidateVotesMap,
  VoteSubmissionCreatePayload,
} from "../../auth/api";

export type ValidationErrors = Partial<Record<string, string>>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrors;
  // Derived numeric values to help UI show summaries
  sumCandidateVotes: number;
  accountedBallots: number;
}

/** Safe sum of candidate votes map (treat non-numeric as 0) */
function sumCandidateVotes(votes?: CandidateVotesMap | null): number {
  if (!votes) return 0;
  return Object.values(votes).reduce((acc, v) => {
    const n = Number(v);
    return acc + (Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
  }, 0);
}

/**
 * Validate a submission payload.
 *
 * Rules mirrored from backend.validateTallyInternal:
 *  - ballotsCast and registered (if provided) must be >= 0
 *  - invalid, blank, rejected, spoiled must be >= 0
 *  - accounted = sum(candidateVotes) + invalid + blank + rejected + spoiled
 *    must NOT exceed ballotsCast
 *  - if ballotsIssued provided, ballotsCast must NOT exceed ballotsIssued
 *  - ballotsCast must NOT exceed registered (if provided)
 *
 * Returns a ValidationResult with `errors` keyed by field name for easy UI mapping.
 */
export function validateSubmissionPayload(
  payload: Partial<VoteSubmissionCreatePayload> | null | undefined,
  allocation?: { registered?: number | null; ballotsIssued?: number | null }
): ValidationResult {
  const errors: ValidationErrors = {};
  if (!payload) {
    return {
      valid: false,
      errors: { payload: "Missing payload" },
      sumCandidateVotes: 0,
      accountedBallots: 0,
    };
  }

  // Numeric fields (coerce to integers where appropriate)
  const ballotsCastRaw = payload.ballotsCast ?? null;
  const ballotsCast = ballotsCastRaw == null ? null : Number(ballotsCastRaw);
  const invalid = Number(payload.invalidBallots ?? 0);
  const blank = Number(payload.blankBallots ?? 0);
  const rejected = Number(payload.rejectedBallots ?? 0);
  const spoiled = Number(payload.spoiledBallots ?? 0);

  // Candidate votes sum
  const sumVotes = sumCandidateVotes(payload.candidateVotes);

  // Validate numeric non-negativity
  if (
    ballotsCast != null &&
    (!Number.isFinite(ballotsCast) || ballotsCast < 0)
  ) {
    errors["ballotsCast"] = "ballotsCast must be a non-negative number";
  }
  if (!Number.isFinite(invalid) || invalid < 0) {
    errors["invalidBallots"] = "invalidBallots must be >= 0";
  }
  if (!Number.isFinite(blank) || blank < 0) {
    errors["blankBallots"] = "blankBallots must be >= 0";
  }
  if (!Number.isFinite(rejected) || rejected < 0) {
    errors["rejectedBallots"] = "rejectedBallots must be >= 0";
  }
  if (!Number.isFinite(spoiled) || spoiled < 0) {
    errors["spoiledBallots"] = "spoiledBallots must be >= 0";
  }

  // If ballotsCast is null/undefined we cannot run some checks; still compute accounted
  const accounted = sumVotes + invalid + blank + rejected + spoiled;

  if (ballotsCast == null) {
    // If ballotsCast missing, add a warning-style error (UI can treat as error)
    errors["ballotsCast"] = errors["ballotsCast"] ?? "ballotsCast is required";
  } else {
    // Accounted must not exceed ballotsCast
    if (accounted > ballotsCast) {
      errors["accounted"] =
        "Sum of candidate votes plus invalid/blank/rejected/spoiled exceeds ballotsCast";
    }

    // If allocation.ballotsIssued provided, ballotsCast must not exceed it
    if (
      allocation &&
      allocation.ballotsIssued != null &&
      Number.isFinite(allocation.ballotsIssued) &&
      ballotsCast > allocation.ballotsIssued
    ) {
      errors[
        "ballotsIssued"
      ] = `ballotsCast (${ballotsCast}) exceeds ballots issued (${allocation.ballotsIssued})`;
    }

    // If allocation.registered provided, ballotsCast must not exceed registered
    if (
      allocation &&
      allocation.registered != null &&
      Number.isFinite(allocation.registered) &&
      ballotsCast > allocation.registered
    ) {
      errors[
        "registered"
      ] = `ballotsCast (${ballotsCast}) exceeds registered voters (${allocation.registered})`;
    }
  }

  // If no candidate votes and ballotsCast > 0, warn user (not an error, but helpful)
  if (sumVotes === 0 && (ballotsCast ?? 0) > 0) {
    // Provide a non-blocking message under candidateVotes key
    errors["candidateVotes"] =
      errors["candidateVotes"] ?? "No candidate vote breakdown provided";
  }

  const valid = Object.keys(errors).length === 0;

  return {
    valid,
    errors,
    sumCandidateVotes: sumVotes,
    accountedBallots: accounted,
  };
}
