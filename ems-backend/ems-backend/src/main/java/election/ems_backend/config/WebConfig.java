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
        reg.setOrder(5); // early
        return reg;
    }
}
