package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.startsmart.ai.riskanalyzer.dto.LlmRecommendationDTO;
import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;
import com.startsmart.ai.riskanalyzer.entity.Project;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class LangGraphClient {

    private final WebClient webClient;
    private final String mlServiceUrl;

    public LangGraphClient(WebClient.Builder webClientBuilder,
                           @Value("${ml.service.url:http://localhost:8000}") String mlServiceUrl) {
        this.webClient = webClientBuilder.build();
        this.mlServiceUrl = mlServiceUrl;
    }

    public List<LlmRecommendationDTO> generateRecommendations(
            List<RecommendationRanker.RankedCategory> topCategories,
            Project project,
            RiskAssessmentResponseDTO.SwotDTO swot) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("top_categories", toCategoryPayload(topCategories));
        requestBody.put("project_context", toProjectContext(project));
        requestBody.put("swot", toSwotPayload(swot));

        try {
            LangGraphRecommendationsResponse response = webClient.post()
                    .uri(mlServiceUrl + "/langgraph/recommendations")
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(LangGraphRecommendationsResponse.class)
                    .block();

            if (response == null || response.recommendations() == null) {
                throw new LlmService.LlmException("LangGraph service returned null response");
            }
            return response.recommendations();
        } catch (LlmService.LlmException e) {
            throw e;
        } catch (Exception e) {
            throw new LlmService.LlmException(
                    "Failed to call LangGraph recommendation service: " + e.getMessage(), e);
        }
    }

    private static List<Map<String, Object>> toCategoryPayload(
            List<RecommendationRanker.RankedCategory> topCategories) {
        return topCategories.stream()
                .map(c -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("category", c.category());
                    m.put("score", c.score() != null ? c.score() : 0.0);
                    m.put("reason", c.reason() != null ? c.reason() : "Not available");
                    return m;
                })
                .toList();
    }

    private static Map<String, Object> toProjectContext(Project project) {
        Map<String, Object> m = new HashMap<>();
        m.put("budget", project.getBudget() != null ? project.getBudget() : null);
        m.put("industry", project.getProjectType() != null ? project.getProjectType() : "Not specified");
        m.put("target_market", project.getTargetMarket() != null ? project.getTargetMarket() : "Not specified");
        m.put("description", project.getDescription() != null ? project.getDescription() : "Not specified");
        return m;
    }

    private static Map<String, Object> toSwotPayload(RiskAssessmentResponseDTO.SwotDTO swot) {
        Map<String, Object> m = new HashMap<>();
        m.put("strengths", swot.getStrengths() != null ? swot.getStrengths() : List.of());
        m.put("weaknesses", swot.getWeaknesses() != null ? swot.getWeaknesses() : List.of());
        m.put("opportunities", swot.getOpportunities() != null ? swot.getOpportunities() : List.of());
        m.put("threats", swot.getThreats() != null ? swot.getThreats() : List.of());
        return m;
    }

    /** Shape of the LangGraph service response: { "recommendations": [...] }. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record LangGraphRecommendationsResponse(List<LlmRecommendationDTO> recommendations) {
    }
}