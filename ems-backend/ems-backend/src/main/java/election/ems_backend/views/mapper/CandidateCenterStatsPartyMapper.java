package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateCenterStatsPartyDto;
import election.ems_backend.views.entity.CandidateCenterStatsParty;

public class CandidateCenterStatsPartyMapper {
    public CandidateCenterStatsPartyDto toDto(CandidateCenterStatsParty e) {
        if (e == null) return null;
        CandidateCenterStatsPartyDto d = new CandidateCenterStatsPartyDto();
        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
            d.setElectionId(e.getId().getElectionId());
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