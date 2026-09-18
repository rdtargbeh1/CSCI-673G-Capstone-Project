package election.ems_backend.service.implement;

import election.ems_backend.dto.ChatRoomCreateRequest;
import election.ems_backend.dto.ChatRoomDto;
import election.ems_backend.dto.ChatRoomUpdateRequest;
import election.ems_backend.entity.ChatRoom;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.RoomType;
import election.ems_backend.mapper.ChatRoomMapper;
import election.ems_backend.repository.ChatRoomRepository;
import election.ems_backend.service.ChatRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatRoomServiceImplementation implements ChatRoomService {

    private final ChatRoomRepository repo;
    private final ChatRoomMapper mapper; // mark mapper class with @Component or @Service, or new it up


    @Override
    public ChatRoomDto create(Organization org, SystemUser creator, ChatRoomCreateRequest req) {
        if (req == null) throw new IllegalArgumentException("Request cannot be null");

        // Non-DM rooms must have a name and must be unique (org+type+name)
        if (req.getRoomType() != RoomType.DM) {
            if (req.getName() == null || req.getName().isBlank()) {
                throw new IllegalArgumentException("Non-DM rooms must have a name");
            }
            if (repo.existsByOrgTypeAndName(org, req.getRoomType(), req.getName())) {
                throw new IllegalStateException("Room name already exists for this type in the organization");
            }
        }

        ChatRoom entity = mapper.toEntity(req, org, creator);
        entity.setRoomId(UUID.randomUUID()); // @PrePersist will still handle timestamps/settings

        ChatRoom saved = repo.save(entity);
        return mapper.toDTO(saved);
    }

    @Transactional(readOnly = true)
    @Override
    public ChatRoomDto get(Organization org, UUID roomId) {
        ChatRoom room = repo.findByOrganizationAndRoomId(org, roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found"));
        return mapper.toDTO(room);
    }

    @Transactional(readOnly = true)
    @Override
    public Page<ChatRoomDto> search(Organization org, String q, boolean includeArchived, Pageable pageable) {
        return repo.searchInOrg(org.getOrgId(), q, includeArchived, pageable)
                .map(mapper::toDTO);
    }

    @Override
    public ChatRoomDto update(Organization org, UUID roomId, ChatRoomUpdateRequest req) {
        ChatRoom room = repo.findByOrganizationAndRoomId(org, roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found"));

        // If renaming a non-DM, enforce uniqueness
        if (req.getName() != null && room.getRoomType() != RoomType.DM) {
            String current = Optional.ofNullable(room.getName()).orElse("");
            if (!req.getName().equalsIgnoreCase(current)
                    && repo.existsByOrgTypeAndName(org, room.getRoomType(), req.getName())) {
                throw new IllegalStateException("Room name already exists for this type in the organization");
            }
        }

        // Apply changes
        mapper.updateEntity(room, req);
        return mapper.toDTO(room);
    }

    @Override
    public void archive(Organization org, UUID roomId, boolean archived) {
        ChatRoom room = repo.findByOrganizationAndRoomId(org, roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found"));
        room.setArchived(archived);
    }
}
