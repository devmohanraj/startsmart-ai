package com.startsmart.ai.riskanalyzer.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Deserializes the JSON returned by Gemini for the risk assessment prompt.
 *
 * Financial risk is intentionally NOT part of this payload — it is kept
 * 100% ML-driven. Gemini reasons over the remaining four categories and
 * anchors them to the ML financial baseline provided in the prompt, so the
 * five scores do not contradict each other.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GeminiRiskResponseDTO {

    private SwotData swot;

    @JsonProperty("budget_adequacy")
    private BudgetAdequacy budgetAdequacy;

    @JsonProperty("market_risk")
    private RiskScore marketRisk;

    @JsonProperty("technical_risk")
    private RiskScore technicalRisk;

    @JsonProperty("operational_risk")
    private RiskScore operationalRisk;

    @JsonProperty("execution_risk")
    private RiskScore executionRisk;

    @JsonProperty("risk_narrative")
    private String riskNarrative;

    @JsonProperty("feasibility_verdict")
    private String feasibilityVerdict;

    @JsonProperty("assessment_metrics")
    private Map<String, Double> assessmentMetrics;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RiskScore {
        private Double score;
        private String reason;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BudgetAdequacy {
        private Integer score;
        private String reasoning;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SwotData {
        private List<String> strengths;
        private List<String> weaknesses;
        private List<String> opportunities;
        private List<String> threats;
    }
}