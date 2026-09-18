package election.ems_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class MailConfig {

    @Bean
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();

        // These can be overridden by application.properties via Spring Boot’s binder.
        // If you haven’t set them yet, the bean still exists; email send will just no-op/fail gracefully at runtime.
        // Example sensible defaults (Gmail-style, change as needed):
        sender.setHost(System.getProperty("spring.mail.host", "smtp.gmail.com"));
        sender.setPort(Integer.parseInt(System.getProperty("spring.mail.port", "587")));
        sender.setUsername(System.getProperty("spring.mail.username", "")); // override in properties
        sender.setPassword(System.getProperty("spring.mail.password", "")); // override in properties

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.debug", "false");
        return sender;
    }
}
