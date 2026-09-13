package election.ems_backend.nec;

import election.ems_backend.enums.OrganizationType;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DbNecOrgResolver implements NecOrgResolver {

    private final JdbcTemplate jdbc;

    @Override
    public UUID getNecOrgId() {
        return jdbc.queryForObject("""
                SELECT org_id
                FROM organization
                WHERE is_active = true
                  AND organization_type = ?
                LIMIT 1
                """, UUID.class, OrganizationType.NEC.name());
    }
}
