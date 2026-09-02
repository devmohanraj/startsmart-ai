package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.startsmart.ai.riskanalyzer.dto.DashboardSummaryDTO;
import com.startsmart.ai.riskanalyzer.dto.DashboardSummaryDTO.ProjectSummaryDTO;
import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO.RiskBreakdownDTO;
import com.startsmart.ai.riskanalyzer.entity.Prediction;
import com.startsmart.ai.riskanalyzer.entity.Project;
import com.startsmart.ai.riskanalyzer.entity.SwotAnalysis;
import com.startsmart.ai.riskanalyzer.repository.PredictionRepository;
import com.startsmart.ai.riskanalyzer.repository.ProjectRepository;
import com.startsmart.ai.riskanalyzer.repository.SwotAnalysisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final PredictionRepository predictionRepository;
    private final SwotAnalysisRepository swotAnalysisRepository;
    private final ObjectMapper objectMapper;

    private static final Map<String, String> RISK_CATEGORY_LABELS = Map.of(
            "financialRisk", "Financial",
            "marketRisk", "Market",
            "technicalRisk", "Technical",
            "operationalRisk", "Operational",
            "executionRisk", "Execution");

    @Transactional(readOnly = true)
    public DashboardSummaryDTO getDashboardSummary(Long userId) {
        List<Project> projects = projectRepository.findByUserUserIdOrderByCreatedAtDesc(userId);
        Map<Long, Prediction> predictionsByProjectId = predictionRepository.findByProjectUserUserId(userId).stream()
                .collect(Collectors.toMap(p -> p.getProject().getProjectId(), Function.identity(), (a, b) -> a));
        Map<Long, SwotAnalysis> swotsByProjectId = swotAnalysisRepository.findByProjectUserUserId(userId).stream()
                .collect(Collectors.toMap(s -> s.getProject().getProjectId(), Function.identity(), (a, b) -> a));

        List<ProjectSummaryDTO> projectSummaries = projects.stream()
                .filter(project -> predictionsByProjectId.containsKey(project.getProjectId())
                        && swotsByProjectId.containsKey(project.getProjectId()))
                .map(project -> toProjectSummary(
                        project,
                        predictionsByProjectId.get(project.getProjectId()),
                        swotsByProjectId.get(project.getProjectId())))
                .toList();

        return buildAggregate(projects.size(), projectSummaries, predictionsByProjectId);
    }

    private ProjectSummaryDTO toProjectSummary(Project project, Prediction prediction, SwotAnalysis swot) {
        return ProjectSummaryDTO.builder()
                .projectId(project.getProjectId())
                .projectName(project.getProjectName())
                .industry(project.getProjectType())
                .riskLevel(prediction.getRiskLevel())
                .riskScore(round1(prediction.getOverallRiskScore()))
                .successProbability(round1(prediction.getSuccessProbability()))
                .feasibilityScore(round1(swot.getFeasibilityScore()))
                .createdAt(project.getCreatedAt())
                .build();
    }

    // Portfolio aggregation covers assessed projects only
    private DashboardSummaryDTO buildAggregate(
            int totalProjects, List<ProjectSummaryDTO> summaries, Map<Long, Prediction> predictionsByProjectId) {
        double averageRiskScore = round1(sumOf(summaries, ProjectSummaryDTO::getRiskScore) / summaries.size());
        double averageSuccessProbability =
                round1(sumOf(summaries, ProjectSummaryDTO::getSuccessProbability) / summaries.size());

        TopDriver topDriver = findTopRiskDriver(summaries, predictionsByProjectId);

        return DashboardSummaryDTO.builder()
                .totalProjects((long) totalProjects)
                .assessedProjects((long) summaries.size())
                .averageOverallRiskScore(averageRiskScore)
                .averageSuccessProbability(averageSuccessProbability)
                .highRiskCount(countByLevel(summaries, "high"))
                .mediumRiskCount(countByLevel(summaries, "medium"))
                .lowRiskCount(countByLevel(summaries, "low"))
                .topRiskCategory(topDriver.category())
                .topRiskCategoryPercentage(topDriver.percentage())
                .riskCategoryBreakdown(buildRiskCategoryBreakdown(summaries, predictionsByProjectId))
                .projects(summaries)
                .build();
    }

    private double sumOf(List<ProjectSummaryDTO> summaries, Function<ProjectSummaryDTO, Double> extractor) {
        return summaries.stream()
                .map(extractor)
                .filter(value -> value != null && !value.isNaN())
                .mapToDouble(Double::doubleValue)
                .sum();
    }

    private List<DashboardSummaryDTO.RiskCategoryBreakdownDTO> buildRiskCategoryBreakdown(
            List<ProjectSummaryDTO> summaries, Map<Long, Prediction> predictionsByProjectId) {
        Map<String, List<Double>> scoresByCategory = new HashMap<>();
        for (ProjectSummaryDTO summary : summaries) {
            RiskBreakdownDTO breakdown = fromJson(
                    predictionsByProjectId.get(summary.getProjectId()) != null
                            ? predictionsByProjectId.get(summary.getProjectId()).getRiskBreakdownJson()
                            : null);
            if (breakdown == null) {
                continue;
            }
            for (Map.Entry<String, String> label : RISK_CATEGORY_LABELS.entrySet()) {
                Double score = scoreOf(breakdown, label.getKey());
                if (score != null) {
                    scoresByCategory.computeIfAbsent(label.getValue(), k -> new ArrayList<>()).add(score);
                }
            }
        }
        if (scoresByCategory.isEmpty()) {
            return List.of();
        }
        return scoresByCategory.entrySet().stream()
                .map(entry -> DashboardSummaryDTO.RiskCategoryBreakdownDTO.builder()
                        .category(entry.getKey())
                        .averageScore(round1(sum(entry.getValue()) / entry.getValue().size()))
                        .projectCount((long) entry.getValue().size())
                        .build())
                .sorted(Comparator.comparingDouble(
                        (DashboardSummaryDTO.RiskCategoryBreakdownDTO b) -> b.getAverageScore() == null
                                ? 0.0 : b.getAverageScore()).reversed())
                .toList();
    }

    private double sum(List<Double> values) {
        return values.stream().mapToDouble(Double::doubleValue).sum();
    }

    private long countByLevel(List<ProjectSummaryDTO> summaries, String level) {
        return summaries.stream()
                .filter(summary -> level.equalsIgnoreCase(summary.getRiskLevel()))
                .count();
    }

    // Top risk driver: the category that most often scores highest within a project's breakdown
    private record TopDriver(String category, Double percentage) {
    }

    private TopDriver findTopRiskDriver(List<ProjectSummaryDTO> summaries, Map<Long, Prediction> predictionsByProjectId) {
        if (summaries.isEmpty()) {
            return new TopDriver(null, null);
        }

        Map<String, Long> driverCounts = new HashMap<>();
        int projectsWithBreakdown = 0;

        for (ProjectSummaryDTO summary : summaries) {
            String topCategory = topCategoryOf(predictionsByProjectId.get(summary.getProjectId()));
            if (topCategory == null) {
                continue;
            }
            projectsWithBreakdown++;
            driverCounts.merge(topCategory, 1L, Long::sum);
        }

        if (projectsWithBreakdown == 0) {
            return new TopDriver(null, null);
        }

        final int totalWithBreakdown = projectsWithBreakdown;
        return driverCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(entry -> new TopDriver(
                        entry.getKey(),
                        round1(entry.getValue() * 100.0 / totalWithBreakdown)))
                .orElse(new TopDriver(null, null));
    }

    private String topCategoryOf(Prediction prediction) {
        RiskBreakdownDTO breakdown = fromJson(prediction != null ? prediction.getRiskBreakdownJson() : null);
        if (breakdown == null) {
            return null;
        }
        return RISK_CATEGORY_LABELS.entrySet().stream()
                .filter(entry -> scoreOf(breakdown, entry.getKey()) != null)
                .max(Comparator.comparingDouble(entry -> scoreOf(breakdown, entry.getKey())))
                .map(Map.Entry::getValue)
                .orElse(null);
    }

    private Double scoreOf(RiskBreakdownDTO breakdown, String categoryKey) {
        return switch (categoryKey) {
            case "financialRisk" -> breakdown.getFinancialRisk() != null ? breakdown.getFinancialRisk().getScore() : null;
            case "marketRisk" -> breakdown.getMarketRisk() != null ? breakdown.getMarketRisk().getScore() : null;
            case "technicalRisk" -> breakdown.getTechnicalRisk() != null ? breakdown.getTechnicalRisk().getScore() : null;
            case "operationalRisk" -> breakdown.getOperationalRisk() != null ? breakdown.getOperationalRisk().getScore() : null;
            case "executionRisk" -> breakdown.getExecutionRisk() != null ? breakdown.getExecutionRisk().getScore() : null;
            default -> null;
        };
    }

    private RiskBreakdownDTO fromJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, RiskBreakdownDTO.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private double round1(Double value) {
        if (value == null) {
            return 0.0;
        }
        return Math.round(value * 10.0) / 10.0;
    }
}
