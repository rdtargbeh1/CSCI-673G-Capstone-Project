package election.ems_backend.integration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

/**
 * Development signing stub — deterministic pseudo-signature for local/test runs.
 * Active when app.security.kms.enabled=false (or missing).
 */
@Service
@ConditionalOnProperty(name = "app.security.kms.enabled", havingValue = "false", matchIfMissing = true)
public class SigningServiceDevStub implements SigningService {

    @Override
    public SignResult signHex(String hex) {
        if (hex == null) hex = "";
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] sig = md.digest(hex.getBytes(StandardCharsets.UTF_8));
            String signature = java.util.HexFormat.of().formatHex(sig);
            UUID devKeyId = UUID.fromString("00000000-0000-0000-0000-000000000001");
            return new SignResult("dev:" + signature, devKeyId);
        } catch (Exception e) {
            throw new RuntimeException("Dev signing failed", e);
        }
    }
}