package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.startsmart.ai.riskanalyzer.dto.LlmRiskResponseDTO;
import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RiskAssessmentJsonRoundTripTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void breakdownSerializesWithFiveSnakeCaseCategories() throws Exception {
        RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown =
                RiskAssessmentResponseDTO.RiskBreakdownDTO.builder()
                        .financialRisk(RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                                .score(42.5).reason("historical ML").source("ML_MODEL").build())
                        .marketRisk(RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                                .score(55.0).reason("competitive segment").source("LLM").build())
                        .mlOnlyFinancialRisk(87.3)
                        .budgetAdequacy(RiskAssessmentResponseDTO.BudgetAdequacyDTO.builder()
                                .score(80).reasoning("₹18,00,000 comfortably covers a focused SaaS MVP").build())
                        .build();

        String json = objectMapper.writeValueAsString(breakdown);

        assertTrue(json.contains("\"financial_risk\":{\"score\":42.5,\"reason\":\"historical ML\",\"source\":\"ML_MODEL\"}"));
        assertTrue(json.contains("\"market_risk\":{\"score\":55.0,\"reason\":\"competitive segment\",\"source\":\"LLM\"}"));
        assertTrue(json.contains("\"ml_only_financial_risk\":87.3"));
        assertTrue(json.contains("\"budget_adequacy\":{\"score\":80,\"reasoning\":\"₹18,00,000 comfortably covers a focused SaaS MVP\"}"));
        assertFalse(json.contains("technical_risk"));
        assertFalse(json.contains("operational_risk"));
        assertFalse(json.contains("execution_risk"));
    }

    @Test
    void legacyCachedBreakdownStillMapsTheOldFlatScores() throws Exception {
        String legacy = """
                {"technical_risk_score": 40.0, "operational_risk_score": 55.0, "execution_risk_score": 50.0}
                """;

        RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown = objectMapper.readValue(
                legacy, RiskAssessmentResponseDTO.RiskBreakdownDTO.class);

        assertNull(breakdown.getFinancialRisk());
        assertNull(breakdown.getMarketRisk());
        assertEquals(40.0, breakdown.getTechnicalRiskScore(), 0.0001);
        assertEquals(55.0, breakdown.getOperationalRiskScore(), 0.0001);
        assertEquals(50.0, breakdown.getExecutionRiskScore(), 0.0001);
    }

    @Test
    void newCachedBreakdownDeserializesFiveCategories() throws Exception {
        String json = """
                {
                  "financial_risk": {"score": 30.0, "reason": "ML", "source": "ML_MODEL"},
                  "market_risk": {"score": 60.0, "reason": "crowded", "source": "LLM"},
                  "technical_risk": {"score": 70.0, "reason": "complex stack", "source": "LLM"},
                  "operational_risk": {"score": 20.0, "reason": "lean team", "source": "LLM"},
                  "execution_risk": {"score": 45.0, "reason": "clear roadmap", "source": "LLM"}
                }
                """;

        RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown = objectMapper.readValue(
                json, RiskAssessmentResponseDTO.RiskBreakdownDTO.class);

        assertNotNull(breakdown.getFinancialRisk());
        assertEquals(30.0, breakdown.getFinancialRisk().getScore(), 0.0001);
        assertEquals("ML_MODEL", breakdown.getFinancialRisk().getSource());
        assertEquals(70.0, breakdown.getTechnicalRisk().getScore(), 0.0001);
        assertEquals(45.0, breakdown.getExecutionRisk().getScore(), 0.0001);
    }

    @Test
    void llmRiskResponseParsesTheNewNestedRiskShape() throws Exception {
        String json = """
                {
                  "budget_adequacy": {"score": 80, "reasoning": "₹18,00,000 covers a focused single-feature SaaS MVP"},
                  "market_risk": {"score": 55.0, "reason": "crowded segment"},
                  "technical_risk": {"score": 62.0, "reason": "complex stack"},
                  "operational_risk": {"score": 48.0, "reason": "lean team"},
                  "execution_risk": {"score": 51.0, "reason": "clear roadmap"},
                  "risk_narrative": "The financial baseline of 34/100 is elevated by an aggressive budget; combined with the technically demanding stack this yields a moderate overall risk profile.",
                  "swot": {"strengths": ["a"], "weaknesses": [], "opportunities": [], "threats": []},
                  "feasibility_verdict": "Moderate",
                  "assessment_metrics": {"financial_sustainability": 68.0, "team_capability": 55.0}
                }
                """;

        LlmRiskResponseDTO dto = objectMapper.readValue(json, LlmRiskResponseDTO.class);

        assertNotNull(dto.getBudgetAdequacy());
        assertEquals(Integer.valueOf(80), dto.getBudgetAdequacy().getScore());
        assertEquals("₹18,00,000 covers a focused single-feature SaaS MVP", dto.getBudgetAdequacy().getReasoning());
        assertNotNull(dto.getMarketRisk());
        assertEquals(55.0, dto.getMarketRisk().getScore(), 0.0001);
        assertEquals("crowded segment", dto.getMarketRisk().getReason());
        assertEquals(62.0, dto.getTechnicalRisk().getScore(), 0.0001);
        assertEquals(48.0, dto.getOperationalRisk().getScore(), 0.0001);
        assertEquals(51.0, dto.getExecutionRisk().getScore(), 0.0001);
        assertNotNull(dto.getRiskNarrative());
        assertTrue(dto.getRiskNarrative().contains("financial baseline"));
        assertEquals("Moderate", dto.getFeasibilityVerdict());
        assertEquals(Map.of("financial_sustainability", 68.0, "team_capability", 55.0), dto.getAssessmentMetrics());
    }

    @Test
    void formatInrUsesIndianNumberingForBudgetReasons() {
        assertEquals("₹18,00,000", RiskAssessmentService.formatInr(new BigDecimal("1800000")));
        assertEquals("₹50,00,000", RiskAssessmentService.formatInr(new BigDecimal("5000000")));
        assertEquals("₹12,34,567", RiskAssessmentService.formatInr(new BigDecimal("1234567")));
        assertEquals("₹12,34,56,789", RiskAssessmentService.formatInr(new BigDecimal("123456789")));
        assertEquals("₹999", RiskAssessmentService.formatInr(new BigDecimal("999.4")));
        assertTrue(RiskAssessmentService.formatInr(new BigDecimal("1800000")).contains("18,00,000"));
        assertNull(RiskAssessmentService.formatInr(null));
    }
}