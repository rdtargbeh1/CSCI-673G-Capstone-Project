package election.ems_backend.dto;

import election.ems_backend.enums.MfaMethod;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MfaProvisionResponse {
    private MfaMethod method;
    /** otpauth URL for QR (Google Authenticator). Return only once at provisioning time. */
    private String otpauthUrl;
    /** Base32 secret (OPTIONAL to show once for backup); DO NOT store plaintext server-side */
    private String base32SecretOnce;
    private String issuer;
    private String accountLabel; // typically username or email
}