package election.ems_backend.repository;


import election.ems_backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID>, JpaSpecificationExecutor<Notification> {

    List<Notification> findByUser_UserIdAndIsReadFalseOrderByDateCreatedDesc(UUID userId);

    @Query("select count(n) from Notification n where n.user.userId = :userId and n.isRead = false")
    long countUnread(@Param("userId") UUID userId);


    @Modifying
    @Query("update Notification n set n.isRead = true, n.dateRead = CURRENT_TIMESTAMP " +
            "where n.notificationId in :ids and n.user.userId = :userId and n.isRead = false")
    int markRead(@Param("userId") UUID userId, @Param("ids") List<UUID> ids);

    @Modifying
    @Query("update Notification n set n.isSeen = true " +
            "where n.notificationId in :ids and n.user.userId = :userId and n.isSeen = false")
    int markSeen(@Param("userId") UUID userId, @Param("ids") List<UUID> ids);

    Optional<Notification> findByIdempotencyKey(String key);

    boolean existsByIdempotencyKey(String idempotencyKey);

    /**
     * ✅ Idempotent insert (Postgres):
     * Inserts a notification only if idempotency_key doesn't already exist.
     *
     * Returns:
     *  - 1 if inserted
     *  - 0 if conflict happened (already exists)
     *
     * IMPORTANT:
     * - Column names must match your notification table schema.
     * - Adjust column names below if yours differ.
     */
    @Modifying
    @Query(value = """
        INSERT INTO notification (
            notification_id,
            org_id,
            user_id,
            type,
            title,
            message,
            related_table,
            related_id,
            priority,
            delivery_methods,
            is_read,
            is_seen,
            idempotency_key,
            date_created
        )
        VALUES (
            :notificationId,
            :orgId,
            :userId,
            :type,
            :title,
            :message,
            :relatedTable,
            :relatedId,
            :priority,
            :deliveryMethods,
            false,
            false,
            :idempotencyKey,
            now()
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        """, nativeQuery = true)
    int insertIfAbsent(
            @Param("notificationId") UUID notificationId,
            @Param("orgId") UUID orgId,
            @Param("userId") UUID userId,
            @Param("type") String type,
            @Param("title") String title,
            @Param("message") String message,
            @Param("relatedTable") String relatedTable,
            @Param("relatedId") UUID relatedId,
            @Param("priority") String priority,
            @Param("deliveryMethods") String deliveryMethods,
            @Param("idempotencyKey") String idempotencyKey
    );

}
