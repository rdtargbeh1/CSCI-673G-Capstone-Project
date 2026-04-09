package election.ems_backend.security;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * Inherit from this base class to automatically fill createdBy/updatedBy.
 * Combine with @CreatedDate/@LastModifiedDate elsewhere if you like.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseAuditedEntity {

    @CreatedBy
    @Column(name = "created_by", updatable = false, length = 255)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", length = 255)
    private String updatedBy;

    public String getCreatedBy() { return createdBy; }
    public String getUpdatedBy() { return updatedBy; }
}