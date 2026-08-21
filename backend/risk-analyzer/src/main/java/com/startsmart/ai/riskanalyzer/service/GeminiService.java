package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.startsmart.ai.riskanalyzer.dto.GeminiResponseDTO;
import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;
import com.startsmart.ai.riskanalyzer.entity.Project;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class GeminiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String apiUrl;
    private final String apiKey;
    private final String groqApiUrl;
    private final String groqApiKey;
    private final String groqModel;

    public GeminiService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${gemini.api.url}") String apiUrl,
            @Value("${gemini.api.key}") String apiKey,
            @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}") String groqApiUrl,
            @Value("${groq.api.key}") String groqApiKey,
            @Value("${groq.model:llama-3.3-70b-versatile}") String groqModel) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.groqApiUrl = groqApiUrl;
        this.groqApiKey = groqApiKey;
        this.groqModel = groqModel;
    }

    @SuppressWarnings("unchecked")
    public String callGroq(String prompt) {
        Map<String, Object> requestBody = Map.of(
                "model", groqModel,
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)),
                "temperature", 0.7);

        Map<String, Object> response = webClient.post()
                .uri(groqApiUrl)
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .retryWhen(
                        reactor.util.retry.Retry
                                .backoff(3, java.time.Duration.ofSeconds(1))
                                .maxBackoff(java.time.Duration.ofSeconds(8))
                                .filter(throwable ->
                                        throwable instanceof org.springframework.web.reactive.function.client.WebClientResponseException.ServiceUnavailable))
                .onErrorMap(
                        org.springframework.web.reactive.function.client.WebClientResponseException.ServiceUnavailable.class,
                        e -> new GeminiException("Groq is temporarily unavailable. Please try again in a moment.", e))
                .onErrorMap(
                        org.springframework.web.reactive.function.client.WebClientResponseException.TooManyRequests.class,
                        e -> new GeminiException("Groq API rate limit reached. Please wait a minute and try again.", e))
                .block();

        if (response == null) {
            throw new GeminiException("Groq API returned null response");
        }

        try {
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                throw new GeminiException("Groq API returned no choices");
            }

            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) {
                throw new GeminiException("Groq API returned no message in the first choice");
            }

            String text = (String) message.get("content");
            if (text == null || text.isBlank()) {
                throw new GeminiException("Groq API returned empty content");
            }
            return text;

        } catch (GeminiException e) {
            throw e;
        } catch (Exception e) {
            throw new GeminiException("Failed to extract text from Groq response: " + e.getMessage(), e);
        }
    }

    public GeminiResponseDTO analyzeMarket(Project project) {
        String prompt = buildPrompt(project);

        String rawJson = callGemini(prompt);
        String cleaned = stripMarkdown(rawJson);

        try {
            GeminiResponseDTO dto = objectMapper.readValue(cleaned, GeminiResponseDTO.class);
            if (dto.getMarketData() == null) {
                throw new GeminiException("Gemini returned incomplete data — missing marketData");
            }
            return dto;
        } catch (GeminiException e) {
            throw e;
        } catch (Exception e) {
            throw new GeminiException("Failed to parse Gemini response: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(Project project) {
        return """
                You are a market research analyst specializing in the Indian market. Analyze the following startup/project and provide market sizing, growth rate, market trends from 2020 to 2026, and competitor analysis focused on the Indian market.

                Important guidelines:
                - All market size values (TAM, SAM, SOM) must be raw numbers representing Indian Rupees (INR). For example, 2400000000 means ₹240 Crore.
                - All competitor revenue must be in INR with Indian units (e.g., "₹38 Cr", "₹220 Cr", "₹5 L").
                - Competitors should be real or realistic companies operating in India.
                - Provide exactly the top 3 competitors ranked by market share.
                - Market trends should reflect the Indian market context.
                - Growth rate should reflect the Indian market growth for this sector.
                - Market sizes should be realistic for the Indian market, not global figures.

                Project details:
                - Industry/Sector: %s
                - Business Model: %s
                - Target Market: %s
                - Description: %s

                Respond with ONLY valid JSON. No markdown, no code fences, no explanation. Use this exact JSON structure:
                {
                  "marketData": {
                    "marketSizeTam": "2400000000",
                    "marketSizeSam": "850000000",
                    "marketSizeSom": "12000000",
                    "growthRate": "8.2%%",
                    "marketTrends": [
                      {"year": 2020, "value": 10},
                      {"year": 2021, "value": 12},
                      {"year": 2022, "value": 15},
                      {"year": 2023, "value": 18},
                      {"year": 2024, "value": 22},
                      {"year": 2025, "value": 27},
                      {"year": 2026, "value": 33}
                    ],
                    "competitors": [
                      {"name": "Competitor A", "marketShare": "22%%", "revenue": "₹38 Cr", "growth": "+8%%", "position": "Direct"},
                      {"name": "Competitor B", "marketShare": "15%%", "revenue": "₹22 Cr", "growth": "+12%%", "position": "Direct"},
                      {"name": "Competitor C", "marketShare": "8%%", "revenue": "₹10 Cr", "growth": "+5%%", "position": "Indirect"},
                      {"name": "Competitor D", "marketShare": "5%%", "revenue": "₹6 Cr", "growth": "+3%%", "position": "Indirect"}
                    ]
                  }
                }
                """
                .formatted(
                        project.getProjectType() != null ? project.getProjectType() : "General",
                        project.getBusinessModel() != null ? project.getBusinessModel() : "Not specified",
                        project.getTargetMarket() != null ? project.getTargetMarket() : "Not specified",
                        project.getDescription() != null ? project.getDescription() : "Not specified");
    }

    public String generateCombinedRecommendations(
            List<RecommendationRanker.RankedCategory> topCategories,
            Project project,
            RiskAssessmentResponseDTO.SwotDTO swot) {
        String prompt = buildCombinedRecommendationPrompt(topCategories, project, swot);
        String rawJson = callGemini(prompt);
        return stripMarkdown(rawJson);
    }

    private String buildCombinedRecommendationPrompt(
            List<RecommendationRanker.RankedCategory> topCategories,
            Project project,
            RiskAssessmentResponseDTO.SwotDTO swot) {
        String budgetText = project.getBudget() != null ? "₹" + project.getBudget() : "Not specified";
        String categoriesText = topCategories == null || topCategories.isEmpty()
                ? "None"
                : topCategories.stream()
                        .map(c -> "- " + capitalize(c.category()) + " Risk (score "
                                + (c.score() != null ? c.score() : "N/A") + "/100): "
                                + (c.reason() != null ? c.reason() : "Not available"))
                        .collect(Collectors.joining("\n"));
        int categoryCount = topCategories != null ? topCategories.size() : 0;

        return """
                You are a startup risk mitigation strategist. The risk assessment for the project below has already been completed. Your task is to produce SPECIFIC, ACTIONABLE recommendations that address the top risk categories listed below — all in a SINGLE response covering every listed category.

                Project details:
                - Industry: %s
                - Business Model: %s
                - Target Market: %s
                - Budget: %s
                - Description: %s

                Top risk categories to address (ranked highest first):
                %s

                Overall SWOT of the project (your recommendations must not contradict identified strengths):
                %s

                STRICT REQUIREMENTS:
                1. Produce 1-2 recommendations for EACH of the %d risk categories listed above, all inside ONE JSON object.
                2. Recommendations must be specific and actionable for THIS exact project - reference the actual budget, industry, scope, and target market given above. Do NOT give generic advice such as "improve marketing", "hire a team", or "raise more funding" without grounding it in this project's specifics.
                3. Do not repeat or summarize the risk reasons above. Only NEW, concrete guidance on what to do about each risk.
                4. Each recommendation must include a realistic mitigation strategy explaining HOW to execute it.
                5. Assign each recommendation a phase: "Immediate" (action within the next week), "Next 30 Days", or "Next Quarter".
                6. Return ONLY valid JSON - no markdown, no code fences, no preamble. Exactly ONE JSON object in this shape:
                {
                  "recommendations": [
                    {
                      "riskCategory": "<exact category key: financial|market|technical|operational|execution>",
                      "recommendation": "<specific actionable recommendation>",
                      "mitigation": "<concrete mitigation strategy>",
                      "phase": "Immediate|Next 30 Days|Next Quarter"
                    }
                  ]
                }
                Include at least one entry for every risk category listed above, and set the "riskCategory" field to the EXACT category key you were given for it.
                """
                .formatted(
                        project.getProjectType() != null ? project.getProjectType() : "Not specified",
                        project.getBusinessModel() != null ? project.getBusinessModel() : "Not specified",
                        project.getTargetMarket() != null ? project.getTargetMarket() : "Not specified",
                        budgetText,
                        project.getDescription() != null ? project.getDescription() : "Not specified",
                        categoriesText,
                        swotText(swot),
                        categoryCount);
    }

    private String swotText(RiskAssessmentResponseDTO.SwotDTO swot) {
        if (swot == null) {
            return "Not available";
        }
        return "Strengths: " + joinList(swot.getStrengths())
                + "\nWeaknesses: " + joinList(swot.getWeaknesses())
                + "\nOpportunities: " + joinList(swot.getOpportunities())
                + "\nThreats: " + joinList(swot.getThreats());
    }

    private String joinList(List<String> items) {
        if (items == null || items.isEmpty()) {
            return "None";
        }
        return String.join("; ", items);
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return Character.toUpperCase(value.charAt(0)) + value.substring(1);
    }

    public String callGemini(String prompt) {
        return callGemini(prompt, apiKey);
    }

    @SuppressWarnings("unchecked")
    public String callGemini(String prompt, String apiKeyToUse) {

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)))));

        Map<String, Object> response = webClient.post()
                .uri(apiUrl + "?key=" + apiKeyToUse)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .retryWhen(
                        reactor.util.retry.Retry
                                .backoff(3, java.time.Duration.ofSeconds(1))
                                .maxBackoff(java.time.Duration.ofSeconds(8))
                                .filter(throwable ->
                                        throwable instanceof org.springframework.web.reactive.function.client.WebClientResponseException.ServiceUnavailable))
                .onErrorMap(
                        org.springframework.web.reactive.function.client.WebClientResponseException.ServiceUnavailable.class,
                        e -> new GeminiException("Gemini is temporarily unavailable. Please try again in a moment.", e))
                .onErrorMap(
                        org.springframework.web.reactive.function.client.WebClientResponseException.TooManyRequests.class,
                        e -> new GeminiException("Gemini API rate limit reached. Please wait a minute and try again.", e))
                .block();

        if (response == null) {
            throw new GeminiException("Gemini API returned null response");
        }
        try {
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new GeminiException("Gemini API returned no candidates");
            }

            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");

            if (parts == null || parts.isEmpty()) {
                throw new GeminiException("Gemini API returned no content parts");
            }
            String text = (String) parts.get(0).get("text");

            if (text == null || text.isBlank()) {
                throw new GeminiException("Gemini API returned empty text");
            }
            return text;

        } catch (GeminiException e) {
            throw e;
        } catch (Exception e) {
            throw new GeminiException("Failed to extract text from Gemini response: " + e.getMessage(),                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 e);
        }
    }

    private String stripMarkdown(String text) {
        if (text == null)
            return null;
        text = text.trim();
        if (text.startsWith("```json")) {
            text = text.substring(7);
        } else if (text.startsWith("```")) {
            text = text.substring(3);
        }
        if (text.endsWith("```")) {
            text = text.substring(0, text.length() - 3);
        }
        return text.trim();
    }

    public static class GeminiException extends RuntimeException {
        public GeminiException(String message) {
            super(message);
        }

        public GeminiException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}