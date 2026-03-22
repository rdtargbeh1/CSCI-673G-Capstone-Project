package election.ems_backend.integration;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordResetEmail(String email, String username, String password) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("Your Password Has Been Reset");

        message.setText(
                "Hello " + username + ",\n\n"
                        + "Your password has been reset by the administrator.\n\n"
                        + "Temporary Password: " + password + "\n\n"
                        + "Please login and change your password immediately.\n\n"
                        + "Regards,\n"
                        + "System Administration"
        );

        mailSender.send(message);
    }
}