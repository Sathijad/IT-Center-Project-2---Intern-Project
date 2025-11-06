package com.itcenter.auth.unit;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.entity.UserRole;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.RoleRepository;
import com.itcenter.auth.repository.UserRoleRepository;
import com.itcenter.auth.service.UserProvisioningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserProvisioningService
 */
@ExtendWith(MockitoExtension.class)
class UserProvisioningServiceTest {

    @Mock
    private AppUserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private UserRoleRepository userRoleRepository;

    private UserProvisioningService userProvisioningService;

    private Role employeeRole;

    @BeforeEach
    void setUp() {
        userProvisioningService = new UserProvisioningService(userRepository, roleRepository, userRoleRepository);
        
        employeeRole = new Role();
        employeeRole.setId(1L);
        employeeRole.setName("EMPLOYEE");
    }

    @Test
    void findOrCreateFromJwt_CreatesNewUser_WhenNotExists() {
        // Given
        String sub = "test-user-sub";
        String email = "newuser@test.com";
        String name = "New User";

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .claim("sub", sub)
                .claim("email", email)
                .claim("name", name)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        when(userRepository.findByCognitoSub(sub)).thenReturn(Optional.empty());
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));

        AppUser savedUser = new AppUser();
        savedUser.setId(1L);
        savedUser.setCognitoSub(sub);
        savedUser.setEmail(email);
        savedUser.setDisplayName(name);
        savedUser.setRoles(new ArrayList<>(List.of(employeeRole)));

        when(userRepository.save(any(AppUser.class))).thenReturn(savedUser);
        // Mock UserRoleRepository - no existing roles for new user
        when(userRoleRepository.findByUserIdWithDetails(1L)).thenReturn(Collections.emptyList());
        // Mock saving UserRole entity
        when(userRoleRepository.save(any(UserRole.class))).thenAnswer(invocation -> {
            UserRole userRole = invocation.getArgument(0);
            userRole.setId(1L);
            return userRole;
        });

        // When
        AppUser result = userProvisioningService.findOrCreateFromJwt(jwt);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo(email);
        verify(userRepository, atLeastOnce()).save(any(AppUser.class));
        verify(userRoleRepository, times(1)).findByUserIdWithDetails(1L);
        verify(userRoleRepository, times(1)).save(any(UserRole.class));
    }

    @Test
    void findOrCreateFromJwt_FindsExistingUser_WhenExists() {
        // Given
        String sub = "existing-user-sub";
        String email = "existing@test.com";

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .claim("sub", sub)
                .claim("email", email)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        AppUser existingUser = new AppUser();
        existingUser.setId(1L);
        existingUser.setCognitoSub(sub);
        existingUser.setEmail(email);
        existingUser.setDisplayName("Existing User");

        when(userRepository.findByCognitoSub(sub)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(AppUser.class))).thenReturn(existingUser);

        // When
        AppUser result = userProvisioningService.findOrCreateFromJwt(jwt);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(userRepository, times(1)).save(any(AppUser.class)); // Only updates last login
    }

    @Test
    void findOrCreateFromJwt_UsesFallbackEmail_WhenMissing() {
        // Given
        String sub = "fallback-user-sub";

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .claim("sub", sub)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        when(userRepository.findByCognitoSub(sub)).thenReturn(Optional.empty());
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));

        AppUser savedUser = new AppUser();
        savedUser.setId(1L);
        savedUser.setCognitoSub(sub);
        savedUser.setEmail(sub + "@cognito.local");
        
        when(userRepository.save(any(AppUser.class))).thenReturn(savedUser);
        // Mock UserRoleRepository - no existing roles for new user
        when(userRoleRepository.findByUserIdWithDetails(1L)).thenReturn(Collections.emptyList());
        // Mock saving UserRole entity
        when(userRoleRepository.save(any(UserRole.class))).thenAnswer(invocation -> {
            UserRole userRole = invocation.getArgument(0);
            userRole.setId(1L);
            return userRole;
        });

        // When
        AppUser result = userProvisioningService.findOrCreateFromJwt(jwt);

        // Then
        assertThat(result).isNotNull();
        verify(userRepository, atLeastOnce()).save(any(AppUser.class));
        verify(userRoleRepository, times(1)).findByUserIdWithDetails(1L);
        verify(userRoleRepository, times(1)).save(any(UserRole.class));
    }
}

