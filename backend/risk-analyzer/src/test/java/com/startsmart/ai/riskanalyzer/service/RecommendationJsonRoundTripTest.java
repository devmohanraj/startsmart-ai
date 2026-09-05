package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.startsmart.ai.riskanalyzer.dto.LlmRecommendationDTO;
import com.startsmart.ai.riskanalyzer.dto.RecommendationResponseDTO;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RecommendationJsonRoundTripTest {

    // Mirror Spring Boot's auto-registered JavaTimeModule; without it LocalDateTime serializes as a numeric array.
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Test
    void responseDtoSerializesAndRoundTripsAllFields() throws Exception {
        LocalDateTime createdAt = LocalDateTime.of(2026, 8, 14, 10, 30);
        RecommendationResponseDTO dto = RecommendationResponseDTO.builder()
                .id(7L)
                .riskCategory("market")
                .recommendationText("Run a ₹5,00,000 paid pilot across two SMB segments before scaling.")
                .mitigationStrategy("Define 10 pilot customers, track weekly signup and retention, and gate the full rollout on 40% retention.")
                .priority("High")
                .phase("Next 30 Days")
                .createdAt(createdAt)
                .build();

        String json = objectMapper.writeValueAsString(dto);

        assertTrue(json.contains("\"riskCategory\":\"market\""));
        assertTrue(json.contains("\"recommendationText\":\"Run a ₹5,00,000 paid pilot across two SMB segments before scaling.\""));
        assertTrue(json.contains("\"mitigationStrategy\""));
        assertTrue(json.contains("\"priority\":\"High\""));
        assertTrue(json.contains("\"phase\":\"Next 30 Days\""));
        assertTrue(json.contains("\"createdAt\":\"2026-08-14T10:30:00\""));

        RecommendationResponseDTO roundTripped = objectMapper.readValue(json, RecommendationResponseDTO.class);
        assertEquals(dto, roundTripped);
    }

    @Test
    void parsesLlmRecommendationArrayForACategory() throws Exception {
        String json = """
                [
                  {"recommendation": "R1", "mitigation": "M1", "phase": "Immediate"},
                  {"recommendation": "R2", "mitigation": "M2", "phase": "Next Quarter"}
                ]
                """;

        List<LlmRecommendationDTO> list = objectMapper.readValue(
                json, new TypeReference<List<LlmRecommendationDTO>>() {});

        assertEquals(2, list.size());
        assertEquals("R1", list.get(0).getRecommendation());
        assertEquals("M1", list.get(0).getMitigation());
        assertEquals("Immediate", list.get(0).getPhase());
        assertEquals("R2", list.get(1).getRecommendation());
        assertEquals("Next Quarter", list.get(1).getPhase());
    }

    @Test
    void parsesLlmRecommendationArrayWithMarkdownFence() throws Exception {
        String json = """
                ```json
                [{"recommendation": "R1", "mitigation": "M1", "phase": "Immediate"}]
                ```
                """;
        // Replicate the service's fence-stripping by hand since stripMarkdown is package-private.
        String cleaned = json.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();

        List<LlmRecommendationDTO> list = objectMapper.readValue(
                cleaned, new TypeReference<List<LlmRecommendationDTO>>() {});

        assertEquals(1, list.size());
        assertEquals("R1", list.get(0).getRecommendation());
        assertEquals("Immediate", list.get(0).getPhase());
    }
}