package election.ems_backend.views.service;


import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentMap;

/**
 * Centralized cache eviction service.
 *
 * Use these methods from write-paths (vote_submission create/update/delete,
 * polling_center_allocation changes, candidate/party updates, etc.) to prevent
 * serving stale aggregated statistics.
 *
 * Two types of eviction supported:
 *  - evictAllStatsCaches(): clears all stats caches (simple, safe).
 *  - targeted evictions (evictOrgElectionCaches / evictOrgElectionCenterCaches):
 *      attempt to evict only cache entries whose key starts with the computed prefix
 *      (keys created by services follow the pattern: "<orgId>:<electionId>:...").
 *
 * Note: targeted eviction uses the native Caffeine cache's asMap() when available;
 * if a cache implementation does not expose a map of keys, the method falls back to
 * clearing the entire cache for safety.
 */
@Service
@RequiredArgsConstructor
public class StatsCacheEvictService {

    private static final Logger log = LoggerFactory.getLogger(StatsCacheEvictService.class);

    private final CacheManager cacheManager;

    // Keep this in sync with @Cacheable value names used across services
    private static final String[] CACHE_NAMES = new String[] {
            "candidateCenterStatsOfficial",
            "candidateDistrictStatsOfficial",
            "candidateCountyStatsOfficial",
            "candidateElectionStatsOfficial",
            "candidateCenterStatsParty",
            "candidateDistrictStatsParty",
            "candidateCountyStatsParty",
            "candidateElectionStatsParty",
            "centerStatsParty",
            "centerStatsOfficial",
            "districtStatsParty",
            "districtStatsOfficial",
            "countyStatsParty",
            "countyStatsOfficial",
            "electionStatsParty",
            "electionStatsOfficial",
            "necResultGeo",
            "candidateCountyCompare"
    };

    /**
     * Evict all entries from all stats caches. Simple and safe; use when writes affect many keys
     * or when you cannot compute targeted keys.
     */
    @Transactional
    public void evictAllStatsCaches() {
        log.debug("Evicting ALL stats caches");
        for (String cacheName : CACHE_NAMES) {
            org.springframework.cache.Cache c = cacheManager.getCache(cacheName);
            if (c != null) {
                try {
                    c.clear();
                } catch (Exception ex) {
                    log.warn("Failed to clear cache '{}' via clear(); attempting fallback removal: {}", cacheName, ex.getMessage());
                    tryEvictAllEntriesFallback(c);
                }
            }
        }
    }



    /**
     * Attempt to evict cache entries for a specific org + election across all stats caches.
     * This looks for keys that start with the "<orgId>:<electionId>:" prefix which is the
     * canonical key pattern used by the @Cacheable services.
     *
     * If the cache implementation is not Caffeine (or does not expose an asMap view),
     * the method will fall back to clearing the entire cache for safety.
     */
    @Transactional
    public void evictOrgElectionCaches(UUID orgId, UUID electionId) {
        Objects.requireNonNull(orgId, "orgId is required");
        Objects.requireNonNull(electionId, "electionId is required");

        final String prefix = orgId.toString() + ":" + electionId.toString() + ":";

        log.debug("Evicting stats caches for prefix={}", prefix);
        for (String cacheName : CACHE_NAMES) {
            org.springframework.cache.Cache c = cacheManager.getCache(cacheName);
            if (c == null) continue;
            try {
                Object nativeCache = c.getNativeCache();
                // Caffeine's Cache has asMap() we can iterate/remove keys from
                if (nativeCache instanceof com.github.benmanes.caffeine.cache.Cache) {
                    ConcurrentMap<Object, Object> map = ((com.github.benmanes.caffeine.cache.Cache<Object, Object>) nativeCache).asMap();
                    Set<Object> keys = map.keySet();
                    for (Object k : keys) {
                        if (k instanceof String && ((String) k).startsWith(prefix)) {
                            log.trace("Evicting key {} from cache {}", k, cacheName);
                            map.remove(k);
                        }
                    }
                } else {
                    // Fallback: clear entire cache if we can't target keys
                    log.debug("Cache '{}' does not expose Caffeine native cache; clearing whole cache as fallback", cacheName);
                    c.clear();
                }
            } catch (Exception ex) {
                log.warn("Failed targeted eviction for cache '{}': {}, clearing whole cache as fallback", cacheName, ex.getMessage());
                try {
                    c.clear();
                } catch (Exception e) {
                    log.error("Failed to clear cache '{}' during fallback eviction: {}", cacheName, e.getMessage());
                }
            }
        }
    }


