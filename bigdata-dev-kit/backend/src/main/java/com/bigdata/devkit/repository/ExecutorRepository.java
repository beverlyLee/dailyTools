package com.bigdata.devkit.repository;

import com.bigdata.devkit.entity.ExecutorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExecutorRepository extends JpaRepository<ExecutorEntity, Long> {
    
    List<ExecutorEntity> findByJobIdOrderByRegisteredAtDesc(Long jobId);
    
    Optional<ExecutorEntity> findByExecutorIdAndJobId(String executorId, Long jobId);
    
    List<ExecutorEntity> findByJobIdAndStatusOrderByRegisteredAtDesc(Long jobId, ExecutorEntity.ExecutorStatus status);
}
