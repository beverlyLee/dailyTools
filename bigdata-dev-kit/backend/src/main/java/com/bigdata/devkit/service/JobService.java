package com.bigdata.devkit.service;

import com.bigdata.devkit.entity.JobEntity;
import com.bigdata.devkit.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class JobService {
    
    private final JobRepository jobRepository;
    
    public List<JobEntity> getAllJobs() {
        return jobRepository.findAll();
    }
    
    public Optional<JobEntity> getJobById(Long id) {
        return jobRepository.findById(id);
    }
    
    public List<JobEntity> getJobsByType(String jobType) {
        return jobRepository.findByJobTypeOrderByCreatedAtDesc(jobType);
    }
    
    @Transactional
    public JobEntity createJob(JobEntity job) {
        return jobRepository.save(job);
    }
    
    @Transactional
    public JobEntity updateJobStatus(Long jobId, JobEntity.JobStatus status) {
        return jobRepository.findById(jobId).map(job -> {
            job.setStatus(status);
            if (status == JobEntity.JobStatus.RUNNING) {
                job.setStartedAt(LocalDateTime.now());
            } else if (status == JobEntity.JobStatus.COMPLETED || 
                       status == JobEntity.JobStatus.FAILED || 
                       status == JobEntity.JobStatus.CANCELLED) {
                job.setFinishedAt(LocalDateTime.now());
            }
            return jobRepository.save(job);
        }).orElseThrow(() -> new RuntimeException("Job not found: " + jobId));
    }
    
    @Transactional
    public JobEntity updateJobProgress(Long jobId, Integer progress) {
        return jobRepository.findById(jobId).map(job -> {
            job.setProgress(progress);
            return jobRepository.save(job);
        }).orElseThrow(() -> new RuntimeException("Job not found: " + jobId));
    }
    
    @Transactional
    public void deleteJob(Long jobId) {
        jobRepository.deleteById(jobId);
    }
    
    @Transactional
    public JobEntity updateDag(Long jobId, String dagJson) {
        return jobRepository.findById(jobId).map(job -> {
            job.setDagJson(dagJson);
            return jobRepository.save(job);
        }).orElseThrow(() -> new RuntimeException("Job not found: " + jobId));
    }
}
