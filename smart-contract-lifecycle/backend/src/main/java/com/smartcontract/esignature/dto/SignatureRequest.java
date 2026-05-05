package com.smartcontract.esignature.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

public class SignatureRequest {

    @NotNull(message = "合同ID不能为空")
    private Long contractId;

    @NotBlank(message = "签署人姓名不能为空")
    private String signatoryName;

    private String signatoryEmail;
    private String signatoryPhone;

    private String signatureType;

    private String verificationCode;

    private String signIpAddress;

    private String signatureImageBase64;

    public enum SignatureType {
        DIGITAL_SIGNATURE,
        ELECTRONIC_SIGNATURE,
        HANDWRITTEN_SIGNATURE
    }

    // Getters and Setters
    public Long getContractId() {
        return contractId;
    }

    public void setContractId(Long contractId) {
        this.contractId = contractId;
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

    public String getSignatureType() {
        return signatureType;
    }

    public void setSignatureType(String signatureType) {
        this.signatureType = signatureType;
    }

    public String getVerificationCode() {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode) {
        this.verificationCode = verificationCode;
    }

    public String getSignIpAddress() {
        return signIpAddress;
    }

    public void setSignIpAddress(String signIpAddress) {
        this.signIpAddress = signIpAddress;
    }

    public String getSignatureImageBase64() {
        return signatureImageBase64;
    }

    public void setSignatureImageBase64(String signatureImageBase64) {
        this.signatureImageBase64 = signatureImageBase64;
    }
}
