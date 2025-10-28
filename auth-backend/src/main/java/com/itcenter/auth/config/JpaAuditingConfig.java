package com.itcenter.auth.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
@RequiredArgsConstructor
@Slf4j
public class JpaAuditingConfig {

    private final com.itcenter.auth.service.UserProvisioningService userProvisioningService;

    @Bean
    public AuditorAware<Long> auditorAware() {
        return () -> {
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                
                if (auth == null || !(auth.getPrincipal() instanceof Jwt)) {
                    log.debug("No authentication or principal is not Jwt");
                    return Optional.empty();
                }
                
                Jwt jwt = (Jwt) auth.getPrincipal();
                
                // Extract user ID by looking up the user from JWT
                com.itcenter.auth.entity.AppUser user = userProvisioningService.findOrCreateFromJwt(jwt);
                
                if (user != null && user.getId() != null) {
                    log.debug("Current auditor: userId={}", user.getId());
                    return Optional.of(user.getId());
                }
                
                return Optional.empty();
            } catch (Exception e) {
                log.error("Error extracting auditor from SecurityContext", e);
                return Optional.empty();
            }
        };
    }
}

