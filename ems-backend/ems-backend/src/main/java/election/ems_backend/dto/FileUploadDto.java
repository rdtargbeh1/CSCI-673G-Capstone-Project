package election.ems_backend.dto;

import election.ems_backend.enums.FileType;
import election.ems_backend.enums.StorageProvider;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class FileUploadDto {
    private UUID fileId;
    private UUID orgId;
    private String relatedTable;
    private UUID relatedId;
    private FileType fileType;
    private String fileUrl;
    private String mimeType;
    private Long sizeBytes;
    private String sha256;
    private StorageProvider storageProvider;
    private UUID uploadedBy;
    private LocalDateTime dateUpdated;
    private LocalDateTime deletedAt;
    private Map<String, Object> tags;
}
