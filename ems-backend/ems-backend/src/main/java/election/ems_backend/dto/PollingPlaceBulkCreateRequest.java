package election.ems_backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PollingPlaceBulkCreateRequest {

    @NotNull
    private UUID centerId;

    @NotBlank
    @Size(max = 80)
    private String labelPrefix;

    @NotNull
    @Min(1)
    @Max(50)
    private Integer quantity;
}