package com.bigdata.devkit.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "sql_versions")
public class SqlVersionEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String sqlName;
    
    @Lob
    @Column(columnDefinition = "TEXT", nullable = false)
    private String sqlContent;
    
    @Column(nullable = false)
    private Integer version;
    
    private String createdBy;
    private String description;
    
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (version == null) {
            version = 1;
        }
    }
}
