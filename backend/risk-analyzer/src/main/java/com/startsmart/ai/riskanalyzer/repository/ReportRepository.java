package com.startsmart.ai.riskanalyzer.repository;

import com.startsmart.ai.riskanalyzer.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {
    Optional<Report> findTopByProjectProjectIdOrderByGeneratedAtDesc(Long projectId);
    List<Report> findByProjectProjectIdOrderByGeneratedAtDesc(Long projectId);
}
