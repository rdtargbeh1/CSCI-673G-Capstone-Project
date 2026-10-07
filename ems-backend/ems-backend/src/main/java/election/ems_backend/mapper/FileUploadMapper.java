package election.ems_backend.mapper;

import election.ems_backend.dto.FileUploadDto;
import election.ems_backend.entity.FileUpload;
import org.springframework.stereotype.Component;

@Component
public class FileUploadMapper {

    public FileUploadDto toDTO(
            FileUpload file
    ) {

        if (file == null) {
            return null;
        }


        return FileUploadDto
                .builder()
                .fileId(
                        file.getFileId()
                )
                .orgId(
                        file.getOrganization() != null
                                ? file.getOrganization().getOrgId()
                                : null
                )
                .relatedTable(
                        file.getRelatedTable()
                )
                .relatedId(
                        file.getRelatedId()
                )
                .fileType(
                        file.getFileType()
                )
                .fileUrl(
                        file.getFileUrl()
                )
                .mimeType(
                        file.getMimeType()
                )
                .sizeBytes(
                        file.getSizeBytes()
                )
                .sha256(
                        file.getSha256()
                )
                .storageProvider(
                        file.getStorageProvider()
                )
                .uploadedBy(
                        file.getUploadedBy() != null
                                ? file.getUploadedBy().getUserId()
                                : null
                )
                .dateUpdated(
                        file.getDateUpdated()
                )
                .deletedAt(
                        file.getDateDeleted()
                )
                .tags(
                        file.getTags()
                )
                .build();
    }
}