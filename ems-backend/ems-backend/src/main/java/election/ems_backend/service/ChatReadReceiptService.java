package election.ems_backend.service;

import election.ems_backend.dto.ChatReadReceiptDto;

import java.util.List;
import java.util.UUID;

public interface ChatReadReceiptService {
    ChatReadReceiptDto markReadForCurrentUser(UUID messageId);
    List<ChatReadReceiptDto> listReaders(UUID messageId);
    long readerCount(UUID messageId);

    // Optional bulk mark (e.g., when opening a room)
    int markManyReadForCurrentUser(List<UUID> messageIds);
}
