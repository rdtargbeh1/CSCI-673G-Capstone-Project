
package election.ems_backend.views.mapper;

import election.ems_backend.views.dto.PlaceCoveragePartyDto;
import election.ems_backend.views.entity.PlaceCoverageParty;

public class PlaceCoveragePartyMapper {

    public PlaceCoveragePartyDto toDto(PlaceCoverageParty e) {
        if (e == null) return null;

        PlaceCoveragePartyDto d = new PlaceCoveragePartyDto();

        if (e.getId() != null) {
            d.setOrgId(e.getId().getOrgId());
            d.setElectionId(e.getId().getElectionId());
            d.setContestId(e.getId().getContestId());
            d.setPlaceId(e.getId().getPlaceId());
        }

        d.setCenterId(e.getCenterId());
        d.setRegisteredVotersExpected(e.getRegisteredVotersExpected());
        d.setBallotsIssuedExpected(e.getBallotsIssuedExpected());
        d.setIsPlaceReported(e.getIsPlaceReported());

        return d;
    }

}
