package election.ems_backend.service;

import election.ems_backend.dto.FileUploadCreateRequest;
import election.ems_backend.dto.FileUploadDto;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Abstraction for storing uploaded files (tally sheets, photos).
 * Implementations should implement delete() and getProviderName().
 */

public interface FileUploadService {

    FileUploadDto uploadMultipart(FileUploadCreateRequest meta, MultipartFile file, UUID uploadedBy);

    FileUploadDto createByUrl(FileUploadCreateRequest req, UUID uploadedBy);

    List<FileUploadDto> list(UUID orgId, String relatedTable, UUID relatedId);

    void softDelete(UUID fileId, UUID requesterId);

    FileUploadDto get(UUID fileId);

    List<FileUploadDto> saveAllForEntity(
            Organization org,
            String relatedTable,
            UUID relatedId,
            SystemUser uploadedBy,
            List<MultipartFile> files,
            Map<String, Object> tags
    );

}
