package com.bigdata.devkit.repository;

import com.bigdata.devkit.entity.UdfEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UdfRepository extends JpaRepository<UdfEntity, Long> {
    
    Optional<UdfEntity> findByFunctionName(String functionName);
    
    List<UdfEntity> findByIsEnabledTrueOrderByCreatedAtDesc();
    
    List<UdfEntity> findByTypeOrderByCreatedAtDesc(UdfEntity.UdfType type);
}
