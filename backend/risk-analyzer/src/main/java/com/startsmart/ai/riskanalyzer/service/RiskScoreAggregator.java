package com.startsmart.ai.riskanalyzer.service;

/**
 * Combines the five risk categories into the weighted Overall Risk Score.
 * Financial risk carries the largest weight because it is grounded in real
 * historical data; the other four are LLM-reasoned on the same 0-100 scale.
 */
public final class RiskScoreAggregator {

    private RiskScoreAggregator() {
    }

    public static final double WEIGHT_FINANCIAL = 0.25;
    public static final double WEIGHT_MARKET = 0.20;
    public static final double WEIGHT_TECHNICAL = 0.20;
    public static final double WEIGHT_OPERATIONAL = 0.20;
    public static final double WEIGHT_EXECUTION = 0.15;

    public static double computeOverallRiskScore(
            double financial, double market, double technical, double operational, double execution) {
        double score = financial * WEIGHT_FINANCIAL
                + market * WEIGHT_MARKET
                + technical * WEIGHT_TECHNICAL
                + operational * WEIGHT_OPERATIONAL
                + execution * WEIGHT_EXECUTION;
        return Math.round(score * 10.0) / 10.0;
    }

    public static double combinedSuccessProbability(double overallRiskScore) {
        return Math.round((100.0 - overallRiskScore) * 10.0) / 10.0;
    }

    /**
     * Blends scope-based budget adequacy with the ML historical baseline:
     * adequacy risk (100 - score) at 60% + ML financial risk at 40%.
     */
    public static double blendFinancialRisk(double budgetAdequacyScore, double mlFinancialRisk) {
        double budgetAdequacyRisk = 100.0 - budgetAdequacyScore;
        double blended = (budgetAdequacyRisk * 0.60) + (mlFinancialRisk * 0.40);
        return Math.round(blended * 10.0) / 10.0;
    }

    /** Same thresholds as the ML service and dashboard so risk levels stay consistent. */
    public static String deriveRiskLevel(double overallRiskScore) {
        if (overallRiskScore >= 67.0) {
            return "High";
        }
        if (overallRiskScore >= 34.0) {
            return "Medium";
        }
        return "Low";
    }
}