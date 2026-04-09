package election.ems_backend.service;

import election.ems_backend.dto.ObserverReportCreateRequest;
import election.ems_backend.dto.ObserverReportDto;
import election.ems_backend.dto.ObserverReportUpdateRequest;
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

    Page<ObserverReportDto> search(UUID orgId, UUID observerId, UUID countyId, UUID centerId,
                                   String type, Boolean resolved, LocalDateTime from, LocalDateTime to,
                                   String q, Pageable pageable);

    // Optional: spatial quick search (non-pageable)
    java.util.List<ObserverReportDto> near(UUID orgId, double lat, double lon, double meters);

}
