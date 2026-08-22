package com.startsmart.ai.riskanalyzer.controller;

import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;
import com.startsmart.ai.riskanalyzer.service.LlmService;
import com.startsmart.ai.riskanalyzer.service.RiskAssessmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/projects/{projectId}/risk-analysis")
@RequiredArgsConstructor
@Tag(name = "Risk Assessment", description = "Endpoints for generating and retrieving the combined ML + Groq risk narrative analysis for a submitted project")
public class RiskAssessmentController {

    private final RiskAssessmentService riskAssessmentService;

    @PostMapping
    @Operation(summary = "Generate combined risk assessment",
               description = "Calls the FastAPI ML service for the data-driven Financial Risk baseline (success probability, risk score, "
                           + "top risk factors), then calls Groq to reason over Market, Technical, Operational, and Execution risk — each "
                           + "with a score and a project-specific reason. The Overall Risk Score is the weighted combination of all five "
                           + "categories (0.25/0.20/0.20/0.20/0.15). Results are persisted and linked to the project.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Risk assessment generated and saved successfully",
            content = @Content(schema = @Schema(implementation = RiskAssessmentResponseDTO.class))),
        @ApiResponse(responseCode = "404", description = "Project not found for the given ID"),
        @ApiResponse(responseCode = "502", description = "ML service or LLM API call failed")
    })
    public ResponseEntity<RiskAssessmentResponseDTO> generateRiskAssessment(@PathVariable Long projectId) {
        RiskAssessmentResponseDTO response = riskAssessmentService.generateRiskAssessment(projectId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Retrieve saved risk assessment",
               description = "Returns the previously generated combined risk assessment for a project, without re-calling "
                           + "the ML service or Groq. Use this endpoint to fetch cached results instead of re-generating.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Risk assessment found and returned successfully",
            content = @Content(schema = @Schema(implementation = RiskAssessmentResponseDTO.class))),
        @ApiResponse(responseCode = "404", description = "No risk assessment found for the given project ID — generate one first via POST")
    })
    public ResponseEntity<RiskAssessmentResponseDTO> getRiskAssessment(@PathVariable Long projectId) {
        RiskAssessmentResponseDTO response = riskAssessmentService.getRiskAssessment(projectId);
        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(LlmService.LlmException.class)
    public ResponseEntity<Map<String, String>> handleLlmError(LlmService.LlmException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", ex.getMessage()));
    }
}