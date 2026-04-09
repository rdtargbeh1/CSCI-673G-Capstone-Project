package election.ems_backend.config;


import election.ems_backend.utility.TenantContext;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tenant-aware DataSource wrapper.
 *
 * - Wraps the application's DataSource and intercepts getConnection().
 * - Applies session variables (app.current_org, app.is_system_admin) on the physical connection
 *   when a TenantContext is present.
 * - Clears those variables before the connection is closed (returned to the pool) to avoid leakage.
 *
 * Enable/disable with: app.datasource.tenant-aware=true|false (default: true).
 */
@Configuration
@ConditionalOnProperty(name = "app.datasource.tenant-aware", havingValue = "true", matchIfMissing = true)
public class TenantAwareDataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(TenantAwareDataSourceConfig.class);

    // small cache to track proxy <> real connection mapping (optional)
    private final Map<Connection, Connection> proxyMap = new ConcurrentHashMap<>();

    @Bean
    @Primary
    public DataSource tenantAwareDataSource(ObjectProvider<DataSource> delegateProvider) {
        DataSource delegate = delegateProvider.getIfAvailable();
        if (delegate == null) {
            throw new IllegalStateException("No DataSource available to wrap with tenant-aware behavior");
        }
        log.info("Registering TenantAwareDataSource wrapping {}", delegate.getClass().getName());
        return new TenantAwareDataSource(delegate);
    }

    @PreDestroy
    public void cleanup() {
        proxyMap.clear();
    }

    private class TenantAwareDataSource implements DataSource {

        private final DataSource delegate;

        TenantAwareDataSource(DataSource delegate) {
            this.delegate = delegate;
        }

        @Override
        public Connection getConnection() throws SQLException {
            Connection real = delegate.getConnection();
            return wrapConnection(real);
        }

        @Override
        public Connection getConnection(String username, String password) throws SQLException {
            Connection real = delegate.getConnection(username, password);
            return wrapConnection(real);
        }

        private Connection wrapConnection(Connection real) throws SQLException {
            try {
                TenantContext ctx = TenantContext.get();
                if (ctx == null || (ctx.orgId().isEmpty() && !ctx.isSystemAdmin())) {
                    // no tenant context — return raw connection
                    return real;
                }

                String org = ctx.orgId().map(Object::toString).orElse("");
                String isAdmin = Boolean.toString(ctx.isSystemAdmin());

                // Apply session variables on the physical connection
                try (PreparedStatement ps = real.prepareStatement("SELECT set_config(?, ?, false)")) {
                    ps.setString(1, "app.current_org");
                    ps.setString(2, org);
                    ps.execute();
                }
                try (PreparedStatement ps = real.prepareStatement("SELECT set_config(?, ?, false)")) {
                    ps.setString(1, "app.is_system_admin");
                    ps.setString(2, isAdmin);
                    ps.execute();
                }

                // Create proxy that clears session variables on close()
                InvocationHandler h = (proxy, method, args) -> {
                    String m = method.getName();
                    if ("close".equals(m)) {
                        // reset vars (best-effort) before closing/returning to pool
                        try {
                            try (PreparedStatement ps = real.prepareStatement("SELECT set_config(?, ?, false)")) {
                                ps.setString(1, "app.current_org");
                                ps.setString(2, "");
                                ps.execute();
                            }
                            try (PreparedStatement ps = real.prepareStatement("SELECT set_config(?, ?, false)")) {
                                ps.setString(1, "app.is_system_admin");
                                ps.setString(2, "false");
                                ps.execute();
                            }
                        } catch (SQLException e) {
                            log.warn("Failed to reset tenant session variables on connection close: {}", e.getMessage());
                        } finally {
                            proxyMap.remove(real);
                        }
                        return method.invoke(real, args);
                    }
                    // delegate all other calls
                    try {
                        return method.invoke(real, args);
                    } catch (Throwable t) {
                        throw t.getCause() != null ? t.getCause() : t;
                    }
                };

                Connection proxy = (Connection) Proxy.newProxyInstance(
                        Connection.class.getClassLoader(),
                        new Class[]{Connection.class},
                        h
                );
                proxyMap.put(real, proxy);
                return proxy;
            } catch (SQLException ex) {
                log.warn("Tenant-aware connection setup failed, returning raw connection: {}", ex.getMessage());
                throw ex;
            }
        }

        // Delegate remaining DataSource methods

        @Override
        public <T> T unwrap(Class<T> iface) throws SQLException {
            return delegate.unwrap(iface);
        }

        @Override
        public boolean isWrapperFor(Class<?> iface) throws SQLException {
            return delegate.isWrapperFor(iface);
        }

        @Override
        public java.io.PrintWriter getLogWriter() throws SQLException {
            return delegate.getLogWriter();
        }

        @Override
        public void setLogWriter(java.io.PrintWriter out) throws SQLException {
            delegate.setLogWriter(out);
        }

        @Override
        public void setLoginTimeout(int seconds) throws SQLException {
            delegate.setLoginTimeout(seconds);
        }

        @Override
        public int getLoginTimeout() throws SQLException {
            return delegate.getLoginTimeout();
        }

        @Override
        public java.util.logging.Logger getParentLogger() {
            try {
                return delegate.getParentLogger();
            } catch (Exception e) {
                return java.util.logging.Logger.getGlobal();
            }
        }
    }
}