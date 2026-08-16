package com.startsmart.ai.riskanalyzer.controller;

import com.startsmart.ai.riskanalyzer.dto.RecommendationResponseDTO;
import com.startsmart.ai.riskanalyzer.service.GeminiService;
import com.startsmart.ai.riskanalyzer.service.RecommendationService;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects/{projectId}/recommendations")
@RequiredArgsConstructor
@Tag(name = "Recommendations", description = "Endpoints for generating and retrieving prioritized, risk-linked, phased recommendations for a submitted project")
public class RecommendationController {

    private final RecommendationService recommendationService;

    @PostMapping
    @Operation(summary = "Generate risk-linked recommendations", description = "Requires that a risk assessment already exists for the project (generated via "
            + "POST /api/projects/{projectId}/risk-analysis). Ranks the five risk categories by score, "
            + "targets the top three, and calls Gemini to produce specific, actionable, phased "
            + "recommendations and mitigation strategies for each. Results are persisted and linked to the project.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Recommendations generated and saved successfully", content = @Content(schema = @Schema(implementation = RecommendationResponseDTO.class))),
            @ApiResponse(responseCode = "400", description = "No risk assessment exists for the project — generate it first via /risk-analysis"),
            @ApiResponse(responseCode = "404", description = "Project not found for the given ID"),
            @ApiResponse(responseCode = "502", description = "Gemini API call failed or returned invalid/unparseable data")
    })
    public ResponseEntity<List<RecommendationResponseDTO>> generateRecommendations(@PathVariable Long projectId) {
        List<RecommendationResponseDTO> response = recommendationService.generateRecommendations(projectId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Retrieve saved recommendations", description = "Returns the previously generated recommendations for a project, without calling Gemini again. "
            + "Use this endpoint to fetch cached results instead of re-generating.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Recommendations found and returned successfully", content = @Content(schema = @Schema(implementation = RecommendationResponseDTO.class))),
            @ApiResponse(responseCode = "404", description = "No recommendations found for the given project ID — generate one first via POST")
    })
    public ResponseEntity<List<RecommendationResponseDTO>> getRecommendations(@PathVariable Long projectId) {
        List<RecommendationResponseDTO> response = recommendationService.getRecommendations(projectId);
        return ResponseEntity.ok(response);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(GeminiService.GeminiException.class)
    public ResponseEntity<Map<String, String>> handleGeminiError(GeminiService.GeminiException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
    }
}