package election.ems_backend.mapper;

import election.ems_backend.dto.ChatReadReceiptDto;
import election.ems_backend.entity.ChatReadReceipt;

import java.util.Optional;

public class ChatReadReceiptMapper {

    public ChatReadReceiptDto toDTO(ChatReadReceipt r) {
        if (r == null) return null;

        String fn = Optional.ofNullable(r.getUser().getFirstName()).orElse("");
        String ln = Optional.ofNullable(r.getUser().getLastName()).orElse("");

        return ChatReadReceiptDto.builder()
                .messageId(r.getMessage().getMessageId())
                .userId(r.getUser().getUserId())
                .userName((fn + " " + ln).trim())
                .dateRead(r.getDateRead())
                .build();
    }
}
