package com.bigdata.devkit.repository;

import com.bigdata.devkit.entity.LogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LogRepository extends JpaRepository<LogEntity, Long> {
    
    List<LogEntity> findByJobIdOrderByTimestampDesc(Long jobId);
    
    List<LogEntity> findByJobIdAndLevelOrderByTimestampDesc(Long jobId, LogEntity.LogLevel level);
    
    List<LogEntity> findByJobIdAndExecutorIdOrderByTimestampDesc(Long jobId, String executorId);
}
