package com.itcenter.auth.service;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.LoginAudit;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.LoginAuditRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {
    
    private final AppUserRepository userRepository;
    private final LoginAuditRepository auditRepository;
    private final UserProvisioningService userProvisioningService;
    
    @Transactional
    public void markLogin(org.springframework.security.oauth2.jwt.Jwt jwt) {
        String jti = jwt.getId();
        
        if (jti == null || jti.isBlank()) {
            // Fallback: hash the token to create a unique key for idempotency
            try {
                String tokenValue = jwt.getTokenValue();
                jti = org.apache.commons.codec.digest.DigestUtils.sha256Hex(tokenValue);
                log.debug("No JTI claim found, using SHA256 hash of token: {}", jti);
            } catch (Exception e) {
                // Final fallback: use sub + iat
                String sub = jwt.getClaimAsString("sub");
                jti = sub + "_" + jwt.getIssuedAt();
                log.debug("Failed to hash token, using fallback: {}", jti);
            }
        }
        
        // Check if this token has already been recorded
        log.info("[MARK-LOGIN] Checking if JTI already exists: {}", jti);
        boolean exists = auditRepository.existsByTokenJti(jti);
        log.info("[MARK-LOGIN] JTI exists check result: {}", exists);
        
        if (exists) {
            log.info("[MARK-LOGIN] Token JTI already recorded: {}, skipping", jti);
            return;
        }
        
        // Find or create user from JWT
        log.info("[MARK-LOGIN] Finding or creating user from JWT");
        AppUser user = userProvisioningService.findOrCreateFromJwt(jwt);
        log.info("[MARK-LOGIN] User found/created: {}", user != null ? user.getEmail() : "NULL");
        
        if (user == null) {
            log.error("[MARK-LOGIN] Could not find or create user from JWT, skipping login audit");
            return;
        }
        
        // Create audit entry
        try {
            HttpServletRequest request = getHttpServletRequest();
            String ipAddress = request != null ? AuditService.getClientIp(request) : null;
            String userAgent = request != null ? request.getHeader("User-Agent") : null;
            
            LoginAudit audit = LoginAudit.builder()
                .user(user)
                .eventType("LOGIN_SUCCESS")
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .tokenJti(jti)
                .build();
            
            log.info("[MARK-LOGIN] Saving audit entry to database");
            auditRepository.save(audit);
            log.info("[MARK-LOGIN] Audit entry saved successfully");
            
            // Update last_login exactly once per token
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
            log.info("[MARK-LOGIN] Updated last_login timestamp");
            
            log.info("[MARK-LOGIN] COMPLETE: Login marked for user: {}, JTI: {}", user.getEmail(), jti);
        } catch (Exception e) {
            log.error("Failed to record login for user: {}", user.getEmail(), e);
            // Don't fail the transaction if audit logging fails
        }
    }
    
    private HttpServletRequest getHttpServletRequest() {
        try {
            ServletRequestAttributes requestAttributes = 
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            return requestAttributes != null ? requestAttributes.getRequest() : null;
        } catch (Exception e) {
            log.debug("Could not get HttpServletRequest", e);
            return null;
        }
    }
}

