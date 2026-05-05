package com.bigdata.devkit.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "logs")
public class LogEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long jobId;
    
    private String executorId;
    
    @Enumerated(EnumType.STRING)
    private LogLevel level = LogLevel.INFO;
    
    @Lob
    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;
    
    private LocalDateTime timestamp;
    
    private String source;
    private String threadName;
    
    public enum LogLevel {
        TRACE,
        DEBUG,
        INFO,
        WARN,
        ERROR,
        FATAL
    }
    
    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
        if (level == null) {
            level = LogLevel.INFO;
        }
    }
}
