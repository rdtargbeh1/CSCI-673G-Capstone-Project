package election.ems_backend.mapper;

import election.ems_backend.dto.ObserverReportCreateRequest;
import election.ems_backend.dto.ObserverReportDto;
import election.ems_backend.dto.ObserverReportUpdateRequest;
import election.ems_backend.entity.*;
import election.ems_backend.enums.ObserverReportVerificationStatus;
import election.ems_backend.enums.ObserverReportVisibility;
import election.ems_backend.enums.ReportType;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Component;

@Component
public class ObserverReportMapper {

    private static final GeometryFactory GF = new GeometryFactory(new PrecisionModel(), 4326);

    public ObserverReportDto toDTO(ObserverReport r) {
        if (r == null) return null;
        Organization org = r.getOrganization();
        SystemUser obs   = r.getObserver();
        County county    = r.getCounty();
        District district =  r.getDistrict();
        PollingCenter pc = r.getPollingCenter();

        Double lat = null, lon = null;
        if (r.getGpsLocation() != null) {
            // JTS uses x=lon, y=lat
            lon = r.getGpsLocation().getX();
            lat = r.getGpsLocation().getY();
        }

        // Observer Name
        String observerFullName = null;
        if (obs != null) {
            String fn = obs.getFirstName() != null ? obs.getFirstName().trim() : "";
            String ln = obs.getLastName() != null ? obs.getLastName().trim() : "";
            String full = (fn + " " + ln).trim();
            observerFullName = full.isEmpty() ? null : full;
        }

        return ObserverReportDto.builder()
                .reportId(r.getReportId())
                .orgId(org != null ? org.getOrgId() : null)
                .orgName(org != null ? org.getOrgName() : null)
                .observerId(obs != null ? obs.getUserId() : null)
                .observerName(observerFullName)
                .countyId(county != null ? county.getCountyId() : null)
                .countyName(county != null ? county.getCountyName() : null)
                .districtId(district != null ? district.getDistrictId() : null)
                .districtName(district != null ? district.getDistrictName() : null)
                .centerId(pc != null ? pc.getCenterId() : null)
                .centerCode(pc != null ? pc.getCode() : null)
                .centerName(pc != null ? pc.getCenterName() : null)
                .type(r.getType() != null ? r.getType().name() : null)
                .description(r.getDescription())
                .visibility(r.getVisibility() != null ? r.getVisibility().name() : null)
                .verificationStatus(r.getVerificationStatus() != null ? r.getVerificationStatus().name() : null)
                .verifiedBy(r.getVerifiedBy())
                .verifiedAt(r.getVerifiedAt())
                .verificationNote(r.getVerificationNote())
                .mediaUrl(r.getMediaUrl())
                .latitude(lat).longitude(lon)
                .timestamp(r.getTimestamp())
                .isCritical(r.getIsCritical())
                .resolved(r.getResolved())
                .resolvedAt(r.getResolvedAt())
                .resolvedBy(r.getResolvedBy())
                .resolvedNote(r.getResolvedNote())
                .build();
    }

    public ObserverReport toEntity(ObserverReportCreateRequest req,
                                   Organization org, SystemUser observer,
                                   County county, PollingCenter center, District district) {
        ObserverReport r = new ObserverReport();
        r.setOrganization(org);
        r.setObserver(observer);
        r.setCounty(county);
        r.setDistrict(district);
        r.setPollingCenter(center);
        r.setType(ReportType.valueOf(req.getType())); // validate upstream if needed
        r.setDescription(req.getDescription());
        r.setVisibility(ObserverReportVisibility.PRIVATE);
        r.setVerificationStatus(ObserverReportVerificationStatus.PENDING);
        r.setMediaUrl(req.getMediaUrl());
        if (req.getTimestamp() != null) r.setTimestamp(req.getTimestamp());
        r.setResolved(false);

        if (req.getLatitude() != null && req.getLongitude() != null) {
            r.setGpsLocation(point(req.getLongitude(), req.getLatitude()));
        }
        return r;
    }

    public void apply(ObserverReportUpdateRequest req,
                      ObserverReport r,
                      County newCounty,
                      PollingCenter newCenter, District dist) {
        if (newCounty != null) r.setCounty(newCounty);
        if(dist != null) r.setDistrict(dist);
        if (newCenter != null) r.setPollingCenter(newCenter);
        if (req.getType() != null) r.setType(ReportType.valueOf(req.getType()));
        if (req.getDescription() != null) r.setDescription(req.getDescription());
        if (req.getMediaUrl() != null) r.setMediaUrl(req.getMediaUrl());
        if (req.getTimestamp() != null) r.setTimestamp(req.getTimestamp());
//        if (req.getResolved() != null) r.setResolved(req.getResolved());

        if (req.getLatitude() != null && req.getLongitude() != null) {
            r.setGpsLocation(point(req.getLongitude(), req.getLatitude()));
        }
    }

    private static Point point(double lon, double lat) {
        Coordinate c = new Coordinate(lon, lat);
        Point p = GF.createPoint(c);
        p.setSRID(4326);
        return p;
    }

}
