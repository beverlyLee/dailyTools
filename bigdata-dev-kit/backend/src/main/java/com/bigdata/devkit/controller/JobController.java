package com.bigdata.devkit.controller;

import com.bigdata.devkit.entity.JobEntity;
import com.bigdata.devkit.service.FileService;
import com.bigdata.devkit.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
public class JobController {
    
    private final JobService jobService;
    private final FileService fileService;
    
    @GetMapping
    public ResponseEntity<List<JobEntity>> getAllJobs() {
        return ResponseEntity.ok(jobService.getAllJobs());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<JobEntity> getJobById(@PathVariable Long id) {
        return jobService.getJobById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/type/{jobType}")
    public ResponseEntity<List<JobEntity>> getJobsByType(@PathVariable String jobType) {
        return ResponseEntity.ok(jobService.getJobsByType(jobType));
    }
    
    @PostMapping
    public ResponseEntity<JobEntity> createJob(@RequestBody JobEntity job) {
        JobEntity saved = jobService.createJob(job);
        return ResponseEntity.ok(saved);
    }
    
    @PostMapping("/upload-jar")
    public ResponseEntity<Map<String, String>> uploadJar(@RequestParam("file") MultipartFile file) {
        try {
            String path = fileService.uploadJarFile(file);
            String filename = fileService.getFilenameFromPath(path);
            Map<String, String> result = new HashMap<>();
            result.put("path", path);
            result.put("filename", filename);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PutMapping("/{id}/status")
    public ResponseEntity<JobEntity> updateJobStatus(
            @PathVariable Long id,
            @RequestParam JobEntity.JobStatus status) {
        try {
            JobEntity updated = jobService.updateJobStatus(id, status);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/{id}/progress")
    public ResponseEntity<JobEntity> updateJobProgress(
            @PathVariable Long id,
            @RequestParam Integer progress) {
        try {
            JobEntity updated = jobService.updateJobProgress(id, progress);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/{id}/dag")
    public ResponseEntity<JobEntity> updateDag(
            @PathVariable Long id,
            @RequestBody Map<String, String> dagMap) {
        try {
            String dagJson = dagMap.get("dagJson");
            JobEntity updated = jobService.updateDag(id, dagJson);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id);
        return ResponseEntity.noContent().build();
    }
}
