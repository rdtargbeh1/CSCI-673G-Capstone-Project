package election.ems_backend.config;

import election.ems_backend.security.RequestContextMdcFilter;
import election.ems_backend.security.TenantFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean<TenantFilter> tenantFilterRegistration(TenantFilter filter) {
        FilterRegistrationBean<TenantFilter> reg = new FilterRegistrationBean<>(filter);
        reg.setEnabled(false); // ✅ ONLY run in SecurityFilterChain
        return reg;
    }

    @Bean
    public FilterRegistrationBean<RequestContextMdcFilter> requestContextMdcFilterRegistration(RequestContextMdcFilter filter) {
        FilterRegistrationBean<RequestContextMdcFilter> reg = new FilterRegistrationBean<>(filter);
        reg.setEnabled(false); // ✅ ONLY run in SecurityFilterChain
        return reg;
    }
}
