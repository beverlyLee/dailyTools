package com.bigdata.devkit.service;

import com.bigdata.devkit.entity.SqlVersionEntity;
import com.bigdata.devkit.repository.SqlVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SqlVersionService {
    
    private final SqlVersionRepository sqlVersionRepository;
    
    public List<SqlVersionEntity> getVersionsBySqlName(String sqlName) {
        return sqlVersionRepository.findBySqlNameOrderByVersionDesc(sqlName);
    }
    
    public Optional<SqlVersionEntity> getLatestVersion(String sqlName) {
        return sqlVersionRepository.findFirstBySqlNameOrderByVersionDesc(sqlName);
    }
    
    public Optional<SqlVersionEntity> getVersion(String sqlName, Integer version) {
        return sqlVersionRepository.findBySqlNameAndVersion(sqlName, version);
    }
    
    @Transactional
    public SqlVersionEntity saveNewVersion(String sqlName, String sqlContent, String createdBy, String description) {
        int nextVersion = 1;
        Optional<SqlVersionEntity> latest = sqlVersionRepository.findFirstBySqlNameOrderByVersionDesc(sqlName);
        if (latest.isPresent()) {
            nextVersion = latest.get().getVersion() + 1;
        }
        
        SqlVersionEntity newVersion = new SqlVersionEntity();
        newVersion.setSqlName(sqlName);
        newVersion.setSqlContent(sqlContent);
        newVersion.setVersion(nextVersion);
        newVersion.setCreatedBy(createdBy);
        newVersion.setDescription(description);
        
        return sqlVersionRepository.save(newVersion);
    }
    
    @Transactional
    public void deleteAllVersions(String sqlName) {
        List<SqlVersionEntity> versions = sqlVersionRepository.findBySqlNameOrderByVersionDesc(sqlName);
        sqlVersionRepository.deleteAll(versions);
    }
}
