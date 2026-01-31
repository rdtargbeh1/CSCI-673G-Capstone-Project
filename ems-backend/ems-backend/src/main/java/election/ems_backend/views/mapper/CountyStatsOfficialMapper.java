package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CountyStatsOfficialDto;
import election.ems_backend.views.entity.CountyStatsOfficial;

public class CountyStatsOfficialMapper {
    public CountyStatsOfficialDto toDto(CountyStatsOfficial e) {
        if (e == null) return null;
        CountyStatsOfficialDto d = new CountyStatsOfficialDto();
        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setCountyId(e.getId().getCountyId());
        }
        d.setCountyName(e.getCountyName());
        d.setRegisteredVoters(e.getRegisteredVoters());
        d.setBallotsCast(e.getBallotsCast());
        d.setValidVotes(e.getValidVotes());
        d.setInvalidTotal(e.getInvalidTotal());
        d.setTurnoutPct(e.getTurnoutPct());
        d.setInvalidPct(e.getInvalidPct());
        return d;
    }
}