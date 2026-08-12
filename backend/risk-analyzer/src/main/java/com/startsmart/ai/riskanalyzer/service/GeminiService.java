package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.startsmart.ai.riskanalyzer.dto.GeminiResponseDTO;
import com.startsmart.ai.riskanalyzer.entity.Project;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String apiUrl;
    private final String apiKey;

    public GeminiService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${gemini.api.url}") String apiUrl,
            @Value("${gemini.api.key}") String apiKey) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
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

    @SuppressWarnings("unchecked")
    public String callGemini(String prompt) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt)))));

        Map<String, Object> response = webClient.post()
                .uri(apiUrl + "?key=" + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
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
            String text = (String) parts.get(0).get("text");
            return text;
        } catch (GeminiException e) {
            throw e;
        } catch (Exception e) {
            throw new GeminiException("Failed to extract text from Gemini response: " + e.getMessage(), e);
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