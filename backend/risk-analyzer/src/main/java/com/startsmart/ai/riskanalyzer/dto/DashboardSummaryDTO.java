package com.startsmart.ai.riskanalyzer.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDTO {

    @Schema(description = "Total number of projects the user has submitted")
    private Long totalProjects;

    @Schema(description = "Number of the user's projects that have a completed risk assessment — all averages and distributions below are computed over this subset only")
    private Long assessedProjects;

    @Schema(description = "Average overall risk score (0-100) across all assessed projects, rounded to 1 decimal")
    private Double averageOverallRiskScore;

    @Schema(description = "Average combined success probability (0-100) across all assessed projects, rounded to 1 decimal")
    private Double averageSuccessProbability;

    @Schema(description = "Count of assessed projects whose risk level is High")
    private Long highRiskCount;

    @Schema(description = "Count of assessed projects whose risk level is Medium")
    private Long mediumRiskCount;

    @Schema(description = "Count of assessed projects whose risk level is Low")
    private Long lowRiskCount;

    @Schema(description = "Risk category most often the single highest-scoring category across assessed projects (e.g. Financial) — null when no breakdown data exists")
    private String topRiskCategory;

    @Schema(description = "Percentage of assessed projects in which the top risk category is the highest-scoring one, rounded to 1 decimal")
    private Double topRiskCategoryPercentage;

    @Schema(description = "Average 0-100 risk score per risk category (Financial, Market, Technical, Operational, Execution) across assessed projects, ordered by severity descending — null when no breakdown data exists")
    private List<RiskCategoryBreakdownDTO> riskCategoryBreakdown;

    @Schema(description = "Per-project key metrics, sorted by creation date (most recent first)")
    private List<ProjectSummaryDTO> projects;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProjectSummaryDTO {

        @Schema(description = "The project ID")
        private Long projectId;

        @Schema(description = "The project name")
        private String projectName;

        @Schema(description = "Industry / project type of the project")
        private String industry;

        @Schema(description = "Risk level: Low, Medium, or High")
        private String riskLevel;

        @Schema(description = "Overall risk score (0-100) from the completed risk assessment")
        private Double riskScore;

        @Schema(description = "Combined success probability (0-100) from the completed risk assessment")
        private Double successProbability;

        @Schema(description = "Feasibility score (0-100) from the completed risk assessment")
        private Double feasibilityScore;

        @Schema(description = "Timestamp when the project was created")
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RiskCategoryBreakdownDTO {

        @Schema(description = "Risk category display label (e.g. Financial)")
        private String category;

        @Schema(description = "Average 0-100 risk score for this category across assessed projects, rounded to 1 decimal")
        private Double averageScore;

        @Schema(description = "Number of assessed projects that contribute to this category score")
        private Long projectCount;
    }
}
