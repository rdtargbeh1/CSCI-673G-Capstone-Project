package election.ems_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PollingCenterCreateRequest {
    @NotBlank
    @Size(max = 150)
    private String centerName;

    @Min(0)
    private int registeredVoters;

    @NotNull
    private UUID districtId;
}