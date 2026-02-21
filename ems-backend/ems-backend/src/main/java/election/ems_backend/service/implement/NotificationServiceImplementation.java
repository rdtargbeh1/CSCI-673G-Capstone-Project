package election.ems_backend.service.implement;


import election.ems_backend.dto.NotificationCreateRequest;
import election.ems_backend.dto.NotificationDto;
import election.ems_backend.entity.ChatRoomMember;
import election.ems_backend.entity.Notification;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.enums.NotificationPriority;
import election.ems_backend.enums.NotificationType;
import election.ems_backend.mapper.NotificationMapper;
import election.ems_backend.repository.ChatRoomMemberRepository;
import election.ems_backend.repository.NotificationRepository;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.service.NotificationSender;
import election.ems_backend.service.NotificationService;
import election.ems_backend.utility.NotificationSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImplementation implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final OrganizationRepository orgRepo;
    private final SystemUserRepository userRepo;
    private final NotificationSender sender;

    // ✅ FIX: inject Spring-managed mapper instead of new()
    private final NotificationMapper mapper;

    @Override
    public List<NotificationDto> publish(NotificationCreateRequest req) {
        Organization org = orgRepo.findById(req.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));

        SystemUser target = userRepo.findById(req.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        SystemUser creator = null;
        if (req.getCreatedBy() != null) {
            creator = userRepo.findById(req.getCreatedBy())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Creator not found"));
        }

        // Normalize channels: if absent, use single deliveryMethod or default IN_APP
        Set<DeliveryMethod> channels = (req.getChannels() != null && !req.getChannels().isEmpty())
                ? EnumSet.copyOf(req.getChannels())
                : EnumSet.of(req.getDeliveryMethod() != null ? req.getDeliveryMethod() : DeliveryMethod.IN_APP);

        // Persist ONE row (in-app record)
        DeliveryMethod persistedMethod = DeliveryMethod.IN_APP;

        String key = (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank())
                ? req.getIdempotencyKey().trim()
                : null;

        Notification saved;

        if (key != null) {
            try {
                Notification n = Notification.builder()
                        .organization(org)
                        .user(target)
                        .type(req.getType())
                        .title(req.getTitle())
                        .message(req.getMessage())
                        .relatedTable(req.getRelatedTable())
                        .relatedId(req.getRelatedId())
                        .priority(req.getPriority() != null ? req.getPriority() : NotificationPriority.NORMAL)
                        .deliveryMethod(persistedMethod)
                        .dateExpires(req.getDateExpires())
                        .createdBy(creator)
                        .idempotencyKey(key)
                        .build();

                saved = notificationRepository.save(n);

            } catch (DataIntegrityViolationException dup) {
                Notification existing = notificationRepository.findByIdempotencyKey(key)
                        .orElseThrow(() -> dup);
                return List.of(mapper.toDTO(existing));
            }
        } else {
            Notification n = Notification.builder()
                    .organization(org)
                    .user(target)
                    .type(req.getType())
                    .title(req.getTitle())
                    .message(req.getMessage())
                    .relatedTable(req.getRelatedTable())
                    .relatedId(req.getRelatedId())
                    .priority(req.getPriority() != null ? req.getPriority() : NotificationPriority.NORMAL)
                    .deliveryMethod(persistedMethod)
                    .dateExpires(req.getDateExpires())
                    .createdBy(creator)
                    .build();

            saved = notificationRepository.save(n);
        }

        // Dispatch side-effects for requested channels (EMAIL/SMS if configured)
        for (DeliveryMethod method : channels) {
            try {
                sender.send(
                        method,
                        target,
                        saved.getTitle(),
                        Optional.ofNullable(saved.getMessage()).orElse(saved.getTitle())
                );
            } catch (Exception ex) {
                // keep persisted IN_APP record even if transport fails
            }
        }

        return List.of(mapper.toDTO(saved));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationDto> search(UUID orgId, UUID userId,
                                        NotificationType type, DeliveryMethod method, Boolean unread,
                                        Pageable pageable) {

        Specification<Notification> spec = Specification
                .where(NotificationSpecs.orgEquals(orgId))
                .and(NotificationSpecs.userEquals(userId))
                .and(NotificationSpecs.typeEquals(type))
                .and(NotificationSpecs.methodEquals(method))
                .and(NotificationSpecs.unread(unread));

        return notificationRepository.findAll(spec, pageable).map(mapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notificationRepository.countUnread(userId);
    }

    @Override
    public int markRead(UUID userId, List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        return notificationRepository.markRead(userId, ids);
    }

    @Override
    public int markSeen(UUID userId, List<UUID> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        return notificationRepository.markSeen(userId, ids);
    }

    @Override
    @Transactional
    public Notification send(Organization org,
                             SystemUser recipient,
                             String type,
                             String title,
                             String message,
                             String relatedTable,
                             UUID relatedId) {

        Notification n = Notification.builder()
                .organization(org)
                .user(recipient)
                .type(NotificationType.valueOf(type))
                .title(title)
                .message(message)
                .relatedTable(relatedTable)
                .relatedId(relatedId)
                .deliveryMethod(DeliveryMethod.IN_APP)
                .priority(NotificationPriority.NORMAL)
                .build();

        return notificationRepository.save(n);
    }

    @Override
    @Transactional
    public void notifyRoomMembersOnNewMessage(UUID roomId,
                                              UUID senderUserId,
                                              Organization org,
                                              String roomDisplayName,
                                              UUID messageId) {

        List<SystemUser> recipients = chatRoomMemberRepository
                .findAllByRoom_RoomIdAndIsEnabledTrueAndMutedFalseAndUser_UserIdNot(roomId, senderUserId)
                .stream()
                .map(ChatRoomMember::getUser)
                .distinct()
                .toList();

        String title = "New Message";
        String msg = "New message in " + (roomDisplayName != null ? roomDisplayName : "this room");

        for (SystemUser u : recipients) {
            send(org, u, "CHAT", title, msg, "chat_message", messageId);
        }
    }
}





//import election.ems_backend.dto.NotificationCreateRequest;
//import election.ems_backend.dto.NotificationDto;
//import election.ems_backend.entity.ChatRoomMember;
//import election.ems_backend.entity.Notification;
//import election.ems_backend.entity.Organization;
//import election.ems_backend.entity.SystemUser;
//import election.ems_backend.enums.DeliveryMethod;
//import election.ems_backend.enums.NotificationPriority;
//import election.ems_backend.enums.NotificationType;
//import election.ems_backend.mapper.NotificationMapper;
//import election.ems_backend.repository.ChatRoomMemberRepository;
//import election.ems_backend.repository.NotificationRepository;
//import election.ems_backend.repository.OrganizationRepository;
//import election.ems_backend.repository.SystemUserRepository;
//import election.ems_backend.service.NotificationSender;
//import election.ems_backend.service.NotificationService;
//import election.ems_backend.utility.NotificationSpecs;
//import lombok.RequiredArgsConstructor;
//import org.springframework.dao.DataIntegrityViolationException;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//import org.springframework.data.jpa.domain.Specification;
//import org.springframework.http.HttpStatus;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//import org.springframework.web.server.ResponseStatusException;
//
//import java.util.*;
//
//@Service
//@RequiredArgsConstructor
//@Transactional
//public class NotificationServiceImplementation implements NotificationService {
//
//    private final NotificationRepository notificationRepository;
//    private final ChatRoomMemberRepository chatRoomMemberRepository;
//    private final OrganizationRepository orgRepo;
//    private final SystemUserRepository userRepo;
//    private final NotificationSender sender;
//
//    private final NotificationMapper mapper = new NotificationMapper();
//
//
//    @Override
//    public List<NotificationDto> publish(NotificationCreateRequest req) {
//        // Load principals
//        Organization org = orgRepo.findById(req.getOrgId())
//                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
//        SystemUser target = userRepo.findById(req.getUserId())
//                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
//        SystemUser creator = null;
//        if (req.getCreatedBy() != null) {
//            creator = userRepo.findById(req.getCreatedBy())
//                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Creator not found"));
//        }
//
//        // Normalize channels: if absent, use single deliveryMethod or default IN_APP
//        Set<DeliveryMethod> channels = (req.getChannels() != null && !req.getChannels().isEmpty())
//                ? EnumSet.copyOf(req.getChannels())
//                : EnumSet.of(req.getDeliveryMethod() != null ? req.getDeliveryMethod() : DeliveryMethod.IN_APP);
//
//        // ✅ We only persist ONE row per idempotencyKey (because uq_notification_idempotency is UNIQUE)
//        // Choose IN_APP as the persisted record (best UX: it shows up in the app)
//        DeliveryMethod persistedMethod = DeliveryMethod.IN_APP;
//
//        String key = (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank())
//                ? req.getIdempotencyKey().trim()
//                : null;
//
//        Notification saved;
//
//        // If key is provided, attempt insert; on duplicate, fetch existing
//        if (key != null) {
//            try {
//                Notification n = Notification.builder()
//                        .organization(org)
//                        .user(target)
//                        .type(req.getType())
//                        .title(req.getTitle())
//                        .message(req.getMessage())
//                        .relatedTable(req.getRelatedTable())
//                        .relatedId(req.getRelatedId())
//                        .priority(req.getPriority() != null ? req.getPriority() : NotificationPriority.NORMAL)
//                        .deliveryMethod(persistedMethod)          // ✅ only one stored row
//                        .dateExpires(req.getDateExpires())
//                        .createdBy(creator)
//                        .idempotencyKey(key)
//                        .build();
//
//                saved = notificationRepository.save(n);
//
//            } catch (DataIntegrityViolationException dup) {
//                // ✅ idempotency hit: return existing and DO NOT re-send transports
//                Notification existing = notificationRepository.findByIdempotencyKey(key)
//                        .orElseThrow(() -> dup);
//                return List.of(mapper.toDTO(existing));
//            }
//        } else {
//            // no idempotency key => normal behavior (still only one row)
//            Notification n = Notification.builder()
//                    .organization(org)
//                    .user(target)
//                    .type(req.getType())
//                    .title(req.getTitle())
//                    .message(req.getMessage())
//                    .relatedTable(req.getRelatedTable())
//                    .relatedId(req.getRelatedId())
//                    .priority(req.getPriority() != null ? req.getPriority() : NotificationPriority.NORMAL)
//                    .deliveryMethod(persistedMethod)
//                    .dateExpires(req.getDateExpires())
//                    .createdBy(creator)
//                    .build();
//
//            saved = notificationRepository.save(n);
//        }
//
//        // ✅ Dispatch side-effects for ALL requested channels (but do not persist per channel)
//        for (DeliveryMethod method : channels) {
//            try {
//                sender.send(
//                        method,
//                        target,
//                        saved.getTitle(),
//                        Optional.ofNullable(saved.getMessage()).orElse(saved.getTitle())
//                );
//            } catch (Exception ex) {
//                // transport failed => keep the persisted IN_APP record; optionally log/retry
//                // log.error("Notification transport failed", ex);
//            }
//        }
//
//        // Return the persisted notification (single record)
//        return List.of(mapper.toDTO(saved));
//    }
//
//
//    @Override
//    @Transactional(readOnly = true)
//    public Page<NotificationDto> search(UUID orgId, UUID userId,
//                                        NotificationType type, DeliveryMethod method, Boolean unread,
//                                        Pageable pageable) {
//        Specification<Notification> spec = Specification
//                .where(NotificationSpecs.orgEquals(orgId))
//                .and(NotificationSpecs.userEquals(userId))
//                .and(NotificationSpecs.typeEquals(type))
//                .and(NotificationSpecs.methodEquals(method))
//                .and(NotificationSpecs.unread(unread));
//
//        return notificationRepository.findAll(spec, pageable).map(mapper::toDTO);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public long unreadCount(UUID userId) {
//        return notificationRepository.countUnread(userId);
//    }
//
//    @Override
//    public int markRead(UUID userId, List<UUID> ids) {
//        if (ids == null || ids.isEmpty()) return 0;
//        return notificationRepository.markRead(userId, ids);
//    }
//
//
//
//    @Override
//    public int markSeen(UUID userId, List<UUID> ids) {
//        if (ids == null || ids.isEmpty()) return 0;
//        return notificationRepository.markSeen(userId, ids);
//    }
//
//    @Override
//    @Transactional
//    public Notification send(Organization org,
//                             SystemUser recipient,
//                             String type,
//                             String title,
//                             String message,
//                             String relatedTable,
//                             UUID relatedId) {
//
//        Notification n = Notification.builder()
//                .organization(org)
//                .user(recipient)
//                .type(NotificationType.valueOf(type))
//                .title(title)
//                .message(message)
//                .relatedTable(relatedTable)
//                .relatedId(relatedId)
//                .deliveryMethod(DeliveryMethod.valueOf("IN_APP"))
//                .priority(NotificationPriority.valueOf("NORMAL"))
//                .build();
//
//        return notificationRepository.save(n);
//    }
//
//    @Override
//    @Transactional
//    public void notifyRoomMembersOnNewMessage(UUID roomId,
//                                              UUID senderUserId,
//                                              Organization org,
//                                              String roomDisplayName,
//                                              UUID messageId) {
//
//        // Fetch enabled, non-muted members of the room (excluding sender)
//        List<SystemUser> recipients = chatRoomMemberRepository
//                .findAllByRoom_RoomIdAndIsEnabledTrueAndMutedFalseAndUser_UserIdNot(roomId, senderUserId)
//                .stream()
//                .map(ChatRoomMember::getUser)
//                .distinct()
//                .toList();
//
//        String title = "New Message";
//        String msg = "New message in " + (roomDisplayName != null ? roomDisplayName : "this room");
//
//        for (SystemUser u : recipients) {
//            send(org, u, "CHAT", title, msg, "chat_message", messageId);
//        }
//    }
//}