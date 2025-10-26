package com.itcenter.auth.repository;

import com.itcenter.auth.entity.LoginAudit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface LoginAuditRepository extends JpaRepository<LoginAudit, Long> {
    
    Page<LoginAudit> findByUserId(Long userId, Pageable pageable);
    
    @Query("SELECT a FROM LoginAudit a WHERE " +
           "(:userId IS NULL OR a.user.id = :userId) AND " +
           "(:eventType IS NULL OR a.eventType = :eventType) AND " +
           "(:startDate IS NULL OR a.createdAt >= :startDate) AND " +
           "(:endDate IS NULL OR a.createdAt <= :endDate)")
    Page<LoginAudit> findByFilters(
        @Param("userId") Long userId,
        @Param("eventType") String eventType,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );
    
    @Query("SELECT COUNT(a) FROM LoginAudit a WHERE a.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);
}

