package election.ems_backend.service.implement;

import election.ems_backend.service.PublishStagingService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.UUID;

/**
 * Performs per-row promotion by calling the DB function publish_nec_result(staging_id, actor_id)
 * in a separate transaction so individual row failures do not abort the entire batch.
 */
@Service
@RequiredArgsConstructor
public class PublishStagingServiceImpl implements PublishStagingService {

    private final JdbcTemplate jdbc;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void publishStagingRow(UUID stagingId, UUID actorUserId) {
        jdbc.execute((Connection conn) -> {
            try (PreparedStatement ps = conn.prepareStatement("SELECT publish_nec_result(?, ?)")) {
                ps.setObject(1, stagingId);
                ps.setObject(2, actorUserId);
                ps.execute();
            }
            return null;
        });
    }
}