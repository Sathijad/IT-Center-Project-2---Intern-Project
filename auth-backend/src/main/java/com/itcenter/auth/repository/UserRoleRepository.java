package com.itcenter.auth.repository;

import com.itcenter.auth.entity.Role;
import com.itcenter.auth.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {
    
    /**
     * Find all role names for a given user ID
     */
    @Query("SELECT r.name FROM UserRole ur " +
           "JOIN ur.role r " +
           "WHERE ur.user.id = :userId")
    List<String> findRoleNamesByUserId(@Param("userId") Long userId);
    
    /**
     * Find all roles for a given user ID
     */
    @Query("SELECT ur.role FROM UserRole ur WHERE ur.user.id = :userId")
    List<Role> findRolesByUserId(@Param("userId") Long userId);
    
    /**
     * Delete user role by user ID and role ID
     */
    @Modifying
    @Query("DELETE FROM UserRole ur WHERE ur.user.id = :userId AND ur.role.id = :roleId")
    void deleteByUserIdAndRoleId(@Param("userId") Long userId, @Param("roleId") Long roleId);
    
    /**
     * Find all user roles with eager loading of related entities
     */
    @Query("SELECT ur FROM UserRole ur " +
           "LEFT JOIN FETCH ur.user u " +
           "LEFT JOIN FETCH ur.role r " +
           "ORDER BY ur.assignedAt DESC")
    List<UserRole> findAllWithUsersAndRoles();
    
    /**
     * Find all user roles for a specific user
     */
    @Query("SELECT ur FROM UserRole ur " +
           "LEFT JOIN FETCH ur.role r " +
           "WHERE ur.user.id = :userId")
    List<UserRole> findByUserIdWithDetails(@Param("userId") Long userId);

    /**
     * Delete all user role mappings for a user (used for soft/hard delete)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM UserRole ur WHERE ur.user.id = :userId")
    int deleteAllByUserId(@Param("userId") Long userId);
}

