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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    
    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;
    
    public UserProfileResponse getCurrentUserProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        AppUser user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return mapToProfileResponse(user);
    }
    
    @Transactional
    public UserProfileResponse updateCurrentUserProfile(UpdateProfileRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        AppUser user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getLocale() != null) {
            user.setLocale(request.getLocale());
        }
        
        user = userRepository.save(user);
        
        // Log profile update
        auditService.logEvent(user.getId(), "PROFILE_UPDATED", null, null, null);
        
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
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Current user not found"));
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

