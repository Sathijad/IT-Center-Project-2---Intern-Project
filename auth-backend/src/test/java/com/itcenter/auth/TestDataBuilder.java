package com.itcenter.auth;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Test data builder for creating test entities
 */
public class TestDataBuilder {

    public static AppUser createTestUser(String email, String displayName, List<Role> roles) {
        AppUser user = new AppUser();
        user.setCognitoSub("sub-" + UUID.randomUUID().toString());
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setLocale("en");
        user.setIsActive(true);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        
        if (roles != null) {
            user.setRoles(roles);
        } else {
            user.setRoles(new ArrayList<>());
        }
        
        return user;
    }

    public static AppUser createTestUser(String email, List<Role> roles) {
        return createTestUser(email, "Test User", roles);
    }

    public static AppUser createTestUser(String email) {
        return createTestUser(email, new ArrayList<>());
    }

    public static Role createRole(String name) {
        Role role = new Role();
        role.setName(name);
        role.setDescription("Test " + name + " role");
        role.setCreatedAt(LocalDateTime.now());
        role.setUpdatedAt(LocalDateTime.now());
        return role;
    }

    public static List<Role> createRoles(String... names) {
        List<Role> roles = new ArrayList<>();
        for (String name : names) {
            roles.add(createRole(name));
        }
        return roles;
    }

    public static AppUser createAdminUser(String email) {
        List<Role> roles = createRoles("ADMIN");
        return createTestUser(email, roles);
    }

    public static AppUser createEmployeeUser(String email) {
        List<Role> roles = createRoles("EMPLOYEE");
        return createTestUser(email, roles);
    }

    public static AppUser createUserWithMultipleRoles(String email, String... roleNames) {
        List<Role> roles = createRoles(roleNames);
        return createTestUser(email, roles);
    }
}

