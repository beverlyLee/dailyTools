package com.bigdata.devkit.repository;

import com.bigdata.devkit.entity.JobEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<JobEntity, Long> {
    
    List<JobEntity> findByJobTypeOrderByCreatedAtDesc(String jobType);
    
    List<JobEntity> findByStatusOrderByCreatedAtDesc(JobEntity.JobStatus status);
    
    List<JobEntity> findByEngineTypeOrderByCreatedAtDesc(String engineType);
}
