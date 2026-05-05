package com.smartcontract.esignature.controller;

import com.smartcontract.entity.ContractSignature;
import com.smartcontract.esignature.dto.SignatureRequest;
import com.smartcontract.esignature.service.ESignatureService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/esignature")
@Api(tags = "电子签章 API")
public class ESignatureController {

    private static final Logger logger = LoggerFactory.getLogger(ESignatureController.class);

    @Autowired
    private ESignatureService eSignatureService;

    @PostMapping("/create")
    @ApiOperation(value = "创建电子签名", notes = "创建新的电子签名记录")
    public ResponseEntity<Map<String, Object>> createSignature(
            @ApiParam(value = "签名请求", required = true)
            @Valid @RequestBody SignatureRequest request) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("创建电子签名，合同ID: {}", request.getContractId());

            ContractSignature signature = eSignatureService.createSignature(request);

            response.put("success", true);
            response.put("message", "签名创建成功");
            response.put("data", signature);

            logger.info("签名创建成功，ID: {}", signature.getId());
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.error("参数错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("创建签名失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "创建签名失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/complete/{signatureId}")
    @ApiOperation(value = "完成签名", notes = "完成电子签名流程")
    public ResponseEntity<Map<String, Object>> completeSignature(
            @ApiParam(value = "签名ID", required = true)
            @PathVariable Long signatureId,
            @ApiParam(value = "签名图像（Base64编码）")
            @RequestBody(required = false) Map<String, String> body) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("完成签名，ID: {}", signatureId);

            String signatureImageBase64 = body != null ? body.get("signatureImageBase64") : null;
            ContractSignature signature = eSignatureService.completeSignature(signatureId, signatureImageBase64);

            response.put("success", true);
            response.put("message", "签名完成");
            response.put("data", signature);

            logger.info("签名完成，ID: {}", signatureId);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.error("参数错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (IllegalStateException e) {
            logger.error("状态错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        } catch (Exception e) {
            logger.error("完成签名失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "完成签名失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/send-verification-code")
    @ApiOperation(value = "发送验证码", notes = "发送短信验证码到指定手机号")
    public ResponseEntity<Map<String, Object>> sendVerificationCode(
            @ApiParam(value = "手机号", required = true)
            @RequestParam String phoneNumber) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("发送验证码到手机号: {}", phoneNumber);

            // 验证手机号格式
            if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
                throw new IllegalArgumentException("手机号不能为空");
            }

            String code = eSignatureService.sendVerificationCode(phoneNumber);

            response.put("success", true);
            response.put("message", "验证码已发送");
            // 实际项目中不应该返回验证码，这里仅用于演示
            response.put("verificationCode", code);

            logger.info("验证码已发送，手机号: {}", phoneNumber);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.error("参数错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("发送验证码失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "发送验证码失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/contract/{contractId}")
    @ApiOperation(value = "获取合同的签名记录", notes = "获取指定合同的所有签名记录")
    public ResponseEntity<Map<String, Object>> getSignaturesByContract(
            @ApiParam(value = "合同ID", required = true)
            @PathVariable Long contractId) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("获取合同的签名记录，合同ID: {}", contractId);

            List<ContractSignature> signatures = eSignatureService.getSignaturesByContract(contractId);

            response.put("success", true);
            response.put("message", "获取成功");
            response.put("data", signatures);
            response.put("total", signatures.size());

            logger.info("获取到 {} 条签名记录", signatures.size());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("获取签名记录失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "获取签名记录失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{signatureId}")
    @ApiOperation(value = "获取签名详情", notes = "获取指定签名的详细信息")
    public ResponseEntity<Map<String, Object>> getSignatureById(
            @ApiParam(value = "签名ID", required = true)
            @PathVariable Long signatureId) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("获取签名详情，ID: {}", signatureId);

            ContractSignature signature = eSignatureService.getSignatureById(signatureId);

            if (signature == null) {
                response.put("success", false);
                response.put("message", "签名记录不存在");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            response.put("success", true);
            response.put("message", "获取成功");
            response.put("data", signature);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("获取签名详情失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "获取签名详情失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/verify/{signatureId}")
    @ApiOperation(value = "验证签名", notes = "验证电子签名的有效性")
    public ResponseEntity<Map<String, Object>> verifySignature(
            @ApiParam(value = "签名ID", required = true)
            @PathVariable Long signatureId) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("验证签名，ID: {}", signatureId);

            boolean isValid = eSignatureService.verifySignature(signatureId);

            response.put("success", true);
            response.put("message", isValid ? "签名有效" : "签名无效");
            response.put("isValid", isValid);

            logger.info("签名验证结果: {}", isValid ? "有效" : "无效");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("验证签名失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "验证签名失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/revoke/{signatureId}")
    @ApiOperation(value = "撤销签名", notes = "撤销已完成的电子签名")
    public ResponseEntity<Map<String, Object>> revokeSignature(
            @ApiParam(value = "签名ID", required = true)
            @PathVariable Long signatureId,
            @ApiParam(value = "撤销原因")
            @RequestBody(required = false) Map<String, String> body) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("撤销签名，ID: {}", signatureId);

            String reason = body != null ? body.get("reason") : null;
            ContractSignature signature = eSignatureService.revokeSignature(signatureId, reason);

            response.put("success", true);
            response.put("message", "签名已撤销");
            response.put("data", signature);

            logger.info("签名已撤销，ID: {}", signatureId);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.error("参数错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (IllegalStateException e) {
            logger.error("状态错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        } catch (Exception e) {
            logger.error("撤销签名失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "撤销签名失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/health")
    @ApiOperation(value = "健康检查", notes = "检查服务是否正常运行")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "电子签章服务正常运行");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }
}
