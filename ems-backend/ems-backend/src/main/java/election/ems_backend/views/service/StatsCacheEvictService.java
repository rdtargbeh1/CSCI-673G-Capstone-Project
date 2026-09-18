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
 * Centralized cache eviction service for election/result statistics.
 *
 * Result cache keys currently use two major formats:
 *
 * Party / tenant views:
 *
 *     <orgId>:<electionId>:...
 *
 * Official views:
 *
 *     <electionId>:...
 *
 * Operational users are not cached by the result services, but cached
 * administrator/non-operational results must still be invalidated when
 * underlying result data changes.
 */
@Service
@RequiredArgsConstructor
public class StatsCacheEvictService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    StatsCacheEvictService.class
            );

    private final CacheManager cacheManager;


    /*
     * Keep synchronized with @Cacheable value names used by
     * result/statistics services.
     */
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
     * Clears every known statistics/result cache.
     *
     * Use this when:
     *
     * - many result dimensions may have changed
     * - the affected organization/election cannot be determined
     * - a large recomputation occurred
     * - targeted eviction cannot be expressed safely
     */
    @Transactional
    public void evictAllStatsCaches() {

        log.debug(
                "Evicting all statistics caches"
        );

        for (String cacheName : CACHE_NAMES) {

            org.springframework.cache.Cache cache =
                    cacheManager.getCache(
                            cacheName
                    );

            if (cache == null) {
                continue;
            }

            try {

                cache.clear();

            } catch (Exception ex) {

                log.warn(
                        "Failed to clear cache '{}' directly; attempting fallback: {}",
                        cacheName,
                        ex.getMessage()
                );

                tryEvictAllEntriesFallback(
                        cache
                );
            }
        }
    }


    /**
     * Evicts cached statistics for one organization/election.
     *
     * Handles both cache-key families:
     *
     * Party/tenant:
     *
     *     <orgId>:<electionId>:...
     *
     * Official:
     *
     *     <electionId>:...
     *
     * Therefore a write affecting an election cannot leave the official
     * cache stale simply because the write originated from a tenant org.
     */
    @Transactional
    public void evictOrgElectionCaches(
            UUID orgId,
            UUID electionId
    ) {

        Objects.requireNonNull(
                orgId,
                "orgId is required"
        );

        Objects.requireNonNull(
                electionId,
                "electionId is required"
        );


        final String orgElectionPrefix =
                orgId + ":" + electionId + ":";

        final String officialElectionPrefix =
                electionId + ":";


        log.debug(
                "Evicting statistics caches for orgId={} electionId={}",
                orgId,
                electionId
        );


        evictMatchingKeys(
                key ->
                        key.startsWith(
                                orgElectionPrefix
                        )
                                ||
                                key.startsWith(
                                        officialElectionPrefix
                                )
        );
    }


    /**
     * Evicts cached entries affected by a change involving one center.
     *
     * IMPORTANT:
     *
     * Center IDs are not always the third cache-key segment. Existing
     * result cache keys may look like:
     *
     *     org:election:contest:county:district:center:...
     *
     * or:
     *
     *     election:contest:county:district:center:...
     *
     * Therefore prefixing:
     *
     *     org:election:center:
     *
     * is not reliable.
     *
     * This method first restricts the key to the requested election/org,
     * then checks whether the center UUID appears as an exact key segment.
     */
    @Transactional
    public void evictOrgElectionCenterCaches(
            UUID orgId,
            UUID electionId,
            UUID centerId
    ) {

        Objects.requireNonNull(
                orgId,
                "orgId is required"
        );

        Objects.requireNonNull(
                electionId,
                "electionId is required"
        );

        Objects.requireNonNull(
                centerId,
                "centerId is required"
        );


        final String orgElectionPrefix =
                orgId + ":" + electionId + ":";

        final String officialElectionPrefix =
                electionId + ":";

        final String centerToken =
                centerId.toString();


        log.debug(
                "Evicting statistics caches for orgId={} electionId={} centerId={}",
                orgId,
                electionId,
                centerId
        );


        evictMatchingKeys(
                key -> {

                    boolean electionMatch =
                            key.startsWith(
                                    orgElectionPrefix
                            )
                                    ||
                                    key.startsWith(
                                            officialElectionPrefix
                                    );

                    if (!electionMatch) {
                        return false;
                    }

                    return containsExactSegment(
                            key,
                            centerToken
                    );
                }
        );
    }


    /**
     * Evicts every cache entry associated with an election.
     *
     * This covers:
     *
     * Official cache keys:
     *
     *     <electionId>:...
     *
     * Tenant cache keys:
     *
     *     <orgId>:<electionId>:...
     *
     * Since the organization ID is unknown here, the election ID is matched
     * as an exact cache-key segment rather than only as the first segment.
     */
    @Transactional
    public void evictByElection(
            UUID electionId
    ) {

        Objects.requireNonNull(
                electionId,
                "electionId is required"
        );


        final String electionToken =
                electionId.toString();


        log.debug(
                "Evicting statistics caches for electionId={}",
                electionId
        );


        evictMatchingKeys(
                key ->
                        containsExactSegment(
                                key,
                                electionToken
                        )
        );
    }


    /**
     * Applies a key-matching predicate to every known cache.
     *
     * If the underlying cache exposes Caffeine's map, matching entries
     * are removed individually.
     *
     * If targeted access is unavailable, the whole cache is cleared
     * because retaining potentially stale election results is less safe
     * than broader eviction.
     */
    private void evictMatchingKeys(
            java.util.function.Predicate<String> matcher
    ) {

        for (String cacheName : CACHE_NAMES) {

            org.springframework.cache.Cache cache =
                    cacheManager.getCache(
                            cacheName
                    );

            if (cache == null) {
                continue;
            }


            try {

                Object nativeCache =
                        cache.getNativeCache();


                if (nativeCache instanceof
                        com.github.benmanes.caffeine.cache.Cache<?, ?> caffeine) {

                    @SuppressWarnings("unchecked")
                    ConcurrentMap<Object, Object> map =
                            (ConcurrentMap<Object, Object>)
                                    caffeine.asMap();


                    Set<Object> keys =
                            map.keySet();


                    for (Object rawKey : keys) {

                        if (!(rawKey instanceof String key)) {
                            continue;
                        }

                        if (!matcher.test(key)) {
                            continue;
                        }


                        log.trace(
                                "Evicting key '{}' from cache '{}'",
                                key,
                                cacheName
                        );


                        map.remove(
                                rawKey
                        );
                    }

                } else {

                    /*
                     * Unknown cache implementation.
                     *
                     * Clear the entire individual cache rather than
                     * risk leaving stale aggregate results.
                     */
                    log.debug(
                            "Cache '{}' does not expose a Caffeine map; clearing whole cache",
                            cacheName
                    );

                    cache.clear();
                }

            } catch (Exception ex) {

                log.warn(
                        "Targeted eviction failed for cache '{}': {}. Clearing whole cache.",
                        cacheName,
                        ex.getMessage()
                );

                try {

                    cache.clear();

                } catch (Exception clearException) {

                    log.error(
                            "Unable to clear cache '{}' during eviction fallback: {}",
                            cacheName,
                            clearException.getMessage()
                    );
                }
            }
        }
    }


    /**
     * Tests whether a colon-delimited cache key contains a value
     * as a complete segment.
     *
     * This avoids accidental partial UUID matching.
     */
    private boolean containsExactSegment(
            String key,
            String expectedSegment
    ) {

        if (key == null || key.isBlank()) {
            return false;
        }

        if (expectedSegment == null || expectedSegment.isBlank()) {
            return false;
        }


        String[] segments =
                key.split(
                        ":",
                        -1
                );


        for (String segment : segments) {

            if (expectedSegment.equals(segment)) {
                return true;
            }
        }


        return false;
    }


    /**
     * Best-effort fallback used when Cache.clear() fails.
     */
    private void tryEvictAllEntriesFallback(
            org.springframework.cache.Cache cache
    ) {

        try {

            Object nativeCache =
                    cache.getNativeCache();


            if (nativeCache instanceof
                    com.github.benmanes.caffeine.cache.Cache<?, ?> caffeine) {

                caffeine
                        .asMap()
                        .clear();

            } else {

                cache.clear();
            }

        } catch (Exception ex) {

            log.debug(
                    "Fallback cache eviction failed: {}",
                    ex.getMessage()
            );
        }
    }
}