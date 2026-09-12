package election.ems_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ObserverReportVerificationRequest {

    @NotNull
    private String status; // VERIFIED or REJECTED

    @NotNull
    private String note;

    private String visibility; // optional override (SHARED or PUBLIC)

    private Boolean isCritical;

}