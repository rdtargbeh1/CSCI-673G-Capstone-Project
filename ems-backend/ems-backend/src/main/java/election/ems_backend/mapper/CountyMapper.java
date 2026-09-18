package election.ems_backend.mapper;

import election.ems_backend.dto.CountyDto;
import election.ems_backend.dto.CountyRequest;
import election.ems_backend.entity.County;
import org.springframework.stereotype.Component;

@Component
public class CountyMapper {

    public CountyDto toDTO(County county) {
        if (county == null) return null;
        return new CountyDto(
                county.getCountyId(),
                county.getCountyName()
        );
    }

    public County toEntity(CountyRequest request) {
        if (request == null) return null;
        return County.builder()
                .countyName(request.countyName())
                .build();
    }

    public void updateEntity(County county, CountyRequest request) {
        if (county != null && request != null && request.countyName() != null) {
            county.setCountyName(request.countyName());
        }
    }
}