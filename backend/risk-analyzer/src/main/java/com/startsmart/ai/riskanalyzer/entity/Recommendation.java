package com.startsmart.ai.riskanalyzer.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "recommendations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(name = "risk_category")
    private String riskCategory;

    @Column(columnDefinition = "TEXT")
    private String recommendationText;

    @Column(columnDefinition = "TEXT")
    private String mitigationStrategy;

    private String priority;

    private String phase;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
