package election.ems_backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Simple cache configuration using Caffeine.
 * districtStatsParty cache entries live for a short TTL to keep data fresh while reducing DB load.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public Caffeine<Object, Object> caffeineConfig() {
        return Caffeine.newBuilder()
                .expireAfterWrite(30, TimeUnit.SECONDS)
                .maximumSize(10_000);
    }

    @Bean
    public CacheManager cacheManager(Caffeine<Object, Object> caffeine) {
        CaffeineCacheManager cm = new CaffeineCacheManager();

        // ✅ Register ALL view caches used by @Cacheable(...)
        cm.setCacheNames(List.of(
                // ---- candidate stats (party) ----
                "candidateCountyStatsParty",
                "candidateDistrictStatsParty",
                "candidateCenterStatsParty",
                "candidateElectionStatsParty",

                // ---- candidate stats (official) ----
                "candidateCountyStatsOfficial",
                "candidateDistrictStatsOfficial",
                "candidateCenterStatsOfficial",
                "candidateElectionStatsOfficial",

                // ---- county stats ----
                "countyStatsParty",
                "countyStatsOfficial",

                // ---- district stats ----
                "districtStatsParty",
                "districtStatsOfficial",

                // ---- center stats ----
                "centerStatsParty",
                "centerStatsOfficial",

                // ---- election stats ----
                "electionStatsParty",
                "electionStatsOfficial",

                // ---- geo / compare / misc views ----
                "necResultGeo",
                "candidateCountyCompare"
        ));

        cm.setCaffeine(caffeine);
        return cm;
    }

//    @Bean
//    public Caffeine<Object, Object> caffeineConfig() {
//        return Caffeine.newBuilder()
//                .expireAfterWrite(30, TimeUnit.SECONDS)   // short TTL; adjust per requirements
//                .maximumSize(10_000);
//    }
//
//    @Bean
//    public CacheManager cacheManager(Caffeine<Object, Object> caffeine) {
//        CaffeineCacheManager cm = new CaffeineCacheManager("districtStatsParty");
//        cm.setCaffeine(caffeine);
//        return cm;
//    }


}