package com.bigdata.devkit.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "jobs")
public class JobEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String jobName;
    
    @Column(nullable = false)
    private String jobType;
    
    @Column(nullable = false)
    private String engineType;
    
    @Lob
    @Column(columnDefinition = "TEXT")
    private String sqlScript;
    
    private String jarPath;
    private String jarName;
    private String mainClass;
    private String arguments;
    
    @Enumerated(EnumType.STRING)
    private JobStatus status = JobStatus.PENDING;
    
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    
    @Lob
    @Column(columnDefinition = "TEXT")
    private String dagJson;
    
    @Lob
    @Column(columnDefinition = "TEXT")
    private String config;
    
    private String applicationId;
    private Integer progress = 0;
    
    public enum JobStatus {
        PENDING,
        SUBMITTED,
        RUNNING,
        COMPLETED,
        FAILED,
        CANCELLED
    }
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = JobStatus.PENDING;
        }
        if (progress == null) {
            progress = 0;
        }
    }
}
