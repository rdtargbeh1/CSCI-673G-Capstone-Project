package election.ems_backend.config;

import election.ems_backend.integration.TenantHandshakeHandler;
import election.ems_backend.integration.TenantHandshakeInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Comma-separated list of allowed origins for WebSocket endpoints.
     * Example (prod): https://app.yourdomain.com,https://admin.yourdomain.com
     * Example (dev):  http://localhost:5173,http://127.0.0.1:5173
     */
    @Value("${app.security.ws-allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String wsAllowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        String[] origins = Arrays.stream(wsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .toArray(String[]::new);

        // Native WS
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)        // ✅ tightened
                .addInterceptors(new TenantHandshakeInterceptor())
                .setHandshakeHandler(new TenantHandshakeHandler());

        // SockJS fallback
        registry.addEndpoint("/ws-sockjs")
                .setAllowedOriginPatterns(origins)        // ✅ tightened
                .addInterceptors(new TenantHandshakeInterceptor())
                .setHandshakeHandler(new TenantHandshakeHandler())
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.setApplicationDestinationPrefixes("/app");
        config.enableSimpleBroker("/topic");
    }




}
