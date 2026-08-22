package com.startsmart.ai.riskanalyzer.service;

/**
 * Pure deterministic helper that combines the five risk categories
 * (Financial, Market, Technical, Operational, Execution) into the single
 * weighted Overall Risk Score and derives the Low/Medium/High risk level.
 *
 * Financial Risk comes from the ML microservice and carries the largest
 * weight because it is grounded in real historical data; the other four
     * categories are reasoned over by the LLM (Groq) using the exact same 0-100 scale
 * (higher = riskier), so the weighted average stays internally consistent.
 *
 * Kept as a standalone utility (no Spring dependencies) so the weighting
 * math is trivially unit-testable.
 */
public final class RiskScoreAggregator {

    private RiskScoreAggregator() {
    }

    // Weights used to combine the five categories into the Overall Risk Score.
    public static final double WEIGHT_FINANCIAL = 0.25;
    public static final double WEIGHT_MARKET = 0.20;
    public static final double WEIGHT_TECHNICAL = 0.20;
    public static final double WEIGHT_OPERATIONAL = 0.20;
    public static final double WEIGHT_EXECUTION = 0.15;

    /**
     * Weighted average of the five risk category scores.
     *
     * @param financial   Financial risk 0-100 (from the ML model)
     * @param market      Market risk 0-100 (LLM reasoning)
     * @param technical   Technical risk 0-100 (LLM reasoning)
     * @param operational Operational risk 0-100 (LLM reasoning)
     * @param execution   Execution risk 0-100 (LLM reasoning)
     * @return the combined Overall Risk Score, rounded to 1 decimal
     */
    public static double computeOverallRiskScore(
            double financial, double market, double technical, double operational, double execution) {
        double score = financial * WEIGHT_FINANCIAL
                + market * WEIGHT_MARKET
                + technical * WEIGHT_TECHNICAL
                + operational * WEIGHT_OPERATIONAL
                + execution * WEIGHT_EXECUTION;
        return Math.round(score * 10.0) / 10.0;
    }

    /**
     * Combined success probability that complements the weighted overall risk
     * score across all five risk categories: success% = 100 - overallRisk%.
     */
    public static double combinedSuccessProbability(double overallRiskScore) {
        return Math.round((100.0 - overallRiskScore) * 10.0) / 10.0;
    }

    /**
     * Blends the LLM's budget-adequacy judgment with the ML historical baseline
     * into the Financial Risk score used for this project:
     * <pre>
     *   budgetAdequacyRisk = 100 - budgetAdequacyScore  (high adequacy = low risk)
     *   blended = (budgetAdequacyRisk * 0.60) + (mlFinancialRisk * 0.40)
     * </pre>
     *
     * @param budgetAdequacyScore 0-100 from the LLM (0 = totally inadequate budget
     *                            for the specific scope, 100 = comfortably covers it)
     * @param mlFinancialRisk     raw ML-only financial risk 0-100 (budget + industry
     *                            against historical funded companies)
     * @return the blended Financial Risk, rounded to 1 decimal
     */
    public static double blendFinancialRisk(double budgetAdequacyScore, double mlFinancialRisk) {
        double budgetAdequacyRisk = 100.0 - budgetAdequacyScore;
        double blended = (budgetAdequacyRisk * 0.60) + (mlFinancialRisk * 0.40);
        return Math.round(blended * 10.0) / 10.0;
    }

    /**
     * Maps a combined risk score (0-100) to a risk level using the same
     * thresholds used by the ML service and the overall dashboard.
     */
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