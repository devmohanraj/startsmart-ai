package com.startsmart.ai.riskanalyzer.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RiskScoreAggregatorTest {

    @Test
    void computeOverallRiskScore_allHundredsIsHundred() {
        assertEquals(100.0, RiskScoreAggregator.computeOverallRiskScore(100, 100, 100, 100, 100), 0.0001);
    }

    @Test
    void computeOverallRiskScore_allZerosIsZero() {
        assertEquals(0.0, RiskScoreAggregator.computeOverallRiskScore(0, 0, 0, 0, 0), 0.0001);
    }

    @Test
    void computeOverallRiskScore_knownMixMatchesWeights() {
        double result = RiskScoreAggregator.computeOverallRiskScore(40, 60, 20, 80, 50);
        assertEquals(49.5, result, 0.0001);
    }

    @Test
    void computeOverallRiskScore_roundsToOneDecimal() {
        double result = RiskScoreAggregator.computeOverallRiskScore(33, 67, 66, 34, 80);
        assertEquals(53.7, result, 0.0001);
    }

    @Test
    void computeOverallRiskScore_highFinancialDominates() {
        double result = RiskScoreAggregator.computeOverallRiskScore(90, 30, 30, 30, 20);
        assertEquals(43.5, result, 0.0001);
    }

    @Test
    void deriveRiskLevel_highThreshold() {
        assertEquals("High", RiskScoreAggregator.deriveRiskLevel(100.0));
        assertEquals("High", RiskScoreAggregator.deriveRiskLevel(67.0));
    }

    @Test
    void deriveRiskLevel_mediumThreshold() {
        assertEquals("Medium", RiskScoreAggregator.deriveRiskLevel(66.9));
        assertEquals("Medium", RiskScoreAggregator.deriveRiskLevel(34.0));
    }

    @Test
    void deriveRiskLevel_lowThreshold() {
        assertEquals("Low", RiskScoreAggregator.deriveRiskLevel(33.9));
        assertEquals("Low", RiskScoreAggregator.deriveRiskLevel(0.0));
    }

    @Test
    void combinedSuccessProbabilityPlusOverallRiskScoreAlwaysEquals100() {
        double[][] profiles = {
                {100, 100, 100, 100, 100},
                {0, 0, 0, 0, 0},
                {40, 60, 20, 80, 50},
                {87.3, 78.0, 74.0, 88.0, 81.0},
                {33, 67, 66, 34, 80},
        };
        for (double[] p : profiles) {
            double overall = RiskScoreAggregator.computeOverallRiskScore(p[0], p[1], p[2], p[3], p[4]);
            double success = RiskScoreAggregator.combinedSuccessProbability(overall);
            assertEquals(100.0, success + overall, 0.0001,
                    "successProbability (" + success + ") + overallRiskScore (" + overall + ") should equal 100");
        }
    }

    @Test
    void combinedSuccessProbabilityReflectsAllFiveNotJustFinancial() {
        double rawFinancialSuccessProbability = 12.7;

        double overallRiskScore = RiskScoreAggregator.computeOverallRiskScore(87.3, 78.0, 74.0, 88.0, 81.0);
        double combinedSuccessProbability = RiskScoreAggregator.combinedSuccessProbability(overallRiskScore);

        // Combined value reflects all five categories; the ML financial-only number is preserved independently.
        assertNotEquals(combinedSuccessProbability, rawFinancialSuccessProbability, 0.001);
        assertEquals(12.7, rawFinancialSuccessProbability, 0.0001);
        assertEquals(100.0, combinedSuccessProbability + overallRiskScore, 0.0001);
    }

    @Test
    void blendFinancialRisk_movesTowardBudgetAdequacySignalNotJustMl1() {
        // ML baseline 87.3; adequate budget (85) for this focused scope pulls the blend well below ML.
        double blended = RiskScoreAggregator.blendFinancialRisk(85, 87.3);
        assertEquals(43.9, blended, 0.0001);
        assertTrue(blended < 87.3, "high budget adequacy must pull financial risk well below the raw ML score");
    }

    @Test
    void blendFinancialRisk_lowBudgetHighAdequacyIsMeaningfullyLowerThanRawMl() {
        // Tiny budget but a focused, realistic scope earns high adequacy (75); budget size alone doesn't doom risk.
        double mlOnly = 87.3;
        double blended = RiskScoreAggregator.blendFinancialRisk(75, mlOnly);
        assertEquals(49.9, blended, 0.0001);
        assertTrue(blended < mlOnly - 20, "blend must meaningfully lower financial risk for scope-adequate budgets");
    }

    @Test
    void blendFinancialRisk_overambitiousScopeStaysHigh() {
        // Same tiny budget with an overambitious scope drives adequacy to the bottom (30).
        double mlOnly = 87.3;
        double blended = RiskScoreAggregator.blendFinancialRisk(30, mlOnly);
        assertEquals(76.9, blended, 0.0001);
        assertTrue(blended > 70, "overambitious scope with a low adequacy score must stay high-risk");
        assertTrue(blended < mlOnly, "even a bad adequacy score only shifts financial risk, keeping ML input visible");
    }

    @Test
    void blendFinancialRisk_keepsRawMlUnchangedForTransparency() {
        double mlOnly = 87.3;
        double blended = RiskScoreAggregator.blendFinancialRisk(75, mlOnly);
        // Raw ML value stays unmodified for transparency while the blended score adjusts it for reporting.
        assertEquals(87.3, mlOnly, 0.0001);
        assertEquals(mlOnly, 87.3, 0.0001);
        assertNotEquals(blended, mlOnly);
    }

    // Calibration scenarios A-D pin realistic budget/scope pairings to sane risk bands.
    @Test
    void testA_focusedSaaS_smallBudget_isNotAutomaticallyHighRisk() {
        // Focused ₹18L SaaS: ML flags 87.3 but the LLM judges it adequate (75), pulling financial risk below ML.
        double mlOnly = 87.3;
        double budgetAdequacy = 75;
        double blended = RiskScoreAggregator.blendFinancialRisk(budgetAdequacy, mlOnly);
        assertEquals(49.9, blended, 0.0001);
        assertTrue(blended < mlOnly, "an adequately-funded simple scope must reduce financial risk below ML-only");

        // Middling surrounding categories keep overall risk moderate despite the high ML blocker.
        double overall = RiskScoreAggregator.computeOverallRiskScore(blended, 55, 40, 45, 40);
        double success = RiskScoreAggregator.combinedSuccessProbability(overall);
        assertTrue(overall < 67, "focused realistic project should stay below the High threshold");
        assertTrue(success > 30, "success probability must not collapse just because ML historical risk was high");
    }

    @Test
    void testB_hardwareIot_smallBudget_staysHighRisk() {
        // ₹18L hardware/IoT with physical deployment is inadequate (25); the blend keeps financial risk high.
        double mlOnly = 87.3;
        double budgetAdequacy = 25;
        double blended = RiskScoreAggregator.blendFinancialRisk(budgetAdequacy, mlOnly);
        assertEquals(79.9, blended, 0.0001);
        assertTrue(blended > 70, "underfunded hardware/physical-deployment scope must remain high risk");
        assertTrue(blended < mlOnly, "even a bad adequacy score only shifts financial risk from the ML value");
    }

    @Test
    void testC_quickCommerce_60L_isModerateNotAutomaticallyVeryHigh() {
        // ₹60L is fine (adequacy 40); the delivery/inventory/logistics scope creates the genuine risk.
        double mlOnly = 84.0;
        double budgetAdequacy = 40;
        double blended = RiskScoreAggregator.blendFinancialRisk(budgetAdequacy, mlOnly);
        assertEquals(69.6, blended, 0.0001);
        assertTrue(blended < mlOnly, "budget adequacy must temper, not eliminate, the ML signal");

        double overall = RiskScoreAggregator.computeOverallRiskScore(blended, 65, 55, 70, 60);
        double success = RiskScoreAggregator.combinedSuccessProbability(overall);
        assertTrue(overall >= 60 && overall <= 70, "overall should land around moderate/high, ~60-70");
        assertTrue(overall < 85, "overall must NOT be forced to 85+");
        assertTrue(success >= 30, "success probability must NOT automatically fall below 30%");
    }

    @Test
    void testD_sameBudget_simplerScope_lowersRiskAndRaisesSuccess() {
        // Identical budget/industry gives identical ML signal (84); only scope differs, isolating the adequacy effect.
        double mlOnly = 84.0;

        double blendedAmbitious = RiskScoreAggregator.blendFinancialRisk(30, mlOnly);
        double blendedSimple = RiskScoreAggregator.blendFinancialRisk(80, mlOnly);
        assertTrue(blendedSimple < blendedAmbitious, "simpler scope -> higher adequacy -> lower blended financial risk");

        double overallAmbitious = RiskScoreAggregator.computeOverallRiskScore(blendedAmbitious, 70, 70, 70, 65);
        double overallSimple = RiskScoreAggregator.computeOverallRiskScore(blendedSimple, 55, 40, 45, 40);
        double successAmbitious = RiskScoreAggregator.combinedSuccessProbability(overallAmbitious);
        double successSimple = RiskScoreAggregator.combinedSuccessProbability(overallSimple);

        assertTrue(overallSimple < overallAmbitious, "simpler scope -> overall risk decreases");
        assertTrue(successSimple > successAmbitious, "simpler scope -> success probability increases");
        assertTrue(successSimple > 30, "a well-scoped project must get a reasonable, not tiny, success probability");
    }

}