package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateCountyCompareDto;
import election.ems_backend.views.entity.CandidateCountyCompare;

public class CandidateCountyCompareMapper {
    public CandidateCountyCompareDto toDto(CandidateCountyCompare e) {
        if (e == null) return null;
        CandidateCountyCompareDto d = new CandidateCountyCompareDto();
        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setCountyId(e.getId().getCountyId());
            d.setCandidateId(e.getId().getCandidateId());
        }
        d.setCountyName(e.getCountyName());
        d.setCandidateName(e.getCandidateName());
        d.setOrgId(e.getOrgId());
        d.setPartyId(e.getPartyId());
        d.setPartyName(e.getPartyName());
        d.setPartyCode(e.getPartyCode());
        d.setPartyCandidateVotes(e.getPartyCandidateVotes());
        d.setOfficialCandidateVotes(e.getOfficialCandidateVotes());
        d.setDiffVotes(e.getDiffVotes());
        d.setPartyVoteSharePct(e.getPartyVoteSharePct());
        d.setOfficialVoteSharePct(e.getOfficialVoteSharePct());
        return d;
    }
}