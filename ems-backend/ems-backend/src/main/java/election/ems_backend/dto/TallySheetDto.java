package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TallySheetDto {
    private UUID uploadId;

    private UUID orgId;
    private UUID submissionId;

    private String imageUrl;
    private String fileSha256;

    private LocalDateTime dateUploaded;
    private LocalDateTime lastUpdated;

    // Optional OCR payload (as JSON String)
    private String ocrExtracted;
}