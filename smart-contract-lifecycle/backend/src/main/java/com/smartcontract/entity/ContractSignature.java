package com.smartcontract.entity;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_signatures")
public class ContractSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "contract_id")
    private Contract contract;

    @Column(name = "signature_type")
    @Enumerated(EnumType.STRING)
    private SignatureType signatureType;

    @Column(name = "signatory_name")
    private String signatoryName;

    @Column(name = "signatory_email")
    private String signatoryEmail;

    @Column(name = "signatory_phone")
    private String signatoryPhone;

    @Column(name = "signature_status")
    @Enumerated(EnumType.STRING)
    private SignatureStatus status;

    @Column(name = "signature_image_path")
    private String signatureImagePath;

    @Column(name = "certificate_info", columnDefinition = "TEXT")
    private String certificateInfo;

    @Column(name = "certificate_serial_number")
    private String certificateSerialNumber;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @Column(name = "sign_ip_address")
    private String signIpAddress;

    @Column(name = "verification_code")
    private String verificationCode;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = SignatureStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum SignatureType {
        DIGITAL_SIGNATURE,  // 数字签名
        ELECTRONIC_SIGNATURE, // 电子签名
        HANDWRITTEN_SIGNATURE // 手写签名
    }

    public enum SignatureStatus {
        PENDING,      // 待签署
        IN_PROGRESS,  // 签署中
        COMPLETED,    // 已完成
        FAILED,       // 签署失败
        REVOKED       // 已撤销
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Contract getContract() {
        return contract;
    }

    public void setContract(Contract contract) {
        this.contract = contract;
    }

    public SignatureType getSignatureType() {
        return signatureType;
    }

    public void setSignatureType(SignatureType signatureType) {
        this.signatureType = signatureType;
    }

    public String getSignatoryName() {
        return signatoryName;
    }

    public void setSignatoryName(String signatoryName) {
        this.signatoryName = signatoryName;
    }

    public String getSignatoryEmail() {
        return signatoryEmail;
    }

    public void setSignatoryEmail(String signatoryEmail) {
        this.signatoryEmail = signatoryEmail;
    }

    public String getSignatoryPhone() {
        return signatoryPhone;
    }

    public void setSignatoryPhone(String signatoryPhone) {
        this.signatoryPhone = signatoryPhone;
    }

    public SignatureStatus getStatus() {
        return status;
    }

    public void setStatus(SignatureStatus status) {
        this.status = status;
    }

    public String getSignatureImagePath() {
        return signatureImagePath;
    }

    public void setSignatureImagePath(String signatureImagePath) {
        this.signatureImagePath = signatureImagePath;
    }

    public String getCertificateInfo() {
        return certificateInfo;
    }

    public void setCertificateInfo(String certificateInfo) {
        this.certificateInfo = certificateInfo;
    }

    public String getCertificateSerialNumber() {
        return certificateSerialNumber;
    }

    public void setCertificateSerialNumber(String certificateSerialNumber) {
        this.certificateSerialNumber = certificateSerialNumber;
    }

    public LocalDateTime getSignedAt() {
        return signedAt;
    }

    public void setSignedAt(LocalDateTime signedAt) {
        this.signedAt = signedAt;
    }

    public String getSignIpAddress() {
        return signIpAddress;
    }

    public void setSignIpAddress(String signIpAddress) {
        this.signIpAddress = signIpAddress;
    }

    public String getVerificationCode() {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
