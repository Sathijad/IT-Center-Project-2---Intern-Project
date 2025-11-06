package com.itcenter.auth.service;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.entity.UserRole;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.RoleRepository;
import com.itcenter.auth.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProvisioningService {
    private static final String USERINFO_ENDPOINT = "https://itcenter-auth.auth.ap-southeast-2.amazoncognito.com/oauth2/userInfo";
    
    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Transactional
    public AppUser findOrCreateFromJwt(Jwt jwt) {
        final String sub   = jwt.getClaimAsString("sub");   // final -> safe to capture
        String email = jwt.getClaimAsString("email"); // May be null
        String name = jwt.getClaimAsString("name"); // May be null
        
        // Log all available claims for debugging
        log.debug("Processing JWT with claims: {}", jwt.getClaims());
        
        // If email or name are missing, try to fetch from Cognito userInfo endpoint
        if ((email == null || email.isBlank() || name == null || name.isBlank())) {
            log.info("Email or name missing from JWT, fetching from userInfo endpoint");
            Map<String, Object> userInfo = fetchUserInfoFromCognito(jwt.getTokenValue());
            
            if (email == null || email.isBlank()) {
                email = (String) userInfo.get("email");
                if (email != null && !email.isBlank()) {
                    log.info("Retrieved email from userInfo: {}", email);
                }
            }
            
            if (name == null || name.isBlank()) {
                name = (String) userInfo.get("name");
                if (name == null || name.isBlank()) {
                    // Try given_name and family_name
                    String given = (String) userInfo.get("given_name");
                    String family = (String) userInfo.get("family_name");
                    if (given != null || family != null) {
                        name = (given != null ? given : "") + (family != null ? " " + family : "");
                        name = name.trim();
                    } else {
                        name = (String) userInfo.get("preferred_username");
                    }
                }
            }
        }
        
        // Fallback to username
        if (email == null || email.isBlank()) {
            email = jwt.getClaimAsString("username");
            if (email == null || email.isBlank()) {
                email = jwt.getClaimAsString("cognito:username");
            }
        }
        
        // Final fallback: use sub
        if (email == null || email.isBlank()) {
            email = sub + "@cognito.local";
            log.warn("No email found, using fallback: {}", email);
        }

        final String finalEmail = email; // make it effectively final for lambda
        
        // Build display name
        String displayName = name;
        if (displayName == null || displayName.isBlank()) {
            displayName = finalEmail; // fallback to email
        }
        
        // Truncate display name to 50 characters (database column limit)
        if (displayName != null && displayName.length() > 50) {
            displayName = displayName.substring(0, 50);
        }

        final String finalDisplayName = displayName;

        // Find existing user or create new one
        AppUser user = userRepository.findByCognitoSub(sub).orElseGet(() -> {
            log.info("Creating new user via JIT provisioning for sub: {}, email: {}", sub, finalEmail);
            
            AppUser newUser = new AppUser();
            newUser.setCognitoSub(sub);
            newUser.setEmail(finalEmail);
            newUser.setDisplayName(finalDisplayName);
            newUser.setIsActive(true);
            newUser.setLocale("en");
            
            AppUser savedUser = userRepository.save(newUser);

            // Optional: Assign default EMPLOYEE role with audit fields
            roleRepository.findByName("EMPLOYEE").ifPresent(role -> {
                // Check if UserRole already exists
                boolean exists = userRoleRepository.findByUserIdWithDetails(savedUser.getId()).stream()
                    .anyMatch(ur -> ur.getRole().getId().equals(role.getId()));
                
                if (!exists) {
                    // Create UserRole entity with audit fields
                    // For system-created users, assigned_by is null (system assignment)
                    UserRole userRole = UserRole.builder()
                        .user(savedUser)
                        .role(role)
                        .assignedAt(Instant.now()) // Explicitly set timestamp
                        .assignedBy(null) // System assignment, no user assigned it
                        .build();
                    
                    userRoleRepository.save(userRole);
                    log.debug("Assigned default EMPLOYEE role to new user {} (system assignment at {})", 
                        savedUser.getId(), userRole.getAssignedAt());
                }
            });
            
            log.info("Created user with ID: {} for email: {}", savedUser.getId(), finalEmail);
            return savedUser;
        });
        
        // ✅ Only fill from Cognito on first creation - preserve manual edits
        boolean needsUpdate = false;
        
        // Update email only if it's missing (first time)
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(finalEmail);
            needsUpdate = true;
            log.debug("Setting email for first time: {}", finalEmail);
        }
        
        // Update display name only if it's missing or blank (first time)
        // Do NOT overwrite existing display name - it may have been customized by user
        if (user.getDisplayName() == null || user.getDisplayName().isBlank()) {
            user.setDisplayName(finalDisplayName);
            needsUpdate = true;
            log.debug("Setting display name for first time: {}", finalDisplayName);
        }
        
        // Always update last login timestamp
        user.setLastLogin(LocalDateTime.now());
        needsUpdate = true;
        
        if (needsUpdate) {
            log.debug("Updating user profile for sub: {}, setting last_login", sub);
            return userRepository.save(user);
        }
        
        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("User account is deactivated");
        }
        return user;
    }
    
    private Map<String, Object> fetchUserInfoFromCognito(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<?> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                USERINFO_ENDPOINT,
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Successfully fetched userInfo from Cognito");
                return response.getBody();
            } else {
                log.warn("UserInfo endpoint returned non-2xx status: {}", response.getStatusCode());
                return java.util.Collections.emptyMap();
            }
        } catch (Exception e) {
            log.error("Failed to fetch userInfo from Cognito: {}", e.getMessage());
            return java.util.Collections.emptyMap();
        }
    }
}

