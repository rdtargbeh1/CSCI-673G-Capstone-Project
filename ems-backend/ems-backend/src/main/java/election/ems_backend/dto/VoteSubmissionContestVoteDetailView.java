package election.ems_backend.dto;

import java.util.UUID;

public interface VoteSubmissionContestVoteDetailView {

    UUID getScvId();
    UUID getSubmissionId();
    UUID getOrgId();
    UUID getElectionId();
    UUID getContestId();
    UUID getOptionId();
    Integer getVoteValue();
    Integer getRank();
    UUID getElectId();
    UUID getCandidateId();
    String getCandidateFullName();
    UUID getPartyId();
    String getPartyName();
    String getPartyAbbreviation();


}
