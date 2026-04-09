package election.ems_backend.config;

import election.ems_backend.integration.TenantHandshakeHandler;
import election.ems_backend.integration.TenantHandshakeInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WS
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")        // tighten in prod
                .addInterceptors(new TenantHandshakeInterceptor())
                .setHandshakeHandler(new TenantHandshakeHandler());

        // SockJS fallback
        registry.addEndpoint("/ws-sockjs")
                .setAllowedOriginPatterns("*")
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
