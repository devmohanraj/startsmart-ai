package com.startsmart.ai.riskanalyzer.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.startsmart.ai.riskanalyzer.dto.LlmMarketResponseDTO;
import com.startsmart.ai.riskanalyzer.dto.MarketAnalysisResponseDTO;
import com.startsmart.ai.riskanalyzer.entity.CompetitorAnalysis;
import com.startsmart.ai.riskanalyzer.entity.MarketAnalysis;
import com.startsmart.ai.riskanalyzer.entity.Project;
import com.startsmart.ai.riskanalyzer.repository.CompetitorAnalysisRepository;
import com.startsmart.ai.riskanalyzer.repository.MarketAnalysisRepository;
import com.startsmart.ai.riskanalyzer.repository.ProjectRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarketAnalysisService {

    private final ProjectRepository projectRepository;
    private final MarketAnalysisRepository marketAnalysisRepository;
    private final CompetitorAnalysisRepository competitorAnalysisRepository;
    private final LlmService llmService;
    private final ObjectMapper objectMapper;

    @Transactional
    public MarketAnalysisResponseDTO generateAndSaveAnalysis(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found with id: " + projectId));

        List<CompetitorAnalysis> existingCompetitors = competitorAnalysisRepository.findByProjectProjectId(projectId);
        if (!existingCompetitors.isEmpty()) {
            competitorAnalysisRepository.deleteAll(existingCompetitors);
        }
        marketAnalysisRepository.findByProjectProjectId(projectId).ifPresent(marketAnalysisRepository::delete);

        LlmMarketResponseDTO llmResponse = llmService.analyzeMarket(project);
        LlmMarketResponseDTO.MarketData marketData = llmResponse.getMarketData();

        String trendsJson;
        try {
            trendsJson = objectMapper.writeValueAsString(marketData.getMarketTrends());
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize market trends", e);
        }

        MarketAnalysis analysis = MarketAnalysis.builder()
                .project(project)
                .marketSizeTam(marketData.getMarketSizeTam())
                .marketSizeSam(marketData.getMarketSizeSam())
                .marketSizeSom(marketData.getMarketSizeSom())
                .growthRate(marketData.getGrowthRate())
                .marketTrendsJson(trendsJson)
                .build();

        MarketAnalysis savedAnalysis = marketAnalysisRepository.save(analysis);

        List<CompetitorAnalysis> competitors = marketData.getCompetitors().stream()
                .collect(Collectors.toMap(
                        c -> c.getName().trim().toLowerCase(),
                        c -> CompetitorAnalysis.builder()
                                .project(project)
                                .competitorName(c.getName().trim())
                                .marketShare(c.getMarketShare())
                                .revenue(c.getRevenue())
                                .growth(c.getGrowth())
                                .position(c.getPosition())
                                .build(),
                        (existing, replacement) -> existing
                ))
                .values()
                .stream()
                .toList();

        List<CompetitorAnalysis> savedCompetitors = competitorAnalysisRepository.saveAll(competitors);

        return MarketAnalysisResponseDTO.from(savedAnalysis, savedCompetitors);
    }

    @Transactional(readOnly = true)
    public MarketAnalysisResponseDTO getAnalysis(Long projectId) {
        MarketAnalysis analysis = marketAnalysisRepository.findByProjectProjectId(projectId)
                .orElseThrow(() -> new EntityNotFoundException("No market analysis found for project id: " + projectId));

        List<CompetitorAnalysis> competitors = competitorAnalysisRepository.findByProjectProjectId(projectId);

        return MarketAnalysisResponseDTO.from(analysis, competitors);
    }
}