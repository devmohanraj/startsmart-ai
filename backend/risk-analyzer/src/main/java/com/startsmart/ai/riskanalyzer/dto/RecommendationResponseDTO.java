package com.startsmart.ai.riskanalyzer.dto;

import com.startsmart.ai.riskanalyzer.entity.Recommendation;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationResponseDTO {

    @Schema(description = "Unique identifier for the recommendation record")
    private Long id;

    @Schema(description = "Risk category this recommendation targets: financial, market, technical, operational, or execution")
    private String riskCategory;

    @Schema(description = "Specific, actionable recommendation text")
    private String recommendationText;

    @Schema(description = "Concrete mitigation strategy explaining how to execute the recommendation")
    private String mitigationStrategy;

    @Schema(description = "Priority derived from the category's risk rank: High, Medium, or Low")
    private String priority;

    @Schema(description = "Execution phase: Immediate, Next 30 Days, or Next Quarter")
    private String phase;

    @Schema(description = "Timestamp when the recommendation was generated")
    private LocalDateTime createdAt;

    public static RecommendationResponseDTO from(Recommendation recommendation) {
        return RecommendationResponseDTO.builder()
                .id(recommendation.getId())
                .riskCategory(recommendation.getRiskCategory())
                .recommendationText(recommendation.getRecommendationText())
                .mitigationStrategy(recommendation.getMitigationStrategy())
                .priority(recommendation.getPriority())
                .phase(recommendation.getPhase())
                .createdAt(recommendation.getCreatedAt())
                .build();
    }
}
