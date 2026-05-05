package com.smartcontract.entity;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_reviews")
public class ContractReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "contract_id")
    private Contract contract;

    @ManyToOne
    @JoinColumn(name = "template_id")
    private ContractTemplate template;

    @Column(name = "review_status")
    @Enumerated(EnumType.STRING)
    private ReviewStatus status;

    @Column(name = "risk_level")
    @Enumerated(EnumType.STRING)
    private RiskLevel riskLevel;

    @Column(name = "key_clauses", columnDefinition = "TEXT")
    private String keyClauses;

    @Column(name = "risk_points", columnDefinition = "TEXT")
    private String riskPoints;

    @Column(name = "review_opinion", columnDefinition = "TEXT")
    private String reviewOpinion;

    @Column(name = "review_report_path")
    private String reviewReportPath;

    @Column(name = "reviewer_id")
    private Long reviewerId;

    @Column(name = "reviewer_name")
    private String reviewerName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = ReviewStatus.PENDING;
        }
        if (riskLevel == null) {
            riskLevel = RiskLevel.UNKNOWN;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ReviewStatus {
        PENDING,      // 待审查
        PROCESSING,   // 审查中
        COMPLETED,    // 已完成
        FAILED        // 审查失败
    }

    public enum RiskLevel {
        UNKNOWN,  // 未知
        LOW,      // 低风险
        MEDIUM,   // 中风险
        HIGH      // 高风险
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

    public ContractTemplate getTemplate() {
        return template;
    }

    public void setTemplate(ContractTemplate template) {
        this.template = template;
    }

    public ReviewStatus getStatus() {
        return status;
    }

    public void setStatus(ReviewStatus status) {
        this.status = status;
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(RiskLevel riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getKeyClauses() {
        return keyClauses;
    }

    public void setKeyClauses(String keyClauses) {
        this.keyClauses = keyClauses;
    }

    public String getRiskPoints() {
        return riskPoints;
    }

    public void setRiskPoints(String riskPoints) {
        this.riskPoints = riskPoints;
    }

    public String getReviewOpinion() {
        return reviewOpinion;
    }

    public void setReviewOpinion(String reviewOpinion) {
        this.reviewOpinion = reviewOpinion;
    }

    public String getReviewReportPath() {
        return reviewReportPath;
    }

    public void setReviewReportPath(String reviewReportPath) {
        this.reviewReportPath = reviewReportPath;
    }

    public Long getReviewerId() {
        return reviewerId;
    }

    public void setReviewerId(Long reviewerId) {
        this.reviewerId = reviewerId;
    }

    public String getReviewerName() {
        return reviewerName;
    }

    public void setReviewerName(String reviewerName) {
        this.reviewerName = reviewerName;
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
