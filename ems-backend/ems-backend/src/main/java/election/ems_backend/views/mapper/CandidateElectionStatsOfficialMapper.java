package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateElectionStatsOfficialDto;
import election.ems_backend.views.entity.CandidateElectionStatsOfficial;

public class CandidateElectionStatsOfficialMapper {
    public CandidateElectionStatsOfficialDto toDto(CandidateElectionStatsOfficial e) {
        if (e == null) return null;
        CandidateElectionStatsOfficialDto d = new CandidateElectionStatsOfficialDto();
        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setCandidateId(e.getId().getCandidateId());
        }
        d.setCandidateName(e.getCandidateName());
        d.setPartyId(e.getPartyId());
        d.setPartyName(e.getPartyName());
        d.setAbbreviation(e.getAbbreviation());
        d.setCandidateVotes(e.getCandidateVotes());
        d.setBallotsCast(e.getBallotsCast());
        d.setTotalValidVotes(e.getTotalValidVotes());
        d.setTotalInvalidVotes(e.getTotalInvalidVotes());
        d.setVoteSharePct(e.getVoteSharePct());
        return d;
    }
}