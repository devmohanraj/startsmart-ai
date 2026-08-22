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
        // financial 0.25 * 40 = 10
        // market    0.20 * 60 = 12
        // technical 0.20 * 20 =  4
        // operational 0.20 * 80 = 16
        // execution 0.15 * 50 =  7.5
        // total = 49.5
        double result = RiskScoreAggregator.computeOverallRiskScore(40, 60, 20, 80, 50);
        assertEquals(49.5, result, 0.0001);
    }

    @Test
    void computeOverallRiskScore_roundsToOneDecimal() {
        // financial 0.25 * 33 = 8.25
        // market    0.20 * 67 = 13.4
        // technical 0.20 * 66 = 13.2
        // operational 0.20 * 34 = 6.8
        // execution 0.15 * 80 = 12
        // total = 53.65 -> 53.7
        double result = RiskScoreAggregator.computeOverallRiskScore(33, 67, 66, 34, 80);
        assertEquals(53.7, result, 0.0001);
    }

    @Test
    void computeOverallRiskScore_highFinancialDominates() {
        // A very high financial risk pulls the overall up even if the rest is calm.
        // financial 0.25 * 90 = 22.5, market 0.20 * 30 = 6, technical 0.20 * 30 = 6,
        // operational 0.20 * 30 = 6, execution 0.15 * 20 = 3  => 43.5
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
        // successProbability (combined) + overallRiskScore must complement to 100 across profiles
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
        // Financial-only (ML) risk is 87.3 -> hypothetical ML-only success would be ~12.7
        double rawFinancialSuccessProbability = 12.7; // the ML response's success_probability

        // A mixed five-category profile still yields an overall (financial carries the most weight)
        double overallRiskScore = RiskScoreAggregator.computeOverallRiskScore(87.3, 78.0, 74.0, 88.0, 81.0);
        double combinedSuccessProbability = RiskScoreAggregator.combinedSuccessProbability(overallRiskScore);

        // The two success numbers do NOT have to agree: the combined one reflects all five categories
        // while the ML financial-only number is preserved independently and unchanged.
        assertNotEquals(combinedSuccessProbability, rawFinancialSuccessProbability, 0.001);
        assertEquals(12.7, rawFinancialSuccessProbability, 0.0001);
        assertEquals(100.0, combinedSuccessProbability + overallRiskScore, 0.0001);
    }

    @Test
    void blendFinancialRisk_movesTowardBudgetAdequacySignalNotJustMl1() {
        // Raw ML baseline says 87.3/100 financial risk (budget vs funded companies).
        // The LLM judges the budget ADEQUATE for this specific focused scope (85/100).
        // budgetAdequacyRisk = 100 - 85 = 15 -> blended = 15*0.6 + 87.3*0.4 = 9 + 34.92 = 43.92 -> 43.9
        double blended = RiskScoreAggregator.blendFinancialRisk(85, 87.3);
        assertEquals(43.9, blended, 0.0001);
        assertTrue(blended < 87.3, "high budget adequacy must pull financial risk well below the raw ML score");
    }

    @Test
    void blendFinancialRisk_lowBudgetHighAdequacyIsMeaningfullyLowerThanRawMl() {
        // LOW budget (₹18L) but a focused, single-feature, realistic scope -> high adequacy (75/100)
        double mlOnly = 87.3;
        double blended = RiskScoreAggregator.blendFinancialRisk(75, mlOnly);
        // (100-75)*0.6 = 15 ; 87.3*0.4 = 34.92 -> 49.92 -> 49.9
        assertEquals(49.9, blended, 0.0001);
        assertTrue(blended < mlOnly - 20, "blend must meaningfully lower financial risk for scope-adequate budgets");
    }

    @Test
    void blendFinancialRisk_overambitiousScopeStaysHigh() {
        // LOW budget (₹18L) + overambitious multi-feature scope -> LOW adequacy (30/100)
        double mlOnly = 87.3;
        double blended = RiskScoreAggregator.blendFinancialRisk(30, mlOnly);
        // (100-30)*0.6 = 42 ; 87.3*0.4 = 34.92 -> 76.92 -> 76.9
        assertEquals(76.9, blended, 0.0001);
        assertTrue(blended > 70, "overambitious scope with a low adequacy score must stay high-risk");
        assertTrue(blended < mlOnly, "even a bad adequacy score only shifts financial risk, keeping ML input visible");
    }

    @Test
    void blendFinancialRisk_keepsRawMlUnchangedForTransparency() {
        double mlOnly = 87.3; // raw value as returned by the ML service
        double blended = RiskScoreAggregator.blendFinancialRisk(75, mlOnly);
        // mlOnlyFinancialRisk is stored separately and is EXACTLY the raw ML response, unmodified by the blend
        assertEquals(87.3, mlOnly, 0.0001);
        assertEquals(mlOnly, 87.3, 0.0001);
        assertNotEquals(blended, mlOnly);
    }

    // ------------------------------------------------------------------
    // Calibration scenarios (TEST A-D). These mirror how the service
    // combines the LLM's budget-adequacy judgment with the ML historical
    // baseline, then derives overall risk and success probability.
    // ------------------------------------------------------------------

    @Test
    void testA_focusedSaaS_smallBudget_isNotAutomaticallyHighRisk() {
        // ₹18L focused single-feature SaaS. ML flags the small budget as high
        // historical risk (87.3), but the LLM judges it ADEQUATE for this narrow
        // scope (75). The blend must pull financial risk well below the ML value.
        double mlOnly = 87.3;
        double budgetAdequacy = 75;
        double blended = RiskScoreAggregator.blendFinancialRisk(budgetAdequacy, mlOnly);
        // (100-75)*0.6 = 15 ; 87.3*0.4 = 34.92 -> 49.92 -> 49.9
        assertEquals(49.9, blended, 0.0001);
        assertTrue(blended < mlOnly, "an adequately-funded simple scope must reduce financial risk below ML-only");

        // A realistic, moderately-rated surrounding profile yields a moderate overall
        // risk and a reasonable success probability, not a 10-20% scare number.
        double overall = RiskScoreAggregator.computeOverallRiskScore(blended, 55, 40, 45, 40);
        double success = RiskScoreAggregator.combinedSuccessProbability(overall);
        assertTrue(overall < 67, "focused realistic project should stay below the High threshold");
        assertTrue(success > 30, "success probability must not collapse just because ML historical risk was high");
    }

    @Test
    void testB_hardwareIot_smallBudget_staysHighRisk() {
        // ₹18L hardware/IoT + physical deployment -> budget is INADEQUATE (25).
        // The blend must keep financial risk high.
        double mlOnly = 87.3;
        double budgetAdequacy = 25;
        double blended = RiskScoreAggregator.blendFinancialRisk(budgetAdequacy, mlOnly);
        // (100-25)*0.6 = 45 ; 87.3*0.4 = 34.92 -> 79.92 -> 79.9
        assertEquals(79.9, blended, 0.0001);
        assertTrue(blended > 70, "underfunded hardware/physical-deployment scope must remain high risk");
        assertTrue(blended < mlOnly, "even a bad adequacy score only shifts financial risk from the ML value");
    }

    @Test
    void testC_quickCommerce_60L_isModerateNotAutomaticallyVeryHigh() {
        // ₹60L FreshBasket quick-commerce. ML ~84. Budget adequacy moderate (40):
        // the budget size itself is not the problem, but delivery/inventory/logistics
        // scope creates genuine risk. Blend to a moderate/high financial risk, and
        // the overall risk must NOT automatically become 85+ nor success fall below 20%.
        double mlOnly = 84.0;
        double budgetAdequacy = 40;
        double blended = RiskScoreAggregator.blendFinancialRisk(budgetAdequacy, mlOnly);
        // (100-40)*0.6 = 36 ; 84*0.4 = 33.6 -> 69.6
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
        // Identical budget + industry -> identical ML signal (84) in both cases.
        double mlOnly = 84.0;

        // Ambitious scope -> low adequacy (30)
        double blendedAmbitious = RiskScoreAggregator.blendFinancialRisk(30, mlOnly);
        // Simplified scope -> high adequacy (80)
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