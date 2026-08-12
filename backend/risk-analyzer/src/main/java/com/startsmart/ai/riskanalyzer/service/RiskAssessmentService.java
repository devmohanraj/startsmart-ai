package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.startsmart.ai.riskanalyzer.dto.GeminiRiskResponseDTO;
import com.startsmart.ai.riskanalyzer.dto.MlPredictionResponseDTO;
import com.startsmart.ai.riskanalyzer.dto.RiskAssessmentResponseDTO;
import com.startsmart.ai.riskanalyzer.entity.Prediction;
import com.startsmart.ai.riskanalyzer.entity.Project;
import com.startsmart.ai.riskanalyzer.entity.SwotAnalysis;
import com.startsmart.ai.riskanalyzer.repository.PredictionRepository;
import com.startsmart.ai.riskanalyzer.repository.ProjectRepository;
import com.startsmart.ai.riskanalyzer.repository.SwotAnalysisRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RiskAssessmentService {

    private final ProjectRepository projectRepository;
    private final PredictionRepository predictionRepository;
    private final SwotAnalysisRepository swotAnalysisRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;
    private final WebClient.Builder webClientBuilder;

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    // Deterministic weights for feasibility score (NOT from Gemini)
    private static final double WEIGHT_FINANCIAL = 0.18;
    private static final double WEIGHT_TEAM = 0.15;
    private static final double WEIGHT_COMPETITIVE = 0.15;
    private static final double WEIGHT_RESOURCE = 0.15;
    private static final double WEIGHT_MARKET = 0.15;
    private static final double WEIGHT_EXECUTION = 0.12;
    private static final double WEIGHT_SCALABILITY = 0.10;

    // Data source labels used in the risk breakdown (which engine produced each score)
    private static final String SOURCE_ML_MODEL = "ML_MODEL";
    private static final String SOURCE_GEMINI = "GEMINI";
    private static final String SOURCE_BLENDED = "BLENDED";

    @Transactional
    public RiskAssessmentResponseDTO generateRiskAssessment(Long projectId) {
        Project project = getProjectOrThrow(projectId);

        // Step 1: Call the FastAPI ML service -> Financial Risk baseline (real historical data)
        MlPredictionResponseDTO mlPrediction = callMlService(project);

        // Step 2: Call Gemini to reason over Market / Technical / Operational / Execution risk,
        // anchored on the ML financial baseline so the five scores stay internally consistent
        GeminiRiskResponseDTO geminiData = callGeminiRiskAnalysis(project, mlPrediction);

        // Step 3: Assemble the five-category breakdown and combine into the weighted Overall Risk Score
        RiskAssessmentResponseDTO.RiskBreakdownDTO riskBreakdown = buildRiskBreakdown(project, mlPrediction, geminiData);
        double overallRiskScore = computeOverallRiskScore(riskBreakdown);
        String riskLevel = RiskScoreAggregator.deriveRiskLevel(overallRiskScore);
        // Combined success probability now reflects ALL FIVE risk categories, not just the ML financial baseline
        double combinedSuccessProbability = RiskScoreAggregator.combinedSuccessProbability(overallRiskScore);

        // Step 4: Compute deterministic feasibility score from the 7 assessment metrics
        Double feasibilityScore = computeFeasibilityScore(geminiData.getAssessmentMetrics());

        // Step 5: Persist combined result (replace any previous assessment for this project)
        predictionRepository.deleteByProjectProjectId(projectId);
        swotAnalysisRepository.deleteByProjectProjectId(projectId);

        Prediction savedPrediction = predictionRepository.save(
                buildPrediction(project, mlPrediction, riskBreakdown, overallRiskScore, combinedSuccessProbability, riskLevel));
        SwotAnalysis savedSwot = swotAnalysisRepository.save(buildSwotAnalysis(project, geminiData, feasibilityScore));

        return toResponseDTO(savedPrediction, savedSwot, mlPrediction, geminiData, feasibilityScore,
                riskBreakdown, overallRiskScore, riskLevel, combinedSuccessProbability, mlPrediction.getSuccessProbability());
    }

    @Transactional(readOnly = true)
    public RiskAssessmentResponseDTO getRiskAssessment(Long projectId) {
        Prediction prediction = predictionRepository.findByProjectProjectId(projectId)
                .orElseThrow(() -> new EntityNotFoundException("No risk assessment found for project id: " + projectId));
        SwotAnalysis swotAnalysis = swotAnalysisRepository.findByProjectProjectId(projectId)
                .orElseThrow(() -> new EntityNotFoundException("No risk assessment found for project id: " + projectId));

        return toResponseDTO(prediction, swotAnalysis, null, null, swotAnalysis.getFeasibilityScore(),
                null, null, null, null, null);
    }

    // ---------------------------------------------------------------
    // ML service call
    // ---------------------------------------------------------------
    private MlPredictionResponseDTO callMlService(Project project) {
        Map<String, Object> requestBody = Map.of(
                "budget_inr", project.getBudget() != null ? project.getBudget() : BigDecimal.ZERO,
                "industry", project.getProjectType() != null ? project.getProjectType() : "Other",
                "is_india", 1
        );

        MlPredictionResponseDTO response = webClientBuilder.build().post()
                .uri(mlServiceUrl + "/predict")
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(MlPredictionResponseDTO.class)
                .block();

        if (response == null) {
            throw new GeminiService.GeminiException("ML service returned null response");
        }
        return response;
    }

    // ---------------------------------------------------------------
    // Gemini call \u2014 four AI-reasoned risk categories anchored on the
    // ML financial baseline
    // ---------------------------------------------------------------
    private GeminiRiskResponseDTO callGeminiRiskAnalysis(Project project, MlPredictionResponseDTO mlPrediction) {
        String prompt = buildRiskPrompt(project, mlPrediction);
        String rawJson = geminiService.callGemini(prompt);
        String cleaned = stripMarkdown(rawJson);

        try {
            return objectMapper.readValue(cleaned, GeminiRiskResponseDTO.class);
        } catch (Exception e) {
            throw new GeminiService.GeminiException("Failed to parse Gemini risk response: " + e.getMessage(), e);
        }
    }

    private String buildRiskPrompt(Project project, MlPredictionResponseDTO ml) {
        String topFactors = ml.getTopRiskFactors() != null
                ? ml.getTopRiskFactors().stream()
                        .map(f -> f.getFeature() + " (" + f.getContribution() + ", " + f.getDirection() + ")")
                        .collect(Collectors.joining(", "))
                : "None";
        String formattedBudget = formatInr(project.getBudget());

        return """
                You are a startup risk analyst. A structured ML model has already calculated the Financial Risk baseline for this project:
                - Financial Risk Score: %s/100 (%s risk)
                - Success Probability: %s%%
                - Key financial risk factors: %s

                Project details submitted by the user:
                - Industry: %s
                - Business Model: %s
                - Target Market: %s
                - Budget: \u20B9%s
                - Description: %s

                The ML Financial Risk score above is only a historical comparison signal from previously funded companies. It is NOT the final truth. Evaluate this project independently based on its actual scope, budget, technical requirements, business model, and ability to reach a realistic MVP. A high ML financial risk score does not automatically mean the project is high risk. Base every score and reason on the actual project details given above \u2014 do not give generic or placeholder reasoning.

                Judge budget_adequacy based ONLY on whether this exact budget can realistically fund the described project's scope and reach a testable MVP \u2014 NOT against historical startup funding benchmarks, and NOT by the size of the budget alone. A small budget can be highly adequate for a focused SaaS, a single-feature MVP, a software-only product, or a small local pilot. A small budget can be inadequate for hardware, physical infrastructure, inventory-heavy businesses, logistics networks, large-scale deployment, or projects requiring expensive regulatory or capital expenditure. Never call a budget inadequate simply because it is small.

                Do not inflate risk scores merely to appear cautious. Score only genuine, evidence-based risks that are present in the project description. Use the full 0-100 range: 0-20 = very low risk; 21-40 = low/moderate risk; 41-60 = moderate risk; 61-80 = high risk; 81-100 = very high risk. Use 60+ ONLY when there is a specific, meaningful concern. Use 80+ ONLY for severe, clearly identifiable problems. A good, focused, realistic project should receive genuinely low risk scores. Do not automatically place scores in the 40-60 range. Do not make every project high risk. Do not infer problems that are not stated. Do not punish a project for missing information unless that missing information creates a specific risk.

                Do not punish early-stage projects for having less funding than large funded startups. Judge whether the available budget is sufficient for THIS project's MVP scope.
                For software/SaaS projects using existing APIs, cloud services, or open-source tools: a reasonable small budget can have LOW financial risk; budget adequacy should be 70-100 when the MVP scope matches the available budget; financial risk below 40 is acceptable for realistic, focused software projects.
                For hardware, manufacturing, logistics-heavy, inventory-heavy, or infrastructure-heavy projects: require higher budget adequacy and increase risk only when the budget truly cannot support the required MVP.
                Do not cluster scores in the middle range. Use: 0-20 = very low risk; 21-40 = low risk; 41-60 = moderate risk; 61-80 = high risk; 81-100 = severe risk. Only give 60+ risk scores when there are specific, explainable problems.

                Return ONLY valid JSON, no markdown, no preamble, in EXACTLY this structure:

                {
                  "budget_adequacy": {
                    "score": <0-100, where 0 = totally inadequate budget for this scope, 100 = budget comfortably covers this scope>,
                    "reasoning": "<1-2 sentences judging whether \u20B9{budget_inr} is realistic for THIS SPECIFIC project's scope, technical complexity, and business model \u2014 e.g. a lean single-feature SaaS idea needs far less than a hardware/IoT product with physical deployment costs. Judge based on what the project needs to reach a testable MVP, not against generic industry funding benchmarks.>"
                  },
                  "market_risk": {
                    "score": <0-100, higher = riskier>,
                    "reason": "<1-2 sentences citing the actual industry/target market given>"
                  },
                  "technical_risk": {
                    "score": <0-100>,
                    "reason": "<1-2 sentences citing the actual description/complexity given>"
                  },
                  "operational_risk": {
                    "score": <0-100>,
                    "reason": "<1-2 sentences citing the actual business model/resources given>"
                  },
                  "execution_risk": {
                    "score": <0-100>,
                    "reason": "<1-2 sentences citing the actual plan/target market given>"
                  },
                  "risk_narrative": "<2-3 sentences synthesizing WHY the overall risk profile is what it is, referencing the Financial Risk baseline AND the strongest 1-2 factors from the four Gemini-scored categories above \u2014 write this as one coherent paragraph, not a list>",
                  "swot": {
                    "strengths": ["...", "...", "...", "..."],
                    "weaknesses": ["...", "...", "...", "..."],
                    "opportunities": ["...", "...", "...", "..."],
                    "threats": ["...", "...", "...", "..."]
                  },
                  "feasibility_verdict": "<1-2 sentence plain-language verdict>",
                  "assessment_metrics": {
                    "financial_sustainability": <0-100>,
                    "team_capability": <0-100>,
                    "competitive_advantage": <0-100>,
                    "resource_availability": <0-100>,
                    "market_opportunity": <0-100>,
                    "execution_readiness": <0-100>,
                    "scalability_potential": <0-100>
                  },
                  "recommendations": ["...", "...", "..."]
                }
                """
                .formatted(
                        ml.getOverallRiskScore() != null ? ml.getOverallRiskScore() : 0,
                        ml.getRiskLevel() != null ? ml.getRiskLevel() : "Unknown",
                        ml.getSuccessProbability() != null ? ml.getSuccessProbability() : 0,
                        topFactors,
                        project.getProjectType() != null ? project.getProjectType() : "Not specified",
                        project.getBusinessModel() != null ? project.getBusinessModel() : "Not specified",
                        project.getTargetMarket() != null ? project.getTargetMarket() : "Not specified",
                        formattedBudget != null ? formattedBudget : "Not specified",
                        project.getDescription() != null ? project.getDescription() : "Not specified");
    }

    // ---------------------------------------------------------------
    // Deterministic feasibility score \u2014 weighted avg of the 7 metrics
    // ---------------------------------------------------------------
    private Double computeFeasibilityScore(Map<String, Double> metrics) {
        if (metrics == null || metrics.isEmpty()) {
            return 0.0;
        }
        double score = 0.0;
        score += getMetric(metrics, "financial_sustainability") * WEIGHT_FINANCIAL;
        score += getMetric(metrics, "team_capability") * WEIGHT_TEAM;
        score += getMetric(metrics, "competitive_advantage") * WEIGHT_COMPETITIVE;
        score += getMetric(metrics, "resource_availability") * WEIGHT_RESOURCE;
        score += getMetric(metrics, "market_opportunity") * WEIGHT_MARKET;
        score += getMetric(metrics, "execution_readiness") * WEIGHT_EXECUTION;
        score += getMetric(metrics, "scalability_potential") * WEIGHT_SCALABILITY;
        return Math.round(score * 10.0) / 10.0;
    }

    private double getMetric(Map<String, Double> metrics, String key) {
        return metrics.getOrDefault(key, 0.0);
    }

    // ---------------------------------------------------------------
    // Persistence helpers
    // ---------------------------------------------------------------
    private Prediction buildPrediction(Project project, MlPredictionResponseDTO ml,
            RiskAssessmentResponseDTO.RiskBreakdownDTO riskBreakdown, double overallRiskScore,
            double combinedSuccessProbability, String riskLevel) {
        return Prediction.builder()
                .project(project)
                .successProbability(combinedSuccessProbability)
                .financialSuccessProbability(ml.getSuccessProbability())
                .overallRiskScore(overallRiskScore)
                .riskLevel(riskLevel)
                .topRiskFactorsJson(toJson(ml.getTopRiskFactors()))
                .riskBreakdownJson(toJson(riskBreakdown))
                .build();
    }

    private SwotAnalysis buildSwotAnalysis(Project project, GeminiRiskResponseDTO gemini, Double feasibilityScore) {
        return SwotAnalysis.builder()
                .project(project)
                .swotJson(toJson(gemini.getSwot()))
                .riskNarrative(gemini.getRiskNarrative())
                .feasibilityScore(feasibilityScore)
                .feasibilityVerdict(gemini.getFeasibilityVerdict())
                .assessmentMetricsJson(toJson(gemini.getAssessmentMetrics()))
                .recommendationsJson(toJson(gemini.getRecommendations()))
                .build();
    }

    private Project getProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found with id: " + projectId));
    }

    // ---------------------------------------------------------------
    // DTO mapping
    // ---------------------------------------------------------------
    private RiskAssessmentResponseDTO toResponseDTO(
            Prediction prediction,
            SwotAnalysis swot,
            MlPredictionResponseDTO ml,
            GeminiRiskResponseDTO gemini,
            Double feasibilityScore,
            RiskAssessmentResponseDTO.RiskBreakdownDTO freshBreakdown,
            Double freshOverallRiskScore,
            String freshRiskLevel,
            Double freshCombinedSuccessProbability,
            Double freshFinancialSuccessProbability) {

        // When reading from cache (ml/gemini null), deserialize from the JSONB columns
        List<MlPredictionResponseDTO.RiskFactor> topRiskFactors = ml != null
                ? ml.getTopRiskFactors()
                : fromJson(prediction.getTopRiskFactorsJson(), new TypeReference<>() {});

        RiskAssessmentResponseDTO.RiskBreakdownDTO riskBreakdown;
        Double overallRiskScore;
        String riskLevel;
        Double financialRiskScore;
        Double successProbability;
        Double financialSuccessProbability;
        Double mlOnlyFinancialRisk;
        RiskAssessmentResponseDTO.BudgetAdequacyDTO budgetAdequacy;

        if (ml != null) {
            // Freshly generated response \u2014 use the values built during generation
            riskBreakdown = freshBreakdown != null
                    ? freshBreakdown
                    : RiskAssessmentResponseDTO.RiskBreakdownDTO.builder().build();
            overallRiskScore = freshOverallRiskScore != null ? freshOverallRiskScore : prediction.getOverallRiskScore();
            riskLevel = freshRiskLevel != null ? freshRiskLevel : prediction.getRiskLevel();
            successProbability = freshCombinedSuccessProbability != null
                    ? freshCombinedSuccessProbability
                    : RiskScoreAggregator.combinedSuccessProbability(overallRiskScore);
            financialSuccessProbability = freshFinancialSuccessProbability != null
                    ? freshFinancialSuccessProbability
                    : ml.getSuccessProbability();
        } else {
            // Cached response \u2014 rebuild everything from the persisted columns
            riskBreakdown = fromJson(prediction.getRiskBreakdownJson(), new TypeReference<>() {});
            if (riskBreakdown == null) {
                riskBreakdown = RiskAssessmentResponseDTO.RiskBreakdownDTO.builder().build();
            }
            fillLegacyFallbacks(riskBreakdown, prediction);
            overallRiskScore = prediction.getOverallRiskScore();
            riskLevel = prediction.getRiskLevel();
            // successProbability is persisted as the combined value on new rows. On legacy rows the
            // successProbability column still held the raw ML financial value, so the combined value
            // is recomputed from the persisted overall risk score, while the raw ML value is kept.
            successProbability = prediction.getFinancialSuccessProbability() != null
                    ? prediction.getSuccessProbability()
                    : RiskScoreAggregator.combinedSuccessProbability(overallRiskScore);
            financialSuccessProbability = prediction.getFinancialSuccessProbability() != null
                    ? prediction.getFinancialSuccessProbability()
                    : prediction.getSuccessProbability();
        }

        // Financial risk on this response is the BLENDED score from the risk breakdown; the raw ML-only
        // number is exposed separately as mlOnlyFinancialRisk, and Gemini's judgment as budgetAdequacy.
        financialRiskScore = riskBreakdown != null && riskBreakdown.getFinancialRisk() != null
                ? riskBreakdown.getFinancialRisk().getScore()
                : (ml != null ? ml.getOverallRiskScore() : prediction.getOverallRiskScore());
        mlOnlyFinancialRisk = riskBreakdown != null ? riskBreakdown.getMlOnlyFinancialRisk() : null;
        budgetAdequacy = riskBreakdown != null ? riskBreakdown.getBudgetAdequacy() : null;

        RiskAssessmentResponseDTO.SwotDTO swotData = fromJson(swot.getSwotJson(), new TypeReference<>() {});
        List<String> recommendations = fromJson(swot.getRecommendationsJson(), new TypeReference<>() {});
        Map<String, Double> assessmentMetrics = fromJson(swot.getAssessmentMetricsJson(), new TypeReference<>() {});

        return RiskAssessmentResponseDTO.builder()
                .id(prediction.getId())
                .projectId(prediction.getProject().getProjectId())
                .successProbability(successProbability)
                .financialSuccessProbability(financialSuccessProbability)
                .overallRiskScore(overallRiskScore)
                .riskLevel(riskLevel)
                .financialRiskScore(financialRiskScore)
                .mlOnlyFinancialRisk(mlOnlyFinancialRisk)
                .budgetAdequacy(budgetAdequacy)
                .topRiskFactors(topRiskFactors)
                .swot(swotData)
                .riskNarrative(swot.getRiskNarrative())
                .feasibilityScore(feasibilityScore != null ? feasibilityScore : swot.getFeasibilityScore())
                .feasibilityVerdict(swot.getFeasibilityVerdict())
                .assessmentMetrics(assessmentMetrics)
                .riskBreakdown(riskBreakdown)
                .recommendations(recommendations)
                .createdAt(prediction.getCreatedAt() != null ? prediction.getCreatedAt() : swot.getCreatedAt())
                .build();
    }

    // ---------------------------------------------------------------
    // Five-category risk breakdown helpers
    // ---------------------------------------------------------------
    private RiskAssessmentResponseDTO.RiskBreakdownDTO buildRiskBreakdown(
            Project project, MlPredictionResponseDTO ml, GeminiRiskResponseDTO gemini) {
        double blendedFinancialRisk = computeBlendedFinancialRisk(ml, gemini);
        return RiskAssessmentResponseDTO.RiskBreakdownDTO.builder()
                .financialRisk(buildFinancialRiskCategory(project, ml, gemini, blendedFinancialRisk))
                .marketRisk(toCategory(gemini.getMarketRisk()))
                .technicalRisk(toCategory(gemini.getTechnicalRisk()))
                .operationalRisk(toCategory(gemini.getOperationalRisk()))
                .executionRisk(toCategory(gemini.getExecutionRisk()))
                .mlOnlyFinancialRisk(ml.getOverallRiskScore())
                .budgetAdequacy(toBudgetAdequacyDto(gemini.getBudgetAdequacy()))
                .build();
    }

    /**
     * Blends Gemini's scope-based budget-adequacy judgment with the ML historical
     * baseline into the Financial Risk score: 60% adequacy / 40% ML. If Gemini did
     * not return a budget-adequacy score, the ML baseline is used unchanged.
     */
    private double computeBlendedFinancialRisk(MlPredictionResponseDTO ml, GeminiRiskResponseDTO gemini) {
        double mlScore = safeDouble(ml.getOverallRiskScore());
        Integer adequacyScore = gemini.getBudgetAdequacy() != null ? gemini.getBudgetAdequacy().getScore() : null;
        if (adequacyScore == null) {
            return Math.round(mlScore * 10.0) / 10.0;
        }
        return RiskScoreAggregator.blendFinancialRisk(adequacyScore.doubleValue(), mlScore);
    }

    private RiskAssessmentResponseDTO.BudgetAdequacyDTO toBudgetAdequacyDto(GeminiRiskResponseDTO.BudgetAdequacy adequacy) {
        if (adequacy == null) {
            return null;
        }
        return RiskAssessmentResponseDTO.BudgetAdequacyDTO.builder()
                .score(adequacy.getScore())
                .reasoning(adequacy.getReasoning())
                .build();
    }

    /**
     * Financial risk is a BLEND of two independent signals: how well the submitted
     * budget covers THIS project's specific scope (Gemini, weighted 60%) and how it
     * compares to previously funded companies in the ML training data (40%). The raw
     * ML-only score is kept separately as {@code mlOnlyFinancialRisk}.
     */
    private RiskAssessmentResponseDTO.RiskCategoryDTO buildFinancialRiskCategory(
            Project project, MlPredictionResponseDTO ml, GeminiRiskResponseDTO gemini, double blendedFinancialRisk) {
        GeminiRiskResponseDTO.BudgetAdequacy adequacy = gemini.getBudgetAdequacy();
        Double mlScore = ml.getOverallRiskScore();

        String reason;
        if (adequacy != null && adequacy.getReasoning() != null && !adequacy.getReasoning().isBlank()) {
            reason = "Budget adequacy for this project's scope: " + adequacy.getReasoning()
                    + " (Historical comparison: this budget is " + describeMlHistoricalRisk(safeDouble(mlScore))
                    + " \u2014 see mlOnlyFinancialRisk for that raw signal.)";
        } else {
            reason = "Financial risk blends Gemini's scope-based budget adequacy (60%) with the ML historical "
                    + "baseline (40%). No budget-adequacy reasoning was returned; see mlOnlyFinancialRisk ("
                    + safeDouble(mlScore) + "/100) for the raw historical signal.";
        }

        return RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                .score(blendedFinancialRisk)
                .reason(reason)
                .source(SOURCE_BLENDED)
                .build();
    }

    private String describeMlHistoricalRisk(double mlScore) {
        if (mlScore >= 67.0) {
            return "in the higher-risk band relative to previously funded companies in this dataset";
        }
        if (mlScore >= 34.0) {
            return "in the moderate-risk band relative to previously funded companies in this dataset";
        }
        return "in the lower-risk band relative to previously funded companies in this dataset";
    }

    private RiskAssessmentResponseDTO.RiskCategoryDTO toCategory(GeminiRiskResponseDTO.RiskScore riskScore) {
        if (riskScore == null || riskScore.getScore() == null) {
            return RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                    .source(SOURCE_GEMINI)
                    .reason("The reasoning model did not return data for this category; regenerate to refresh.")
                    .build();
        }
        return RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                .score(riskScore.getScore())
                .reason(riskScore.getReason())
                .source(SOURCE_GEMINI)
                .build();
    }

    /**
     * Weighted Overall Risk Score from the five categories using the shared
     * {@link RiskScoreAggregator} weights (0.25/0.20/0.20/0.20/0.15).
     */
    private double computeOverallRiskScore(RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown) {
        return RiskScoreAggregator.computeOverallRiskScore(
                scoreOf(breakdown.getFinancialRisk()),
                scoreOf(breakdown.getMarketRisk()),
                scoreOf(breakdown.getTechnicalRisk()),
                scoreOf(breakdown.getOperationalRisk()),
                scoreOf(breakdown.getExecutionRisk()));
    }

    private double scoreOf(RiskAssessmentResponseDTO.RiskCategoryDTO category) {
        return category != null && category.getScore() != null ? category.getScore() : 0.0;
    }

    /**
     * Formats an amount using Indian numbering (lakhs/crores), e.g.
     * 1800000 -> "\u20B918,00,000". Budgets are whole rupees so no decimals
     * are emitted.
     */
    static String formatInr(BigDecimal value) {
        if (value == null) {
            return null;
        }
        long amount = Math.round(value.doubleValue());
        boolean negative = amount < 0;
        amount = Math.abs(amount);

        String digits = String.valueOf(amount);
        String grouped;
        if (digits.length() <= 3) {
            grouped = digits;
        } else {
            int split = digits.length() - 3;
            String first = digits.substring(0, split);
            StringBuilder builder = new StringBuilder(first);
            int pos = first.length() - 2;
            while (pos > 0) {
                builder.insert(pos, ',');
                pos -= 2;
            }
            grouped = builder.append(',').append(digits.substring(split)).toString();
        }
        return (negative ? "-\u20B9" : "\u20B9") + grouped;
    }

    /**
     * Best-effort fill for a cached (older-generation) breakdown whose persisted
     * JSON predates the five-category upgrade.
     */
    private void fillLegacyFallbacks(RiskAssessmentResponseDTO.RiskBreakdownDTO breakdown, Prediction prediction) {
        if (breakdown.getFinancialRisk() == null && prediction.getOverallRiskScore() != null) {
            breakdown.setFinancialRisk(RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                    .score(prediction.getOverallRiskScore())
                    .reason("Financial baseline from the ML model, carried over from a previous-generation assessment. Regenerate to refresh.")
                    .source(SOURCE_ML_MODEL)
                    .build());
        }
        // Legacy rows stored the pure ML value as the financial score \u2014 reuse it as mlOnlyFinancialRisk.
        if (breakdown.getMlOnlyFinancialRisk() == null && breakdown.getFinancialRisk() != null
                && breakdown.getFinancialRisk().getScore() != null) {
            breakdown.setMlOnlyFinancialRisk(breakdown.getFinancialRisk().getScore());
        }
        if (breakdown.getMarketRisk() == null) {
            breakdown.setMarketRisk(RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                    .reason("Market risk was not computed in previous-generation assessments. Regenerate to compute it.")
                    .source(SOURCE_GEMINI)
                    .build());
        }
        if (breakdown.getTechnicalRisk() == null && breakdown.getTechnicalRiskScore() != null) {
            breakdown.setTechnicalRisk(RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                    .score(breakdown.getTechnicalRiskScore())
                    .reason("Technical sub-score carried over from a previous-generation assessment. Regenerate for a Gemini-grounded reason.")
                    .source(SOURCE_GEMINI)
                    .build());
        }
        if (breakdown.getOperationalRisk() == null && breakdown.getOperationalRiskScore() != null) {
            breakdown.setOperationalRisk(RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                    .score(breakdown.getOperationalRiskScore())
                    .reason("Operational sub-score carried over from a previous-generation assessment. Regenerate for a Gemini-grounded reason.")
                    .source(SOURCE_GEMINI)
                    .build());
        }
        if (breakdown.getExecutionRisk() == null && breakdown.getExecutionRiskScore() != null) {
            breakdown.setExecutionRisk(RiskAssessmentResponseDTO.RiskCategoryDTO.builder()
                    .score(breakdown.getExecutionRiskScore())
                    .reason("Execution sub-score carried over from a previous-generation assessment. Regenerate for a Gemini-grounded reason.")
                    .source(SOURCE_GEMINI)
                    .build());
        }
    }

    // ---------------------------------------------------------------
    // JSON / misc helpers
    // ---------------------------------------------------------------
    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize risk assessment data", e);
        }
    }

    private <T> T fromJson(String json, TypeReference<T> typeReference) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, typeReference);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to deserialize risk assessment data", e);
        }
    }

    private double safeDouble(Double value) {
        return value != null ? value : 0.0;
    }

    private String stripMarkdown(String text) {
        if (text == null) return null;
        text = text.trim();
        if (text.startsWith("```json")) {
            text = text.substring(7);
        } else if (text.startsWith("```")) {
            text = text.substring(3);
        }
        if (text.endsWith("```")) {
            text = text.substring(0, text.length() - 3);
        }
        return text.trim();
    }
}
