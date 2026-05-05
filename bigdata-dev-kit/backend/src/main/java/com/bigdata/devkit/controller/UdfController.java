package com.bigdata.devkit.controller;

import com.bigdata.devkit.entity.UdfEntity;
import com.bigdata.devkit.service.UdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/udfs")
@RequiredArgsConstructor
public class UdfController {
    
    private final UdfService udfService;
    
    @GetMapping
    public ResponseEntity<List<UdfEntity>> getAllUdfs() {
        return ResponseEntity.ok(udfService.getAllUdfs());
    }
    
    @GetMapping("/enabled")
    public ResponseEntity<List<UdfEntity>> getEnabledUdfs() {
        return ResponseEntity.ok(udfService.getEnabledUdfs());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UdfEntity> getUdfById(@PathVariable Long id) {
        return udfService.getUdfById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/name/{functionName}")
    public ResponseEntity<UdfEntity> getUdfByName(@PathVariable String functionName) {
        return udfService.getUdfByName(functionName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<?> createUdf(@RequestBody UdfEntity udf) {
        try {
            UdfEntity saved = udfService.createUdf(udf);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUdf(@PathVariable Long id, @RequestBody UdfEntity udfDetails) {
        try {
            UdfEntity updated = udfService.updateUdf(id, udfDetails);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/{id}/toggle")
    public ResponseEntity<?> toggleUdf(@PathVariable Long id, @RequestParam boolean enabled) {
        try {
            UdfEntity updated = udfService.toggleUdf(id, enabled);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUdf(@PathVariable Long id) {
        udfService.deleteUdf(id);
        return ResponseEntity.noContent().build();
    }
}
