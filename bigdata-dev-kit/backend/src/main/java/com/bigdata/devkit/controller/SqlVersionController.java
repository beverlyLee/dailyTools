package com.bigdata.devkit.controller;

import com.bigdata.devkit.entity.SqlVersionEntity;
import com.bigdata.devkit.service.SqlVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sql-versions")
@RequiredArgsConstructor
public class SqlVersionController {
    
    private final SqlVersionService sqlVersionService;
    
    @GetMapping("/{sqlName}")
    public ResponseEntity<List<SqlVersionEntity>> getVersionsBySqlName(@PathVariable String sqlName) {
        return ResponseEntity.ok(sqlVersionService.getVersionsBySqlName(sqlName));
    }
    
    @GetMapping("/{sqlName}/latest")
    public ResponseEntity<SqlVersionEntity> getLatestVersion(@PathVariable String sqlName) {
        return sqlVersionService.getLatestVersion(sqlName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/{sqlName}/version/{version}")
    public ResponseEntity<SqlVersionEntity> getVersion(
            @PathVariable String sqlName,
            @PathVariable Integer version) {
        return sqlVersionService.getVersion(sqlName, version)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<SqlVersionEntity> saveNewVersion(@RequestBody Map<String, String> params) {
        String sqlName = params.get("sqlName");
        String sqlContent = params.get("sqlContent");
        String createdBy = params.getOrDefault("createdBy", "system");
        String description = params.getOrDefault("description", "");
        
        SqlVersionEntity saved = sqlVersionService.saveNewVersion(
                sqlName, sqlContent, createdBy, description);
        return ResponseEntity.ok(saved);
    }
    
    @DeleteMapping("/{sqlName}")
    public ResponseEntity<Void> deleteAllVersions(@PathVariable String sqlName) {
        sqlVersionService.deleteAllVersions(sqlName);
        return ResponseEntity.noContent().build();
    }
}
