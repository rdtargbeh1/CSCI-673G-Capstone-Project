
package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CenterStatsOfficialDto;
import election.ems_backend.views.entity.CenterStatsOfficial;

public class CenterStatsOfficialMapper {

    public CenterStatsOfficialDto toDto(CenterStatsOfficial e) {
        if (e == null) return null;

        CenterStatsOfficialDto d = new CenterStatsOfficialDto();

        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setCenterId(e.getId().getCenterId());
        }

        d.setCenterCode(e.getCenterCode());
        d.setCenterName(e.getCenterName());

        d.setDistrictId(e.getDistrictId());
        d.setDistrictName(e.getDistrictName());

        d.setCountyId(e.getCountyId());
        d.setCountyName(e.getCountyName());

        d.setRegisteredVoters(e.getRegisteredVoters());
        d.setBallotsIssued(e.getBallotsIssued());

        d.setBallotsCast(e.getBallotsCast());
        d.setValidVotes(e.getValidVotes());
        d.setInvalidTotal(e.getInvalidTotal());

        d.setTurnoutPct(e.getTurnoutPct());
        d.setInvalidPct(e.getInvalidPct());

        d.setPlacesTotal(e.getPlacesTotal());
        d.setPlacesReported(e.getPlacesReported());
        d.setPlacesReportingPct(e.getPlacesReportingPct());

        d.setHasPlaceAllocation(e.getHasPlaceAllocation());
        d.setCenterStarted(e.getCenterStarted());
        d.setCenterPartial(e.getCenterPartial());
        d.setCenterCompleted(e.getCenterCompleted());

        d.setSource(e.getSource());
        d.setUploadTime(e.getUploadTime());

        return d;
    }
}
