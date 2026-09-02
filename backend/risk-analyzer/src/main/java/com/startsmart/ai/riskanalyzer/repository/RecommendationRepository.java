package com.startsmart.ai.riskanalyzer.repository;

import com.startsmart.ai.riskanalyzer.entity.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {
    List<Recommendation> findByProjectProjectId(Long projectId);
    List<Recommendation> findByProjectUserUserId(Long userId);
    void deleteByProjectProjectId(Long projectId);
}
