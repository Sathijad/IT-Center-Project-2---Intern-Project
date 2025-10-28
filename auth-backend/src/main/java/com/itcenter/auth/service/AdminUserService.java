package com.itcenter.auth.service;

import com.itcenter.auth.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUserService {

    private final AppUserRepository userRepository;

    /**
     * Permanently deletes a user and all related data.
     * With ON DELETE CASCADE constraints, this removes:
     * - user_roles entries
     * - login_audit entries
     * - All other data referencing app_users
     */
    @Transactional
    public void deleteUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found: " + userId);
        }
        
        log.info("Permanently deleting user ID: {}", userId);
        userRepository.deleteById(userId);
        log.info("User ID: {} has been permanently deleted along with all related data", userId);
    }
}


