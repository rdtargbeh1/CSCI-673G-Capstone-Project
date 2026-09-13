package election.ems_backend.mapper;

import election.ems_backend.dto.ChatReactionDto;
import election.ems_backend.entity.ChatReaction;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class ChatReactionMapper {

    public ChatReactionDto toDTO(ChatReaction r) {
        if (r == null) return null;

        String fn = Optional.ofNullable(r.getUser().getFirstName()).orElse("");
        String ln = Optional.ofNullable(r.getUser().getLastName()).orElse("");

        return ChatReactionDto.builder()
                .reactionId(r.getReactionId())
                .messageId(r.getMessage().getMessageId())
                .userId(r.getUser().getUserId())
                .userName((fn + " " + ln).trim())
                .emoji(r.getEmoji())
                .dateCreated(r.getDateCreated())
                .build();
    }
}
