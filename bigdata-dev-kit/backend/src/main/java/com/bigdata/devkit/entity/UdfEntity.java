package com.bigdata.devkit.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "udfs")
public class UdfEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String functionName;
    
    @Column(nullable = false)
    private String className;
    
    @Enumerated(EnumType.STRING)
    private UdfType type = UdfType.SCALAR;
    
    private String jarPath;
    private String jarName;
    private String version;
    private String description;
    
    @Lob
    @Column(columnDefinition = "TEXT")
    private String sourceCode;
    
    @Column(nullable = false)
    private Boolean isEnabled = true;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public enum UdfType {
        SCALAR,
        TABLE,
        AGGREGATE
    }
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (isEnabled == null) {
            isEnabled = true;
        }
        if (type == null) {
            type = UdfType.SCALAR;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
