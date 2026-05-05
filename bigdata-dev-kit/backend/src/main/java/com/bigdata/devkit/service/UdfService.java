package com.bigdata.devkit.service;

import com.bigdata.devkit.entity.UdfEntity;
import com.bigdata.devkit.repository.UdfRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UdfService {
    
    private final UdfRepository udfRepository;
    
    public List<UdfEntity> getAllUdfs() {
        return udfRepository.findAll();
    }
    
    public List<UdfEntity> getEnabledUdfs() {
        return udfRepository.findByIsEnabledTrueOrderByCreatedAtDesc();
    }
    
    public Optional<UdfEntity> getUdfById(Long id) {
        return udfRepository.findById(id);
    }
    
    public Optional<UdfEntity> getUdfByName(String functionName) {
        return udfRepository.findByFunctionName(functionName);
    }
    
    @Transactional
    public UdfEntity createUdf(UdfEntity udf) {
        if (udfRepository.findByFunctionName(udf.getFunctionName()).isPresent()) {
            throw new RuntimeException("UDF already exists with name: " + udf.getFunctionName());
        }
        return udfRepository.save(udf);
    }
    
    @Transactional
    public UdfEntity updateUdf(Long id, UdfEntity udfDetails) {
        return udfRepository.findById(id).map(udf -> {
            udf.setClassName(udfDetails.getClassName());
            udf.setType(udfDetails.getType());
            udf.setJarPath(udfDetails.getJarPath());
            udf.setJarName(udfDetails.getJarName());
            udf.setVersion(udfDetails.getVersion());
            udf.setDescription(udfDetails.getDescription());
            udf.setSourceCode(udfDetails.getSourceCode());
            udf.setIsEnabled(udfDetails.getIsEnabled());
            return udfRepository.save(udf);
        }).orElseThrow(() -> new RuntimeException("UDF not found: " + id));
    }
    
    @Transactional
    public UdfEntity toggleUdf(Long id, boolean enabled) {
        return udfRepository.findById(id).map(udf -> {
            udf.setIsEnabled(enabled);
            return udfRepository.save(udf);
        }).orElseThrow(() -> new RuntimeException("UDF not found: " + id));
    }
    
    @Transactional
    public void deleteUdf(Long id) {
        udfRepository.deleteById(id);
    }
}