    /**
     * Evict cache entries related to a specific org + election + center.
     * Useful when polling_center_allocation or polling_center rows change for a center.
     */
    @Transactional
    public void evictOrgElectionCenterCaches(UUID orgId, UUID electionId, UUID centerId) {
        Objects.requireNonNull(orgId, "orgId is required");
        Objects.requireNonNull(electionId, "electionId is required");
        Objects.requireNonNull(centerId, "centerId is required");

        final String prefix = orgId.toString() + ":" + electionId.toString() + ":" + centerId.toString() + ":";
        log.debug("Evicting stats caches for center prefix={}", prefix);

        for (String cacheName : CACHE_NAMES) {
            org.springframework.cache.Cache c = cacheManager.getCache(cacheName);
            if (c == null) continue;
            try {
                Object nativeCache = c.getNativeCache();
                if (nativeCache instanceof com.github.benmanes.caffeine.cache.Cache) {
                    ConcurrentMap<Object, Object> map = ((com.github.benmanes.caffeine.cache.Cache<Object, Object>) nativeCache).asMap();
                    Set<Object> keys = map.keySet();
                    for (Object k : keys) {
                        if (k instanceof String && ((String) k).startsWith(prefix)) {
                            log.trace("Evicting key {} from cache {}", k, cacheName);
                            map.remove(k);
                        }
                    }
                } else {
                    log.debug("Cache '{}' does not expose Caffeine native cache; clearing whole cache as fallback", cacheName);
                    c.clear();
                }
            } catch (Exception ex) {
                log.warn("Failed targeted eviction for cache '{}': {}, clearing whole cache as fallback", cacheName, ex.getMessage());
                try {
                    c.clear();
                } catch (Exception e) {
                    log.error("Failed to clear cache '{}' during fallback eviction: {}", cacheName, e.getMessage());
                }
            }
        }
    }


    @Transactional
    public void evictByElection(UUID electionId) {
        Objects.requireNonNull(electionId, "electionId is required");
        final String prefix = electionId.toString() + ":"; // matches services that use electionId as first key segment

        log.debug("Evicting stats caches for election prefix={}", prefix);
        for (String cacheName : CACHE_NAMES) {
            org.springframework.cache.Cache c = cacheManager.getCache(cacheName);
            if (c == null) continue;
            try {
                Object nativeCache = c.getNativeCache();
                if (nativeCache instanceof com.github.benmanes.caffeine.cache.Cache) {
                    ConcurrentMap<Object, Object> map = ((com.github.benmanes.caffeine.cache.Cache<Object, Object>) nativeCache).asMap();
                    Set<Object> keys = map.keySet();
                    for (Object k : keys) {
                        if (k instanceof String && ((String) k).startsWith(prefix)) {
                            log.trace("Evicting key {} from cache {}", k, cacheName);
                            map.remove(k);
                        }
                    }
                } else {
                    // Fallback: clear whole cache (safe but heavier)
                    log.debug("Cache '{}' does not expose Caffeine native cache; clearing whole cache as fallback", cacheName);
                    c.clear();
                }
            } catch (Exception ex) {
                log.warn("Failed targeted eviction for cache '{}': {}, clearing whole cache as fallback", cacheName, ex.getMessage());
                try {
                    c.clear();
                } catch (Exception e) {
                    log.error("Failed to clear cache '{}' during fallback eviction: {}", cacheName, e.getMessage());
                }
            }
        }
    }


    // Helper: try a best-effort removal of entries if clear() isn't available or fails
    private void tryEvictAllEntriesFallback(org.springframework.cache.Cache c) {
        try {
            Object nativeCache = c.getNativeCache();
            if (nativeCache instanceof com.github.benmanes.caffeine.cache.Cache) {
                ((com.github.benmanes.caffeine.cache.Cache<?, ?>) nativeCache).asMap().clear();
            } else {
                c.clear();
            }
        } catch (Exception ex) {
            log.debug("Fallback eviction failed: {}", ex.getMessage());
        }
    }


}