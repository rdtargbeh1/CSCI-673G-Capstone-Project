package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * UserSigningKey: stores public key metadata for a user's signing key.
 * Use this table to manage key lifecycle: creation, rotation, revocation.
 *
 * Columns:
 * - keyId: PK
 * - user: owner (optional, if you want key tied to a user)
 * - kid: key identifier used in signatures (kid)
 * - publicKey: PEM or base64 encoded public key material
 * - algorithm: e.g. "RS256"
 * - createdAt, revoked, revokedAt, metadata (jsonb)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "user_signing_key",
        indexes = {
                @Index(name = "idx_user_signing_key_user_id", columnList = "user_id"),
                @Index(name = "idx_user_signing_key_kid", columnList = "kid")
        }
)
public class UserSigningKey {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "key_id", nullable = false, updatable = false)
    private UUID keyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", foreignKey = @ForeignKey(name = "fk_signing_key_user"))
    private SystemUser user;

    @Column(name = "kid", length = 150)
    private String kid;

    @Lob
    @Column(name = "public_key", columnDefinition = "TEXT", nullable = false)
    private String publicKey;

    @Column(name = "algorithm", length = 50)
    private String algorithm;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    @Column(name = "revoked", nullable = false)
    private boolean revoked = false;

    @Column(name = "date_revoked")
    private LocalDateTime dateRevoked;

    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata; // optional JSON metadata
}