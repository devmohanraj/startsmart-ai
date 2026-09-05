package com.startsmart.ai.riskanalyzer.service;

import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

public final class RecommendationRanker {

    private RecommendationRanker() {
    }

    public static final List<String> CATEGORY_ORDER = List.of(
            "financial", "market", "technical", "operational", "execution");

    public record RankedCategory(String category, Double score, String reason) {
    }

    public static List<RankedCategory> selectTopThree(RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown) {
        return CATEGORY_ORDER.stream()
                .map(category -> toRankedCategory(breakdown, category))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingDouble((RankedCategory r) -> safeScore(r.score())).reversed())
                .limit(3)
                .toList();
    }

    private static RankedCategory toRankedCategory(
            RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown, String category) {
        RiskAssessmentResponseDTO.RiskCategoryDTO categoryData = switch (category) {
            case "financial" -> breakdown.getFinancialRisk();
            case "market" -> breakdown.getMarketRisk();
            case "technical" -> breakdown.getTechnicalRisk();
            case "operational" -> breakdown.getOperationalRisk();
            case "execution" -> breakdown.getExecutionRisk();
            default -> null;
        };
        if (categoryData == null) {
            return null;
        }
        return new RankedCategory(category, categoryData.getScore(), categoryData.getReason());
    }

    private static double safeScore(Double score) {
        return score != null ? score : 0.0;
    }
}