package election.ems_backend.integration;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

public class TenantHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request,
                                      WebSocketHandler wsHandler,
                                      Map<String, Object> attributes) {
        UUID userId = (UUID) attributes.get("userId");
        UUID orgId  = (UUID) attributes.get("orgId");
        if (userId != null && orgId != null) {
            return new WsPrincipal(userId, orgId);
        }
        return super.determineUser(request, wsHandler, attributes);
    }
}
