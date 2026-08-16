package com.startsmart.ai.riskanalyzer.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Deserializes a single recommendation object Gemini returns. For the combined
 * (one-call) flow each entry carries the target risk category so priority can be
 * mapped by that category's rank:
 *
 * <pre>
 *   { "riskCategory": "market", "recommendation": "...", "mitigation": "...", "phase": "Immediate|Next 30 Days|Next Quarter" }
 * </pre>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class GeminiRecommendationDTO {

    private String riskCategory;

    private String recommendation;

    private String mitigation;

    private String phase;
}
