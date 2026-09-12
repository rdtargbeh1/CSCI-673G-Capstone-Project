package election.ems_backend.mapper;

import election.ems_backend.dto.FileUploadDto;
import election.ems_backend.entity.FileUpload;
import org.springframework.stereotype.Component;

@Component
public class FileUploadMapper {
    public FileUploadDto toDTO(FileUpload f) {
        return FileUploadDto.builder()
                .fileId(f.getFileId())
                .orgId(f.getOrganization().getOrgId())
                .relatedTable(f.getRelatedTable())
                .relatedId(f.getRelatedId())
                .fileType(f.getFileType())
                .fileUrl(f.getFileUrl())
                .mimeType(f.getMimeType())
                .sizeBytes(f.getSizeBytes())
                .sha256(f.getSha256())
                .storageProvider(f.getStorageProvider())
                .uploadedBy(f.getUploadedBy().getUserId())
                .dateUpdated(f.getDateUpdated())
                .deletedAt(f.getDateDeleted())
                .tags(f.getTags())
                .build();
    }
}