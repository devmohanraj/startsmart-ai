package com.startsmart.ai.riskanalyzer.controller;

import com.startsmart.ai.riskanalyzer.dto.ReportResponseDTO;
import com.startsmart.ai.riskanalyzer.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Endpoints for compiling a project's risk score, SWOT, and recommendations into a downloadable PDF report")
public class ReportController {

    private final ReportService reportService;

    @PostMapping("/projects/{projectId}/report")
    @Operation(summary = "Generate assessment report",
               description = "Compiles the saved risk prediction, SWOT analysis, and recommendations for a project into a PDF, stores the file path in the reports table, and returns report metadata")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Report generated and saved successfully",
            content = @Content(schema = @Schema(implementation = ReportResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "Missing risk assessment, SWOT, or report file write failure"),
        @ApiResponse(responseCode = "404", description = "Project not found for the given ID")
    })
    public ResponseEntity<ReportResponseDTO> generateReport(@PathVariable Long projectId) {
        return ResponseEntity.ok(reportService.generateReport(projectId));
    }

    @GetMapping("/projects/{projectId}/report")
    @Operation(summary = "Retrieve latest report metadata",
               description = "Returns the most recently generated report for a project without producing a new PDF")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Latest report found and returned successfully",
            content = @Content(schema = @Schema(implementation = ReportResponseDTO.class))),
        @ApiResponse(responseCode = "404", description = "Project or report not found")
    })
    public ResponseEntity<ReportResponseDTO> getLatestReport(@PathVariable Long projectId) {
        return ResponseEntity.ok(reportService.getLatestReport(projectId));
    }

    @GetMapping("/reports/{reportId}/download")
    @Operation(summary = "Download report PDF",
               description = "Streams the stored PDF for the given report ID as an attachment")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "PDF streamed successfully",
            content = @Content(mediaType = "application/pdf")),
        @ApiResponse(responseCode = "404", description = "Report not found or file missing on disk")
    })
    public ResponseEntity<Resource> downloadReport(@PathVariable Long reportId) {
        File file = reportService.getReportFile(reportId);
        Resource resource = new FileSystemResource(file);
        String encoded = URLEncoder.encode(file.getName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(file.length())
                .body(resource);
    }

    @PostMapping("/reports/portfolio")
    @Operation(summary = "Generate portfolio assessment report",
               description = "Compiles all assessed projects for the given user into a single PDF with portfolio overview, per-project risk scores, SWOT analyses, and recommendations")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Portfolio PDF streamed successfully",
            content = @Content(mediaType = "application/pdf")),
        @ApiResponse(responseCode = "400", description = "No assessed projects exist for the user"),
        @ApiResponse(responseCode = "404", description = "No projects found for the given user ID")
    })
    public ResponseEntity<byte[]> generatePortfolioReport(@RequestParam Long userId) {
        byte[] pdf = reportService.generatePortfolioReport(userId);
        String fileName = "StartSmart-Portfolio-Report-" + userId + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.length)
                .body(pdf);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(ReportService.ReportGenerationException.class)
    public ResponseEntity<Map<String, String>> handleGenerationError(ReportService.ReportGenerationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
    }
}
