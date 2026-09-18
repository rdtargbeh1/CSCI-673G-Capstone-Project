package election.ems_backend.config;

import election.ems_backend.tenant.TenantContext;
import org.jboss.logging.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.Map;
import java.util.concurrent.Executor;

/**
 * Async configuration for recompute worker. Tune pool sizes for production workload.
 *
 * Security hardening:
 * - Propagate TenantContext + MDC into pooled async threads
 * - Always clear them to avoid cross-request / cross-tenant leakage
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean
    public TaskDecorator tenantMdcTaskDecorator() {
        return runnable -> {
            // Capture context from the submitting thread
            TenantContext parentCtx = TenantContext.get();

            // jboss MDC supports getMap(); it can be null
            @SuppressWarnings("unchecked")
            Map<String, Object> parentMdc = MDC.getMap();

            return () -> {
                try {
                    // Apply TenantContext (best-effort, do not crash if null)
                    if (parentCtx != null) {
                        TenantContext.set(
                                parentCtx.userId().orElse(null),
                                parentCtx.orgId().orElse(null),
                                parentCtx.isSystemAdmin()
                                // If you later add necAdmin to TenantContext,
                                // you can extend this call to the 4-arg setter.
                        );
                    }

                    // Apply MDC
                    if (parentMdc != null) {
                        for (Map.Entry<String, Object> e : parentMdc.entrySet()) {
                            if (e.getKey() != null && e.getValue() != null) {
                                MDC.put(e.getKey(), String.valueOf(e.getValue()));
                            }
                        }
                    }

                    runnable.run();
                } finally {
                    // Always clear to avoid leaking into next task on the same pooled thread
                    TenantContext.clear();
                    MDC.clear();
                }
            };
        };
    }

    /**
     * Executor used by @Async("voteExecutor") throughout the vote submission/tally flow.
     * Tune pool sizes for your environment.
     */
    @Bean(name = "voteExecutor")
    public Executor voteExecutor(TaskDecorator tenantMdcTaskDecorator) {
        ThreadPoolTaskExecutor t = new ThreadPoolTaskExecutor();
        t.setCorePoolSize(8);
        t.setMaxPoolSize(50);
        t.setQueueCapacity(500);
        t.setThreadNamePrefix("vote-recompute-");
        t.setTaskDecorator(tenantMdcTaskDecorator); // ✅ critical
        t.initialize();
        return t;
    }

    @Bean(name = "batchTaskExecutor")
    public Executor batchTaskExecutor(TaskDecorator tenantMdcTaskDecorator) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("batch-exec-");
        executor.setTaskDecorator(tenantMdcTaskDecorator); // ✅ critical
        executor.initialize();
        return executor;
    }

    @Bean(name = "reportTaskExecutor")
    public Executor reportTaskExecutor(TaskDecorator tenantMdcTaskDecorator) {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(2);
        exec.setMaxPoolSize(8);
        exec.setQueueCapacity(50);
        exec.setThreadNamePrefix("report-gen-");
        exec.setTaskDecorator(tenantMdcTaskDecorator); // ✅ critical
        exec.initialize();
        return exec;
    }
}


