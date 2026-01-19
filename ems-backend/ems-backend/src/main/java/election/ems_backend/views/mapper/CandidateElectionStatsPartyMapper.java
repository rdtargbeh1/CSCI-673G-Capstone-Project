package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateElectionStatsPartyDto;
import election.ems_backend.views.entity.CandidateElectionStatsParty;

public class CandidateElectionStatsPartyMapper {
    public CandidateElectionStatsPartyDto toDto(CandidateElectionStatsParty e) {
        if (e == null) return null;
        CandidateElectionStatsPartyDto d = new CandidateElectionStatsPartyDto();
        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
            d.setElectionId(e.getId().getElectionId());
            d.setCandidateId(e.getId().getCandidateId());
        }
        d.setCandidateName(e.getCandidateName());
        d.setPartyId(e.getPartyId());
        d.setPartyName(e.getPartyName());
        d.setPartyCode(e.getPartyCode());
        d.setCandidateVotes(e.getCandidateVotes());
        d.setRegisteredVoters(e.getRegisteredVoters());
        d.setBallotsCast(e.getBallotsCast());
        d.setValidVotes(e.getValidVotes());
        d.setInvalidTotal(e.getInvalidTotal());
        d.setVoteSharePct(e.getVoteSharePct());
        return d;
    }
}