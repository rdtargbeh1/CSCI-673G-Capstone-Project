package election.ems_backend.mapper;

import election.ems_backend.dto.PollingCenterCreateRequest;
import election.ems_backend.dto.PollingCenterDto;
import election.ems_backend.dto.PollingCenterUpdateRequest;
import election.ems_backend.entity.County;
import election.ems_backend.entity.District;
import election.ems_backend.entity.PollingCenter;
import org.springframework.stereotype.Component;

@Component
public class PollingCenterMapper {

    public PollingCenterDto toDTO(PollingCenter pc) {
        if (pc == null) return null;
        District d = pc.getDistrict();
        County c = (d != null) ? d.getCounty() : null;

        return PollingCenterDto.builder()
                .centerId(pc.getCenterId())
                .centerName(pc.getCenterName())
                .code(pc.getCode())
//                .registeredVoters(pc.getRegisteredVoters())
                .districtId(d != null ? d.getDistrictId() : null)
                .districtName(d != null ? d.getDistrictName() : null)
                .countyId(c != null ? c.getCountyId() : null)
                .countyName(c != null ? c.getCountyName() : null)
                .latitude(pc.getLatitude())
                .longitude(pc.getLongitude())
                .createdAt(pc.getCreatedAt())
                .build();
    }

    public PollingCenter toEntity(PollingCenterCreateRequest req, District district) {
        if (req == null) return null;
        return PollingCenter.builder()
                .centerName(req.getCenterName())
//                .registeredVoters(req.getRegisteredVoters())
                .district(district)
                .build();
    }

    public void apply(PollingCenterUpdateRequest req, PollingCenter pc, District newDistrict) {
        if (req == null || pc == null) return;
        if (req.getCenterName() != null) pc.setCenterName(req.getCenterName());
        if (req.getCode() != null) pc.setCode(req.getCode());
//        if (req.getRegisteredVoters() != null) pc.setRegisteredVoters(req.getRegisteredVoters());
        if (newDistrict != null) pc.setDistrict(newDistrict);
    }
}
