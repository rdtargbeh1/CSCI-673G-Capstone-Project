package election.ems_backend.utility;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatMessageEditRequest {
    private String content;                // new message body
}