package com.itcenter.auth.service;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProvisioningService {
    private final AppUserRepository userRepository;
    private final RoleRepository roleRepository;

    @Transactional
    public AppUser findOrCreateFromJwt(Jwt jwt) {
        final String sub   = jwt.getClaimAsString("sub");   // final -> safe to capture
        String email = jwt.getClaimAsString("email"); // May be null
        
        // Log all available claims for debugging
        log.debug("Processing JWT with claims: {}", jwt.getClaims());
        
        // If email is not available, try to get it from username or sub
        if (email == null || email.isBlank()) {
            email = jwt.getClaimAsString("username");
            log.warn("Email claim missing, using username: {}", email);
        }
        
        if (email == null || email.isBlank()) {
            email = jwt.getClaimAsString("cognito:username");
            log.warn("Username also missing, using cognito:username: {}", email);
        }
        
        // Final fallback: use sub
        if (email == null || email.isBlank()) {
            email = sub + "@cognito.local";
            log.warn("No email/username found, using fallback: {}", email);
        }

        final String finalEmail = email; // make it effectively final for lambda

        return userRepository.findByCognitoSub(sub).orElseGet(() -> {
            // build display name here (no non-final capture)
            String name = jwt.getClaimAsString("name");
            if (name == null || name.isBlank()) {
                String given  = jwt.getClaimAsString("given_name");
                String family = jwt.getClaimAsString("family_name");
                if ((given != null && !given.isBlank()) || (family != null && !family.isBlank())) {
                    name = (given == null ? "" : given) + (family == null ? "" : " " + family);
                }
            }
            if (name == null || name.isBlank()) {
                name = finalEmail; // final fallback
            }

            log.info("Creating new user via JIT provisioning for sub: {}, email: {}", sub, finalEmail);
            
            AppUser user = new AppUser();
            user.setCognitoSub(sub);
            user.setEmail(finalEmail);
            user.setDisplayName(name);
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
}

