package com.bigdata.devkit.service;

import com.bigdata.devkit.entity.ExecutorEntity;
import com.bigdata.devkit.repository.ExecutorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ExecutorService {
    
    private final ExecutorRepository executorRepository;
    
    public List<ExecutorEntity> getExecutorsByJobId(Long jobId) {
        return executorRepository.findByJobIdOrderByRegisteredAtDesc(jobId);
    }
    
    public Optional<ExecutorEntity> getExecutorById(Long id) {
        return executorRepository.findById(id);
    }
    
    public Optional<ExecutorEntity> getExecutorByExecutorIdAndJobId(String executorId, Long jobId) {
        return executorRepository.findByExecutorIdAndJobId(executorId, jobId);
    }
    
    @Transactional
    public ExecutorEntity createExecutor(ExecutorEntity executor) {
        return executorRepository.save(executor);
    }
    
    @Transactional
    public ExecutorEntity updateExecutorStatus(String executorId, Long jobId, ExecutorEntity.ExecutorStatus status) {
        return executorRepository.findByExecutorIdAndJobId(executorId, jobId).map(executor -> {
            executor.setStatus(status);
            executor.setLastHeartbeatAt(LocalDateTime.now());
            return executorRepository.save(executor);
        }).orElseThrow(() -> new RuntimeException("Executor not found: " + executorId));
    }
    
    @Transactional
    public ExecutorEntity updateExecutorMetrics(String executorId, Long jobId, 
            Double cpuUsage, Double memoryUsage, Long tasksCompleted, 
            Long tasksRunning, Long tasksFailed) {
        return executorRepository.findByExecutorIdAndJobId(executorId, jobId).map(executor -> {
            if (cpuUsage != null) executor.setCpuUsage(cpuUsage);
            if (memoryUsage != null) executor.setMemoryUsage(memoryUsage);
            if (tasksCompleted != null) executor.setTasksCompleted(tasksCompleted);
            if (tasksRunning != null) executor.setTasksRunning(tasksRunning);
            if (tasksFailed != null) executor.setTasksFailed(tasksFailed);
            executor.setLastHeartbeatAt(LocalDateTime.now());
            return executorRepository.save(executor);
        }).orElseThrow(() -> new RuntimeException("Executor not found: " + executorId));
    }
    
    @Transactional
    public void deleteExecutorsByJobId(Long jobId) {
        List<ExecutorEntity> executors = executorRepository.findByJobIdOrderByRegisteredAtDesc(jobId);
        executorRepository.deleteAll(executors);
    }
}
