package com.startsmart.ai.riskanalyzer.dto;

import com.startsmart.ai.riskanalyzer.entity.Report;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportResponseDTO {

    @Schema(description = "Unique identifier for the report record")
    private Long reportId;

    @Schema(description = "The project ID this report belongs to")
    private Long projectId;

    @Schema(description = "Project name used to label the downloadable document")
    private String projectName;

    @Schema(description = "Path at which the generated report file is stored")
    private String reportPath;

    @Schema(description = "Timestamp when the report was generated")
    private LocalDateTime generatedAt;

    @Schema(description = "Non-null only when a report generation is returned; guards against down-stream double-generation")
    private String message;

    public static ReportResponseDTO from(Report report, String projectName) {
        return ReportResponseDTO.builder()
                .reportId(report.getReportId())
                .projectId(report.getProject().getProjectId())
                .projectName(projectName)
                .reportPath(report.getReportPath())
                .generatedAt(report.getGeneratedAt())
                .build();
    }
}
