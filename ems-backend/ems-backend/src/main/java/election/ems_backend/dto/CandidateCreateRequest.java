package election.ems_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class CandidateCreateRequest {
    @NotBlank
    @Size(max = 50)
    private String fullName;

    @Size(max = 30)
    private String position;

    // Optional: candidate may be independent
    private UUID partyId;

    private String photoUrl;

    private boolean isActive = true;

    private Boolean independent;
}