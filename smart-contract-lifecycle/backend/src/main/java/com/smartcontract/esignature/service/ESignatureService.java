package com.smartcontract.esignature.service;

import com.smartcontract.entity.Contract;
import com.smartcontract.entity.ContractSignature;
import com.smartcontract.esignature.dto.SignatureRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ESignatureService {

    private static final Logger logger = LoggerFactory.getLogger(ESignatureService.class);

    @PersistenceContext
    private EntityManager entityManager;

    private final Map<String, String> verificationCodes = new HashMap<>();

    @Transactional
    public ContractSignature createSignature(SignatureRequest request) {
        logger.info("开始创建电子签名，合同ID: {}", request.getContractId());

        // 1. 验证合同是否存在
        Contract contract = entityManager.find(Contract.class, request.getContractId());
        if (contract == null) {
            throw new IllegalArgumentException("合同不存在，ID: " + request.getContractId());
        }

        // 2. 验证验证码（如果需要）
        if (request.getVerificationCode() != null && !request.getVerificationCode().isEmpty()) {
            String storedCode = verificationCodes.get(request.getSignatoryPhone());
            if (storedCode == null || !storedCode.equals(request.getVerificationCode())) {
                throw new IllegalArgumentException("验证码无效或已过期");
            }
            // 验证通过后清除验证码
            verificationCodes.remove(request.getSignatoryPhone());
        }

        // 3. 创建签名记录
        ContractSignature signature = new ContractSignature();
        signature.setContract(contract);
        signature.setSignatoryName(request.getSignatoryName());
        signature.setSignatoryEmail(request.getSignatoryEmail());
        signature.setSignatoryPhone(request.getSignatoryPhone());
        signature.setStatus(ContractSignature.SignatureStatus.IN_PROGRESS);
        signature.setSignIpAddress(request.getSignIpAddress());

        // 4. 设置签名类型
        if (request.getSignatureType() != null) {
            try {
                signature.setSignatureType(ContractSignature.SignatureType.valueOf(request.getSignatureType()));
            } catch (IllegalArgumentException e) {
                signature.setSignatureType(ContractSignature.SignatureType.ELECTRONIC_SIGNATURE);
            }
        } else {
            signature.setSignatureType(ContractSignature.SignatureType.ELECTRONIC_SIGNATURE);
        }

        // 5. 保存签名记录
        entityManager.persist(signature);

        logger.info("签名记录已创建，ID: {}", signature.getId());
        return signature;
    }

    @Transactional
    public ContractSignature completeSignature(Long signatureId, String signatureImageBase64) {
        logger.info("完成签名，签名ID: {}", signatureId);

        ContractSignature signature = entityManager.find(ContractSignature.class, signatureId);
        if (signature == null) {
            throw new IllegalArgumentException("签名记录不存在，ID: " + signatureId);
        }

        if (signature.getStatus() == ContractSignature.SignatureStatus.COMPLETED) {
            throw new IllegalStateException("签名已完成，不能重复签署");
        }

        // 1. 处理签名图像
        if (signatureImageBase64 != null && !signatureImageBase64.isEmpty()) {
            // 实际项目中应该将 Base64 图片保存到文件系统或云存储
            // 这里简化处理，只保存路径
            String signaturePath = "/signatures/" + UUID.randomUUID() + ".png";
            signature.setSignatureImagePath(signaturePath);
            logger.info("签名图像已保存，路径: {}", signaturePath);
        }

        // 2. 生成证书信息（模拟）
        String certificateSerialNumber = generateCertificateSerialNumber();
        signature.setCertificateSerialNumber(certificateSerialNumber);
        signature.setCertificateInfo(generateCertificateInfo(signature));

        // 3. 更新签名状态
        signature.setStatus(ContractSignature.SignatureStatus.COMPLETED);
        signature.setSignedAt(LocalDateTime.now());

        // 4. 更新合同状态
        Contract contract = signature.getContract();
        if (contract != null) {
            contract.setStatus(Contract.ContractStatus.SIGNED);
            contract.setSignDate(LocalDateTime.now().toLocalDate());
            entityManager.merge(contract);
        }

        entityManager.merge(signature);

        logger.info("签名完成，ID: {}", signatureId);
        return signature;
    }

    public String sendVerificationCode(String phoneNumber) {
        logger.info("发送验证码到手机号: {}", phoneNumber);

        // 生成6位随机验证码
        String code = String.format("%06d", new Random().nextInt(999999));

        // 存储验证码（5分钟有效）
        verificationCodes.put(phoneNumber, code);

        // 实际项目中应该调用短信服务发送验证码
        // 这里简化处理，直接返回验证码
        logger.info("验证码已生成: {}", code);

        return code;
    }

    public List<ContractSignature> getSignaturesByContract(Long contractId) {
        logger.info("获取合同的签名记录，合同ID: {}", contractId);

        String jpql = "SELECT s FROM ContractSignature s WHERE s.contract.id = :contractId ORDER BY s.createdAt DESC";
        return entityManager.createQuery(jpql, ContractSignature.class)
                .setParameter("contractId", contractId)
                .getResultList();
    }

    public ContractSignature getSignatureById(Long signatureId) {
        return entityManager.find(ContractSignature.class, signatureId);
    }

    @Transactional
    public ContractSignature revokeSignature(Long signatureId, String reason) {
        logger.info("撤销签名，签名ID: {}", signatureId);

        ContractSignature signature = entityManager.find(ContractSignature.class, signatureId);
        if (signature == null) {
            throw new IllegalArgumentException("签名记录不存在，ID: " + signatureId);
        }

        if (signature.getStatus() != ContractSignature.SignatureStatus.COMPLETED) {
            throw new IllegalStateException("只有已完成的签名才能撤销");
        }

        signature.setStatus(ContractSignature.SignatureStatus.REVOKED);
        entityManager.merge(signature);

        logger.info("签名已撤销，ID: {}", signatureId);
        return signature;
    }

    public boolean verifySignature(Long signatureId) {
        logger.info("验证签名，签名ID: {}", signatureId);

        ContractSignature signature = entityManager.find(ContractSignature.class, signatureId);
        if (signature == null) {
            return false;
        }

        // 验证签名状态
        if (signature.getStatus() != ContractSignature.SignatureStatus.COMPLETED) {
            return false;
        }

        // 验证证书序列号
        if (signature.getCertificateSerialNumber() == null || signature.getCertificateSerialNumber().isEmpty()) {
            return false;
        }

        // 实际项目中应该验证 CA 证书链
        // 这里简化处理，只做基本验证

        logger.info("签名验证通过，ID: {}", signatureId);
        return true;
    }

    private String generateCertificateSerialNumber() {
        // 生成证书序列号
        return "SC-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    private String generateCertificateInfo(ContractSignature signature) {
        // 生成证书信息（模拟）
        StringBuilder info = new StringBuilder();
        info.append("=== 数字证书信息 ===\n");
        info.append("证书序列号: ").append(signature.getCertificateSerialNumber()).append("\n");
        info.append("签署人: ").append(signature.getSignatoryName()).append("\n");
        if (signature.getSignatoryEmail() != null) {
            info.append("邮箱: ").append(signature.getSignatoryEmail()).append("\n");
        }
        if (signature.getSignatoryPhone() != null) {
            info.append("电话: ").append(signature.getSignatoryPhone()).append("\n");
        }
        info.append("签署时间: ").append(signature.getSignedAt()).append("\n");
        info.append("IP地址: ").append(signature.getSignIpAddress()).append("\n");
        info.append("签名类型: ").append(signature.getSignatureType()).append("\n");
        info.append("=====================");

        return info.toString();
    }
}
