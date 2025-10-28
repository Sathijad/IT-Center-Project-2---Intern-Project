package com.itcenter.auth.repository;

import com.itcenter.auth.entity.LoginAudit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface LoginAuditRepository extends JpaRepository<LoginAudit, Long> {
    
    Page<LoginAudit> findByUserId(Long userId, Pageable pageable);
    
    // Simplified query - just order by date descending
    @Query("SELECT a FROM LoginAudit a ORDER BY a.createdAt DESC")
    Page<LoginAudit> findAllOrderedByCreatedAtDesc(Pageable pageable);
    
    @Query("SELECT COUNT(a) FROM LoginAudit a WHERE a.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);
    
    boolean existsByTokenJti(String tokenJti);
}

