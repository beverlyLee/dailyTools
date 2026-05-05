package com.smartcontract.contractreview.util;

import com.smartcontract.contractreview.dto.ContractReviewResult;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class RiskAnalyzer {

    private static final Pattern UNFAIR_BREACH_PATTERN = Pattern.compile(
        "(?:甲方|乙方|一方)[^。]*?(?:不承担|免除|免责|不负责)[^。]*?责任",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern VAGUE_PAYMENT_PATTERN = Pattern.compile(
        "(?:付款|支付)[^。]*?(?:另行协商|双方商定|另行约定|根据实际情况)",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern UNFAIR_TERMINATION_PATTERN = Pattern.compile(
        "(?:甲方|乙方)[^。]*?(?:随时|单方面|单方)[^。]*?(?:解除|终止)",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern INVALID_DISPUTE_PATTERN = Pattern.compile(
        "(?:诉讼|仲裁)[^。]*?(?:甲方|乙方)[^。]*?(?:所在地|住所地)",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern MISSING_AMOUNT_PATTERN = Pattern.compile(
        "(?:金额|价款|价格)[^。]*?(?:另行协商|双方商定|另行约定)",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern MISSING_TERM_PATTERN = Pattern.compile(
        "(?:有效期|期限|租期)[^。]*?(?:另行协商|双方商定|另行约定)",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern EXCESSIVE_PENALTY_PATTERN = Pattern.compile(
        "(?:违约金|赔偿金|罚款)[^。]*?(?:20%|30%|50%|双倍|两倍|三倍)",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern NO_GUARANTEE_PATTERN = Pattern.compile(
        "(?:质量|保证|担保)[^。]*?(?:不保证|不担保|不承担)[^。]*?(?:责任|义务)",
        Pattern.CASE_INSENSITIVE
    );

    public List<ContractReviewResult.RiskPoint> analyzeRisks(String text) {
        List<ContractReviewResult.RiskPoint> riskPoints = new ArrayList<>();
        
        analyzeUnfairBreachClauses(text, riskPoints);
        analyzeVaguePaymentClauses(text, riskPoints);
        analyzeUnfairTerminationClauses(text, riskPoints);
        analyzeInvalidDisputeClauses(text, riskPoints);
        analyzeMissingAmountClauses(text, riskPoints);
        analyzeMissingTermClauses(text, riskPoints);
        analyzeExcessivePenaltyClauses(text, riskPoints);
        analyzeNoGuaranteeClauses(text, riskPoints);
        
        return riskPoints;
    }

    private void analyzeUnfairBreachClauses(String text, List<ContractReviewResult.RiskPoint> riskPoints) {
        Matcher matcher = UNFAIR_BREACH_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            ContractReviewResult.RiskPoint risk = new ContractReviewResult.RiskPoint();
            risk.setRiskType("不公平违约责任条款");
            risk.setDescription("发现可能存在的不公平违约责任条款：" + extractedText);
            risk.setRiskLevel(ContractReviewResult.RiskLevel.HIGH);
            risk.setSuggestion("建议审查该违约责任条款，确保双方责任对等，避免一方过度免责。");
            risk.setRelatedClause("违约责任");
            risk.setStartPosition(matcher.start());
            risk.setEndPosition(matcher.end());
            riskPoints.add(risk);
        }
    }

    private void analyzeVaguePaymentClauses(String text, List<ContractReviewResult.RiskPoint> riskPoints) {
        Matcher matcher = VAGUE_PAYMENT_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            ContractReviewResult.RiskPoint risk = new ContractReviewResult.RiskPoint();
            risk.setRiskType("模糊的付款条款");
            risk.setDescription("发现付款条款中存在模糊表述：" + extractedText);
            risk.setRiskLevel(ContractReviewResult.RiskLevel.MEDIUM);
            risk.setSuggestion("建议明确付款时间、金额和方式，避免使用模糊表述。");
            risk.setRelatedClause("付款条款");
            risk.setStartPosition(matcher.start());
            risk.setEndPosition(matcher.end());
            riskPoints.add(risk);
        }
    }

    private void analyzeUnfairTerminationClauses(String text, List<ContractReviewResult.RiskPoint> riskPoints) {
        Matcher matcher = UNFAIR_TERMINATION_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            ContractReviewResult.RiskPoint risk = new ContractReviewResult.RiskPoint();
            risk.setRiskType("不公平终止条款");
            risk.setDescription("发现可能存在的不公平终止条款：" + extractedText);
            risk.setRiskLevel(ContractReviewResult.RiskLevel.HIGH);
            risk.setSuggestion("建议审查合同终止条款，确保双方解除合同的权利对等。");
            risk.setRelatedClause("终止/解除条款");
            risk.setStartPosition(matcher.start());
            risk.setEndPosition(matcher.end());
            riskPoints.add(risk);
        }
    }

    private void analyzeInvalidDisputeClauses(String text, List<ContractReviewResult.RiskPoint> riskPoints) {
        Matcher matcher = INVALID_DISPUTE_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            ContractReviewResult.RiskPoint risk = new ContractReviewResult.RiskPoint();
            risk.setRiskType("可能无效的争议解决条款");
            risk.setDescription("争议解决条款可能存在管辖地约定问题：" + extractedText);
            risk.setRiskLevel(ContractReviewResult.RiskLevel.MEDIUM);
            risk.setSuggestion("建议审查争议解决条款，确保管辖地约定合法有效，考虑选择中立的仲裁机构或法院。");
            risk.setRelatedClause("争议解决条款");
            risk.setStartPosition(matcher.start());
            risk.setEndPosition(matcher.end());
            riskPoints.add(risk);
        }
    }

    private void analyzeMissingAmountClauses(String text, List<ContractReviewResult.RiskPoint> riskPoints) {
        Matcher matcher = MISSING_AMOUNT_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            ContractReviewResult.RiskPoint risk = new ContractReviewResult.RiskPoint();
            risk.setRiskType("金额条款不明确");
            risk.setDescription("合同金额条款存在不明确表述：" + extractedText);
            risk.setRiskLevel(ContractReviewResult.RiskLevel.HIGH);
            risk.setSuggestion("建议明确合同金额，避免使用模糊表述，确保金额具体可执行。");
            risk.setRelatedClause("金额条款");
            risk.setStartPosition(matcher.start());
            risk.setEndPosition(matcher.end());
            riskPoints.add(risk);
        }
    }

    private void analyzeMissingTermClauses(String text, List<ContractReviewResult.RiskPoint> riskPoints) {
        Matcher matcher = MISSING_TERM_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            ContractReviewResult.RiskPoint risk = new ContractReviewResult.RiskPoint();
            risk.setRiskType("期限条款不明确");
            risk.setDescription("合同期限条款存在不明确表述：" + extractedText);
            risk.setRiskLevel(ContractReviewResult.RiskLevel.MEDIUM);
            risk.setSuggestion("建议明确合同起止日期和有效期限，避免使用模糊表述。");
            risk.setRelatedClause("期限条款");
            risk.setStartPosition(matcher.start());
            risk.setEndPosition(matcher.end());
            riskPoints.add(risk);
        }
    }

    private void analyzeExcessivePenaltyClauses(String text, List<ContractReviewResult.RiskPoint> riskPoints) {
        Matcher matcher = EXCESSIVE_PENALTY_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            ContractReviewResult.RiskPoint risk = new ContractReviewResult.RiskPoint();
            risk.setRiskType("违约金比例过高");
            risk.setDescription("发现违约金比例可能过高：" + extractedText);
            risk.setRiskLevel(ContractReviewResult.RiskLevel.MEDIUM);
            risk.setSuggestion("建议审查违约金比例，根据合同法相关规定，违约金过高可能被法院调整，建议比例不超过实际损失的30%。");
            risk.setRelatedClause("违约金条款");
            risk.setStartPosition(matcher.start());
            risk.setEndPosition(matcher.end());
            riskPoints.add(risk);
        }
    }

    private void analyzeNoGuaranteeClauses(String text, List<ContractReviewResult.RiskPoint> riskPoints) {
        Matcher matcher = NO_GUARANTEE_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            ContractReviewResult.RiskPoint risk = new ContractReviewResult.RiskPoint();
            risk.setRiskType("质量保证条款缺失");
            risk.setDescription("发现可能存在的质量保证免责条款：" + extractedText);
            risk.setRiskLevel(ContractReviewResult.RiskLevel.HIGH);
            risk.setSuggestion("建议审查质量保证条款，确保供方承担合理的质量保证责任，避免过度免责。");
            risk.setRelatedClause("质量保证条款");
            risk.setStartPosition(matcher.start());
            risk.setEndPosition(matcher.end());
            riskPoints.add(risk);
        }
    }

    public ContractReviewResult.RiskLevel calculateOverallRiskLevel(List<ContractReviewResult.RiskPoint> riskPoints) {
        if (riskPoints == null || riskPoints.isEmpty()) {
            return ContractReviewResult.RiskLevel.LOW;
        }
        
        long highRiskCount = riskPoints.stream()
            .filter(r -> r.getRiskLevel() == ContractReviewResult.RiskLevel.HIGH)
            .count();
        
        long mediumRiskCount = riskPoints.stream()
            .filter(r -> r.getRiskLevel() == ContractReviewResult.RiskLevel.MEDIUM)
            .count();
        
        if (highRiskCount > 0) {
            return ContractReviewResult.RiskLevel.HIGH;
        } else if (mediumRiskCount > 0) {
            return ContractReviewResult.RiskLevel.MEDIUM;
        } else {
            return ContractReviewResult.RiskLevel.LOW;
        }
    }

    public String generateReviewOpinion(ContractReviewResult.RiskLevel overallRiskLevel, 
                                          List<ContractReviewResult.RiskPoint> riskPoints) {
        StringBuilder opinion = new StringBuilder();
        
        opinion.append("## 合同审查意见书\n\n");
        opinion.append("### 审查概述\n");
        opinion.append("本意见书基于对合同文本的自动分析生成，仅供参考，最终审查意见请以法律专业人士确认为准。\n\n");
        
        opinion.append("### 总体风险评估\n");
        switch (overallRiskLevel) {
            case HIGH:
                opinion.append("**高风险**：合同中发现多个高风险条款，建议慎重审查并与对方协商修改。\n\n");
                break;
            case MEDIUM:
                opinion.append("**中风险**：合同中存在一些需要关注的风险点，建议审查并考虑是否需要修改。\n\n");
                break;
            case LOW:
                opinion.append("**低风险**：合同未发现明显的高风险条款，整体较为规范。\n\n");
                break;
            default:
                opinion.append("**风险未知**：无法评估合同风险水平。\n\n");
        }
        
        if (riskPoints != null && !riskPoints.isEmpty()) {
            opinion.append("### 发现的风险点\n\n");
            
            for (int i = 0; i < riskPoints.size(); i++) {
                ContractReviewResult.RiskPoint risk = riskPoints.get(i);
                opinion.append(String.format("#### %d. %s\n", i + 1, risk.getRiskType()));
                opinion.append(String.format("- **风险等级**：%s\n", translateRiskLevel(risk.getRiskLevel())));
                opinion.append(String.format("- **描述**：%s\n", risk.getDescription()));
                opinion.append(String.format("- **建议**：%s\n\n", risk.getSuggestion()));
            }
        }
        
        opinion.append("### 审查建议\n");
        opinion.append("1. 请仔细审查所有标记的风险点，评估其对合同履行的影响。\n");
        opinion.append("2. 对于高风险条款，建议与对方协商修改，确保合同公平合理。\n");
        opinion.append("3. 建议咨询专业法律人士，获取正式的法律意见。\n");
        opinion.append("4. 保留所有修改记录和沟通证据，以备后续争议解决使用。\n\n");
        
        opinion.append("---\n");
        opinion.append("*本意见书由智能合同审查系统自动生成，仅供参考，不构成法律意见。*\n");
        
        return opinion.toString();
    }

    private String translateRiskLevel(ContractReviewResult.RiskLevel level) {
        switch (level) {
            case HIGH:
                return "高风险";
            case MEDIUM:
                return "中风险";
            case LOW:
                return "低风险";
            default:
                return "未知";
        }
    }
}
