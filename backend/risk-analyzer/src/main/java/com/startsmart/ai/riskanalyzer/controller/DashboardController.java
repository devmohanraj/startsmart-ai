package com.startsmart.ai.riskanalyzer.controller;

import com.startsmart.ai.riskanalyzer.dto.DashboardSummaryDTO;
import com.startsmart.ai.riskanalyzer.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Portfolio-level aggregation endpoints across all of a user's projects with completed risk assessments")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @Operation(summary = "Get portfolio dashboard summary",
               description = "Aggregates already-computed assessments only; no ML or LLM calls")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Summary retrieved successfully; zeroed aggregates when no projects are assessed",
            content = @Content(schema = @Schema(implementation = DashboardSummaryDTO.class)))
    })
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary(@RequestParam Long userId) {
        DashboardSummaryDTO response = dashboardService.getDashboardSummary(userId);
        return ResponseEntity.ok(response);
    }
}
