package com.itcenter.auth.service;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProvisioningService {
    private static final String USERINFO_ENDPOINT = "https://itcenter-auth.auth.ap-southeast-2.amazoncognito.com/oauth2/userInfo";
    
    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;
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

        final String finalDisplayName = displayName;

        return userRepository.findByCognitoSub(sub).orElseGet(() -> {
            log.info("Creating new user via JIT provisioning for sub: {}, email: {}", sub, finalEmail);
            
            AppUser user = new AppUser();
            user.setCognitoSub(sub);
            user.setEmail(finalEmail);
            user.setDisplayName(finalDisplayName);
            user.setIsActive(true);
            user.setLocale("en");
            
            AppUser savedUser = userRepository.save(user);

            // Optional: Assign default role
            roleRepository.findByName("EMPLOYEE").ifPresent(role -> {
                savedUser.getRoles().add(role);
                userRepository.save(savedUser);
            });
            
            log.info("Created user with ID: {} for email: {}", savedUser.getId(), finalEmail);
            return savedUser;
        });
    }
    
    private Map<String, Object> fetchUserInfoFromCognito(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<?> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                USERINFO_ENDPOINT,
                HttpMethod.GET,
                entity,
                Map.class
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

