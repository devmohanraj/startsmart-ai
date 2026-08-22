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
    @Operation(summary = "Get the portfolio dashboard summary for a user",
               description = "Aggregates already-computed risk assessment data across ALL of the user's projects — no ML or LLM "
                           + "calls are made. Returns total and assessed project counts, average overall risk score, average success "
                           + "probability, High/Medium/Low risk distribution, the most common top risk category across projects, and a "
                           + "per-project list (name, industry, risk score, success probability, feasibility score, created date) sorted "
                           + "most recent first. Projects without a completed risk assessment are excluded from all averages.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Dashboard summary retrieved successfully — returns zeroed aggregates and an empty project list when the user has no assessed projects",
            content = @Content(schema = @Schema(implementation = DashboardSummaryDTO.class)))
    })
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary(@RequestParam Long userId) {
        DashboardSummaryDTO response = dashboardService.getDashboardSummary(userId);
        return ResponseEntity.ok(response);
    }
}
