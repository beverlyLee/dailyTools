package com.bigdata.devkit.repository;

import com.bigdata.devkit.entity.SqlVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SqlVersionRepository extends JpaRepository<SqlVersionEntity, Long> {
    
    List<SqlVersionEntity> findBySqlNameOrderByVersionDesc(String sqlName);
    
    Optional<SqlVersionEntity> findBySqlNameAndVersion(String sqlName, Integer version);
    
    Optional<SqlVersionEntity> findFirstBySqlNameOrderByVersionDesc(String sqlName);
}
