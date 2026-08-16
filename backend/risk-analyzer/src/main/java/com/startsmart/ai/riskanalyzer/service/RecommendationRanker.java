package com.startsmart.ai.riskanalyzer.service;

import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Pure deterministic helper that ranks the five risk categories by score
 * (descending) and picks the top three that the recommendation engine should
 * target. Ties keep the canonical category order (financial, market,
 * technical, operational, execution).
 *
 * Kept as a standalone utility (no Spring dependencies) so the ranking math
 * is trivially unit-testable without mocking Gemini.
 */
public final class RecommendationRanker {

    private RecommendationRanker() {
    }

    /** Canonical category order — used to break score ties deterministically. */
    public static final List<String> CATEGORY_ORDER = List.of(
            "financial", "market", "technical", "operational", "execution");

    /**
     * A ranked category: its key, its risk score (may be null when the source
     * assessment did not compute it) and the original reason text from the
     * risk breakdown.
     */
    public record RankedCategory(String category, Double score, String reason) {
    }

    /**
     * Ranks the five risk categories by score descending and returns the top
     * three. Categories with no breakdown entry are skipped; null scores sort
     * to the bottom (treated as 0). Sorting is stable, so equal scores keep
     * {@link #CATEGORY_ORDER} order.
     *
     * @param breakdown the persisted risk breakdown from the risk assessment
     * @return the top 3 categories, highest risk first
     */
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