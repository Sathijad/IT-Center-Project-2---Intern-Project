package com.itcenter.auth.repository;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Repository tests for AppUserRepository
 */
@DataJpaTest
class AppUserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Role adminRole;
    private Role employeeRole;

    @BeforeEach
    void setUp() {
        // Create roles
        adminRole = new Role();
        adminRole.setName("ADMIN");
        adminRole = roleRepository.save(adminRole);

        employeeRole = new Role();
        employeeRole.setName("EMPLOYEE");
        employeeRole = roleRepository.save(employeeRole);
    }

    @Test
    void findByEmailIgnoreCase_FindsUser() {
        // Given
        AppUser user = new AppUser();
        user.setCognitoSub("test-sub-123");
        user.setEmail("test@example.com");
        user.setDisplayName("Test User");
        user.setLocale("en");
        user.setIsActive(true);
        user.setRoles(new ArrayList<>(List.of(employeeRole)));
        entityManager.persistAndFlush(user);

        // When
        Optional<AppUser> found = userRepository.findByEmailIgnoreCase("TEST@EXAMPLE.COM");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void findByCognitoSub_FindsUser() {
        // Given
        AppUser user = new AppUser();
        user.setCognitoSub("unique-sub-456");
        user.setEmail("user@example.com");
        user.setDisplayName("User Name");
        user.setLocale("en");
        user.setIsActive(true);
        user.setRoles(new ArrayList<>(List.of(employeeRole)));
        entityManager.persistAndFlush(user);

        // When
        Optional<AppUser> found = userRepository.findByCognitoSub("unique-sub-456");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getCognitoSub()).isEqualTo("unique-sub-456");
    }

    @Test
    void findByEmailIgnoreCase_ReturnsEmpty_WhenNotFound() {
        // When
        Optional<AppUser> found = userRepository.findByEmailIgnoreCase("nonexistent@example.com");

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    void saveUser_WithRoles_PersistsCorrectly() {
        // Given
        AppUser user = new AppUser();
        user.setCognitoSub("save-test-sub");
        user.setEmail("save@example.com");
        user.setDisplayName("Save Test");
        user.setLocale("en");
        user.setIsActive(true);
        user.setRoles(new ArrayList<>(List.of(adminRole, employeeRole)));

        // When
        AppUser saved = userRepository.saveAndFlush(user);

        // Then
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getRoles()).hasSize(2);
    }
}

