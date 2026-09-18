package election.ems_backend.entity;


import election.ems_backend.enums.RoleName;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "user_role",
        uniqueConstraints = @UniqueConstraint(name = "uq_user_role_name", columnNames = "role_name")
)
public class UserRole {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "role_id", nullable = false, updatable = false)
    private UUID roleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_name", nullable = false, length = 30)
    private RoleName roleName;

    @Column(name = "description", length = 250)
    private String description;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    @UpdateTimestamp
    @Column(name = "date_updated")
    private LocalDateTime dateUpdated;

    /**
     * Mark roles created by the platform (seeded/core roles) as builtin to prevent deletion.
     * Application logic and DB admins can use this flag to protect core roles.
     */
    @Column(name = "is_builtin", nullable = false)
    private boolean isBuiltin = false;


    // Optional builder for controlled construction (no relations here, so it's safe)
    @Builder(toBuilder = true)
    public UserRole(RoleName roleName, String description, boolean isBuiltin) {
        this.roleName = roleName;
        this.description = description;
        this.isBuiltin = isBuiltin;
    }

}
