package com.itcenter.auth.controller;

import com.itcenter.auth.service.SessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class SessionController {
    
    private final SessionService sessionService;
    
    @PostMapping("/sessions/mark-login")
    public ResponseEntity<Void> markLogin(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken)) {
            log.error("[MARK-LOGIN] Authentication is not JwtAuthenticationToken: {}", authentication.getClass());
            return ResponseEntity.status(403).build();
        }
        
        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
        Jwt jwt = jwtAuth.getToken();
        
        log.info("[MARK-LOGIN] Endpoint hit! sub={} aud={} jti={} exp={} iat={} issuer={}",
            jwt.getSubject(),
            jwt.getAudience(),
            jwt.getId(),
            jwt.getExpiresAt(),
            jwt.getIssuedAt(),
            jwt.getIssuer()
        );
        
        log.info("[MARK-LOGIN] All claims: {}", jwt.getClaims());
        
        try {
            sessionService.markLogin(jwt);
            log.info("[MARK-LOGIN] Service call completed successfully");
        } catch (Exception e) {
            log.error("[MARK-LOGIN] Service call failed", e);
            return ResponseEntity.status(500).build();
        }
        
        return ResponseEntity.noContent().build();
    }
}

