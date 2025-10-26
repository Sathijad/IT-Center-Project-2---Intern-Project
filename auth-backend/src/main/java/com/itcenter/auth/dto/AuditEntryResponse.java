package com.itcenter.auth.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEntryResponse {
    private Long id;
    private Long userId;
    private String userEmail;
    private String eventType;
    private String ipAddress;
    private String userAgent;
    private String metadata;
    private LocalDateTime createdAt;
}

