package election.ems_backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ObserverReportResolveRequest {

    @NotBlank
    private String note; // REQUIRED reason for resolution
}