/**
 * src/shared/lib/submissionHash.ts
 *
 * Client-side helpers to compute idempotency fields for vote submissions:
 *  - generateClientGuid(): returns a UUIDv4 (uses crypto.randomUUID when available).
 *  - buildSubmissionHashFromPayload(payload): computes SHA-256 hex of a canonical
 *    payload string that mirrors the backend's buildSubmissionHash algorithm.
 *
 * Algorithm (must match backend buildSubmissionHash):
 *  - Build a stable JSON string for candidateVotes where keys are sorted lexicographically.
 *  - Concatenate the canonical fields with '|':
 *      orgId | electionId | centerId | placeId | agentId | votesJson | cast | invalid | blank | rejected | spoiled
 *  - Compute SHA-256 over UTF-8 bytes and return lowercase hex string.
 *
 * Usage:
 *  import { buildSubmissionHashFromPayload, generateClientGuid } from "../lib/submissionHash";
 *
 *  const hash = await buildSubmissionHashFromPayload(payload);
 *  const clientGuid = generateClientGuid();
 *
 * Place this file at: src/shared/lib/submissionHash.ts
 */

import type {
  VoteSubmissionCreatePayload,
  CandidateVotesMap,
} from "../../auth/api";

/** Convert ArrayBuffer to lowercase hex string */
function hexFromBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16).padStart(2, "0");
    hex.push(h);
  }
  return hex.join("");
}

/** Stable JSON serialization for votes map: sort keys lexicographically */
function canonicalizeVotes(
  votes: CandidateVotesMap | undefined | null
): string {
  if (!votes) return "{}";
  const sortedKeys = Object.keys(votes).sort(); // lexicographic sort of UUID strings
  const obj: Record<string, number> = {};
  for (const k of sortedKeys) {
    // Ensure values are numbers (coerce defensively)
    const v = votes[k];
    obj[k] = typeof v === "number" ? v : Number(v) || 0;
  }
  return JSON.stringify(obj);
}

/**
 * Build the submission hash following the backend canonicalization:
 * payload fields included (in order):
 *   orgId | electionId | centerId | placeId | agentId | votesJson | cast | invalid | blank | rejected | spoiled
 *
 * All values are converted to strings; missing numeric values default to 0.
 *
 * Returns lowercase SHA-256 hex string.
 */
export async function buildSubmissionHashFromPayload(
  payload: Pick<
    VoteSubmissionCreatePayload,
    | "orgId"
    | "electionId"
    | "centerId"
    | "placeId"
    | "agentId"
    | "candidateVotes"
    | "ballotsCast"
    | "invalidBallots"
    | "blankBallots"
    | "rejectedBallots"
    | "spoiledBallots"
  >
): Promise<string> {
  // Defensive defaults for numeric fields
  const cast = payload.ballotsCast ?? 0;
  const invalid = payload.invalidBallots ?? 0;
  const blank = payload.blankBallots ?? 0;
  const rejected = payload.rejectedBallots ?? 0;
  const spoiled = payload.spoiledBallots ?? 0;

  const votesJson = canonicalizeVotes(
    payload.candidateVotes as CandidateVotesMap
  );

  // Build payload string identical to backend delimiter scheme
  const parts = [
    payload.orgId ?? "",
    payload.electionId ?? "",
    payload.centerId ?? "",
    payload.placeId ?? "",
    payload.agentId ?? "",
    votesJson,
    String(cast),
    String(invalid),
    String(blank),
    String(rejected),
    String(spoiled),
  ];

  const raw = parts.join("|");

  // Compute SHA-256 using SubtleCrypto
  // TextEncoder -> utf-8 -> digest -> hex
  const enc = new TextEncoder();
  const data = enc.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return hexFromBuffer(hashBuffer);
}

/**
 * Generate a client GUID for idempotency purposes.
 * Uses crypto.randomUUID() if available, otherwise falls back to a compact UUIDv4 generator.
 */
export function generateClientGuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as any).randomUUID === "function"
  ) {
    return (crypto as any).randomUUID();
  }

  // Fallback UUIDv4 implementation (RFC4122-compliant enough for client ids)
  // Note: not cryptographically identical to crypto.randomUUID but acceptable as fallback.
  const bytes = new Uint8Array(16);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  // Per RFC4122: set version to 4 -> xxxx-xxxx-4xxx-...
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant bits: 10xx
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

/**
 * Convenience helper: ensure idempotency fields exist on a payload.
 * - If payload.clientGuid missing => generate one.
 * - If payload.submissionHash missing => compute it (async).
 *
 * Returns a new object (does not mutate original) with clientGuid and submissionHash.
 */
export async function ensureIdempotencyFields(
  payload: VoteSubmissionCreatePayload
): Promise<{ clientGuid: string; submissionHash: string }> {
  const clientGuid = payload.clientGuid ?? generateClientGuid();
  const submissionHash =
    payload.submissionHash ??
    (await buildSubmissionHashFromPayload({
      orgId: payload.orgId,
      electionId: payload.electionId,
      centerId: payload.centerId,
      placeId: payload.placeId,
      agentId: payload.agentId,
      candidateVotes: payload.candidateVotes,
      ballotsCast: payload.ballotsCast,
      invalidBallots: payload.invalidBallots,
      blankBallots: payload.blankBallots,
      rejectedBallots: payload.rejectedBallots,
      spoiledBallots: payload.spoiledBallots,
    }));

  return { clientGuid, submissionHash };
}
