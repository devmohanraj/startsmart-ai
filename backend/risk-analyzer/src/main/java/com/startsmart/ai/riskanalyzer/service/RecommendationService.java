package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.startsmart.ai.riskanalyzer.dto.GeminiRecommendationDTO;
import com.startsmart.ai.riskanalyzer.dto.RecommendationResponseDTO;
import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;
import com.startsmart.ai.riskanalyzer.entity.Prediction;
import com.startsmart.ai.riskanalyzer.entity.Project;
import com.startsmart.ai.riskanalyzer.entity.Recommendation;
import com.startsmart.ai.riskanalyzer.entity.SwotAnalysis;
import com.startsmart.ai.riskanalyzer.repository.PredictionRepository;
import com.startsmart.ai.riskanalyzer.repository.ProjectRepository;
import com.startsmart.ai.riskanalyzer.repository.RecommendationRepository;
import com.startsmart.ai.riskanalyzer.repository.SwotAnalysisRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RecommendationService {

    private static final List<String> PRIORITIES = List.of("High", "Medium", "Low");
    private static final List<String> PHASES = List.of("Immediate", "Next 30 Days", "Next Quarter");
    private static final String PHASE_FALLBACK = "Next 30 Days";

    private final ProjectRepository projectRepository;
    private final PredictionRepository predictionRepository;
    private final SwotAnalysisRepository swotAnalysisRepository;
    private final RecommendationRepository recommendationRepository;
    private final LangGraphClient langGraphClient;
    private final ObjectMapper objectMapper;

    public RecommendationService(ProjectRepository projectRepository,
                                 PredictionRepository predictionRepository,
                                 SwotAnalysisRepository swotAnalysisRepository,
                                 RecommendationRepository recommendationRepository,
                                 LangGraphClient langGraphClient,
                                 ObjectMapper objectMapper) {
        this.projectRepository = projectRepository;
        this.predictionRepository = predictionRepository;
        this.swotAnalysisRepository = swotAnalysisRepository;
        this.recommendationRepository = recommendationRepository;
        this.langGraphClient = langGraphClient;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public List<RecommendationResponseDTO> generateRecommendations(Long projectId) {
        Project project = getProjectOrThrow(projectId);

        // The engine depends on an existing risk assessment — never regenerate it here.
        Prediction prediction = predictionRepository.findByProjectProjectId(projectId)
                .orElseThrow(() -> new IllegalStateException(noAssessmentMessage(projectId)));
        SwotAnalysis swot = swotAnalysisRepository.findByProjectProjectId(projectId)
                .orElseThrow(() -> new IllegalStateException(noAssessmentMessage(projectId)));

        RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown = loadRiskBreakdown(projectId, prediction);
        RiskAssessmentResponseDTO.SwotDTO swotData = loadSwot(swot);

        List<RecommendationRanker.RankedCategory> top = RecommendationRanker.selectTopThree(breakdown);

        // The 2-node LangGraph agent (analyze -> sequence, inside the Python
        // ml-service) covers all top categories and phases them in one flow.
        List<GeminiRecommendationDTO> results = langGraphClient.generateRecommendations(top, project, swotData);

        Map<String, String> priorityByCategory = new HashMap<>();
        for (int i = 0; i < top.size(); i++) {
            priorityByCategory.put(top.get(i).category(), PRIORITIES.get(i));
        }

        List<Recommendation> recommendations = new ArrayList<>();
        for (GeminiRecommendationDTO g : results) {
            if (g.getRecommendation() == null || g.getRecommendation().isBlank()) {
                continue;
            }
            String category = normalizeCategory(g.getRiskCategory());
            if (category == null || !priorityByCategory.containsKey(category)) {
                continue;
            }
            recommendations.add(Recommendation.builder()
                    .project(project)
                    .riskCategory(category)
                    .recommendationText(g.getRecommendation().trim())
                    .mitigationStrategy(g.getMitigation() != null ? g.getMitigation().trim() : null)
                    .priority(priorityByCategory.get(category))
                    .phase(normalizePhase(g.getPhase()))
                    .build());
        }

        // Replace any previous recommendations for this project (same pattern as
        // MarketAnalysisService / RiskAssessmentService use for their tables).
        recommendationRepository.deleteByProjectProjectId(projectId);
        List<Recommendation> saved = recommendationRepository.saveAll(recommendations);
        return saved.stream().map(RecommendationResponseDTO::from).toList();
    }

    @Transactional(readOnly = true)
    public List<RecommendationResponseDTO> getRecommendations(Long projectId) {
        List<Recommendation> recommendations = recommendationRepository.findByProjectProjectId(projectId);
        if (recommendations.isEmpty()) {
            throw new EntityNotFoundException("No recommendations found for project id: " + projectId);
        }
        return recommendations.stream().map(RecommendationResponseDTO::from).toList();
    }

    private Project getProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found with id: " + projectId));
    }

    private String noAssessmentMessage(Long projectId) {
        return "No risk assessment found for project id: " + projectId
                + ". Generate the risk analysis first via POST /api/projects/{projectId}/risk-analysis "
                + "before requesting recommendations.";
    }

    private RiskAssessmentResponseDTO.RiskBreakdownDTO loadRiskBreakdown(
            Long projectId, Prediction prediction) {
        RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown = fromJson(
                prediction.getRiskBreakdownJson(), new TypeReference<>() {});
        if (breakdown == null) {
            throw new IllegalStateException("Risk breakdown data is missing for project id: " + projectId
                    + ". Regenerate the risk analysis first.");
        }
        return breakdown;
    }

    private RiskAssessmentResponseDTO.SwotDTO loadSwot(SwotAnalysis swot) {
        return fromJson(swot.getSwotJson(), new TypeReference<>() {});
    }

    private List<GeminiRecommendationDTO> parseRecommendationsResponse(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            CombinedRecommendationsResponse response =
                    objectMapper.readValue(json, CombinedRecommendationsResponse.class);
            return response.recommendations() != null ? response.recommendations() : List.of();
        } catch (JsonProcessingException e) {
            throw new GeminiService.GeminiException(
                    "Failed to parse Gemini recommendation response: " + e.getMessage(), e);
        }
    }

    private String normalizeCategory(String category) {
        if (category == null) {
            return null;
        }
        String normalized = category.trim().toLowerCase();
        if (normalized.endsWith(" risk")) {
            normalized = normalized.substring(0, normalized.length() - " risk".length()).trim();
        }
        return normalized;
    }

    private String normalizePhase(String phase) {
        if (phase == null) {
            return PHASE_FALLBACK;
        }
        String trimmed = phase.trim();
        for (String valid : PHASES) {
            if (valid.equalsIgnoreCase(trimmed)) {
                return valid;
            }
        }
        return PHASE_FALLBACK;
    }

    private <T> T fromJson(String json, TypeReference<T> typeReference) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, typeReference);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize recommendation source data", e);
        }
    }

    /** Shape of the single Gemini response for all top categories. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record CombinedRecommendationsResponse(List<GeminiRecommendationDTO> recommendations) {
    }
}
