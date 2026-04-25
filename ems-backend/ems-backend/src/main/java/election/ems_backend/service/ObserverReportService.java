package election.ems_backend.service;

import election.ems_backend.dto.*;
import election.ems_backend.entity.SystemUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ObserverReportService {

    ObserverReportDto create(ObserverReportCreateRequest req, List<MultipartFile> files);

    ObserverReportDto update(UUID reportId, ObserverReportUpdateRequest req, List<MultipartFile> filesToAppend);

    void delete(UUID reportId);

    ObserverReportDto get(UUID reportId);

    /**
     * ✅ SYSTEM ADMIN - See ALL reports
     */
    Page<ObserverReportDto> searchSystem(
            UUID observerId,
            UUID countyId,
            UUID centerId,
            String type,
            Boolean isCritical,
            Boolean resolved,
            String verificationStatus,
            String visibility,
            LocalDateTime from,
            LocalDateTime to,
            String q,
            Pageable pageable,
            SystemUser currentUser
    );


    Page<ObserverReportDto> search(
            UUID observerId,
            UUID countyId,
            UUID centerId,
            String type,
            Boolean isCritical,
            Boolean resolved,
            String verificationStatus,
            String visibility,
            LocalDateTime from,
            LocalDateTime to,
            String q,
            Pageable pageable,
            SystemUser currentUser,
            UUID orgId
    );

    Page<ObserverReportDto> searchNec(
            UUID observerId,
            UUID countyId,
            UUID centerId,
            String type,
            Boolean isCritical,
            Boolean resolved,
            String verificationStatus,
            String visibility,
            LocalDateTime from,
            LocalDateTime to,
            String q,
            Pageable pageable,
            SystemUser currentUser,
            UUID necOrgId
    );


    // Optional: spatial quick search (non-pageable)
    java.util.List<ObserverReportDto> near(UUID orgId, double lat, double lon, double meters);

    ObserverReportDto verifyReport(
            UUID reportId,
            ObserverReportVerificationRequest req
    );

//    ObserverReportDto verifyReport(UUID reportId, ObserverReportVerificationRequest req, SystemUser currentUser);

    ObserverReportDto resolveReport(UUID reportId, ObserverReportResolveRequest req,
            SystemUser currentUser
    );

}
