package election.ems_backend.entity;

import election.ems_backend.enums.OrganizationType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor

@Entity
@Table(name = "organization", uniqueConstraints = {
        @UniqueConstraint(name = "uq_org_subdomain", columnNames = "subdomain")
})
public class Organization {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "org_id", nullable = false, updatable = false)
    private UUID orgId;


    @Size(max = 120)
    @Column(name = "org_name", nullable = false, length = 120)
    private String orgName;

    @Enumerated(EnumType.STRING)
    @Column(name = "org__type", nullable = false, length = 30)
    private OrganizationType organizationType;

    /**
     * If this tenant represents a specific national party (e.g. CDC as an org),
     * link it here. NGOs / Media / NEC usually keep this null.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "party_id",
            foreignKey = @ForeignKey(name = "organization_party_id_fkey")
    )
    private Party party;


    /** Branding & whitelabel */
    @Column(name = "logo_url")
    private String logoUrl;

    @Size(max = 20) // e.g., "#0A84FF" or rgba/short hex if you choose
    @Column(name = "primary_color", length = 9)
    private String primaryColor;

    @Column(name = "subdomain", unique = true, length = 63)
    private String subdomain;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    @PrePersist
    void prePersist() {
        if (dateCreated == null) dateCreated = LocalDateTime.now();
    }

    // convenience helpers
    public boolean isActive() { return isActive;}

}
