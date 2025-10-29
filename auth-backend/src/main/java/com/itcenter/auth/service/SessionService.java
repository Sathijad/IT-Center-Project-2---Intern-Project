package com.itcenter.auth.service;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.LoginAudit;
import com.itcenter.auth.repository.LoginAuditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;


@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {
    
    private final LoginAuditRepository auditRepository;
    private final UserProvisioningService provisioningService;
    
    @Transactional
    public void markLogin(org.springframework.security.oauth2.jwt.Jwt jwt) {
        // Use UserProvisioningService first so last_login is always updated
        AppUser user = provisioningService.findOrCreateFromJwt(jwt);
        log.info("[MARK-LOGIN] Resolved user: id={}, email={}", user.getId(), user.getEmail());

        // Extract request context for IP and User-Agent
        HttpServletRequest request = null;
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            request = attrs != null ? attrs.getRequest() : null;
        } catch (Exception ignored) { }
        String ip = request != null ? com.itcenter.auth.service.AuditService.getClientIp(request) : null;
        String ua = request != null ? request.getHeader("User-Agent") : null;

        // idempotency key by token (prefer jti, fallback to token hash)
        String jti = jwt.getId();
        String key = (jti == null || jti.isBlank())
                ? org.apache.commons.codec.digest.DigestUtils.sha256Hex(jwt.getTokenValue())
                : jti;

        log.info("[MARK-LOGIN] Using idempotency key: {}", key);
        
        if (auditRepository.existsByTokenJti(key)) {
            log.info("[MARK-LOGIN] Token already recorded, skipping audit insert (last_login updated)");
            return;
        }

        // Write audit entry with token JTI
        // Note: last_login is already updated by UserProvisioningService
        LoginAudit audit = LoginAudit.builder()
                .user(user)
                .eventType("LOGIN_SUCCESS")
                .tokenJti(key)
                .ipAddress(ip)
                .userAgent(ua)
                .build();
        
        auditRepository.save(audit);
        log.info("[MARK-LOGIN] Audit entry saved: id={}", audit.getId());
    }
}

