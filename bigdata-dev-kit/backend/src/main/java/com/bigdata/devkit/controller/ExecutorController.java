package com.bigdata.devkit.controller;

import com.bigdata.devkit.entity.ExecutorEntity;
import com.bigdata.devkit.service.ExecutorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/executors")
@RequiredArgsConstructor
public class ExecutorController {
    
    private final ExecutorService executorService;
    
    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<ExecutorEntity>> getExecutorsByJobId(@PathVariable Long jobId) {
        return ResponseEntity.ok(executorService.getExecutorsByJobId(jobId));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ExecutorEntity> getExecutorById(@PathVariable Long id) {
        return executorService.getExecutorById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<ExecutorEntity> createExecutor(@RequestBody ExecutorEntity executor) {
        ExecutorEntity saved = executorService.createExecutor(executor);
        return ResponseEntity.ok(saved);
    }
    
    @PutMapping("/status")
    public ResponseEntity<?> updateExecutorStatus(
            @RequestParam String executorId,
            @RequestParam Long jobId,
            @RequestParam ExecutorEntity.ExecutorStatus status) {
        try {
            ExecutorEntity updated = executorService.updateExecutorStatus(executorId, jobId, status);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/metrics")
    public ResponseEntity<?> updateExecutorMetrics(
            @RequestParam String executorId,
            @RequestParam Long jobId,
            @RequestParam(required = false) Double cpuUsage,
            @RequestParam(required = false) Double memoryUsage,
            @RequestParam(required = false) Long tasksCompleted,
            @RequestParam(required = false) Long tasksRunning,
            @RequestParam(required = false) Long tasksFailed) {
        try {
            ExecutorEntity updated = executorService.updateExecutorMetrics(
                    executorId, jobId, cpuUsage, memoryUsage, 
                    tasksCompleted, tasksRunning, tasksFailed);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/job/{jobId}")
    public ResponseEntity<Void> deleteExecutorsByJobId(@PathVariable Long jobId) {
        executorService.deleteExecutorsByJobId(jobId);
        return ResponseEntity.noContent().build();
    }
}
