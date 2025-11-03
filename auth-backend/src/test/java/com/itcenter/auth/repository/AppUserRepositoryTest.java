package com.itcenter.auth.repository;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.annotation.DirtiesContext;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Repository tests for AppUserRepository with @DataJpaTest
 */
@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.globally_quoted_identifiers=false",
    "spring.flyway.enabled=false"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class AppUserRepositoryTest {

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Role adminRole;
    private Role employeeRole;
    private AppUser testUser;

    @BeforeEach
    void setUp() {
        // Create roles
        adminRole = new Role();
        adminRole.setName("ADMIN");
        adminRole.setDescription("Admin role");
        adminRole = roleRepository.save(adminRole);

        employeeRole = new Role();
        employeeRole.setName("EMPLOYEE");
        employeeRole.setDescription("Employee role");
        employeeRole = roleRepository.save(employeeRole);

        // Create test user
        testUser = new AppUser();
        testUser.setCognitoSub("test-sub-123");
        testUser.setEmail("test@example.com");
        testUser.setDisplayName("Test User");
        testUser.setLocale("en");
        testUser.setIsActive(true);
        testUser.setRoles(new ArrayList<>(List.of(adminRole, employeeRole)));
        testUser = userRepository.save(testUser);
    }

    @Test
    void testSaveUser_Success() {
        // Given
        AppUser newUser = new AppUser();
        newUser.setCognitoSub("new-sub-456");
        newUser.setEmail("new@example.com");
        newUser.setDisplayName("New User");
        newUser.setLocale("si");
        newUser.setIsActive(true);
        newUser.setRoles(new ArrayList<>(List.of(employeeRole)));

        // When
        AppUser saved = userRepository.save(newUser);

        // Then
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEmail()).isEqualTo("new@example.com");
    }

    @Test
    void testFindByEmail_ReturnsUser_WhenExists() {
        // When
        Optional<AppUser> found = userRepository.findByEmail("test@example.com");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void testFindByEmail_ReturnsEmpty_WhenNotExists() {
        // When
        Optional<AppUser> found = userRepository.findByEmail("nonexistent@example.com");

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    void testFindByCognitoSub_ReturnsUser_WhenExists() {
        // When
        Optional<AppUser> found = userRepository.findByCognitoSub("test-sub-123");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getCognitoSub()).isEqualTo("test-sub-123");
    }

    @Test
    void testFindByCognitoSub_ReturnsEmpty_WhenNotExists() {
        // When
        Optional<AppUser> found = userRepository.findByCognitoSub("nonexistent-sub");

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    void testExistsByEmail_ReturnsTrue_WhenExists() {
        // When
        boolean exists = userRepository.existsByEmail("test@example.com");

        // Then
        assertThat(exists).isTrue();
    }

    @Test
    void testExistsByEmail_ReturnsFalse_WhenNotExists() {
        // When
        boolean exists = userRepository.existsByEmail("nonexistent@example.com");

        // Then
        assertThat(exists).isFalse();
    }

    @Test
    void testSearchUsers_ByEmail_ReturnsMatchingUsers() {
        // Given
        AppUser secondUser = new AppUser();
        secondUser.setCognitoSub("sub-456");
        secondUser.setEmail("another@example.com");
        secondUser.setDisplayName("Another User");
        secondUser.setIsActive(true);
        userRepository.save(secondUser);

        // When
        Page<AppUser> results = userRepository.searchUsers("test@", PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getEmail()).contains("test@");
    }

    @Test
    void testSearchUsers_ByDisplayName_ReturnsMatchingUsers() {
        // When
        Page<AppUser> results = userRepository.searchUsers("Test", PageRequest.of(0, 10));

        // Then
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getDisplayName()).containsIgnoringCase("Test");
    }

    @Test
    void testFindAllActive_ReturnsOnlyActiveUsers() {
        // Given
        AppUser inactiveUser = new AppUser();
        inactiveUser.setCognitoSub("sub-inactive");
        inactiveUser.setEmail("inactive@example.com");
        inactiveUser.setIsActive(false);
        userRepository.save(inactiveUser);

        // When
        Page<AppUser> activeUsers = userRepository.findAllActive(PageRequest.of(0, 10));

        // Then
        assertThat(activeUsers.getContent()).allMatch(AppUser::getIsActive);
    }

    @Test
    void testUserWithRoles_AssociatesCorrectly() {
        // When
        Optional<AppUser> user = userRepository.findById(testUser.getId());
        
        // Then
        assertThat(user).isPresent();
        assertThat(user.get().getRoles()).hasSize(2);
        assertThat(user.get().getRoles()).extracting(Role::getName)
            .containsExactlyInAnyOrder("ADMIN", "EMPLOYEE");
    }

    @Test
    void testUpdateUserRoles_Success() {
        // Given
        testUser.setRoles(new ArrayList<>(List.of(employeeRole)));

        // When
        AppUser updated = userRepository.save(testUser);

        // Then
        assertThat(updated.getRoles()).hasSize(1);
        assertThat(updated.getRoles().get(0).getName()).isEqualTo("EMPLOYEE");
    }
}
