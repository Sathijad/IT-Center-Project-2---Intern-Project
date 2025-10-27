package com.itcenter.auth.service;

import com.itcenter.auth.dto.*;
import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;
    private final UserProvisioningService provisioningService;
    private final com.itcenter.auth.repository.UserRoleRepository userRoleRepository;
    
    public UserProfileResponse getCurrentUserProfile() {
        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt)) {
            throw new RuntimeException("Invalid authentication principal");
        }
        
        org.springframework.security.oauth2.jwt.Jwt jwt = (org.springframework.security.oauth2.jwt.Jwt) auth.getPrincipal();
        AppUser user = provisioningService.findOrCreateFromJwt(jwt);
        
        // Log login success event
        try {
            HttpServletRequest request = getHttpServletRequest();
            if (request != null) {
                String ipAddress = AuditService.getClientIp(request);
                String userAgent = request.getHeader("User-Agent");
                auditService.logEvent(user, "LOGIN_SUCCESS", ipAddress, userAgent, null);
                log.debug("Logged LOGIN_SUCCESS for user: {}, IP: {}", user.getEmail(), ipAddress);
            } else {
                log.warn("HttpServletRequest not available, skipping audit logging");
            }
        } catch (Exception e) {
            log.error("Failed to log login audit event", e);
            // Don't fail the request if audit logging fails
        }
        
        return mapToProfileResponse(user);
    }
    
    @Transactional
    public UserProfileResponse updateCurrentUserProfile(UpdateProfileRequest request) {
        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt)) {
            throw new RuntimeException("Invalid authentication principal");
        }
        
        org.springframework.security.oauth2.jwt.Jwt jwt = (org.springframework.security.oauth2.jwt.Jwt) auth.getPrincipal();
        AppUser user = provisioningService.findOrCreateFromJwt(jwt);
        
        log.info("Updating profile for user ID: {}, current displayName: {}, current locale: {}", 
            user.getId(), user.getDisplayName(), user.getLocale());
        
        if (request.getDisplayName() != null) {
            log.info("Setting displayName from '{}' to '{}'", user.getDisplayName(), request.getDisplayName());
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getLocale() != null) {
            log.info("Setting locale from '{}' to '{}'", user.getLocale(), request.getLocale());
            user.setLocale(request.getLocale());
        }
        
        // Force save and flush to ensure persistence
        user = userRepository.saveAndFlush(user);
        log.info("Saved user with ID: {}, new displayName: {}, new locale: {}", 
            user.getId(), user.getDisplayName(), user.getLocale());
        
        // Log profile update (with error handling)
        try {
            auditService.logEvent(user.getId(), "PROFILE_UPDATED", null, null, null);
        } catch (Exception e) {
            log.error("Failed to log audit event: {}", e.getMessage());
            // Don't fail the update if audit logging fails
        }
        
        return mapToProfileResponse(user);
    }
    
    public Page<UserSummaryResponse> searchUsers(String query, Pageable pageable) {
        Page<AppUser> users = query != null && !query.isEmpty() 
            ? userRepository.searchUsers(query, pageable)
            : userRepository.findAll(pageable);
        
        return users.map(this::mapToSummaryResponse);
    }
    
    public UserSummaryResponse getUserById(Long id) {
        AppUser user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return mapToSummaryResponse(user);
    }
    
    @Transactional
    public UserSummaryResponse updateUserRoles(Long userId, UpdateRolesRequest request) {
        AppUser targetUser = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        AppUser currentUser = getCurrentUser();
        
        // Validate and get roles
        List<Role> roles = request.getRoles().stream()
            .map(roleName -> roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName)))
            .collect(Collectors.toList());
        
        // Update user roles
        targetUser.setRoles(roles);
        targetUser = userRepository.save(targetUser);
        
        // Log role change
        String eventType = request.getRoles().contains("ADMIN") 
            ? "ROLE_ASSIGNED" 
            : "ROLE_REMOVED";
        auditService.logEvent(userId, eventType, null, null, 
            String.format("Updated by: %s", currentUser.getEmail()));
        
        return mapToSummaryResponse(targetUser);
    }
    
    private AppUser getCurrentUser() {
        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt)) {
            throw new RuntimeException("Invalid authentication principal");
        }
        
        org.springframework.security.oauth2.jwt.Jwt jwt = (org.springframework.security.oauth2.jwt.Jwt) auth.getPrincipal();
        return provisioningService.findOrCreateFromJwt(jwt);
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
    
    private UserProfileResponse mapToProfileResponse(AppUser user) {
        return UserProfileResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .displayName(user.getDisplayName())
            .locale(user.getLocale())
            .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
            .createdAt(user.getCreatedAt())
            .lastLogin(user.getLastLogin())
            .build();
    }
    
    private UserSummaryResponse mapToSummaryResponse(AppUser user) {
        return UserSummaryResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .displayName(user.getDisplayName())
            .locale(user.getLocale())
            .isActive(user.getIsActive())
            .createdAt(user.getCreatedAt())
            .lastLogin(user.getLastLogin())
            .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toList()))
            .build();
    }
}

