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
        final String email = jwt.getClaimAsString("email"); // final -> safe to capture

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
                name = email; // final fallback
            }

            log.info("Creating new user via JIT provisioning for sub: {}", sub);
            
            AppUser user = new AppUser();
            user.setCognitoSub(sub);
            user.setEmail(email);
            user.setDisplayName(name);
            user.setIsActive(true);
            user.setLocale("en");
            
            AppUser savedUser = userRepository.save(user);

            // Optional: Assign default role
            roleRepository.findByName("EMPLOYEE").ifPresent(role -> {
                savedUser.getRoles().add(role);
                userRepository.save(savedUser);
            });
            
            log.info("Created user with ID: {} for email: {}", savedUser.getId(), email);
            return savedUser;
        });
    }
}

