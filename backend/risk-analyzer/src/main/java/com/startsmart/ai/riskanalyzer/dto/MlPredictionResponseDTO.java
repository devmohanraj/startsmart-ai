package com.startsmart.ai.riskanalyzer.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class MlPredictionResponseDTO {

    @JsonProperty("success_probability")
    private Double successProbability;

    @JsonProperty("overall_risk_score")
    private Double overallRiskScore;

    @JsonProperty("risk_level")
    private String riskLevel;

    @JsonProperty("top_risk_factors")
    private List<RiskFactor> topRiskFactors;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RiskFactor {
        private String feature;
        private Double contribution;
        private String direction;
    }
}