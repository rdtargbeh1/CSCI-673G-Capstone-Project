package election.ems_backend.mapper;

import election.ems_backend.dto.PollingPlaceCreateRequest;
import election.ems_backend.dto.PollingPlaceDto;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingPlace;
import org.springframework.stereotype.Component;

@Component
public class PollingPlaceMapper {


    public PollingPlaceDto toDTO(PollingPlace p) {
        PollingCenter c = p.getPollingCenter();
        var d = c.getDistrict();
        var county = d != null ? d.getCounty() : null;

        return PollingPlaceDto.builder()
                .placeId(p.getPlaceId())

                // Center
                .centerId(c.getCenterId())
                .centerCode(c.getCode())
                .centerName(c.getCenterName())

                // District
                .districtId(d != null ? d.getDistrictId() : null)
                .districtName(d != null ? d.getDistrictName() : null)

                // County
                .countyId(county != null ? county.getCountyId() : null)
                .countyName(county != null ? county.getCountyName() : null)

                // Place
                .placeNumber(p.getPlaceNumber())
                .code(p.getCode())
                .label(p.getLabel())
                .active(p.isActive())

                .build();
    }

    public PollingPlace toEntity(PollingPlaceCreateRequest req,
                                 PollingCenter center,
                                 int nextPlaceNumber,
                                 String generatedCode) {
        return PollingPlace.builder()
                .pollingCenter(center)
                .placeNumber(nextPlaceNumber)
                .code(generatedCode)
                .label(req.getLabel())
                .active(true)
                .build();
    }

}
