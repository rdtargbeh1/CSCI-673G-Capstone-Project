package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateCountyStatsOfficialDto;
import election.ems_backend.views.entity.CandidateCountyStatsOfficial;

public class CandidateCountyStatsOfficialMapper {
    public CandidateCountyStatsOfficialDto toDto(CandidateCountyStatsOfficial e) {
        if (e == null) return null;
        CandidateCountyStatsOfficialDto d = new CandidateCountyStatsOfficialDto();
        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setCountyId(e.getId().getCountyId());
            d.setCandidateId(e.getId().getCandidateId());
        }
        d.setCountyName(e.getCountyName());
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