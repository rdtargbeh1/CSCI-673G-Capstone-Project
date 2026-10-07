package election.ems_backend.service.implement;

import election.ems_backend.dto.ChatReactionDto;
import election.ems_backend.entity.ChatMessage;
import election.ems_backend.entity.ChatReaction;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.mapper.ChatReactionMapper;
import election.ems_backend.repository.ChatMessageRepository;
import election.ems_backend.repository.ChatReactionRepository;
import election.ems_backend.service.ChatReactionService;
import election.ems_backend.tenant.TenantUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatReactionServiceImplementation implements ChatReactionService {

    private final ChatReactionRepository reactions;
    private final ChatMessageRepository messages;

    private final ChatReactionMapper mapper = new ChatReactionMapper();

    @Override
    public ChatReactionDto toggle(UUID messageId, String emoji) {
        if (emoji == null || emoji.isBlank()) throw new IllegalArgumentException("emoji is required");

        UUID tenantId = TenantUtils.requireTenantOrg();
        SystemUser me = currentUserOrThrow();

        ChatMessage msg = messages.findById(messageId)
                .orElseThrow(() -> new NoSuchElementException("Message not found"));

        // tenant guard: message must belong to current org
        if (!msg.getOrganization().getOrgId().equals(tenantId)) {
            throw new IllegalStateException("Cross-tenant access not allowed");
        }

        // If reaction exists -> delete (toggle off). Else create.
        var existing = reactions.findByMessage_MessageIdAndUser_UserIdAndEmoji(messageId, me.getUserId(), emoji);
        if (existing.isPresent()) {
            reactions.delete(existing.get());
            return null; // toggled off
        }

        ChatReaction r = ChatReaction.builder()
                .message(msg)
                .user(me)
                .emoji(emoji)
                .dateCreated(LocalDateTime.now(ZoneOffset.UTC))
                .build();

        ChatReaction saved = reactions.save(r);
        return mapper.toDTO(saved);
    }

    @Override
    public void remove(UUID messageId, String emoji) {
        if (emoji == null || emoji.isBlank()) return;
        TenantUtils.requireTenantOrg();
        SystemUser me = currentUserOrThrow();

        reactions.findByMessage_MessageIdAndUser_UserIdAndEmoji(messageId, me.getUserId(), emoji)
                .ifPresent(reactions::delete);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatReactionDto> listForMessage(UUID messageId) {
        TenantUtils.requireTenantOrg(); // guard path
        return reactions.findByMessage_MessageId(messageId).stream()
                .map(mapper::toDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> countsForMessage(UUID messageId) {
        TenantUtils.requireTenantOrg();

        // Simple one-pass aggregation on all reactions of the message
        return reactions.findByMessage_MessageId(messageId).stream()
                .collect(Collectors.groupingBy(ChatReaction::getEmoji, Collectors.counting()));
    }

    /* -------- helpers -------- */

    private SystemUser currentUserOrThrow() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof SystemUser u)) {
            throw new IllegalStateException("Authenticated user required");
        }
        return u;
    }
}
