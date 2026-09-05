package election.ems_backend.config;


import com.zaxxer.hikari.HikariDataSource;
import election.ems_backend.tenant.TenantContext;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
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
 * Responsibilities:
 *
 * - Wraps the application's physical DataSource.
 * - Intercepts getConnection().
 * - Applies PostgreSQL session variables when TenantContext exists:
 *
 *      app.current_org
 *      app.is_system_admin
 *
 * - Clears those values before the connection is returned to the pool.
 *
 *
 * DEVELOPMENT / CURRENT MODE
 * ---------------------------------------------------------------
 *
 * app.datasource.tenant-aware=false
 *
 * This configuration is completely disabled and Spring Boot creates
 * its normal DataSource from spring.datasource.* properties.
 *
 *
 * TENANT-AWARE MODE
 * ---------------------------------------------------------------
 *
 * app.datasource.tenant-aware=true
 *
 * This configuration constructs the physical Hikari DataSource from
 * Spring Boot DataSourceProperties and wraps it with the tenant-aware
 * behavior below.
 *
 *
 * IMPORTANT:
 *
 * Tenant-aware mode is intentionally opt-in.
 */
@Configuration
@ConditionalOnProperty(
        prefix = "app.datasource",
        name = "tenant-aware",
        havingValue = "true",
        matchIfMissing = false
)
public class TenantAwareDataSourceConfig {

    private static final Logger log =
            LoggerFactory.getLogger(
                    TenantAwareDataSourceConfig.class
            );


    /**
     * Tracks wrapped connections.
     *
     * This is retained from the existing implementation.
     */
    private final Map<Connection, Connection> proxyMap =
            new ConcurrentHashMap<>();


    // ========================================================================
    // TENANT-AWARE DATASOURCE
    // ========================================================================

    /**
     * Creates the physical DataSource directly from Spring Boot's
     * configured DataSourceProperties and then wraps it.
     *
     * We intentionally DO NOT inject ObjectProvider<DataSource> here.
     *
     * Asking Spring for another DataSource while this DataSource itself
     * is being created can cause a circular dependency during
     * EntityManagerFactory initialization.
     */
    @Bean
    @Primary
    public DataSource tenantAwareDataSource(
            DataSourceProperties properties
    ) {

        HikariDataSource delegate =
                properties
                        .initializeDataSourceBuilder()
                        .type(HikariDataSource.class)
                        .build();


        /*
         * Preserve the configured Hikari pool name when useful for
         * diagnostics.
         */
        delegate.setPoolName(
                "TenantAwareHikariPool"
        );


        log.info(
                "Registering tenant-aware DataSource wrapping {}",
                delegate.getClass().getName()
        );


        return new TenantAwareDataSource(
                delegate
        );
    }


    // ========================================================================
    // CLEANUP
    // ========================================================================

    @PreDestroy
    public void cleanup() {

        proxyMap.clear();
    }


    // ========================================================================
    // TENANT-AWARE DATASOURCE WRAPPER
    // ========================================================================

    private class TenantAwareDataSource implements DataSource {

        private final DataSource delegate;


        TenantAwareDataSource(
                DataSource delegate
        ) {

            this.delegate =
                    delegate;
        }


        // ====================================================================
        // CONNECTION
        // ====================================================================

        @Override
        public Connection getConnection()
                throws SQLException {

            Connection real =
                    delegate.getConnection();


            return wrapConnection(
                    real
            );
        }


        @Override
        public Connection getConnection(
                String username,
                String password
        ) throws SQLException {

            Connection real =
                    delegate.getConnection(
                            username,
                            password
                    );


            return wrapConnection(
                    real
            );
        }


        // ====================================================================
        // WRAP CONNECTION
        // ====================================================================

