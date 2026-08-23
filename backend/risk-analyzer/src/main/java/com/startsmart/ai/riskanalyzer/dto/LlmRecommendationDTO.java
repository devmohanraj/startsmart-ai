package com.startsmart.ai.riskanalyzer.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LlmRecommendationDTO {

    private String riskCategory;

    private String recommendation;

    private String mitigation;

    private String phase;
}
