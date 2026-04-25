package election.ems_backend.dto;

import election.ems_backend.enums.FileType;
import election.ems_backend.enums.StorageProvider;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class FileUploadCreateRequest {
    @NotNull
    private UUID orgId;
    @NotNull private String relatedTable;   // "vote_submission", "tally_sheet", etc.
    @NotNull private UUID relatedId;
    @NotNull private FileType fileType;
    @NotNull private StorageProvider storageProvider;

    // Use either multipart upload OR direct URL
    private String fileUrl;   // if provided, no multipart required

    // Optional hints
    private String mimeType;
    private Long sizeBytes;
    private String sha256;

    private Map<String, Object> tags;
}

