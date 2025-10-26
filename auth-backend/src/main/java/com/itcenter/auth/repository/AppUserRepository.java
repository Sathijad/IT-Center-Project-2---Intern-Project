package com.itcenter.auth.repository;

import com.itcenter.auth.entity.AppUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    
    Optional<AppUser> findByEmail(String email);
    
    Optional<AppUser> findByCognitoSub(String cognitoSub);
    
    @Query("SELECT u FROM AppUser u WHERE " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.displayName) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<AppUser> searchUsers(@Param("query") String query, Pageable pageable);
    
    boolean existsByEmail(String email);
    
    boolean existsByCognitoSub(String cognitoSub);
}

