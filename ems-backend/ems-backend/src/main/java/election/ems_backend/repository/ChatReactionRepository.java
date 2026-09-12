package election.ems_backend.repository;

import election.ems_backend.entity.ChatReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatReactionRepository extends JpaRepository<ChatReaction, UUID> {

    Optional<ChatReaction> findByMessage_MessageIdAndUser_UserIdAndEmoji(UUID messageId, UUID userId, String emoji);

    List<ChatReaction> findByMessage_MessageId(UUID messageId);

    List<ChatReaction> findByMessage_MessageIdAndEmoji(UUID messageId, String emoji);

    long countByMessage_MessageIdAndEmoji(UUID messageId, String emoji);

    long countByMessage_MessageId(UUID messageId);
}
