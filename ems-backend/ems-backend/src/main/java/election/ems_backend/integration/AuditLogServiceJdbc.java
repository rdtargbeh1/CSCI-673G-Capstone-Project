package election.ems_backend.integration;


import election.ems_backend.dto.AuditLogDto;
import election.ems_backend.enums.ActivityType;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.tenant.AuditCurrentUser;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.data.domain.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.*;

/**
 * JDBC-backed AuditLogService implementation that conforms to the AuditLogService interface.
 *
 * Notes / assumptions:
 * - Table audit_log has columns:
 *     log_id UUID primary key,
 *     org_id UUID,
 *     user_id UUID,
 *     activity_type text,
 *     entity_affected text,
 *     action_description text,
 *     created_at timestamptz default now()
 *
 * - Uses gen_random_uuid() for the log_id (Postgres pgcrypto). If unavailable, switch to server-side UUID generation in Java.
 */
@Service
@Primary
@RequiredArgsConstructor
public class AuditLogServiceJdbc implements AuditLogService {


    private final AuditCurrentUser auditCurrentUser;
    private static final Logger log = LoggerFactory.getLogger(AuditLogServiceJdbc.class);

    private final JdbcTemplate jdbc;

    private static final RowMapper<AuditLogDto> ROW_MAPPER = new RowMapper<>() {
        @Override
        public AuditLogDto mapRow(ResultSet rs, int rowNum) throws SQLException {
            return AuditLogDto.builder()
                    .logId(rs.getString("log_id") != null ? UUID.fromString(rs.getString("log_id")) : null)
                    .orgId(rs.getString("org_id") != null ? UUID.fromString(rs.getString("org_id")) : null)
                    .userId(rs.getString("user_id") != null ? UUID.fromString(rs.getString("user_id")) : null)
                    .activityType(rs.getString("activity_type") != null ? ActivityType.valueOf(rs.getString("activity_type")) : null)
                    .entityAffected(rs.getString("entity_affected"))
                    .actionDescription(rs.getString("action_description"))
                    .dateCreated(rs.getTimestamp("date_created") != null ? rs.getTimestamp("date_created").toLocalDateTime() : null)
                    .build();
        }
    };

