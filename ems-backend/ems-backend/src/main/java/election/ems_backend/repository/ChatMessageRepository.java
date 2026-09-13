package election.ems_backend.repository;

import election.ems_backend.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    @Query("""
        select m
        from ChatMessage m
        where m.room.roomId = :roomId
          and m.dateDeleted is null
        order by m.dateCreated desc, m.messageId desc
    """)
    Page<ChatMessage> findRecent(@Param("roomId") UUID roomId, Pageable pageable);

    @Query("""
        select m
        from ChatMessage m
        where m.room.roomId = :roomId
          and m.dateDeleted is null
          and m.dateCreated > :since
        order by m.dateCreated asc, m.messageId asc
    """)
    List<ChatMessage> findSince(@Param("roomId") UUID roomId,
                                @Param("since") LocalDateTime since);

    Optional<ChatMessage> findByClientGuid(UUID clientGuid);

    @EntityGraph(attributePaths = {"sender"})
    @Query("select m from ChatMessage m where m.messageId = :id")
    Optional<ChatMessage> fetchWithSender(@Param("id") UUID id);


    @Query("""
        select count(msg)
        from ChatMessage msg
        where msg.room.roomId = :roomId
          and msg.dateDeleted is null
          and msg.dateCreated > :since
    """)
    long countUnreadSince(@Param("roomId") UUID roomId,
                          @Param("since") LocalDateTime since);


}
