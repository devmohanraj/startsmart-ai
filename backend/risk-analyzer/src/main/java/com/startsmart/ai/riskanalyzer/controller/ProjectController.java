package com.startsmart.ai.riskanalyzer.controller;

import com.startsmart.ai.riskanalyzer.dto.ProjectRequestDTO;
import com.startsmart.ai.riskanalyzer.dto.ProjectResponseDTO;
import com.startsmart.ai.riskanalyzer.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Endpoints for submitting and managing startup/project risk analysis submissions")
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    @Operation(summary = "Submit a new project", description = "Accepts startup/project details and saves them for risk and market analysis")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Project created successfully",
            content = @Content(schema = @Schema(implementation = ProjectResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "Validation failed — field-level error messages returned")
    })
    public ResponseEntity<ProjectResponseDTO> createProject(
            @Valid @RequestBody ProjectRequestDTO dto,
            @RequestParam Long userId
    ) {
        ProjectResponseDTO response = projectService.createProject(dto, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get all projects for a user")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Projects retrieved successfully",
            content = @Content(schema = @Schema(implementation = ProjectResponseDTO.class)))
    })
    public ResponseEntity<List<ProjectResponseDTO>> getUserProjects(@PathVariable Long userId) {
        List<ProjectResponseDTO> response = projectService.getUserProjects(userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{projectId}")
    @Operation(summary = "Delete a project")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Project deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Project not found")
    })
    public ResponseEntity<Void> deleteProject(@PathVariable Long projectId) {
        projectService.deleteProject(projectId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationErrors(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(404).body(Map.of("error", ex.getMessage()));
    }
}
