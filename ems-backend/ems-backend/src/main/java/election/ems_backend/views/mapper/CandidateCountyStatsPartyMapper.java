
package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateCountyStatsPartyDto;
import election.ems_backend.views.entity.CandidateCountyStatsParty;

public class CandidateCountyStatsPartyMapper {

    public CandidateCountyStatsPartyDto toDto(CandidateCountyStatsParty e) {
        if (e == null) return null;

        CandidateCountyStatsPartyDto d = new CandidateCountyStatsPartyDto();

        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setCountyId(e.getId().getCountyId());
            d.setCandidateId(e.getId().getCandidateId());
        }

        d.setCountyName(e.getCountyName());

        d.setCandidateName(e.getCandidateName());

        d.setPartyId(e.getPartyId());
        d.setPartyName(e.getPartyName());
        d.setPartyCode(e.getPartyCode());

        // totals
        d.setCandidateVotes(e.getCandidateVotes());
        d.setBallotsCast(e.getBallotsCast());
        d.setTotalValidVotes(e.getTotalValidVotes());
        d.setTotalInvalidVotes(e.getTotalInvalidVotes());
        d.setVoteSharePct(e.getVoteSharePct());

        // rankings / outcomes
        d.setRankInCounty(e.getRankInCounty());
        d.setWinnerVotes(e.getWinnerVotes());
        d.setWinnerVoteSharePct(e.getWinnerVoteSharePct());
        d.setMarginVotes(e.getMarginVotes());
        d.setMarginPct(e.getMarginPct());
        d.setIsCountyWinner(e.getIsCountyWinner());

        return d;
    }
}
