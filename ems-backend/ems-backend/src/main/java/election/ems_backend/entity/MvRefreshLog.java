package election.ems_backend.entity;

import election.ems_backend.enums.RefreshStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Tracks refresh history for materialized views.
 */
@Entity
@Table(name = "mv_refresh_log")
@Getter
@Setter
@NoArgsConstructor
public class MvRefreshLog {

    @Id
    @Column(name = "mv_name", length = 200, nullable = false)
    private String mvName;

    @Column(name = "last_refreshed")
    private LocalDateTime lastRefreshed;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "status", length = 20)
    private RefreshStatus status = RefreshStatus.UNKNOWN;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;
}
