package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.startsmart.ai.riskanalyzer.dto.ReportResponseDTO;
import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;
import com.startsmart.ai.riskanalyzer.entity.Prediction;
import com.startsmart.ai.riskanalyzer.entity.Project;
import com.startsmart.ai.riskanalyzer.entity.Recommendation;
import com.startsmart.ai.riskanalyzer.entity.Report;
import com.startsmart.ai.riskanalyzer.entity.SwotAnalysis;
import com.startsmart.ai.riskanalyzer.repository.PredictionRepository;
import com.startsmart.ai.riskanalyzer.repository.ProjectRepository;
import com.startsmart.ai.riskanalyzer.repository.RecommendationRepository;
import com.startsmart.ai.riskanalyzer.repository.ReportRepository;
import com.startsmart.ai.riskanalyzer.repository.SwotAnalysisRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ProjectRepository projectRepository;
    private final PredictionRepository predictionRepository;
    private final SwotAnalysisRepository swotAnalysisRepository;
    private final RecommendationRepository recommendationRepository;
    private final ReportRepository reportRepository;
    private final ObjectMapper objectMapper;

    @Value("${reports.dir:reports}")
    private String reportsDir;

    private static final DateTimeFormatter FILE_STAMP = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");
    private static final Color INDIGO = new Color(67, 56, 202);
    private static final Color MUTED = new Color(107, 114, 128);

    @Transactional
    public ReportResponseDTO generateReport(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found with id: " + projectId));

        Prediction prediction = predictionRepository.findByProjectProjectId(projectId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No risk assessment exists for project " + projectId
                                + " — generate one first via /risk-analysis"));
        SwotAnalysis swot = swotAnalysisRepository.findByProjectProjectId(projectId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No SWOT analysis exists for project " + projectId + " — generate the risk assessment first"));
        List<Recommendation> recommendations = recommendationRepository.findByProjectProjectId(projectId);

        Path filePath = renderPdf(project, prediction, swot, recommendations);

        Report saved = reportRepository.save(Report.builder()
                .project(project)
                .reportPath(filePath.toString())
                .build());

        return ReportResponseDTO.from(saved, project.getProjectName());
    }

    @Transactional(readOnly = true)
    public ReportResponseDTO getLatestReport(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found with id: " + projectId));
        Report latest = reportRepository.findTopByProjectProjectIdOrderByGeneratedAtDesc(projectId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "No report has been generated for project " + projectId
                                + " yet — generate one via POST /report"));
        return ReportResponseDTO.from(latest, project.getProjectName());
    }

    public java.io.File getReportFile(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new EntityNotFoundException("Report not found with id: " + reportId));
        Path path = Paths.get(report.getReportPath()).toAbsolutePath().normalize();
        if (!Files.isRegularFile(path)) {
            throw new EntityNotFoundException("Report file is missing on disk: " + report.getReportPath());
        }
        return path.toFile();
    }

    @Transactional(readOnly = true)
    public byte[] generatePortfolioReport(Long userId) {
        List<Project> allProjects = projectRepository.findByUserUserIdOrderByCreatedAtDesc(userId);
        if (allProjects.isEmpty()) {
            throw new EntityNotFoundException("No projects found for user " + userId);
        }

        Map<Long, Prediction> predictionsByProject = predictionRepository.findByProjectUserUserId(userId).stream()
                .collect(Collectors.toMap(p -> p.getProject().getProjectId(), Function.identity(), (a, b) -> a));
        Map<Long, SwotAnalysis> swotsByProject = swotAnalysisRepository.findByProjectUserUserId(userId).stream()
                .collect(Collectors.toMap(s -> s.getProject().getProjectId(), Function.identity(), (a, b) -> a));
        Map<Long, List<Recommendation>> recsByProject = recommendationRepository.findByProjectUserUserId(userId)
                .stream()
                .collect(Collectors.groupingBy(r -> r.getProject().getProjectId()));

        long assessedCount = allProjects.stream()
                .filter(p -> predictionsByProject.containsKey(p.getProjectId())
                        && swotsByProject.containsKey(p.getProjectId()))
                .count();

        if (assessedCount == 0) {
            throw new IllegalStateException("None of your projects have a completed risk assessment yet — "
                    + "generate one first via /risk-analysis");
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, baos);
            document.open();

            document.add(title("StartSmart AI — Portfolio Assessment Report"));
            document.add(muted("Generated " + LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("MMMM d, yyyy 'at' h:mm a"))));
            document.add(new Paragraph(" "));

            writePortfolioSummary(document, allProjects, predictionsByProject, assessedCount);

            for (Project project : allProjects) {
                Prediction pred = predictionsByProject.get(project.getProjectId());
                SwotAnalysis swot = swotsByProject.get(project.getProjectId());
                if (pred == null || swot == null) {
                    continue;
                }
                List<Recommendation> recs = recsByProject
                        .getOrDefault(project.getProjectId(), List.of());
                writeProjectSection(document, project, pred, swot, recs);
            }

            document.close();
        } catch (DocumentException e) {
            throw new ReportGenerationException("Failed to generate portfolio report", e);
        }
        return baos.toByteArray();
    }

    private void writePortfolioSummary(Document document, List<Project> allProjects,
            Map<Long, Prediction> predictionsByProject,
            long assessedCount) throws DocumentException {
        long high = allProjects.stream()
                .filter(p -> "high".equalsIgnoreCase(
                        Optional.ofNullable(predictionsByProject.get(p.getProjectId()))
                                .map(Prediction::getRiskLevel).orElse(null)))
                .count();
        long medium = allProjects.stream()
                .filter(p -> "medium".equalsIgnoreCase(
                        Optional.ofNullable(predictionsByProject.get(p.getProjectId()))
                                .map(Prediction::getRiskLevel).orElse(null)))
                .count();
        long low = allProjects.stream()
                .filter(p -> "low".equalsIgnoreCase(
                        Optional.ofNullable(predictionsByProject.get(p.getProjectId()))
                                .map(Prediction::getRiskLevel).orElse(null)))
                .count();

        double avgRisk = allProjects.stream()
                .map(p -> predictionsByProject.get(p.getProjectId()))
                .filter(java.util.Objects::nonNull)
                .mapToDouble(p -> p.getOverallRiskScore() != null ? p.getOverallRiskScore() : 0.0)
                .average().orElse(0.0);
        double avgSuccess = allProjects.stream()
                .map(p -> predictionsByProject.get(p.getProjectId()))
                .filter(java.util.Objects::nonNull)
                .mapToDouble(p -> p.getSuccessProbability() != null ? p.getSuccessProbability() : 0.0)
                .average().orElse(0.0);

        document.add(section("1. Portfolio Overview"));
        kvTable(document, new String[][] {
                { "Total Projects", String.valueOf(allProjects.size()) },
                { "Assessed Projects", String.valueOf(assessedCount) },
                { "Average Risk Score", fmt(avgRisk) + " / 100" },
                { "Average Success Probability", fmt(avgSuccess) + " %" },
                { "High Risk", String.valueOf(high) },
                { "Medium Risk", String.valueOf(medium) },
                { "Low Risk", String.valueOf(low) },
        });
        document.add(new Paragraph(" "));
    }

    private void writeProjectSection(Document document, Project project, Prediction prediction,
            SwotAnalysis swot, List<Recommendation> recommendations)
            throws DocumentException {
        document.add(section("2. " + project.getProjectName()));

        document.add(boldLabel("Project Details"));
        kvTable(document, new String[][] {
                { "Project", def(project.getProjectName()) },
                { "Industry", def(project.getProjectType()) },
                { "Business Model", def(project.getBusinessModel()) },
                { "Budget", project.getBudget() != null ? "$" + project.getBudget() : "\u2014" },
                { "Target Market", def(project.getTargetMarket()) },
                { "Description", def(project.getDescription()) },
                { "Created", project.getCreatedAt() != null
                        ? project.getCreatedAt().format(DateTimeFormatter.ofPattern("MMM d, yyyy"))
                        : "\u2014" },
        });

        document.add(boldLabel("Risk Summary"));
        kvTable(document, new String[][] {
                { "Overall Risk Score", fmt(prediction.getOverallRiskScore()) + " / 100" },
                { "Risk Level", def(prediction.getRiskLevel()) },
                { "Success Probability", fmt(prediction.getSuccessProbability()) + " %" },
                { "Feasibility Score", fmt(swot.getFeasibilityScore()) + " / 100" },
                { "Feasibility Verdict", def(swot.getFeasibilityVerdict()) },
        });
        if (hasText(swot.getRiskNarrative())) {
            document.add(boldLabel("Risk Narrative"));
            document.add(paragraph(swot.getRiskNarrative()));
        }

        addRiskBreakdown(document, prediction);
        addSwot(document, swot);
        addRecommendations(document, recommendations);
        document.add(new Paragraph(" "));
    }

    private Path renderPdf(Project project, Prediction prediction, SwotAnalysis swot,
            List<Recommendation> recommendations) {
        Path dir = Paths.get(reportsDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new ReportGenerationException("Could not create report directory", e);
        }

        String fileName = "assessment-" + project.getProjectId() + "-" + FILE_STAMP.format(LocalDateTime.now())
                + ".pdf";
        Path filePath = dir.resolve(fileName);

        try (OutputStream out = Files.newOutputStream(filePath)) {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, out);
            document.open();
            writeReportContent(document, project, prediction, swot, recommendations);
            document.close();
        } catch (DocumentException | IOException e) {
            throw new ReportGenerationException("Failed to write PDF report for project " + project.getProjectId(), e);
        }
        return filePath;
    }

    private void writeReportContent(Document document, Project project, Prediction prediction, SwotAnalysis swot,
            List<Recommendation> recommendations) throws DocumentException {
        document.add(title("StartSmart AI — Comprehensive Assessment Report"));
        document.add(muted(
                "Generated " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM d, yyyy 'at' h:mm a"))));
        document.add(new Paragraph(" "));

        document.add(section("1. Project Overview"));
        kvTable(document, new String[][] {
                { "Project", def(project.getProjectName()) },
                { "Industry", def(project.getProjectType()) },
                { "Business Model", def(project.getBusinessModel()) },
                { "Budget", project.getBudget() != null ? "$" + project.getBudget() : "\u2014" },
                { "Target Market", def(project.getTargetMarket()) },
                { "Description", def(project.getDescription()) },
        });

        document.add(section("2. Risk Summary"));
        kvTable(document, new String[][] {
                { "Overall Risk Score", fmt(prediction.getOverallRiskScore()) + " / 100" },
                { "Risk Level", def(prediction.getRiskLevel()) },
                { "Success Probability", fmt(prediction.getSuccessProbability()) + " %" },
                { "Feasibility Score", fmt(swot.getFeasibilityScore()) + " / 100" },
                { "Feasibility Verdict", def(swot.getFeasibilityVerdict()) },
        });
        if (hasText(swot.getRiskNarrative())) {
            document.add(boldLabel("Risk Narrative"));
            document.add(paragraph(swot.getRiskNarrative()));
        }

        addRiskBreakdown(document, prediction);
        addSwot(document, swot);
        addRecommendations(document, recommendations);
    }

    private void addRiskBreakdown(Document document, Prediction prediction) throws DocumentException {
        RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown = fromJson(prediction.getRiskBreakdownJson(),
                new TypeReference<RiskAssessmentResponseDTO.RiskBreakdownDTO>() {
                });
        document.add(section("3. Risk by Category"));
        if (breakdown == null) {
            document.add(paragraph("No category breakdown available."));
            return;
        }
        PdfPTable table = table(3);
        table.addCell(headerCell("Category"));
        table.addCell(headerCell("Score"));
        table.addCell(headerCell("Reason"));
        addCategoryRow(table, "Financial", breakdown.getFinancialRisk());
        addCategoryRow(table, "Market", breakdown.getMarketRisk());
        addCategoryRow(table, "Technical", breakdown.getTechnicalRisk());
        addCategoryRow(table, "Operational", breakdown.getOperationalRisk());
        addCategoryRow(table, "Execution", breakdown.getExecutionRisk());
        document.add(table);
    }

    private void addCategoryRow(PdfPTable table, String label,
            RiskAssessmentResponseDTO.RiskCategoryDTO category) {
        if (category == null || category.getScore() == null) {
            return;
        }
        table.addCell(bodyCell(label));
        table.addCell(bodyCell(fmt(category.getScore()) + " / 100"));
        table.addCell(bodyCell(category.getReason() != null ? category.getReason() : "\u2014"));
    }

    private void addSwot(Document document, SwotAnalysis swot) throws DocumentException {
        RiskAssessmentResponseDTO.SwotDTO data = fromJson(swot.getSwotJson(),
                new TypeReference<RiskAssessmentResponseDTO.SwotDTO>() {
                });
        document.add(section("4. SWOT Analysis"));
        if (data == null) {
            document.add(paragraph("No SWOT analysis available."));
            return;
        }
        document.add(boldLabel("Strengths"));
        bulletList(document, data.getStrengths());
        document.add(boldLabel("Weaknesses"));
        bulletList(document, data.getWeaknesses());
        document.add(boldLabel("Opportunities"));
        bulletList(document, data.getOpportunities());
        document.add(boldLabel("Threats"));
        bulletList(document, data.getThreats());
    }

    private void addRecommendations(Document document, List<Recommendation> recommendations) throws DocumentException {
        document.add(section("5. Recommendations"));
        if (recommendations == null || recommendations.isEmpty()) {
            document.add(paragraph("No recommendations available for this project."));
            return;
        }
        PdfPTable table = table(4);
        table.addCell(headerCell("Category"));
        table.addCell(headerCell("Priority"));
        table.addCell(headerCell("Phase"));
        table.addCell(headerCell("Recommendation / Mitigation"));
        for (Recommendation rec : recommendations) {
            table.addCell(bodyCell(def(rec.getRiskCategory())));
            table.addCell(bodyCell(def(rec.getPriority())));
            table.addCell(bodyCell(def(rec.getPhase())));
            String text = rec.getRecommendationText() != null ? rec.getRecommendationText() : "\u2014";
            if (rec.getMitigationStrategy() != null) {
                text += "\n\nMitigation: " + rec.getMitigationStrategy();
            }
            table.addCell(bodyCell(text));
        }
        document.add(table);
    }

    private <T> T fromJson(String json, TypeReference<T> type) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, type);
        } catch (IOException e) {
            return null;
        }
    }

    private PdfPTable table(int columns) throws DocumentException {
        PdfPTable table = new PdfPTable(columns);
        table.setWidthPercentage(100);
        table.setSpacingBefore(6);
        return table;
    }

    private PdfPCell headerCell(String text) {
        PdfPCell cell = new PdfPCell(
                new Phrase(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE)));
        cell.setBackgroundColor(INDIGO);
        cell.setPadding(5);
        return cell;
    }

    private PdfPCell bodyCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FontFactory.getFont(FontFactory.HELVETICA, 9)));
        cell.setPadding(5);
        return cell;
    }

    private Paragraph title(String text) {
        return new Paragraph(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, INDIGO));
    }

    private Paragraph section(String text) {
        Paragraph p = new Paragraph(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, INDIGO));
        p.setSpacingBefore(14);
        p.setSpacingAfter(5);
        return p;
    }

    private Paragraph boldLabel(String text) {
        Paragraph p = new Paragraph(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11));
        p.setSpacingBefore(8);
        p.setSpacingAfter(2);
        return p;
    }

    private Paragraph paragraph(String text) {
        Paragraph p = new Paragraph(text, FontFactory.getFont(FontFactory.HELVETICA, 10));
        p.setSpacingAfter(4);
        return p;
    }

    private Paragraph muted(String text) {
        Paragraph p = new Paragraph(text, FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED));
        p.setSpacingAfter(4);
        return p;
    }

    private void bulletList(Document document, List<String> items) throws DocumentException {
        if (items == null || items.isEmpty()) {
            return;
        }
        PdfPTable list = new PdfPTable(1);
        list.setWidthPercentage(100);
        for (String item : items) {
            PdfPCell cell = new PdfPCell(
                    new Paragraph("\u2022  " + item, FontFactory.getFont(FontFactory.HELVETICA, 10)));
            cell.setBorder(PdfPCell.NO_BORDER);
            cell.setPadding(2);
            list.addCell(cell);
        }
        document.add(list);
    }

    private void kvTable(Document document, String[][] rows) throws DocumentException {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4);
        for (String[] row : rows) {
            PdfPCell k = new PdfPCell(new Phrase(row[0], FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10)));
            k.setBackgroundColor(new Color(243, 244, 246));
            k.setPadding(5);
            PdfPCell v = new PdfPCell(new Phrase(row[1], FontFactory.getFont(FontFactory.HELVETICA, 10)));
            v.setPadding(5);
            table.addCell(k);
            table.addCell(v);
        }
        document.add(table);
    }

    private String fmt(Double value) {
        return value != null ? String.valueOf(Math.round(value * 10.0) / 10.0) : "\u2014";
    }

    private String def(String value) {
        return value != null && !value.isBlank() ? value : "\u2014";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public static class ReportGenerationException extends RuntimeException {
        public ReportGenerationException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
