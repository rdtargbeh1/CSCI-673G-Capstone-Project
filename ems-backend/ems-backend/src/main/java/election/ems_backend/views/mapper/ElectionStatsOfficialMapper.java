package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.ElectionStatsOfficialDto;
import election.ems_backend.views.entity.ElectionStatsOfficial;

public class ElectionStatsOfficialMapper {

    public ElectionStatsOfficialDto toDto(ElectionStatsOfficial e) {

        if (e == null) return null;

        ElectionStatsOfficialDto d = new ElectionStatsOfficialDto();

        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
        }

        d.setRegisteredVoters(e.getRegisteredVoters());
        d.setBallotsCast(e.getBallotsCast());
        d.setValidVotes(e.getValidVotes());
        d.setInvalidTotal(e.getInvalidTotal());
        d.setTurnoutPct(e.getTurnoutPct());
        d.setInvalidPct(e.getInvalidPct());

        // ✅ NEW: reporting coverage
        d.setCentersReported(e.getCentersReported());
        d.setCentersTotal(e.getCentersTotal());
        d.setReportingPct(e.getReportingPct());

        return d;
    }
}
