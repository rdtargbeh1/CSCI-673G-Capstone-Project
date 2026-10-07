package election.ems_backend.repository;

import election.ems_backend.entity.ChatReadReceipt;
import election.ems_backend.utility.ChatReadReceiptId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatReadReceiptRepository extends JpaRepository<ChatReadReceipt, ChatReadReceiptId> {

    Optional<ChatReadReceipt> findByMessage_MessageIdAndUser_UserId(UUID messageId, UUID userId);

    List<ChatReadReceipt> findByMessage_MessageId(UUID messageId);

    long countByMessage_MessageId(UUID messageId);

    boolean existsByMessage_MessageIdAndUser_UserId(UUID messageId, UUID userId);
}
