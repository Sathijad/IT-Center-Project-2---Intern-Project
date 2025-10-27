package com.itcenter.auth.config;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final AppUserRepository userRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String sub = jwt.getClaimAsString("sub");
        
        if (sub == null || sub.isBlank()) {
            log.warn("No 'sub' claim found in JWT, creating authentication without authorities");
            return new JwtAuthenticationToken(jwt);
        }

        // Load user from database and get their roles
        AppUser user = userRepository.findByCognitoSub(sub).orElse(null);
        
        List<GrantedAuthority> authorities;
        
        if (user != null && user.getRoles() != null && !user.getRoles().isEmpty()) {
            authorities = user.getRoles().stream()
                .map(Role::getName)
                .map(roleName -> "ROLE_" + roleName)  // Spring Security expects ROLE_ prefix
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
            
            log.debug("Loaded {} roles for user {}: {}", 
                authorities.size(), sub, 
                authorities.stream().map(GrantedAuthority::getAuthority).collect(Collectors.joining(", ")));
        } else {
            authorities = List.of(new SimpleGrantedAuthority("ROLE_EMPLOYEE"));
            log.debug("No user or roles found for sub: {}, assigning default ROLE_EMPLOYEE", sub);
        }

        return new JwtAuthenticationToken(jwt, authorities);
    }
}

