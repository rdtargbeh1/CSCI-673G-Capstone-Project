package election.ems_backend.integration;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;


import java.util.Map;
import java.util.UUID;

public class TenantHandshakeInterceptor implements HandshakeInterceptor  {

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        if (request instanceof ServletServerHttpRequest sr) {
            HttpServletRequest req = sr.getServletRequest();

            UUID orgId  = election.ems_backend.utility.TenantUtils.currentTenantOrg();
            UUID userId = election.ems_backend.utility.TenantUtils.currentUserId();

            // reject if unauthenticated or no tenant
            if (orgId == null || userId == null) return false;

            // store for the HandshakeHandler
            attributes.put("orgId", orgId);
            attributes.put("userId", userId);
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {}
}

