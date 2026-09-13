package election.ems_backend.integration;


import election.ems_backend.utility.ChatMessageCreatedEvent;
import election.ems_backend.utility.ChatMessageDeletedEvent;
import election.ems_backend.utility.ChatMessageEditedEvent;
import election.ems_backend.utility.ChatWsEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class ChatWsBroadcaster {

    private final SimpMessagingTemplate ws;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(ChatMessageCreatedEvent evt) {
        send(new ChatWsEvent(
                "chat_message_created",
                evt.roomId(),
                evt.messageId(),
                evt.senderUserId(),
                evt.organizationId(),
                evt.roomDisplayName(),
                evt.occurredAt()
        ));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(ChatMessageEditedEvent evt) {
        send(new ChatWsEvent(
                "chat_message_edited",
                evt.roomId(),
                evt.messageId(),
                evt.editorUserId(),
                evt.organizationId(),
                evt.roomDisplayName(),
                evt.occurredAt()
        ));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(ChatMessageDeletedEvent evt) {
        send(new ChatWsEvent(
                "chat_message_deleted",
                evt.roomId(),
                evt.messageId(),
                evt.deleterUserId(),
                evt.organizationId(),
                evt.roomDisplayName(),
                evt.occurredAt()
        ));
    }

    private void send(ChatWsEvent payload) {
        // ✅ No ambiguity, because payload is not a Map
        ws.convertAndSend("/topic/rooms/" + payload.roomId(), payload);
    }


}
