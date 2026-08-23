package com.startsmart.ai.riskanalyzer.service;

import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RecommendationRankerTest {

    private RiskAssessmentResponseDTO.RiskBreakdownDTO breakdownWith(
            Double financial, Double market, Double technical, Double operational, Double execution) {
        return RiskAssessmentResponseDTO.RiskBreakdownDTO.builder()
                .financialRisk(cat(financial))
                .marketRisk(cat(market))
                .technicalRisk(cat(technical))
                .operationalRisk(cat(operational))
                .executionRisk(cat(execution))
                .build();
    }

    private RiskAssessmentResponseDTO.RiskCategoryDTO cat(Double score) {
        return RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                .score(score)
                .reason("reason")
                .build();
    }

    private List<String> categoriesOf(List<RecommendationRanker.RankedCategory> ranked) {
        return ranked.stream().map(RecommendationRanker.RankedCategory::category).toList();
    }

    @Test
    void selectsTopThreeByScoreDescending() {
        var top = RecommendationRanker.selectTopThree(breakdownWith(80.0, 40.0, 60.0, 90.0, 30.0));
        assertEquals(List.of("operational", "financial", "technical"), categoriesOf(top));
        assertEquals(90.0, top.get(0).score(), 0.0001);
        assertEquals(80.0, top.get(1).score(), 0.0001);
        assertEquals(60.0, top.get(2).score(), 0.0001);
    }

    @Test
    void tieBreaksByCanonicalCategoryOrder() {
        var top = RecommendationRanker.selectTopThree(breakdownWith(50.0, 50.0, 50.0, 50.0, 50.0));
        assertEquals(List.of("financial", "market", "technical"), categoriesOf(top));
    }

    @Test
    void tieAtSecondRankKeepsCanonicalOrderWithinTie() {
        var top = RecommendationRanker.selectTopThree(breakdownWith(90.0, 60.0, 60.0, 60.0, 20.0));
        assertEquals(List.of("financial", "market", "technical"), categoriesOf(top));
    }

    @Test
    void returnsFewerWhenCategoriesAreMissing() {
        var breakdown = RiskAssessmentResponseDTO.RiskBreakdownDTO.builder()
                .marketRisk(cat(70.0))
                .technicalRisk(cat(50.0))
                .build();
        var top = RecommendationRanker.selectTopThree(breakdown);
        assertEquals(List.of("market", "technical"), categoriesOf(top));
    }

    @Test
    void nullScoresAreTreatedAsLowestAndExcludedFromTopThree() {
        var breakdown = RiskAssessmentResponseDTO.RiskBreakdownDTO.builder()
                .financialRisk(RiskAssessmentResponseDTO.RiskCategoryDTO.builder().reason("no score").build())
                .marketRisk(cat(40.0))
                .technicalRisk(cat(30.0))
                .executionRisk(cat(20.0))
                .build();
        var top = RecommendationRanker.selectTopThree(breakdown);
        assertEquals(List.of("market", "technical", "execution"), categoriesOf(top));
    }

    @Test
    void emptyBreakdownReturnsNoTargets() {
        assertTrue(RecommendationRanker.selectTopThree(RiskAssessmentResponseDTO.RiskBreakdownDTO.builder().build()).isEmpty());
    }
}