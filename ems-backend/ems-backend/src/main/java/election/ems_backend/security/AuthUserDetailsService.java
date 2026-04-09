package election.ems_backend.security;

import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthUserDetailsService implements UserDetailsService {

    private final SystemUserRepository users;
    private static final Logger log = LoggerFactory.getLogger(AuthUserDetailsService.class);




    @Override
    public UserDetails loadUserByUsername(String userNameOrEmail) throws UsernameNotFoundException {
        log.info("Auth lookup for [{}]", userNameOrEmail);

        SystemUser u = users.findByEmailIgnoreCase(userNameOrEmail)
                .or(() -> users.findByUserNameIgnoreCase(userNameOrEmail))
                .orElseThrow(() -> {
                    log.warn("No user found for [{}]", userNameOrEmail);
                    return new UsernameNotFoundException("User not found: " + userNameOrEmail);
                });

        log.info("Found user {}, id={}", u.getEmail(), u.getUserId());

        // Extract role name from UserRole → RoleName enum
        String roleName = (u.getRole() != null && u.getRole().getRoleName() != null)
                ? u.getRole().getRoleName().name()
                : "USER";

        String authority = "ROLE_" + roleName;

        return User.withUsername(userNameOrEmail)
                .password(u.getPassword())
                .authorities(authority)
                .accountLocked(u.getLockedUntil() != null && u.getLockedUntil().isAfter(java.time.LocalDateTime.now()))
                .disabled(!u.isActive())
                .build();
    }




}

