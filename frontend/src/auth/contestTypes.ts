// src/api/contestTypes.ts

export type ContestVoteMethod = "SINGLE_CHOICE" | "MULTI_CHOICE" | "RANKED";
export type ContestCategory =
  | "PRESIDENT"
  | "SENATE"
  | "REPRESENTATIVE"
  | "REFERENDUM"
  | "OTHER";
export type ContestScopeType = "NATIONAL" | "COUNTY" | "DISTRICT";
export type ContestStatus = "DRAFT" | "PUBLISHED" | "LOCKED" | "ARCHIVED";

export interface ContestDto {
  contestId: string;
  electionId: string;
  contestName: string;
  category: ContestCategory;
  scopeType: ContestScopeType;
  countyId?: string | null;
  districtId?: string | null;
  voteMethod: ContestVoteMethod;
  seats: number;
  maxSelections: number;
  description?: string | null;
  status: ContestStatus;
  isActive: boolean;
  dateCreated?: string;
  dateUpdated?: string;
}

export type ContestOptionType = "CANDIDATE" | "LABEL";

export interface ContestOptionDto {
  optionId: string;
  contestId: string;
  optionType: ContestOptionType;
  candidateId?: string | null;
  optionLabel?: string | null;
  optionOrder: number;
  isActive: boolean;
  dateCreated?: string;
  dateUpdated?: string;
}

export interface ContestCandidateBulkAssignRequest {
  contestId: string;
  candidateIds: string[];
  replace: boolean; // replace mode matches backend req.isReplace()
}
