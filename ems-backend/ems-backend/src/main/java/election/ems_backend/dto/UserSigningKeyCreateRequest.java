package election.ems_backend.dto;

import lombok.Data;

@Data
public class UserSigningKeyCreateRequest {
    private String kid;
    private String publicKey; // required
    private String algorithm; // optional, e.g. "RS256"
    private String metadata; // optional json string
}