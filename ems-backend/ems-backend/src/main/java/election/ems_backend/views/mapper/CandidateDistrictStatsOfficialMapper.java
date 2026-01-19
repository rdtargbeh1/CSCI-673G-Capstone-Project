package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateDistrictStatsOfficialDto;
import election.ems_backend.views.entity.CandidateDistrictStatsOfficial;

public class CandidateDistrictStatsOfficialMapper {
    public CandidateDistrictStatsOfficialDto toDto(CandidateDistrictStatsOfficial e) {
        if (e == null) return null;
        CandidateDistrictStatsOfficialDto d = new CandidateDistrictStatsOfficialDto();
        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setDistrictId(e.getId().getDistrictId());
            d.setCandidateId(e.getId().getCandidateId());
        }
        d.setCountyId(e.getCountyId());
        d.setCountyName(e.getCountyName());
        d.setDistrictName(e.getDistrictName());
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