package election.ems_backend.utility;

import election.ems_backend.enums.MfaMethod;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MfaStatusResponse {
    private boolean enabled;
    private MfaMethod method;
}