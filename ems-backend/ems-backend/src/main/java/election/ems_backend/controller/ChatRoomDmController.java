package election.ems_backend.controller;

import election.ems_backend.dto.ChatRoomDmDto;
import election.ems_backend.service.ChatRoomDmService;
import election.ems_backend.utility.OpenDmRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat/dm")
public class ChatRoomDmController {

    private final ChatRoomDmService service;

    /** Open (or get existing) DM with another user in current tenant */
    @PostMapping("/open")
    public ChatRoomDmDto open(@RequestBody OpenDmRequest req) {
        return service.openOrGet(req.getOtherUserId());
    }

    /** List my DMs in current tenant */
    @GetMapping("/my")
    public List<ChatRoomDmDto> myDms() {
        return service.myDms();
    }
}
