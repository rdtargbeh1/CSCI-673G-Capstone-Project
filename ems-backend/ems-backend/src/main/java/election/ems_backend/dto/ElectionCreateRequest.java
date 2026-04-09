package election.ems_backend.dto;

import election.ems_backend.enums.ElectionType;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ElectionCreateRequest {
    @NotBlank
    @Size(max = 100)
    private String electionName;
    @Min(1847)
    @Max(2100)
    private int year;
    @NotNull
    private ElectionType electionType;
    private boolean isActive;
}
