package election.ems_backend.service;

import election.ems_backend.dto.ChatMessageCreateRequest;
import election.ems_backend.dto.ChatMessageDto;
import election.ems_backend.utility.ChatMessageEditRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ChatMessageService {

    ChatMessageDto sendInTenant(ChatMessageCreateRequest req);

    Page<ChatMessageDto> listInTenant(UUID roomId, Pageable pageable);

    List<ChatMessageDto> syncSinceInTenant(UUID roomId, LocalDateTime since);

    ChatMessageDto editInTenant(UUID messageId, ChatMessageEditRequest req);

    void deleteInTenant(UUID messageId);
}