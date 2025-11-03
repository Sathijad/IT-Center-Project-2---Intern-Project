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
        
        // Note: Login audit is now handled by /api/v1/sessions/mark-login endpoint
        // to ensure idempotency (once per JWT token)
        
        return mapToProfileResponse(user);
    }
    
    @Transactional
    public UserProfileResponse updateCurrentUserProfile(UpdateProfileRequest request) {
        log.info("UpdateProfileRequest received - displayName: '{}', locale: '{}'", 
            request.getDisplayName(), request.getLocale());
        
        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt)) {
            throw new RuntimeException("Invalid authentication principal");
        }
        
        org.springframework.security.oauth2.jwt.Jwt jwt = (org.springframework.security.oauth2.jwt.Jwt) auth.getPrincipal();
        AppUser user = provisioningService.findOrCreateFromJwt(jwt);
        
        log.info("Updating profile for user ID: {}, current displayName: '{}', current locale: '{}'", 
            user.getId(), user.getDisplayName(), user.getLocale());
        
        boolean changed = false;
        
        if (request.getDisplayName() != null && !request.getDisplayName().trim().isEmpty()) {
            String newDisplayName = request.getDisplayName().trim();
            if (!newDisplayName.equals(user.getDisplayName())) {
                log.info("Changing displayName from '{}' to '{}'", user.getDisplayName(), newDisplayName);
                user.setDisplayName(newDisplayName);
                changed = true;
            } else {
                log.info("Display name unchanged: '{}'", newDisplayName);
            }
        }
        
        if (request.getLocale() != null && !request.getLocale().trim().isEmpty()) {
            String newLocale = request.getLocale().trim();
            if (!newLocale.equals(user.getLocale())) {
                log.info("Changing locale from '{}' to '{}'", user.getLocale(), newLocale);
                user.setLocale(newLocale);
                changed = true;
            } else {
                log.info("Locale unchanged: '{}'", newLocale);
            }
        }
        
        if (changed) {
            log.info("Changes detected, saving user to database...");
            // Force save and flush to ensure persistence
            user = userRepository.saveAndFlush(user);
            log.info("User saved successfully. ID: {}, displayName: '{}', locale: '{}'", 
                user.getId(), user.getDisplayName(), user.getLocale());
        } else {
            log.info("No changes detected, skipping save operation");
        }
        
        // Log profile update (with error handling)
        try {
            HttpServletRequest httpRequest = getHttpServletRequest();
            String ipAddress = httpRequest != null ? com.itcenter.auth.service.AuditService.getClientIp(httpRequest) : null;
            String userAgent = httpRequest != null ? httpRequest.getHeader("User-Agent") : null;
            auditService.logEvent(user, "PROFILE_UPDATED", ipAddress, userAgent, null);
        } catch (Exception e) {
            log.error("Failed to log audit event: {}", e.getMessage());
            // Don't fail the update if audit logging fails
        }
        
        return mapToProfileResponse(user);
    }
    
    public Page<UserSummaryResponse> searchUsers(String query, Pageable pageable) {
        Page<AppUser> users = query != null && !query.isEmpty() 
            ? userRepository.searchUsers(query, pageable)
            : userRepository.findAllActive(pageable);
        
        return users.map(this::mapToSummaryResponse);
    }
    
    public UserSummaryResponse getUserById(Long id) {
        AppUser user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("User not found");
        }
        
        return mapToSummaryResponse(user);
    }
    
    @Transactional
    public UserSummaryResponse updateUserRoles(Long userId, UpdateRolesRequest request) {
        log.info("Updating roles for user ID: {}, requested roles: {}", userId, request.getRoles());
        
        // Load managed entity - don't create new instances
        AppUser targetUser = userRepository.findById(userId)
            .orElseThrow(() -> {
                log.error("User not found with ID: {}", userId);
                return new RuntimeException("User not found");
            });
        
        AppUser currentUser = getCurrentUser();
        
        // Normalize and validate role names, then deduplicate
        List<String> newRoleNames = request.getRoles().stream()
            .filter(role -> role != null && !role.isBlank())
            .map(String::trim)
            .map(String::toUpperCase)
            .distinct() // Remove duplicates after normalization
            .collect(Collectors.toList());
        
        // Validate all roles exist and load as managed entities, using LinkedHashSet to deduplicate
        java.util.Set<Role> targetRolesSet = new java.util.LinkedHashSet<>();
        for (String roleName : newRoleNames) {
            Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
            targetRolesSet.add(role); // Set will automatically deduplicate by object reference/equals
        }
        List<Role> targetRoles = new java.util.ArrayList<>(targetRolesSet);
        
        // Get current roles from the many-to-many relationship
        List<String> existingRoleNames = targetUser.getRoles().stream()
            .map(Role::getName)
            .collect(Collectors.toList());
        
        // Determine roles to add and remove
        List<String> rolesToAdd = newRoleNames.stream()
            .filter(role -> !existingRoleNames.contains(role))
            .collect(Collectors.toList());
        List<String> rolesToRemove = existingRoleNames.stream()
            .filter(role -> !newRoleNames.contains(role))
            .collect(Collectors.toList());
        
        // Update user roles using the @ManyToMany relationship (JPA handles the join table)
        targetUser.setRoles(targetRoles);
        targetUser = userRepository.save(targetUser);
        
        // Log audit events for role changes (with transaction isolation)
        try {
            // Log role additions
            for (String roleName : rolesToAdd) {
                auditService.logEvent(currentUser, "ROLE_ASSIGNED", null, null,
                    String.format("Assigned %s to %s", roleName, targetUser.getEmail()));
            }
            
            // Log role removals
            for (String roleName : rolesToRemove) {
                auditService.logEvent(currentUser, "ROLE_REMOVED", null, null,
                    String.format("Removed %s from %s", roleName, targetUser.getEmail()));
            }
            
            log.info("Updated roles for user {}: added={}, removed={}", 
                targetUser.getEmail(), rolesToAdd, rolesToRemove);
        } catch (Exception e) {
            log.error("Failed to log audit events for role changes", e);
            // Don't fail the update if audit logging fails
        }
        
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

