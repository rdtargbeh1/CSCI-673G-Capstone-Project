package election.ems_backend.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.kms.model.MessageType;
import software.amazon.awssdk.services.kms.model.SignRequest;
import software.amazon.awssdk.services.kms.model.SignResponse;
import software.amazon.awssdk.services.kms.model.SigningAlgorithmSpec;

import java.util.Base64;
import java.util.UUID;

/**
 * AWS KMS-backed signer.
 *
 * Created only when property app.security.kms.enabled=true.
 *
 * Requirements (when enabled):
 *  - app.security.kms.key-id must be set
 *  - AWS credentials must be available (env vars, profile, instance role, etc.)
 */
@Service
@ConditionalOnProperty(name = "app.security.kms.enabled", havingValue = "true")
public class SigningServiceAwsKms implements SigningService {

    private final KmsClient kms;
    private final String keyId;
    private final SigningAlgorithmSpec algorithm;

    public SigningServiceAwsKms(
            KmsClient kms,
            @Value("${app.security.kms.key-id}") String keyId,
            @Value("${app.security.kms.algorithm:RSASSA_PSS_SHA_256}") String algorithmName
    ) {
        this.kms = kms;
        this.keyId = keyId;
        this.algorithm = SigningAlgorithmSpec.fromValue(algorithmName);
    }

    @Override
    public SignResult signHex(String hexPayload) {
        byte[] data = hexToBytes(hexPayload);

        SignRequest req = SignRequest.builder()
                .keyId(keyId)
                .signingAlgorithm(algorithm)
                .message(SdkBytes.fromByteArray(data))
                .messageType(MessageType.RAW)
                .build();

        SignResponse resp = kms.sign(req);
        byte[] sig = resp.signature().asByteArray();
        String signatureB64 = Base64.getEncoder().encodeToString(sig);

        UUID signerKeyId;
        try {
            signerKeyId = UUID.fromString(keyId);
        } catch (Exception e) {
            signerKeyId = UUID.nameUUIDFromBytes(keyId.getBytes());
        }

        return new SignResult(signatureB64, signerKeyId);
    }

    private static byte[] hexToBytes(String hex) {
        if (hex == null || hex.isEmpty()) return new byte[0];
        return java.util.HexFormat.of().parseHex(hex);
    }
}
