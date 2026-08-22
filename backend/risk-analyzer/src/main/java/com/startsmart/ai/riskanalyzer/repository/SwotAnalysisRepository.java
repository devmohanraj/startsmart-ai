package com.startsmart.ai.riskanalyzer.repository;

import com.startsmart.ai.riskanalyzer.entity.SwotAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SwotAnalysisRepository extends JpaRepository<SwotAnalysis, Long> {
    Optional<SwotAnalysis> findByProjectProjectId(Long projectId);
    void deleteByProjectProjectId(Long projectId);
    List<SwotAnalysis> findByProjectUserUserId(Long userId);
}