package com.bigdata.devkit.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> result = new HashMap<>();
        result.put("status", "UP");
        result.put("service", "bigdata-dev-kit-backend");
        result.put("version", "1.0.0");
        result.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> result = new HashMap<>();
        result.put("name", "大数据处理开发套件后端");
        result.put("description", "管理计算资源的 Spring Boot 服务");
        result.put("features", new String[]{
            "批处理作业管理",
            "流处理 SQL 管理",
            "UDF 函数管理",
            "Executor 监控",
            "日志管理",
            "SQL 版本控制"
        });
        result.put("apis", new String[]{
            "/api/jobs - 作业管理",
            "/api/udfs - UDF 管理",
            "/api/executors - Executor 管理",
            "/api/logs - 日志管理",
            "/api/sql-versions - SQL 版本控制"
        });
        return ResponseEntity.ok(result);
    }
}
