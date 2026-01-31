package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateCenterStatsOfficialDto;
import election.ems_backend.views.entity.CandidateCenterStatsOfficial;

public class CandidateCenterStatsOfficialMapper {
    public CandidateCenterStatsOfficialDto toDto(CandidateCenterStatsOfficial e) {
        if (e == null) return null;
        CandidateCenterStatsOfficialDto d = new CandidateCenterStatsOfficialDto();
        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setCenterId(e.getId().getCenterId());
            d.setCandidateId(e.getId().getCandidateId());
        }
        d.setCountyId(e.getCountyId());
        d.setCountyName(e.getCountyName());
        d.setDistrictId(e.getDistrictId());
        d.setDistrictName(e.getDistrictName());
        d.setCenterCode(e.getCenterCode());
        d.setCenterName(e.getCenterName());
        d.setCandidateName(e.getCandidateName());
        d.setPartyId(e.getPartyId());
        d.setPartyName(e.getPartyName());
        d.setPartyCode(e.getPartyCode());
        d.setCandidateVotes(e.getCandidateVotes());
        d.setRegisteredVoters(e.getRegisteredVoters());
        d.setBallotsCast(e.getBallotsCast());
        d.setCenterValidVotes(e.getCenterValidVotes());
        d.setCenterInvalidTotal(e.getCenterInvalidTotal());
        d.setVoteSharePct(e.getVoteSharePct());
        return d;
    }
}