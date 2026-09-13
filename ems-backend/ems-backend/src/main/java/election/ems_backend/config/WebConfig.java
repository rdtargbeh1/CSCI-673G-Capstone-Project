package election.ems_backend.config;


import election.ems_backend.tenant.OrgContextFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebConfig {


    @Bean
    public FilterRegistrationBean<OrgContextFilter> orgContextFilterRegistration(OrgContextFilter filter) {
        FilterRegistrationBean<OrgContextFilter> reg = new FilterRegistrationBean<>();
        reg.setFilter(filter);

        // ✅ Security hardening:
        // Do NOT register OrgContextFilter as a servlet/container filter.
        // Tenant/org context must be derived AFTER authentication inside Spring Security chain.
        reg.setEnabled(false);

        // Keep order as-is (harmless when disabled)
        reg.setOrder(5);

        return reg;
    }


}
