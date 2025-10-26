package com.itcenter.auth.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {
    private Long id;
    private String email;
    private String displayName;
    private String locale;
    private List<String> roles;
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;
}

