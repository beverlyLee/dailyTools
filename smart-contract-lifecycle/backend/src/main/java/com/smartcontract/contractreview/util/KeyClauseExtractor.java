package com.smartcontract.contractreview.util;

import com.smartcontract.contractreview.dto.ContractReviewResult;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class KeyClauseExtractor {

    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
        "(?:金额|价款|价格|总额|总价|人民币|￥|¥)\\s*[:：]?\\s*([\\d,，.]+)(?:元|人民币|圆|整)?",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern DATE_PATTERN = Pattern.compile(
        "(?:\\d{4})[年/-]\\s*(?:\\d{1,2})[月/-]\\s*(?:\\d{1,2})[日号]?",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern PARTY_PATTERN = Pattern.compile(
        "(?:甲方|乙方|供方|需方|买方|卖方|出租方|承租方)[:：\\s]*([^\\n\\r，,；;。]+)",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern TERM_PATTERN = Pattern.compile(
        "(?:有效期|期限|租期|合同期|履行期)\\s*[:：]?\\s*([^\\n\\r。]+)",
        Pattern.CASE_INSENSITIVE
    );
    
    private static final Pattern BREACH_PATTERN = Pattern.compile(
        "(?:违约|违约责任|违约条款|违约赔偿)[：:：]*([^。]+。)",
        Pattern.CASE_INSENSITIVE | Pattern.DOTALL
    );
    
    private static final Pattern PAYMENT_PATTERN = Pattern.compile(
        "(?:付款|支付|结算|付款方式)[：:：]*([^。]+。)",
        Pattern.CASE_INSENSITIVE | Pattern.DOTALL
    );
    
    private static final Pattern TERMINATION_PATTERN = Pattern.compile(
        "(?:解除|终止|解除合同|终止合同)[：:：]*([^。]+。)",
        Pattern.CASE_INSENSITIVE | Pattern.DOTALL
    );
    
    private static final Pattern DISPUTE_PATTERN = Pattern.compile(
        "(?:争议|纠纷|管辖|诉讼|仲裁)[：:：]*([^。]+。)",
        Pattern.CASE_INSENSITIVE | Pattern.DOTALL
    );

    public List<ContractReviewResult.KeyClause> extractKeyClauses(String text) {
        List<ContractReviewResult.KeyClause> keyClauses = new ArrayList<>();
        
        extractAmountClause(text, keyClauses);
        extractDateClause(text, keyClauses);
        extractPartyClause(text, keyClauses);
        extractTermClause(text, keyClauses);
        extractBreachClause(text, keyClauses);
        extractPaymentClause(text, keyClauses);
        extractTerminationClause(text, keyClauses);
        extractDisputeClause(text, keyClauses);
        
        return keyClauses;
    }

    private void extractAmountClause(String text, List<ContractReviewResult.KeyClause> keyClauses) {
        Matcher matcher = AMOUNT_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            String amountStr = matcher.group(1).replaceAll("[,，]", "");
            
            try {
                BigDecimal amount = new BigDecimal(amountStr);
                ContractReviewResult.KeyClause clause = new ContractReviewResult.KeyClause();
                clause.setClauseType("金额条款");
                clause.setContent("合同金额: " + amount);
                clause.setExtractedText(extractedText);
                clause.setStartPosition(matcher.start());
                clause.setEndPosition(matcher.end());
                keyClauses.add(clause);
            } catch (NumberFormatException e) {
                // 忽略格式错误的金额
            }
        }
    }

    private void extractDateClause(String text, List<ContractReviewResult.KeyClause> keyClauses) {
        Matcher matcher = DATE_PATTERN.matcher(text);
        int count = 0;
        while (matcher.find() && count < 5) {
            String dateStr = matcher.group();
            ContractReviewResult.KeyClause clause = new ContractReviewResult.KeyClause();
            clause.setClauseType("日期条款");
            clause.setContent("合同日期: " + dateStr);
            clause.setExtractedText(dateStr);
            clause.setStartPosition(matcher.start());
            clause.setEndPosition(matcher.end());
            keyClauses.add(clause);
            count++;
        }
    }

    private void extractPartyClause(String text, List<ContractReviewResult.KeyClause> keyClauses) {
        Matcher matcher = PARTY_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            String partyName = matcher.group(1).trim();
            
            if (partyName.length() > 0 && partyName.length() < 100) {
                ContractReviewResult.KeyClause clause = new ContractReviewResult.KeyClause();
                clause.setClauseType("合同主体");
                clause.setContent("合同主体: " + partyName);
                clause.setExtractedText(extractedText);
                clause.setStartPosition(matcher.start());
                clause.setEndPosition(matcher.end());
                keyClauses.add(clause);
            }
        }
    }

    private void extractTermClause(String text, List<ContractReviewResult.KeyClause> keyClauses) {
        Matcher matcher = TERM_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            String termContent = matcher.group(1).trim();
            
            if (termContent.length() > 0) {
                ContractReviewResult.KeyClause clause = new ContractReviewResult.KeyClause();
                clause.setClauseType("期限条款");
                clause.setContent("合同期限: " + termContent);
                clause.setExtractedText(extractedText);
                clause.setStartPosition(matcher.start());
                clause.setEndPosition(matcher.end());
                keyClauses.add(clause);
            }
        }
    }

    private void extractBreachClause(String text, List<ContractReviewResult.KeyClause> keyClauses) {
        Matcher matcher = BREACH_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            String breachContent = matcher.group(1).trim();
            
            if (breachContent.length() > 0 && breachContent.length() < 500) {
                ContractReviewResult.KeyClause clause = new ContractReviewResult.KeyClause();
                clause.setClauseType("违约条款");
                clause.setContent("违约责任: " + breachContent);
                clause.setExtractedText(extractedText);
                clause.setStartPosition(matcher.start());
                clause.setEndPosition(matcher.end());
                keyClauses.add(clause);
            }
        }
    }

    private void extractPaymentClause(String text, List<ContractReviewResult.KeyClause> keyClauses) {
        Matcher matcher = PAYMENT_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            String paymentContent = matcher.group(1).trim();
            
            if (paymentContent.length() > 0 && paymentContent.length() < 500) {
                ContractReviewResult.KeyClause clause = new ContractReviewResult.KeyClause();
                clause.setClauseType("付款条款");
                clause.setContent("付款方式: " + paymentContent);
                clause.setExtractedText(extractedText);
                clause.setStartPosition(matcher.start());
                clause.setEndPosition(matcher.end());
                keyClauses.add(clause);
            }
        }
    }

    private void extractTerminationClause(String text, List<ContractReviewResult.KeyClause> keyClauses) {
        Matcher matcher = TERMINATION_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            String terminationContent = matcher.group(1).trim();
            
            if (terminationContent.length() > 0 && terminationContent.length() < 500) {
                ContractReviewResult.KeyClause clause = new ContractReviewResult.KeyClause();
                clause.setClauseType("解除/终止条款");
                clause.setContent("合同解除/终止: " + terminationContent);
                clause.setExtractedText(extractedText);
                clause.setStartPosition(matcher.start());
                clause.setEndPosition(matcher.end());
                keyClauses.add(clause);
            }
        }
    }

    private void extractDisputeClause(String text, List<ContractReviewResult.KeyClause> keyClauses) {
        Matcher matcher = DISPUTE_PATTERN.matcher(text);
        while (matcher.find()) {
            String extractedText = matcher.group();
            String disputeContent = matcher.group(1).trim();
            
            if (disputeContent.length() > 0 && disputeContent.length() < 500) {
                ContractReviewResult.KeyClause clause = new ContractReviewResult.KeyClause();
                clause.setClauseType("争议解决条款");
                clause.setContent("争议解决: " + disputeContent);
                clause.setExtractedText(extractedText);
                clause.setStartPosition(matcher.start());
                clause.setEndPosition(matcher.end());
                keyClauses.add(clause);
            }
        }
    }

    public BigDecimal extractAmount(String text) {
        Matcher matcher = AMOUNT_PATTERN.matcher(text);
        if (matcher.find()) {
            String amountStr = matcher.group(1).replaceAll("[,，]", "");
            try {
                return new BigDecimal(amountStr);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    public LocalDate parseDate(String dateStr) {
        DateTimeFormatter[] formatters = {
            DateTimeFormatter.ofPattern("yyyy年MM月dd日"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd"),
            DateTimeFormatter.ofPattern("yyyy.MM.dd")
        };
        
        for (DateTimeFormatter formatter : formatters) {
            try {
                return LocalDate.parse(dateStr.replaceAll("[年月日/-]", "-"), formatter);
            } catch (DateTimeParseException e) {
                // 尝试下一个格式
            }
        }
        return null;
    }
}
