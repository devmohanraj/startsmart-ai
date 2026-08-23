package com.startsmart.ai.riskanalyzer.controller;

import com.startsmart.ai.riskanalyzer.dto.MarketAnalysisResponseDTO;
import com.startsmart.ai.riskanalyzer.service.LlmService;
import com.startsmart.ai.riskanalyzer.service.MarketAnalysisService;
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
@RequestMapping("/api/projects/{projectId}/market-analysis")
@RequiredArgsConstructor
@Tag(name = "Market Analysis", description = "Endpoints for generating and retrieving AI-powered market size and competitor analysis for a submitted project")
public class MarketAnalysisController {

    private final MarketAnalysisService marketAnalysisService;

    @PostMapping
    @Operation(summary = "Generate market & competitor analysis",
               description = "Uses Groq to return TAM/SAM/SOM, growth, trends, and competitors; persists the result")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Market analysis generated and saved successfully",
            content = @Content(schema = @Schema(implementation = MarketAnalysisResponseDTO.class))),
        @ApiResponse(responseCode = "404", description = "Project not found for the given ID"),
        @ApiResponse(responseCode = "502", description = "Groq API call failed or returned invalid/unparseable data")
    })
    public ResponseEntity<MarketAnalysisResponseDTO> generateAnalysis(@PathVariable Long projectId) {
        MarketAnalysisResponseDTO response = marketAnalysisService.generateAndSaveAnalysis(projectId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Retrieve saved market & competitor analysis",
               description = "Returns cached analysis without calling Groq again")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Market analysis found and returned successfully",
            content = @Content(schema = @Schema(implementation = MarketAnalysisResponseDTO.class))),
        @ApiResponse(responseCode = "404", description = "No analysis found for the given project ID — generate one first via POST")
    })
    public ResponseEntity<MarketAnalysisResponseDTO> getAnalysis(@PathVariable Long projectId) {
        MarketAnalysisResponseDTO response = marketAnalysisService.getAnalysis(projectId);
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