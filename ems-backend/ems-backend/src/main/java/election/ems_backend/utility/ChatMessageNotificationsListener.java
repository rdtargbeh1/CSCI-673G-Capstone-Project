package election.ems_backend.utility;

import election.ems_backend.entity.Organization;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ChatMessageNotificationsListener {

    private final NotificationService notificationService;
    private final OrganizationRepository organizationRepository;


    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageCreated(ChatMessageCreatedEvent evt) {

        Organization org = organizationRepository.findById(evt.organizationId())
                .orElseThrow(() -> new IllegalStateException("Organization not found: " + evt.organizationId()));

        notificationService.notifyRoomMembersOnNewMessage(
                evt.roomId(),
                evt.senderUserId(),
                org,
                evt.roomDisplayName(),
                evt.messageId()
        );
    }


}