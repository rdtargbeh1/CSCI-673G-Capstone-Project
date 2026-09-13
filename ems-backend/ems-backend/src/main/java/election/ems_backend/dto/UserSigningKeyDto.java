package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserSigningKeyDto {
    private UUID keyId;
    private UUID userId;
    private String kid;
    private String publicKey;
    private String algorithm;
    private boolean revoked;
    private LocalDateTime dateRevoked;
    private LocalDateTime dateCreated;
    private String metadata;
}
