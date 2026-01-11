package election.ems_backend.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Async configuration for recompute worker. Tune pool sizes for production workload.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Executor used by @Async("voteExecutor") throughout the vote submission/tally flow.
     * Tune pool sizes for your environment.
     */
    @Bean(name = "voteExecutor")
    public Executor voteExecutor() {
        ThreadPoolTaskExecutor t = new ThreadPoolTaskExecutor();
        t.setCorePoolSize(8);
        t.setMaxPoolSize(50);
        t.setQueueCapacity(500);
        t.setThreadNamePrefix("vote-recompute-");
        t.initialize();
        return t;
    }


    @Bean(name = "batchTaskExecutor")
    public Executor batchTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);   // tune per environment
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("batch-exec-");
        executor.initialize();
        return executor;
    }

    @Bean(name = "reportTaskExecutor")
    public Executor reportTaskExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(2);
        exec.setMaxPoolSize(8);
        exec.setQueueCapacity(50);
        exec.setThreadNamePrefix("report-gen-");
        exec.initialize();
        return exec;
    }

}