package election.ems_backend.utility;

import election.ems_backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ChatMessageNotificationsListener {

    private final NotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageCreated(ChatMessageCreatedEvent evt) {
        // Delegate to your existing method (already handles member fetching & sends)
        notificationService.notifyRoomMembersOnNewMessage(
                evt.roomId(),
                evt.senderUserId(),
                evt.organization(),
                evt.roomDisplayName(),
                evt.messageId()
        );
    }
}