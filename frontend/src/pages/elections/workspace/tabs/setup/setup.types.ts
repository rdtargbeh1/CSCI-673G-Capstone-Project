// src/pages/elections/workspace/tabs/setup/setup.types.ts

export type SetupSubTab =
  | "ELECTION_PARTIES"
  | "ELECTION_CANDIDATES"
  | "CONTESTS"
  | "CONTEST_OPTIONS"
  | "SUBMISSION_NORMALIZATION"
  | "MASTER_PARTIES"
  | "MASTER_CANDIDATES";

/**
 * Optional shared DTO placeholders (replace later with real API DTOs)
 */
export type PartyMasterRow = {
  partyId: string;
  partyName: string;
  acronym?: string | null;
  isActive: boolean;
};

export type CandidateMasterRow = {
  candidateId: string;
  fullName: string;
  partyId?: string | null;
  isActive: boolean;
};
