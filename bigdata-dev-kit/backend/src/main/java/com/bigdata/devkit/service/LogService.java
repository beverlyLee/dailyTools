package com.bigdata.devkit.service;

import com.bigdata.devkit.entity.LogEntity;
import com.bigdata.devkit.repository.LogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LogService {
    
    private final LogRepository logRepository;
    
    public List<LogEntity> getLogsByJobId(Long jobId) {
        return logRepository.findByJobIdOrderByTimestampDesc(jobId);
    }
    
    public List<LogEntity> getLogsByJobIdAndLevel(Long jobId, LogEntity.LogLevel level) {
        return logRepository.findByJobIdAndLevelOrderByTimestampDesc(jobId, level);
    }
    
    public List<LogEntity> getLogsByJobIdAndExecutorId(Long jobId, String executorId) {
        return logRepository.findByJobIdAndExecutorIdOrderByTimestampDesc(jobId, executorId);
    }
    
    @Transactional
    public LogEntity addLog(LogEntity log) {
        return logRepository.save(log);
    }
    
    @Transactional
    public LogEntity addInfoLog(Long jobId, String message) {
        return addLog(jobId, null, LogEntity.LogLevel.INFO, message);
    }
    
    @Transactional
    public LogEntity addErrorLog(Long jobId, String message) {
        return addLog(jobId, null, LogEntity.LogLevel.ERROR, message);
    }
    
    @Transactional
    public LogEntity addLog(Long jobId, String executorId, LogEntity.LogLevel level, String message) {
        LogEntity log = new LogEntity();
        log.setJobId(jobId);
        log.setExecutorId(executorId);
        log.setLevel(level);
        log.setMessage(message);
        return logRepository.save(log);
    }
    
    @Transactional
    public void deleteLogsByJobId(Long jobId) {
        List<LogEntity> logs = logRepository.findByJobIdOrderByTimestampDesc(jobId);
        logRepository.deleteAll(logs);
    }
}
