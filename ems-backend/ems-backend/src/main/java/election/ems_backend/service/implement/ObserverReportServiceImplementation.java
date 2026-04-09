package election.ems_backend.service.implement;


import election.ems_backend.dto.NotificationCreateRequest;
import election.ems_backend.dto.ObserverReportCreateRequest;
import election.ems_backend.dto.ObserverReportDto;
import election.ems_backend.dto.ObserverReportUpdateRequest;
import election.ems_backend.entity.*;
import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.enums.NotificationPriority;
import election.ems_backend.enums.NotificationType;
import election.ems_backend.mapper.ObserverReportMapper;
import election.ems_backend.repository.*;
import election.ems_backend.service.FileUploadService;
import election.ems_backend.service.NotificationService;
import election.ems_backend.service.ObserverReportService;
import election.ems_backend.utility.ObserverReportSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class ObserverReportServiceImplementation implements ObserverReportService {

    private final ObserverReportRepository repo;
    private final OrganizationRepository orgRepo;
    private final SystemUserRepository userRepo;
    private final CountyRepository countyRepo;
    private final DistrictRepository districtRepository;
    private final PollingCenterRepository centerRepo;
    private final FileUploadService fileUploadService;
    private final NotificationService notificationService;

    private final ObserverReportMapper mapper = new ObserverReportMapper();


    @Override
    public ObserverReportDto create(ObserverReportCreateRequest req, List<MultipartFile> files) {
        Organization org = orgRepo.findById(req.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Organization not found"));
        SystemUser observer = userRepo.findById(req.getObserverId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Observer not found"));

        County county = null;
        District district = null;
        PollingCenter center = null;

        if (req.getCenterId() != null) {

            center = centerRepo.findById(req.getCenterId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));

            district = center.getDistrict();
            county = district.getCounty();

        } else if (req.getDistrictId() != null) {

            district = districtRepository.findById(req.getDistrictId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "District not found"));

            county = district.getCounty();

        } else if (req.getCountyId() != null) {

            county = countyRepo.findById(req.getCountyId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "County not found"));
        }

        if ((req.getLatitude() == null) ^ (req.getLongitude() == null)) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Both latitude and longitude are required for GPS"
            );
        }

        ObserverReport saved = repo.save(
                mapper.toEntity(req, org, observer, county,  center, district)
        );

        // --- FILE UPLOADS (optional evidence) ---
        if (files != null && !files.isEmpty()) {
            // related_table = "observer_report"
            fileUploadService.saveAllForEntity(
                    org,
                    "observer_report",
                    saved.getReportId(),
                    observer,               // uploaded_by
                    files,
                    Map.of("category", "EVIDENCE") // optional tags/metadata
            );
        }

        // --- NOTIFICATION to the observer (IN_APP + EMAIL) ---
        // Use idempotency so duplicates don’t happen on retries
        notify(
                org.getOrgId(), observer.getUserId(),
                NotificationType.ALERT,
                "Observer Report Submitted",
                buildReportMessage(saved, center),
                "observer_report", saved.getReportId(),
                NotificationPriority.NORMAL,
                EnumSet.of(DeliveryMethod.IN_APP, DeliveryMethod.EMAIL),
                "obs-" + saved.getReportId() + "-created"
        );

        return mapper.toDTO(saved);
    }


    @Override
    public ObserverReportDto update(UUID reportId, ObserverReportUpdateRequest req, List<MultipartFile> filesToAppend) {
        ObserverReport entity = repo.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Report not found"));

        County newCounty = null;
        District district = null;
        PollingCenter newCenter = null;

        if (req.getCenterId() != null) {
            newCenter = centerRepo.findById(req.getCenterId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));
            district = newCenter.getDistrict();
            newCounty = district.getCounty();

        } else if (req.getDistrictId() != null) {
            district = districtRepository.findById(req.getDistrictId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "District not found"));
            newCounty = district.getCounty();

        } else if (req.getCountyId() != null) {
            newCounty = countyRepo.findById(req.getCountyId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "County not found"));
        }

        if ((req.getLatitude() == null) ^ (req.getLongitude() == null)) {
            throw new ResponseStatusException(BAD_REQUEST, "Both latitude and longitude are required for GPS");
        }

        mapper.apply(req, entity, newCounty,  newCenter, district);
        ObserverReport saved = repo.save(entity);

        // --- APPEND NEW EVIDENCE (if provided) ---
        if (filesToAppend != null && !filesToAppend.isEmpty()) {
            fileUploadService.saveAllForEntity(
                    saved.getOrganization(),
                    "observer_report",
                    saved.getReportId(),
                    saved.getObserver(),
                    filesToAppend,
                    Map.of("category", "EVIDENCE", "action", "APPEND")
            );
        }

        // --- NOTIFY observer (update) ---
        notify(
                saved.getOrganization().getOrgId(),
                saved.getObserver().getUserId(),
                NotificationType.ALERT,
                "Observer Report Updated",
                "Your observer report has been updated.",
                "observer_report", saved.getReportId(),
                NotificationPriority.LOW,
                EnumSet.of(DeliveryMethod.IN_APP, DeliveryMethod.EMAIL),
                "obs-" + saved.getReportId() + "-updated-" + saved.getTimestamp() // simple uniqueness
        );

        return mapper.toDTO(saved);
    }

    @Override
    public void delete(UUID reportId) {
        ObserverReport entity = repo.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Report not found"));

        repo.delete(entity);

        // --- NOTIFY observer (deleted) ---
        notify(
                entity.getOrganization().getOrgId(),
                entity.getObserver().getUserId(),
                NotificationType.ALERT,
                "Observer Report Deleted",
                "Your observer report was deleted.",
                "observer_report", entity.getReportId(),
                NotificationPriority.LOW,
                EnumSet.of(DeliveryMethod.IN_APP, DeliveryMethod.EMAIL),
                "obs-" + entity.getReportId() + "-deleted"
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ObserverReportDto get(UUID reportId) {
        return repo.findById(reportId).map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Report not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ObserverReportDto> search(UUID orgId, UUID observerId, UUID countyId, UUID centerId,
                                          String type, Boolean resolved, LocalDateTime from, LocalDateTime to,
                                          String q, Pageable pageable) {
        Specification<ObserverReport> spec = Specification
                .where(ObserverReportSpecs.orgEquals(orgId))
                .and(ObserverReportSpecs.observerEquals(observerId))
                .and(ObserverReportSpecs.countyEquals(countyId))
                .and(ObserverReportSpecs.centerEquals(centerId))
                .and(ObserverReportSpecs.typeEquals(type))
                .and(ObserverReportSpecs.resolvedEquals(resolved))
                .and(ObserverReportSpecs.between(from, to))
                .and(ObserverReportSpecs.textSearch(q));
        return repo.findAll(spec, pageable).map(mapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ObserverReportDto> near(UUID orgId, double lat, double lon, double meters) {
        return repo.findNear(orgId, lon, lat, meters).stream().map(mapper::toDTO).toList();
    }


    private String buildReportMessage(ObserverReport r, PollingCenter center) {
        String where = (center != null)
                ? center.getCenterName()
                : (r.getCounty() != null ? r.getCounty().getCountyName() : "unspecified location");
        return "Report type: " + r.getType() + " at " + where + ".";
    }

    private void notify(UUID orgId, UUID userId,
                        NotificationType type, String title, String message,
                        String relatedTable, UUID relatedId,
                        NotificationPriority priority,
                        Set<DeliveryMethod> channels,
                        String idempotencyKey) {

        NotificationCreateRequest req = NotificationCreateRequest.builder()
                .orgId(orgId)
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .relatedTable(relatedTable)
                .relatedId(relatedId)
                .priority(priority != null ? priority : NotificationPriority.NORMAL)
                .channels((channels == null || channels.isEmpty())
                        ? EnumSet.of(DeliveryMethod.IN_APP)
                        : EnumSet.copyOf(channels))
                .idempotencyKey(idempotencyKey)
                .build();

        notificationService.publish(req);
    }

}