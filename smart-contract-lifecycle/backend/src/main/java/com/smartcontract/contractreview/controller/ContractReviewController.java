package com.smartcontract.contractreview.controller;

import com.smartcontract.contractreview.dto.ContractReviewResult;
import com.smartcontract.contractreview.service.ContractReviewService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/contract-review")
@Api(tags = "合同智能审查 API")
public class ContractReviewController {

    private static final Logger logger = LoggerFactory.getLogger(ContractReviewController.class);

    @Autowired
    private ContractReviewService contractReviewService;

    @PostMapping("/upload")
    @ApiOperation(value = "上传合同并进行智能审查", notes = "支持 PDF 和 Word 格式的合同文件")
    public ResponseEntity<Map<String, Object>> uploadAndReviewContract(
            @ApiParam(value = "合同文件", required = true) 
            @RequestParam("file") MultipartFile file) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 验证文件
            if (file == null || file.isEmpty()) {
                response.put("success", false);
                response.put("message", "文件不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null) {
                response.put("success", false);
                response.put("message", "文件名为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 验证文件格式
            String filename = originalFilename.toLowerCase();
            if (!filename.endsWith(".pdf") && !filename.endsWith(".docx") && !filename.endsWith(".doc")) {
                response.put("success", false);
                response.put("message", "不支持的文件格式，仅支持 PDF、DOCX、DOC 格式");
                return ResponseEntity.badRequest().body(response);
            }
            
            logger.info("开始审查合同文件: {}", originalFilename);
            
            // 执行合同审查
            ContractReviewResult result = contractReviewService.reviewContract(file);
            
            response.put("success", true);
            response.put("message", "合同审查完成");
            response.put("data", result);
            
            logger.info("合同审查完成: {}", originalFilename);
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            logger.error("文件读取失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "文件读取失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            logger.error("合同审查失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "合同审查失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/compare-with-template")
    @ApiOperation(value = "上传合同与模板进行对比审查", notes = "将合同文件与模板文件进行对比审查")
    public ResponseEntity<Map<String, Object>> compareWithTemplate(
            @ApiParam(value = "合同文件", required = true) 
            @RequestParam("contractFile") MultipartFile contractFile,
            @ApiParam(value = "模板文件", required = true) 
            @RequestParam("templateFile") MultipartFile templateFile) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            // 验证文件
            if (contractFile == null || contractFile.isEmpty()) {
                response.put("success", false);
                response.put("message", "合同文件不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (templateFile == null || templateFile.isEmpty()) {
                response.put("success", false);
                response.put("message", "模板文件不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 验证文件格式
            validateFileFormat(contractFile);
            validateFileFormat(templateFile);
            
            logger.info("开始对比审查: 合同 {} vs 模板 {}", 
                contractFile.getOriginalFilename(), templateFile.getOriginalFilename());
            
            // 执行对比审查
            ContractReviewResult result = contractReviewService.reviewContractWithTemplate(contractFile, templateFile);
            
            response.put("success", true);
            response.put("message", "合同对比审查完成");
            response.put("data", result);
            
            logger.info("对比审查完成");
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            logger.error("参数错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (IOException e) {
            logger.error("文件读取失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "文件读取失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        } catch (Exception e) {
            logger.error("对比审查失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "对比审查失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/health")
    @ApiOperation(value = "健康检查", notes = "检查服务是否正常运行")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "合同审查服务正常运行");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    private void validateFileFormat(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new IllegalArgumentException("文件名为空");
        }
        
        String filename = originalFilename.toLowerCase();
        if (!filename.endsWith(".pdf") && !filename.endsWith(".docx") && !filename.endsWith(".doc")) {
            throw new IllegalArgumentException(
                "不支持的文件格式: " + originalFilename + "，仅支持 PDF、DOCX、DOC 格式");
        }
    }
}
