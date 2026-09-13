package election.ems_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditBaseEntity {

    @CreatedDate
    @Column(name = "date_created", updatable = false, nullable = false)
    private LocalDateTime dateCreated;

    @LastModifiedDate
    @Column(name = "date_updated", nullable = false)
    private LocalDateTime dateUpdated;

    @CreatedBy
    @Column(name = "created_by", length = 120)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", length = 120)
    private String updatedBy;

    // Optional: soft delete / active flag (shared across entities)
    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    // Optional: optimistic locking to protect against concurrent edits
    @jakarta.persistence.Version
    @Column(name = "version", nullable = false)
    private Integer  version = 0;
}