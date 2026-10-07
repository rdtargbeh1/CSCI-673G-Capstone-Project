package election.ems_backend.integration;

import java.util.UUID;

/**
 * Abstract signing service used to sign hex-encoded payloads (e.g., chain_hash).
 * Implementations should throw unchecked exceptions on failure so callers can decide handling semantics.
 */
public interface SigningService {

    /**
     * Sign a hex-encoded payload and return a SignResult containing signature (hex/base64)
     * and the key id used to sign.
     *
     * Implementations should throw runtime exceptions (e.g., SigningException) on failure.
     */
    SignResult signHex(String hexPayload);

    record SignResult(String signature, UUID keyId) {}
}