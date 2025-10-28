package com.itcenter.auth.repository;

import com.itcenter.auth.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.annotation.DirtiesContext;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Repository tests for RoleRepository with @DataJpaTest
 */
@DataJpaTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class RoleRepositoryTest {

    @Autowired
    private RoleRepository roleRepository;

    private Role testRole;

    @BeforeEach
    void setUp() {
        testRole = new Role();
        testRole.setName("TEST_ROLE");
        testRole.setDescription("Test role description");
        testRole = roleRepository.save(testRole);
    }

    @Test
    void testSaveRole_Success() {
        // Given
        Role newRole = new Role();
        newRole.setName("NEW_ROLE");
        newRole.setDescription("New role");

        // When
        Role saved = roleRepository.save(newRole);

        // Then
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("NEW_ROLE");
    }

    @Test
    void testFindByName_ReturnsRole_WhenExists() {
        // When
        Optional<Role> found = roleRepository.findByName("TEST_ROLE");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("TEST_ROLE");
    }

    @Test
    void testFindByName_ReturnsEmpty_WhenNotExists() {
        // When
        Optional<Role> found = roleRepository.findByName("NONEXISTENT");

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    void testExistsByName_ReturnsTrue_WhenExists() {
        // When
        boolean exists = roleRepository.existsByName("TEST_ROLE");

        // Then
        assertThat(exists).isTrue();
    }

    @Test
    void testExistsByName_ReturnsFalse_WhenNotExists() {
        // When
        boolean exists = roleRepository.existsByName("NONEXISTENT");

        // Then
        assertThat(exists).isFalse();
    }

    @Test
    void testUpdateRole_Success() {
        // Given
        String newDescription = "Updated description";
        testRole.setDescription(newDescription);

        // When
        Role updated = roleRepository.save(testRole);

        // Then
        assertThat(updated.getDescription()).isEqualTo(newDescription);
    }

    @Test
    void testDeleteRole_Success() {
        // Given
        Long roleId = testRole.getId();

        // When
        roleRepository.delete(testRole);
        roleRepository.flush();

        // Then
        Optional<Role> deleted = roleRepository.findById(roleId);
        assertThat(deleted).isEmpty();
    }
}

