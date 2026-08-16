package com.startsmart.ai.riskanalyzer.service;

import com.startsmart.ai.riskanalyzer.dto.ProjectRequestDTO;
import com.startsmart.ai.riskanalyzer.dto.ProjectResponseDTO;
import com.startsmart.ai.riskanalyzer.entity.Project;
import com.startsmart.ai.riskanalyzer.entity.User;
import com.startsmart.ai.riskanalyzer.repository.CompetitorAnalysisRepository;
import com.startsmart.ai.riskanalyzer.repository.MarketAnalysisRepository;
import com.startsmart.ai.riskanalyzer.repository.PredictionRepository;
import com.startsmart.ai.riskanalyzer.repository.ProjectRepository;
import com.startsmart.ai.riskanalyzer.repository.RecommendationRepository;
import com.startsmart.ai.riskanalyzer.repository.SwotAnalysisRepository;
import com.startsmart.ai.riskanalyzer.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final MarketAnalysisRepository marketAnalysisRepository;
    private final CompetitorAnalysisRepository competitorAnalysisRepository;
    private final PredictionRepository predictionRepository;
    private final SwotAnalysisRepository swotAnalysisRepository;
    private final RecommendationRepository recommendationRepository;

    public ProjectResponseDTO createProject(ProjectRequestDTO dto, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));

        Project project = Project.builder()
                .user(user)
                .projectName(dto.getProjectName())
                .projectType(dto.getIndustrySector())
                .businessModel(dto.getBusinessModel())
                .targetMarket(dto.getTargetMarket())
                .budget(dto.getBudget())
                .description(dto.getDescription())
                .build();

        Project saved = projectRepository.save(project);

        return ProjectResponseDTO.builder()
                .projectId(saved.getProjectId())
                .projectName(saved.getProjectName())
                .projectType(saved.getProjectType())
                .businessModel(saved.getBusinessModel())
                .budget(saved.getBudget())
                .targetMarket(saved.getTargetMarket())
                .description(saved.getDescription())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    public List<ProjectResponseDTO> getUserProjects(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + userId));

        return projectRepository.findByUserUserIdOrderByCreatedAtDesc(userId).stream()
                .map(project -> ProjectResponseDTO.builder()
                        .projectId(project.getProjectId())
                        .projectName(project.getProjectName())
                        .projectType(project.getProjectType())
                        .businessModel(project.getBusinessModel())
                        .budget(project.getBudget())
                        .targetMarket(project.getTargetMarket())
                        .description(project.getDescription())
                        .createdAt(project.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public void deleteProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("Project not found with id: " + projectId));
        
        // Delete related records first to avoid foreign key constraint violation
        predictionRepository.deleteByProjectProjectId(projectId);
        swotAnalysisRepository.deleteByProjectProjectId(projectId);
        recommendationRepository.deleteByProjectProjectId(projectId);
        marketAnalysisRepository.deleteByProjectProjectId(projectId);
        competitorAnalysisRepository.deleteByProjectProjectId(projectId);
        
        projectRepository.delete(project);
    }
}
