package election.ems_backend.security;

import election.ems_backend.utility.TenantContext;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


/**
 * Aspect that synchronizes the current tenant context (Java thread)
 * with PostgreSQL session variables used for Row-Level Security (RLS).
 *
 * For every @Transactional method:
 *   - SET LOCAL app.current_org       = current tenant UUID (or empty)
 *   - SET LOCAL app.is_system_admin   = 'true'/'false'
 *
 * These variables are scoped to the current DB connection/transaction,
 * ensuring RLS policies are automatically enforced by Postgres.
 *
 * Example of matching Postgres RLS policy:
 *   CREATE POLICY tenant_isolation ON vote_table
 *   USING (organization_id::text = current_setting('app.current_org', true));
 *
 * The Aspect must run inside the same transaction context as the JPA session.
 */

@Aspect
@Component
@RequiredArgsConstructor
public class RlsTenantAspect {

    private final JdbcTemplate jdbc;

    /**
     * Runs before any public @Transactional method within your application package.
     * Adjust the package expression if your root package changes.
     */
    @Before("execution(public * Backend.ElectionVote..*(..)) && @annotation(transactional)")
    public void setRlsVariables(Transactional transactional) {
        TenantContext ctx = TenantContext.get();
        if (ctx == null) {
            // No tenant context → likely public/system operation; skip RLS vars
            return;
        }

        String isAdmin = Boolean.toString(ctx.isSystemAdmin());
        String org = ctx.orgId().map(Object::toString).orElse("");

        // Use set_config so we can use parameters.
        // set_config returns text (old value), so we use queryForObject and ignore the result.
        jdbc.queryForObject(
                "SELECT set_config('app.is_system_admin', ?, true)",
                String.class,
                isAdmin
        );

        jdbc.queryForObject(
                "SELECT set_config('app.current_org', ?, true)",
                String.class,
                org
        );
    }



}


