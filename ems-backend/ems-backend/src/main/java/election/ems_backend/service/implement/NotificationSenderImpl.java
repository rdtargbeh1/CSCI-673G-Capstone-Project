package election.ems_backend.service.implement;

import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.service.NotificationSender;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationSenderImpl implements NotificationSender {


    private static final Logger log = LoggerFactory.getLogger(NotificationSenderImpl.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${twilio.accountSid:}")
    private String twilioSid;

    @Value("${twilio.authToken:}")
    private String twilioToken;

    @Value("${twilio.fromNumber:}")
    private String twilioFrom;

    private volatile boolean twilioInitialized = false;

    private synchronized void initTwilioIfNeeded() {
        if (!twilioInitialized && twilioSid != null && !twilioSid.isBlank()) {
            com.twilio.Twilio.init(twilioSid, twilioToken);
            twilioInitialized = true;
        }
    }

    @Override
    public void send(DeliveryMethod method, SystemUser to, String subject, String body) {
        switch (method) {
            case EMAIL -> sendEmail(to, subject, body);
            case SMS   -> sendSms(to, body);
            case IN_APP, SYSTEM -> log.debug("In-app notification persisted only (no external dispatch)");
        }
    }

    @Override
    public void sendEmail(SystemUser to, String subject, String body) {
        if (to == null || to.getEmail() == null || to.getEmail().isBlank()) {
            log.warn("No email address available; skipping email");
            return;
        }
        if (fromEmail == null || fromEmail.isBlank()) {
            log.error("spring.mail.username/fromEmail not configured; cannot send email");
            return;
        }
        try {
            var msg = new org.springframework.mail.SimpleMailMessage();
            msg.setTo(to.getEmail());
            msg.setFrom(fromEmail);
            msg.setSubject(subject != null ? subject : "(no subject)");
            msg.setText(body != null ? body : "");
            mailSender.send(msg);
            log.info("✅ Email sent to {}", to.getEmail());
        } catch (Exception e) {
            log.error("❌ Email send failed to {}: {}", to.getEmail(), e.getMessage());
        }
    }

    @Override
    public void sendSms(SystemUser to, String body) {
        if (to == null || to.getPhoneNumber() == null || to.getPhoneNumber().isBlank()) {
            log.warn("No phone number available; skipping SMS");
            return;
        }
        if (twilioSid == null || twilioSid.isBlank() || twilioToken == null || twilioToken.isBlank() || twilioFrom == null || twilioFrom.isBlank()) {
            log.warn("Twilio not configured; skipping SMS to {}", to.getPhoneNumber());
            return;
        }
        try {
            initTwilioIfNeeded();
            com.twilio.rest.api.v2010.account.Message.creator(
                            new com.twilio.type.PhoneNumber(to.getPhoneNumber()),
                            new com.twilio.type.PhoneNumber(twilioFrom),
                            body != null ? body : "")
                    .create();
            log.info("✅ SMS sent to {}", to.getPhoneNumber());
        } catch (Exception e) {
            log.error("❌ SMS send failed to {}: {}", to.getPhoneNumber(), e.getMessage());
        }
    }

}