    /**
     * ✅ CRITICAL: audit must never break caller flows.
     * ✅ CRITICAL: isolate audit in its own transaction so failures never abort business tx.
     * ✅ CRITICAL: do ONE insert only (no "fallback insert" after a SQL error in Postgres).
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLogDto log(UUID orgId, UUID userId, ActivityType type, String entity, String description) {
        try {
            UUID id = UUID.randomUUID();

            String sql =
                    "INSERT INTO audit_log " +
                            "(log_id, org_id, user_id, activity_type, entity_affected, action_description, date_created) " +
                            "VALUES (?, ?, ?, ?, ?, ?, now())";

            jdbc.update(sql,
                    id,
                    orgId,
                    userId,
                    type == null ? null : type.name(),
                    entity,
                    description
            );

            return AuditLogDto.builder()
                    .logId(id)
                    .orgId(orgId)
                    .userId(userId)
                    .activityType(type)
                    .entityAffected(entity)
                    .actionDescription(description)
                    .dateCreated(LocalDateTime.now())
                    .build();

        } catch (Exception ex) {
            // audit must never break business flow
            log.warn("Audit log failed (ignored). orgId={}, userId={}, type={}, entity={}, err={}",
                    orgId, userId, type, entity, ex.getMessage(), ex);
            return null;
        }
    }

    @Override
    public AuditLogDto logAuto(ActivityType type, String entity, String description) {
        // Tenant request => OrgContext has orgId
        // System request => OrgContext is null
        UUID orgId = election.ems_backend.tenant.OrgContext.get();

        // Current authenticated user (may be null for system/background jobs)
        UUID userId = auditCurrentUser.userIdOrNull();

        // Reuse the existing JDBC writer
        return log(orgId, userId, type, entity, description);
    }

    @Override
    public AuditLogDto logWithOrg(UUID orgId, ActivityType type, String entity, String description) {
        UUID userId = auditCurrentUser.userIdOrNull();   // auto user
        return log(orgId, userId, type, entity, description); // force org
    }


    @Override
    public Page<AuditLogDto> search(UUID orgId, UUID userId, ActivityType type, LocalDateTime from, LocalDateTime to, String q, Pageable pageable) {
        // Build dynamic WHERE clause
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (orgId != null) {
            where.append(" AND org_id = ? ");
            params.add(orgId);
        }
        if (userId != null) {
            where.append(" AND user_id = ? ");
            params.add(userId);
        }
        if (type != null) {
            where.append(" AND activity_type = ? ");
            params.add(type.name());
        }
        if (from != null) {
            where.append(" AND date_created  >= ? ");
            params.add(java.sql.Timestamp.valueOf(from));
        }
        if (to != null) {
            where.append(" AND date_created  <= ? ");
            params.add(java.sql.Timestamp.valueOf(to));
        }
        if (StringUtils.hasText(q)) {
            where.append(" AND (entity_affected ILIKE ? OR action_description ILIKE ?) ");
            String like = "%" + q + "%";
            params.add(like);
            params.add(like);
        }

        // Count total
        String countSql = "SELECT COUNT(*) FROM audit_log " + where;
        long total = 0;
        try {
            total = jdbc.queryForObject(countSql, Long.class, params.toArray());
        } catch (EmptyResultDataAccessException ignored) {
        }

        // Determine sorting and pagination
        String orderBy = " ORDER BY date_created DESC ";
        if (pageable != null && pageable.getSort() != null) {
            List<String> orderClauses = new ArrayList<>();
            for (Sort.Order o : pageable.getSort()) {
                String prop = o.getProperty();
                String col;
                switch (prop) {
                    case "timestamp": col = "date_created"; break;
                    case "activityType": col = "activity_type"; break;
                    case "entityAffected": col = "entity_affected"; break;
                    default: col = "date_created"; break;
                }
                orderClauses.add(col + " " + (o.isAscending() ? "ASC" : "DESC"));
            }
            if (!orderClauses.isEmpty()) {
                orderBy = " ORDER BY " + String.join(", ", orderClauses) + " ";
            }
        }

        int page = (pageable == null) ? 0 : pageable.getPageNumber();
        int size = (pageable == null) ? 20 : pageable.getPageSize();
        int offset = page * size;

        String sql = "SELECT log_id, org_id, user_id, activity_type, entity_affected, action_description, date_created " +
                "FROM audit_log " + where + orderBy + " LIMIT ? OFFSET ?";

        params.add(size);
        params.add(offset);

        List<AuditLogDto> rows = jdbc.query(sql, ROW_MAPPER, params.toArray());

        return new PageImpl<>(rows, PageRequest.of(page, size, pageable == null ? Sort.by(Sort.Direction.DESC, "timestamp") : pageable.getSort()), total);
    }





    @Override
    public Page<AuditLogDto> searchSystemLogs(UUID userId,
                                              ActivityType type,
                                              LocalDateTime from,
                                              LocalDateTime to,
                                              String q,
                                              Pageable pageable) {

        // ✅ SYSTEM GLOBAL: org_id IS NULL
        StringBuilder where = new StringBuilder(" WHERE org_id IS NULL ");
        List<Object> params = new ArrayList<>();

        if (userId != null) {
            where.append(" AND user_id = ? ");
            params.add(userId);
        }
        if (type != null) {
            where.append(" AND activity_type = ? ");
            params.add(type.name());
        }

        // ✅ FIX: use date_created (match insert + select)
        if (from != null) {
            where.append(" AND date_created >= ? ");
            params.add(java.sql.Timestamp.valueOf(from));
        }
        if (to != null) {
            where.append(" AND date_created <= ? ");
            params.add(java.sql.Timestamp.valueOf(to));
        }

        if (StringUtils.hasText(q)) {
            where.append(" AND (entity_affected ILIKE ? OR action_description ILIKE ?) ");
            String like = "%" + q + "%";
            params.add(like);
            params.add(like);
        }

        String countSql = "SELECT COUNT(*) FROM audit_log " + where;
        long total = 0;
        try {
            total = jdbc.queryForObject(countSql, Long.class, params.toArray());
        } catch (EmptyResultDataAccessException ignored) {}

        String orderBy = " ORDER BY date_created DESC ";
        if (pageable != null && pageable.getSort() != null) {
            List<String> orderClauses = new ArrayList<>();
            for (Sort.Order o : pageable.getSort()) {
                String prop = o.getProperty();
                String col;
                switch (prop) {
                    case "timestamp":
                    case "dateCreated":
                        col = "date_created"; break;
                    case "activityType":
                        col = "activity_type"; break;
                    case "entityAffected":
                        col = "entity_affected"; break;
                    default:
                        col = "date_created"; break;
                }
                orderClauses.add(col + " " + (o.isAscending() ? "ASC" : "DESC"));
            }
            if (!orderClauses.isEmpty()) {
                orderBy = " ORDER BY " + String.join(", ", orderClauses) + " ";
            }
        }

        int page = (pageable == null) ? 0 : pageable.getPageNumber();
        int size = (pageable == null) ? 20 : pageable.getPageSize();
        int offset = page * size;

        String sql =
                "SELECT log_id, org_id, user_id, activity_type, entity_affected, action_description, date_created " +
                        "FROM audit_log " + where + orderBy + " LIMIT ? OFFSET ?";

        List<Object> pageParams = new ArrayList<>(params);
        pageParams.add(size);
        pageParams.add(offset);

        List<AuditLogDto> rows = jdbc.query(sql, ROW_MAPPER, pageParams.toArray());

        Sort sort = (pageable == null) ? Sort.by(Sort.Direction.DESC, "dateCreated") : pageable.getSort();
        return new PageImpl<>(rows, PageRequest.of(page, size, sort), total);
    }

}