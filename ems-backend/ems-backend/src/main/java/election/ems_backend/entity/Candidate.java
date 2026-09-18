package election.ems_backend.entity;


import election.ems_backend.security.BaseAuditedEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(name = "candidate")
public class Candidate extends BaseAuditedEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "candidate_id", updatable = false, nullable = false)
    private UUID candidateId;

    @Column(name = "full_name", nullable = false, length = 50)
    private String fullName;

    @Column(name = "position", length = 30)
    private String position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id", foreignKey = @ForeignKey(name = "fk_candidate_party_id_key"))
    private Party party;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "is_independent", nullable = false)
    private boolean independent = false;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    @UpdateTimestamp
    @Column(name = "date_updated")
    private LocalDateTime dateUpdated;


    @Override
    public String toString() {
        return fullName + (party != null ? " (" + party.getAbbreviation() + ")" : "");
    }
}
