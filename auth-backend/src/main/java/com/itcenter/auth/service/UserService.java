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
        try {
            org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (!(auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt)) {
                log.error("Invalid authentication principal type: {}", auth.getPrincipal() != null ? auth.getPrincipal().getClass().getName() : "null");
                throw new RuntimeException("Invalid authentication principal");
            }
            
            org.springframework.security.oauth2.jwt.Jwt jwt = (org.springframework.security.oauth2.jwt.Jwt) auth.getPrincipal();
            log.debug("Getting user profile for sub: {}", jwt.getClaimAsString("sub"));
            
            AppUser user = provisioningService.findOrCreateFromJwt(jwt);
            
            if (user == null) {
                log.error("User is null after findOrCreateFromJwt");
                throw new RuntimeException("User not found or could not be created");
            }
            
            log.debug("User found/created: id={}, email={}, roles={}", user.getId(), user.getEmail(), 
                user.getRoles() != null ? user.getRoles().size() : 0);
            
            // Note: Login audit is now handled by /api/v1/sessions/mark-login endpoint
            // to ensure idempotency (once per JWT token)
            
            return mapToProfileResponse(user);
        } catch (Exception e) {
            log.error("Error in getCurrentUserProfile", e);
            throw e;
        }
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
    
    /**
     * Get user profile by cognito_sub for internal service-to-service calls
     * Used by leave-attendance-backend to fetch user details
     */
    public UserProfileResponse getUserByCognitoSub(String cognitoSub) {
        log.debug("Fetching user by cognito_sub: {}", cognitoSub);
        AppUser user = userRepository.findByCognitoSub(cognitoSub)
            .orElseThrow(() -> {
                log.warn("User not found with cognito_sub: {}", cognitoSub);
                return new RuntimeException("User not found with cognito_sub: " + cognitoSub);
            });
        
        if (Boolean.FALSE.equals(user.getIsActive())) {
            log.warn("User is not active with cognito_sub: {}", cognitoSub);
            throw new RuntimeException("User is not active");
        }
        
        log.debug("Found user: id={}, email={}, displayName={}", user.getId(), user.getEmail(), user.getDisplayName());
        return mapToProfileResponse(user);
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
        
        // Normalize and validate role names
        List<String> newRoleNames = request.getRoles().stream()
            .filter(role -> role != null && !role.isBlank())
            .map(String::trim)
            .map(String::toUpperCase)
            .collect(Collectors.toList());
        
        // Validate all roles exist and load as managed entities
        List<Role> targetRoles = newRoleNames.stream()
            .map(roleName -> roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName)))
            .collect(Collectors.toList());
        
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
        try {
            if (user == null) {
                log.error("mapToProfileResponse called with null user");
                throw new RuntimeException("User is null");
            }
            
            List<String> roleNames = user.getRoles() != null 
                ? user.getRoles().stream().map(Role::getName).collect(Collectors.toList())
                : new java.util.ArrayList<>();
            
            log.debug("Mapping user to profile response: id={}, email={}, roles={}", 
                user.getId(), user.getEmail(), roleNames);
            
            return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .locale(user.getLocale())
                .roles(roleNames)
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .build();
        } catch (Exception e) {
            log.error("Error mapping user to profile response: userId={}, error={}", 
                user != null ? user.getId() : "null", e.getMessage(), e);
            throw new RuntimeException("Failed to map user to profile response: " + e.getMessage(), e);
        }
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

