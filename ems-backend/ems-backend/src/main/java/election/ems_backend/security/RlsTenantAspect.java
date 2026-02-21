package election.ems_backend.security;

import election.ems_backend.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Aspect
@Component
@RequiredArgsConstructor
public class RlsTenantAspect {

    private final JdbcTemplate jdbc;

    @Before("@annotation(transactional) && execution(public * election.ems_backend..*(..))")
    public void setRlsVariables(Transactional transactional) {

        TenantContext ctx = TenantContext.get();

        boolean systemAdmin = (ctx != null) && ctx.isSystemAdmin();
        String org = (ctx != null) ? ctx.orgId().map(UUID::toString).orElse("") : "";
        String user = (ctx != null) ? resolveUserId(ctx) : "";
        boolean necAdmin = (ctx != null) && resolveIsNecAdmin(ctx);

        // ✅ IMPORTANT: set_config returns TEXT, so use queryForObject (not update)
        setConfig("app.is_system_admin", Boolean.toString(systemAdmin));
        setConfig("app.current_org", org);
        setConfig("app.current_user", user);
        setConfig("app.is_nec_admin", Boolean.toString(necAdmin));
    }

    private void setConfig(String key, String val) {
        // ignore returned old value
        jdbc.queryForObject(
                "SELECT set_config(?, ?, true)",
                String.class,
                key,
                val == null ? "" : val
        );
    }

    private String resolveUserId(TenantContext ctx) {
        try {
            Method m = ctx.getClass().getMethod("userId");
            Object v = m.invoke(ctx);

            if (v instanceof Optional<?> opt) {
                Object inner = opt.orElse(null);
                if (inner instanceof UUID u) return u.toString();
                if (inner instanceof String s && !s.isBlank()) return s.trim();
                return "";
            }

            if (v instanceof UUID u) return u.toString();
            if (v instanceof String s && !s.isBlank()) return s.trim();

        } catch (Exception ignore) {}

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null) return "";
            String name = auth.getName();
            if (name == null || name.isBlank()) return "";
            try {
                return UUID.fromString(name.trim()).toString();
            } catch (Exception ignored) {
                return "";
            }
        } catch (Exception ignore) {
            return "";
        }
    }

    private boolean resolveIsNecAdmin(TenantContext ctx) {
        try {
            Method m = ctx.getClass().getMethod("isNecAdmin");
            Object v = m.invoke(ctx);
            if (v instanceof Boolean b) return b;
            if (v != null) return Boolean.parseBoolean(v.toString());
        } catch (Exception ignore) {}

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || auth.getAuthorities() == null) return false;

            Collection<?> auths = auth.getAuthorities();
            for (Object a : auths) {
                String s = a.toString();
                if ("ROLE_NEC_ADMIN".equals(s) || "NEC_ADMIN".equals(s)) return true;
            }
        } catch (Exception ignore) {}

        return false;
    }

}




