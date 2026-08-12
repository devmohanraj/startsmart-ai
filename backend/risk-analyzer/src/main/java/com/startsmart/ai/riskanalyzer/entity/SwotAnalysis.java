package com.startsmart.ai.riskanalyzer.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "swot_analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SwotAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "swot_json", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String swotJson;

    @Column(columnDefinition = "TEXT")
    private String riskNarrative;

    private Double feasibilityScore;

    @Column(columnDefinition = "TEXT")
    private String feasibilityVerdict;

    @Column(name = "assessment_metrics_json", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String assessmentMetricsJson;

    @Column(name = "recommendations_json", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String recommendationsJson;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}