
package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.CenterCoveragePartyDto;
import election.ems_backend.views.entity.CenterCoverageParty;

public class CenterCoveragePartyMapper {

    public CenterCoveragePartyDto toDto(CenterCoverageParty e) {
        if (e == null) return null;

        CenterCoveragePartyDto d = new CenterCoveragePartyDto();

        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
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
