package com.itcenter.auth.service;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.LoginAudit;
import com.itcenter.auth.repository.LoginAuditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {
    
    private final LoginAuditRepository auditRepository;
    private final UserProvisioningService provisioningService;
    
    @Transactional
    public void markLogin(org.springframework.security.oauth2.jwt.Jwt jwt) {
        // idempotency key by token (prefer jti, fallback to token hash)
        String jti = jwt.getId();
        String key = (jti == null || jti.isBlank())
                ? org.apache.commons.codec.digest.DigestUtils.sha256Hex(jwt.getTokenValue())
                : jti;

        log.info("[MARK-LOGIN] Using idempotency key: {}", key);
        
        if (auditRepository.existsByTokenJti(key)) {
            log.info("[MARK-LOGIN] Token already recorded, skipping idempotently: {}", key);
            return;
        }

        // Use UserProvisioningService to resolve user (handles JWT claims properly)
        AppUser user = provisioningService.findOrCreateFromJwt(jwt);
        log.info("[MARK-LOGIN] Resolved user: id={}, email={}", user.getId(), user.getEmail());

        // Write audit entry with token JTI
        // Note: last_login is already updated by UserProvisioningService
        LoginAudit audit = LoginAudit.builder()
                .user(user)
                .eventType("LOGIN_SUCCESS")
                .tokenJti(key)
                .build();
        
        auditRepository.save(audit);
        log.info("[MARK-LOGIN] Audit entry saved: id={}", audit.getId());
    }
}

