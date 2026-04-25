// normalize.types.ts

export type VoteSubmissionContestRow = {
  scvId: string;
  submissionId: string;
  contestName?: string | null;
  optionLabel?: string | null;
  voteValue: number;
  rank?: number | null;
  dateCreated?: string | null;
};

export type VoteSubmissionRankingRow = {
  svrId: string;
  submissionId: string;
  contestName?: string | null;
  // JSON array string for now (later render chips)
  rankingJson: string;
  dateCreated?: string | null;
};
