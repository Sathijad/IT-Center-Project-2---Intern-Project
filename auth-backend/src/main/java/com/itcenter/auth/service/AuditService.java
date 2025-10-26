package com.itcenter.auth.service;

import com.itcenter.auth.dto.AuditEntryResponse;
import com.itcenter.auth.entity.LoginAudit;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.LoginAuditRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {
    
    private final LoginAuditRepository auditRepository;
    private final AppUserRepository userRepository;
    
    @Transactional
    public void logEvent(Long userId, String eventType, String ipAddress, 
                        String userAgent, String metadata) {
        try {
            LoginAudit audit = LoginAudit.builder()
                .user(userRepository.findById(userId).orElse(null))
                .eventType(eventType)
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .metadata(metadata)
                .build();
            
            auditRepository.save(audit);
            
            log.info("Audit event logged: user_id={}, event_type={}", userId, eventType);
        } catch (Exception e) {
            log.error("Failed to log audit event", e);
        }
    }
    
    public Page<AuditEntryResponse> getAuditLog(Long userId, String eventType,
                                                LocalDateTime startDate, 
                                                LocalDateTime endDate,
                                                Pageable pageable) {
        Page<LoginAudit> audits = auditRepository.findByFilters(
            userId, eventType, startDate, endDate, pageable
        );
        
        return audits.map(this::mapToResponse);
    }
    
    private AuditEntryResponse mapToResponse(LoginAudit audit) {
        return AuditEntryResponse.builder()
            .id(audit.getId())
            .userId(audit.getUser() != null ? audit.getUser().getId() : null)
            .userEmail(audit.getUser() != null ? audit.getUser().getEmail() : null)
            .eventType(audit.getEventType())
            .ipAddress(audit.getIpAddress())
            .userAgent(audit.getUserAgent())
            .metadata(audit.getMetadata())
            .createdAt(audit.getCreatedAt())
            .build();
    }
}

