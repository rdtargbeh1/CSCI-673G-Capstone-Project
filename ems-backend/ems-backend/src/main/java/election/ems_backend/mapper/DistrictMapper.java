package election.ems_backend.mapper;

import election.ems_backend.dto.DistrictDto;
import election.ems_backend.dto.DistrictRequest;
import election.ems_backend.entity.County;
import election.ems_backend.entity.District;
import org.springframework.stereotype.Component;

@Component
public class DistrictMapper {

    public DistrictDto toDTO(District d) {
        if (d == null) return null;
        return new DistrictDto(
                d.getDistrictId(),
                d.getDistrictName(),
                d.getCounty() != null ? d.getCounty().getCountyId() : null,
                d.getCounty() != null ? d.getCounty().getCountyName() : null
        );
    }

    /** county must be loaded by service and passed in */
    public District toEntity(DistrictRequest req, County county) {
        if (req == null) return null;
        return District.builder()
                .districtName(req.districtName())
                .county(county)
                .build();
    }

    public void updateEntity(District target, DistrictRequest req, County county) {
        if (target == null || req == null) return;
        if (req.districtName() != null) target.setDistrictName(req.districtName());
        if (county != null) target.setCounty(county);
    }
}
