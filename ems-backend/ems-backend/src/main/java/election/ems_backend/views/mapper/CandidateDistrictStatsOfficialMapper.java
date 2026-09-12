
package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CandidateDistrictStatsOfficialDto;
import election.ems_backend.views.entity.CandidateDistrictStatsOfficial;

public class CandidateDistrictStatsOfficialMapper {

    public CandidateDistrictStatsOfficialDto toDto(CandidateDistrictStatsOfficial e) {
        if (e == null) return null;

        CandidateDistrictStatsOfficialDto d = new CandidateDistrictStatsOfficialDto();

        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setDistrictId(e.getId().getDistrictId());
            d.setCandidateId(e.getId().getCandidateId());
        }

        d.setCountyId(e.getCountyId());
        d.setCountyName(e.getCountyName());

        d.setDistrictName(e.getDistrictName());

        d.setCandidateName(e.getCandidateName());

        d.setPartyId(e.getPartyId());
        d.setPartyName(e.getPartyName());
        d.setPartyCode(e.getPartyCode());

        d.setCandidateVotes(e.getCandidateVotes());
        d.setBallotsCast(e.getBallotsCast());
        d.setTotalValidVotes(e.getTotalValidVotes());
        d.setTotalInvalidVotes(e.getTotalInvalidVotes());

        d.setVoteSharePct(e.getVoteSharePct());

        d.setRankInDistrict(e.getRankInDistrict());
        d.setWinnerVotes(e.getWinnerVotes());
        d.setWinnerVoteSharePct(e.getWinnerVoteSharePct());
        d.setMarginVotes(e.getMarginVotes());
        d.setMarginPct(e.getMarginPct());
        d.setIsDistrictWinner(e.getIsDistrictWinner());

        return d;
    }
}
