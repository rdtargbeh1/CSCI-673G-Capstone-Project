package election.ems_backend.views.mapper;


import election.ems_backend.views.dto.CenterCoverageOfficialDto;
import election.ems_backend.views.entity.CenterCoverageOfficial;

public class CenterCoverageOfficialMapper {

    public CenterCoverageOfficialDto toDto(CenterCoverageOfficial e) {
        if (e == null) return null;

        CenterCoverageOfficialDto d = new CenterCoverageOfficialDto();

        if (e.getId() != null) {
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setCenterId(e.getId().getCenterId());
        }

        d.setPlacesTotal(e.getPlacesTotal());
        d.setPlacesReported(e.getPlacesReported());
        d.setPlacesReportingPct(e.getPlacesReportingPct());

        d.setHasPlaceAllocation(e.getHasPlaceAllocation());
        d.setCenterStarted(e.getCenterStarted());
        d.setCenterPartial(e.getCenterPartial());
        d.setCenterCompleted(e.getCenterCompleted());

        d.setRegisteredVotersExpected(e.getRegisteredVotersExpected());
        d.setBallotsIssuedExpected(e.getBallotsIssuedExpected());

        return d;
    }
}
