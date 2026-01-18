package election.ems_backend.service;


import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.DeliveryMethod;

public interface NotificationSender {

    void send(DeliveryMethod method, SystemUser to, String subject, String body);

    void sendEmail(SystemUser to, String subject, String body);

    void sendSms(SystemUser to, String body);

    // In-app is just persistence; no transport needed here.
}
