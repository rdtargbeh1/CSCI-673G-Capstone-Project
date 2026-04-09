package election.ems_backend.service;

import election.ems_backend.dto.MfaProvisionResponse;
import election.ems_backend.utility.MfaStatusResponse;

import java.util.UUID;

public interface UserMfaService {
    /** Start TOTP provisioning (returns otpauth URL & base32 secret ONCE) */
    MfaProvisionResponse provisionTotp(UUID userId, String issuer);

    /** Verify a TOTP code and enable MFA for the user */
    void verifyAndEnableTotp(UUID userId, String code);

    /** Disable MFA completely */
    void disable(UUID userId);

    /** Current status */
    MfaStatusResponse status(UUID userId);
}
