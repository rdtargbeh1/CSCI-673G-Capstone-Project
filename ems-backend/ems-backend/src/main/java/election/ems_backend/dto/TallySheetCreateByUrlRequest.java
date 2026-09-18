package election.ems_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class TallySheetCreateByUrlRequest {
    @NotNull
    private UUID orgId;
    @NotNull private UUID submissionId;
    @NotBlank
    @Size(min = 5, max = 2048)
    private String imageUrl;

    // Optional precomputed hash and OCR JSON
    private String fileSha256;
    private String ocrExtracted;
}
