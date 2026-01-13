package election.ems_backend.service;

import election.ems_backend.dto.NotificationCreateRequest;
import election.ems_backend.dto.NotificationDto;
import election.ems_backend.entity.Notification;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface NotificationService {

    List<NotificationDto> publish(NotificationCreateRequest req);



//    NotificationDto publish(NotificationCreateRequest req);                 // create + dispatch

    Page<NotificationDto> search(UUID orgId, UUID userId,
                                 NotificationType type, DeliveryMethod method, Boolean unread, Pageable pageable);
    long unreadCount(UUID userId);

    int markRead(UUID userId, List<UUID> ids);

    int markSeen(UUID userId, List<UUID> ids);


    Notification send(Organization org,
                      SystemUser recipient,
                      String type,
                      String title,
                      String message,
                      String relatedTable,
                      UUID relatedId);

    /** Helper for chat: send “New Message” to room members except the sender. */
    void notifyRoomMembersOnNewMessage(UUID roomId,
                                       UUID senderUserId,
                                       Organization org,
                                       String roomDisplayName,
                                       UUID messageId);



}