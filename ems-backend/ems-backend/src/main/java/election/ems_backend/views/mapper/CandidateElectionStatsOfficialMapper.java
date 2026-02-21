
package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateElectionStatsOfficialDto;
import election.ems_backend.views.entity.CandidateElectionStatsOfficial;

public class CandidateElectionStatsOfficialMapper {

    public CandidateElectionStatsOfficialDto toDto(CandidateElectionStatsOfficial e) {
        if (e == null) return null;

        CandidateElectionStatsOfficialDto d = new CandidateElectionStatsOfficialDto();

        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setCandidateId(e.getId().getCandidateId());
        }

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
        d.setRankInElection(e.getRankInElection());
        d.setWinnerVotes(e.getWinnerVotes());
        d.setWinnerVoteSharePct(e.getWinnerVoteSharePct());
        d.setMarginVotes(e.getMarginVotes());
        d.setMarginPct(e.getMarginPct());
        d.setIsElectionWinner(e.getIsElectionWinner());

        return d;
    }
}
