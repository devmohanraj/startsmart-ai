package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.startsmart.ai.riskanalyzer.dto.LlmMarketResponseDTO;
import com.startsmart.ai.riskanalyzer.entity.Project;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class LlmService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String groqApiUrl;
    private final String groqApiKey;
    private final String groqApiKeyAnalysis;
    private final String groqModel;

    public LlmService(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}") String groqApiUrl,
            @Value("${groq.api.key}") String groqApiKey,
            @Value("${groq.api.key.analysis:}") String groqApiKeyAnalysis,
            @Value("${groq.model:llama-3.3-70b-versatile}") String groqModel) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = objectMapper;
        this.groqApiUrl = groqApiUrl;
        this.groqApiKey = groqApiKey;
        this.groqApiKeyAnalysis = groqApiKeyAnalysis;
        this.groqModel = groqModel;
    }

    public String getGroqApiKeyAnalysis() {
        return groqApiKeyAnalysis;
    }

    public String callGroq(String prompt) {
        return callGroq(prompt, groqApiKey);
    }

    @SuppressWarnings("unchecked")
    public String callGroq(String prompt, String apiKeyToUse) {
        Map<String, Object> requestBody = Map.of(
                "model", groqModel,
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)),
                "temperature", 0.7);

        Map<String, Object> response = webClient.post()
                .uri(groqApiUrl)
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKeyToUse)
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
                        e -> new LlmException("Groq is temporarily unavailable. Please try again in a moment.", e))
                .onErrorMap(
                        org.springframework.web.reactive.function.client.WebClientResponseException.TooManyRequests.class,
                        e -> new LlmException("Groq API rate limit reached. Please wait a minute and try again.", e))
                .block();

        if (response == null) {
            throw new LlmException("Groq API returned null response");
        }

        try {
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices == null || choices.isEmpty()) {
                throw new LlmException("Groq API returned no choices");
            }

            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) {
                throw new LlmException("Groq API returned no message in the first choice");
            }

            String text = (String) message.get("content");
            if (text == null || text.isBlank()) {
                throw new LlmException("Groq API returned empty content");
            }
            return text;

        } catch (LlmException e) {
            throw e;
        } catch (Exception e) {
            throw new LlmException("Failed to extract text from Groq response: " + e.getMessage(), e);
        }
    }

    public LlmMarketResponseDTO analyzeMarket(Project project) {
        String prompt = buildPrompt(project);

        String rawJson = callGroq(prompt, groqApiKeyAnalysis);
        String cleaned = stripMarkdown(rawJson);

        try {
            LlmMarketResponseDTO dto = objectMapper.readValue(cleaned, LlmMarketResponseDTO.class);
            if (dto.getMarketData() == null) {
                throw new LlmException("Groq returned incomplete data — missing marketData");
            }
            return dto;
        } catch (LlmException e) {
            throw e;
        } catch (Exception e) {
            throw new LlmException("Failed to parse Groq market analysis response: " + e.getMessage(), e);
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

                Your ENTIRE response MUST be a single valid JSON object. No markdown, no code fences (never wrap the JSON in ```json or any code fence), no preamble, no commentary before or after the JSON, no trailing text. Use ONLY the exact camelCase keys shown below. Every key is REQUIRED - do not omit any key, do not add any extra key, and keep every string value inside double quotes. Use this exact JSON structure:
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

    public static class LlmException extends RuntimeException {
        public LlmException(String message) {
            super(message);
        }

        public LlmException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
