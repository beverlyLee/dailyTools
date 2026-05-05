package com.bigdata.devkit.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "executors")
public class ExecutorEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String executorId;
    
    @Column(nullable = false)
    private Long jobId;
    
    private String host;
    private Integer port;
    
    private Integer cores;
    private Long memoryMb;
    
    @Enumerated(EnumType.STRING)
    private ExecutorStatus status = ExecutorStatus.IDLE;
    
    private LocalDateTime registeredAt;
    private LocalDateTime lastHeartbeatAt;
    
    private Long tasksCompleted;
    private Long tasksRunning;
    private Long tasksFailed;
    
    private Double cpuUsage;
    private Double memoryUsage;
    private Long shuffleReadBytes;
    private Long shuffleWriteBytes;
    
    public enum ExecutorStatus {
        IDLE,
        RUNNING,
        BUSY,
        FAILED,
        LOST,
        DEAD
    }
    
    @PrePersist
    protected void onCreate() {
        if (registeredAt == null) {
            registeredAt = LocalDateTime.now();
        }
        if (lastHeartbeatAt == null) {
            lastHeartbeatAt = LocalDateTime.now();
        }
        if (status == null) {
            status = ExecutorStatus.IDLE;
        }
        if (tasksCompleted == null) tasksCompleted = 0L;
        if (tasksRunning == null) tasksRunning = 0L;
        if (tasksFailed == null) tasksFailed = 0L;
    }
}