        private Connection wrapConnection(
                Connection real
        ) throws SQLException {

            try {

                TenantContext ctx =
                        TenantContext.get();


                /*
                 * No tenant context:
                 *
                 * Return the real pooled connection unchanged.
                 */
                if (
                        ctx == null ||
                                (
                                        ctx.orgId().isEmpty() &&
                                                !ctx.isSystemAdmin()
                                )
                ) {

                    return real;
                }


                String org =
                        ctx
                                .orgId()
                                .map(
                                        Object::toString
                                )
                                .orElse(
                                        ""
                                );


                String isAdmin =
                        Boolean.toString(
                                ctx.isSystemAdmin()
                        );


                // ============================================================
                // APPLY CURRENT ORGANIZATION
                // ============================================================

                try (
                        PreparedStatement ps =
                                real.prepareStatement(
                                        "SELECT set_config(?, ?, false)"
                                )
                ) {

                    ps.setString(
                            1,
                            "app.current_org"
                    );


                    ps.setString(
                            2,
                            org
                    );


                    ps.execute();
                }


                // ============================================================
                // APPLY SYSTEM ADMIN FLAG
                // ============================================================

                try (
                        PreparedStatement ps =
                                real.prepareStatement(
                                        "SELECT set_config(?, ?, false)"
                                )
                ) {

                    ps.setString(
                            1,
                            "app.is_system_admin"
                    );


                    ps.setString(
                            2,
                            isAdmin
                    );


                    ps.execute();
                }


                // ============================================================
                // CONNECTION PROXY
                // ============================================================

                InvocationHandler handler =
                        (
                                proxy,
                                method,
                                args
                        ) -> {

                            String methodName =
                                    method.getName();


                            // =================================================
                            // CLOSE
                            // =================================================

                            if (
                                    "close".equals(
                                            methodName
                                    )
                            ) {

                                /*
                                 * Reset tenant information before returning
                                 * the physical connection to the Hikari pool.
                                 */
                                try {

                                    // -----------------------------------------
                                    // Clear organization
                                    // -----------------------------------------

                                    try (
                                            PreparedStatement ps =
                                                    real.prepareStatement(
                                                            "SELECT set_config(?, ?, false)"
                                                    )
                                    ) {

                                        ps.setString(
                                                1,
                                                "app.current_org"
                                        );


                                        ps.setString(
                                                2,
                                                ""
                                        );


                                        ps.execute();
                                    }


                                    // -----------------------------------------
                                    // Clear system-admin flag
                                    // -----------------------------------------

                                    try (
                                            PreparedStatement ps =
                                                    real.prepareStatement(
                                                            "SELECT set_config(?, ?, false)"
                                                    )
                                    ) {

                                        ps.setString(
                                                1,
                                                "app.is_system_admin"
                                        );


                                        ps.setString(
                                                2,
                                                "false"
                                        );


                                        ps.execute();
                                    }

                                } catch (
                                        SQLException ex
                                ) {

                                    log.warn(
                                            "Failed to reset tenant session variables on connection close: {}",
                                            ex.getMessage()
                                    );

                                } finally {

                                    proxyMap.remove(
                                            real
                                    );
                                }


                                try {

                                    return method.invoke(
                                            real,
                                            args
                                    );

                                } catch (
                                        Throwable throwable
                                ) {

                                    throw unwrapInvocationThrowable(
                                            throwable
                                    );
                                }
                            }


                            // =================================================
                            // ALL OTHER CONNECTION METHODS
                            // =================================================

                            try {

                                return method.invoke(
                                        real,
                                        args
                                );

                            } catch (
                                    Throwable throwable
                            ) {

                                throw unwrapInvocationThrowable(
                                        throwable
                                );
                            }
                        };


                Connection proxy =
                        (
                                Connection
                                )
                                Proxy.newProxyInstance(
                                        Connection.class.getClassLoader(),

                                        new Class[]{
                                                Connection.class
                                        },

                                        handler
                                );


                proxyMap.put(
                        real,
                        proxy
                );


                return proxy;

            } catch (
                    SQLException ex
            ) {

                log.warn(
                        "Tenant-aware connection setup failed: {}",
                        ex.getMessage()
                );


                /*
                 * Preserve existing behavior:
                 * SQL setup failures propagate to the caller.
                 */
                try {

                    real.close();

                } catch (
                        SQLException closeEx
                ) {

                    log.debug(
                            "Failed to close connection after tenant setup failure: {}",
                            closeEx.getMessage()
                    );
                }


                throw ex;
            }
        }


        // ====================================================================
        // INVOCATION EXCEPTION
        // ====================================================================

        private Throwable unwrapInvocationThrowable(
                Throwable throwable
        ) {

            return throwable.getCause() != null
                    ? throwable.getCause()
                    : throwable;
        }


        // ====================================================================
        // DATASOURCE DELEGATION
        // ====================================================================

        @Override
        public <T> T unwrap(
                Class<T> iface
        ) throws SQLException {

            return delegate.unwrap(
                    iface
            );
        }


        @Override
        public boolean isWrapperFor(
                Class<?> iface
        ) throws SQLException {

            return delegate.isWrapperFor(
                    iface
            );
        }


        @Override
        public java.io.PrintWriter getLogWriter()
                throws SQLException {

            return delegate.getLogWriter();
        }


        @Override
        public void setLogWriter(
                java.io.PrintWriter out
        ) throws SQLException {

            delegate.setLogWriter(
                    out
            );
        }


        @Override
        public void setLoginTimeout(
                int seconds
        ) throws SQLException {

            delegate.setLoginTimeout(
                    seconds
            );
        }


        @Override
        public int getLoginTimeout()
                throws SQLException {

            return delegate.getLoginTimeout();
        }


        @Override
        public java.util.logging.Logger getParentLogger() {

            try {

                return delegate.getParentLogger();

            } catch (
                    Exception ex
            ) {

                return java.util.logging.Logger.getGlobal();
            }
        }
    }
}