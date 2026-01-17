package election.ems_backend.utility;

import lombok.Data;

@Data
public class MfaVerifyRequest {
    private String code; // 6-digit from authenticator app
}
