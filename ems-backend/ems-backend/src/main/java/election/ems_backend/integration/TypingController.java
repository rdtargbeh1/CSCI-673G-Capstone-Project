package election.ems_backend.integration;


import election.ems_backend.entity.SystemUser;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;


@Controller
@RequiredArgsConstructor
public class TypingController {


    private final SimpMessagingTemplate ws;

    // Client SENDs to: /app/typing.{roomId}
    // Server BROADCASTs to: /topic/rooms/{roomId}/typing
    @MessageMapping("/typing.{roomId}")
    public void typing(@DestinationVariable UUID roomId, TypingSignal payload) {

        SystemUser me = (SystemUser)
                org.springframework.security.core.context.SecurityContextHolder
                        .getContext()
                        .getAuthentication()
                        .getPrincipal();

        ws.convertAndSend(
                "/topic/rooms/" + roomId + "/typing",
                new TypingEvent(
                        "typing",
                        roomId,
                        me.getUserId(),
                        payload != null && payload.isTyping(),
                        Instant.now()
                )
        );
    }


//    private final SimpMessagingTemplate ws;
//
//    // Client SENDs to: /app/typing.{roomId}
//    // We broadcast to:  /topic/rooms/{roomId}/typing
//    @MessageMapping("/typing.{roomId}")
//    public void typing(@DestinationVariable String roomId, TypingSignal payload) {
//        ws.convertAndSend("/topic/rooms/" + roomId + "/typing", Map.of(
//                "type", "typing",
//                "typing", payload != null && payload.isTyping()
//        ));
//    }

}