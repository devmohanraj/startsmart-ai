package com.startsmart.ai.riskanalyzer.repository;

import com.startsmart.ai.riskanalyzer.entity.Prediction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {
    Optional<Prediction> findByProjectProjectId(Long projectId);
    void deleteByProjectProjectId(Long projectId);
    List<Prediction> findByProjectUserUserId(Long userId);
}