package election.ems_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TallySheetOcrUpdateRequest {
    @NotNull
    @NotBlank
    private String ocrExtracted; // JSON string (already serialized)
}
