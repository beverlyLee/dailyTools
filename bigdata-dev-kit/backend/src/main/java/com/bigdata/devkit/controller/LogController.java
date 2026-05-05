package com.bigdata.devkit.controller;

import com.bigdata.devkit.entity.LogEntity;
import com.bigdata.devkit.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogController {
    
    private final LogService logService;
    
    @GetMapping("/job/{jobId}")
    public ResponseEntity<List<LogEntity>> getLogsByJobId(@PathVariable Long jobId) {
        return ResponseEntity.ok(logService.getLogsByJobId(jobId));
    }
    
    @GetMapping("/job/{jobId}/level/{level}")
    public ResponseEntity<List<LogEntity>> getLogsByJobIdAndLevel(
            @PathVariable Long jobId,
            @PathVariable LogEntity.LogLevel level) {
        return ResponseEntity.ok(logService.getLogsByJobIdAndLevel(jobId, level));
    }
    
    @GetMapping("/job/{jobId}/executor/{executorId}")
    public ResponseEntity<List<LogEntity>> getLogsByJobIdAndExecutorId(
            @PathVariable Long jobId,
            @PathVariable String executorId) {
        return ResponseEntity.ok(logService.getLogsByJobIdAndExecutorId(jobId, executorId));
    }
    
    @PostMapping
    public ResponseEntity<LogEntity> addLog(@RequestBody LogEntity log) {
        LogEntity saved = logService.addLog(log);
        return ResponseEntity.ok(saved);
    }
    
    @DeleteMapping("/job/{jobId}")
    public ResponseEntity<Void> deleteLogsByJobId(@PathVariable Long jobId) {
        logService.deleteLogsByJobId(jobId);
        return ResponseEntity.noContent().build();
    }
}
