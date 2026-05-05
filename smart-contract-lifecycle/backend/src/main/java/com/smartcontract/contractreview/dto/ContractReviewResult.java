package com.smartcontract.contractreview.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class ContractReviewResult {

    private String contractTitle;
    private String contractType;
    private BigDecimal amount;
    private LocalDate startDate;
    private LocalDate endDate;
    private String partyA;
    private String partyB;
    
    private List<KeyClause> keyClauses;
    private List<RiskPoint> riskPoints;
    private List<TemplateComparison> templateComparisons;
    private String reviewOpinion;
    private RiskLevel overallRiskLevel;
    
    public enum RiskLevel {
        UNKNOWN, LOW, MEDIUM, HIGH
    }
    
    public static class KeyClause {
        private String clauseType;
        private String content;
        private String extractedText;
        private int startPosition;
        private int endPosition;
        
        public KeyClause() {}
        
        public KeyClause(String clauseType, String content, String extractedText) {
            this.clauseType = clauseType;
            this.content = content;
            this.extractedText = extractedText;
        }
        
        // Getters and Setters
        public String getClauseType() {
            return clauseType;
        }
        
        public void setClauseType(String clauseType) {
            this.clauseType = clauseType;
        }
        
        public String getContent() {
            return content;
        }
        
        public void setContent(String content) {
            this.content = content;
        }
        
        public String getExtractedText() {
            return extractedText;
        }
        
        public void setExtractedText(String extractedText) {
            this.extractedText = extractedText;
        }
        
        public int getStartPosition() {
            return startPosition;
        }
        
        public void setStartPosition(int startPosition) {
            this.startPosition = startPosition;
        }
        
        public int getEndPosition() {
            return endPosition;
        }
        
        public void setEndPosition(int endPosition) {
            this.endPosition = endPosition;
        }
    }
    
    public static class RiskPoint {
        private String riskType;
        private String description;
        private RiskLevel riskLevel;
        private String suggestion;
        private String relatedClause;
        private int startPosition;
        private int endPosition;
        
        public RiskPoint() {}
        
        public RiskPoint(String riskType, String description, RiskLevel riskLevel, String suggestion) {
            this.riskType = riskType;
            this.description = description;
            this.riskLevel = riskLevel;
            this.suggestion = suggestion;
        }
        
        // Getters and Setters
        public String getRiskType() {
            return riskType;
        }
        
        public void setRiskType(String riskType) {
            this.riskType = riskType;
        }
        
        public String getDescription() {
            return description;
        }
        
        public void setDescription(String description) {
            this.description = description;
        }
        
        public RiskLevel getRiskLevel() {
            return riskLevel;
        }
        
        public void setRiskLevel(RiskLevel riskLevel) {
            this.riskLevel = riskLevel;
        }
        
        public String getSuggestion() {
            return suggestion;
        }
        
        public void setSuggestion(String suggestion) {
            this.suggestion = suggestion;
        }
        
        public String getRelatedClause() {
            return relatedClause;
        }
        
        public void setRelatedClause(String relatedClause) {
            this.relatedClause = relatedClause;
        }
        
        public int getStartPosition() {
            return startPosition;
        }
        
        public void setStartPosition(int startPosition) {
            this.startPosition = startPosition;
        }
        
        public int getEndPosition() {
            return endPosition;
        }
        
        public void setEndPosition(int endPosition) {
            this.endPosition = endPosition;
        }
    }
    
    public static class TemplateComparison {
        private String templateClause;
        private String contractClause;
        private String difference;
        private boolean isSignificant;
        private RiskLevel riskLevel;
        
        public TemplateComparison() {}
        
        public TemplateComparison(String templateClause, String contractClause, String difference, boolean isSignificant) {
            this.templateClause = templateClause;
            this.contractClause = contractClause;
            this.difference = difference;
            this.isSignificant = isSignificant;
        }
        
        // Getters and Setters
        public String getTemplateClause() {
            return templateClause;
        }
        
        public void setTemplateClause(String templateClause) {
            this.templateClause = templateClause;
        }
        
        public String getContractClause() {
            return contractClause;
        }
        
        public void setContractClause(String contractClause) {
            this.contractClause = contractClause;
        }
        
        public String getDifference() {
            return difference;
        }
        
        public void setDifference(String difference) {
            this.difference = difference;
        }
        
        public boolean isSignificant() {
            return isSignificant;
        }
        
        public void setSignificant(boolean significant) {
            isSignificant = significant;
        }
        
        public RiskLevel getRiskLevel() {
            return riskLevel;
        }
        
        public void setRiskLevel(RiskLevel riskLevel) {
            this.riskLevel = riskLevel;
        }
    }
    
    // Getters and Setters for ContractReviewResult
    public String getContractTitle() {
        return contractTitle;
    }
    
    public void setContractTitle(String contractTitle) {
        this.contractTitle = contractTitle;
    }
    
    public String getContractType() {
        return contractType;
    }
    
    public void setContractType(String contractType) {
        this.contractType = contractType;
    }
    
    public BigDecimal getAmount() {
        return amount;
    }
    
    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
    
    public LocalDate getStartDate() {
        return startDate;
    }
    
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }
    
    public LocalDate getEndDate() {
        return endDate;
    }
    
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
    
    public String getPartyA() {
        return partyA;
    }
    
    public void setPartyA(String partyA) {
        this.partyA = partyA;
    }
    
    public String getPartyB() {
        return partyB;
    }
    
    public void setPartyB(String partyB) {
        this.partyB = partyB;
    }
    
    public List<KeyClause> getKeyClauses() {
        return keyClauses;
    }
    
    public void setKeyClauses(List<KeyClause> keyClauses) {
        this.keyClauses = keyClauses;
    }
    
    public List<RiskPoint> getRiskPoints() {
        return riskPoints;
    }
    
    public void setRiskPoints(List<RiskPoint> riskPoints) {
        this.riskPoints = riskPoints;
    }
    
    public List<TemplateComparison> getTemplateComparisons() {
        return templateComparisons;
    }
    
    public void setTemplateComparisons(List<TemplateComparison> templateComparisons) {
        this.templateComparisons = templateComparisons;
    }
    
    public String getReviewOpinion() {
        return reviewOpinion;
    }
    
    public void setReviewOpinion(String reviewOpinion) {
        this.reviewOpinion = reviewOpinion;
    }
    
    public RiskLevel getOverallRiskLevel() {
        return overallRiskLevel;
    }
    
    public void setOverallRiskLevel(RiskLevel overallRiskLevel) {
        this.overallRiskLevel = overallRiskLevel;
    }
}
