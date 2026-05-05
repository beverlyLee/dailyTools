package com.smartcontract.contractreview.service;

import com.smartcontract.contractreview.dto.ContractReviewResult;
import com.smartcontract.contractreview.util.DocumentExtractor;
import com.smartcontract.contractreview.util.KeyClauseExtractor;
import com.smartcontract.contractreview.util.RiskAnalyzer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class ContractReviewService {

    private static final Logger logger = LoggerFactory.getLogger(ContractReviewService.class);

    @Autowired
    private DocumentExtractor documentExtractor;

    @Autowired
    private KeyClauseExtractor keyClauseExtractor;

    @Autowired
    private RiskAnalyzer riskAnalyzer;

    public ContractReviewResult reviewContract(MultipartFile file) throws IOException {
        logger.info("开始审查合同文件: {}", file.getOriginalFilename());
        
        // 1. 提取文档文本
        String text = documentExtractor.extractText(file);
        logger.info("成功提取文档文本，文本长度: {}", text.length());
        
        // 2. 提取关键条款
        List<ContractReviewResult.KeyClause> keyClauses = keyClauseExtractor.extractKeyClauses(text);
        logger.info("提取到 {} 个关键条款", keyClauses.size());
        
        // 3. 分析风险点
        List<ContractReviewResult.RiskPoint> riskPoints = riskAnalyzer.analyzeRisks(text);
        logger.info("分析到 {} 个风险点", riskPoints.size());
        
        // 4. 计算总体风险等级
        ContractReviewResult.RiskLevel overallRiskLevel = riskAnalyzer.calculateOverallRiskLevel(riskPoints);
        logger.info("总体风险等级: {}", overallRiskLevel);
        
        // 5. 生成审查意见书
        String reviewOpinion = riskAnalyzer.generateReviewOpinion(overallRiskLevel, riskPoints);
        logger.info("成功生成审查意见书");
        
        // 6. 构建审查结果
        ContractReviewResult result = new ContractReviewResult();
        result.setContractTitle(file.getOriginalFilename());
        result.setKeyClauses(keyClauses);
        result.setRiskPoints(riskPoints);
        result.setOverallRiskLevel(overallRiskLevel);
        result.setReviewOpinion(reviewOpinion);
        result.setTemplateComparisons(new ArrayList<>());
        
        // 7. 尝试提取合同基本信息
        extractContractBasicInfo(text, result);
        
        logger.info("合同审查完成，文件: {}", file.getOriginalFilename());
        return result;
    }

    private void extractContractBasicInfo(String text, ContractReviewResult result) {
        // 提取金额
        result.setAmount(keyClauseExtractor.extractAmount(text));
        
        // 提取合同类型（基于关键词匹配）
        if (text.contains("采购") || text.contains("购买") || text.contains("买卖")) {
            result.setContractType("采购合同");
        } else if (text.contains("租赁") || text.contains("出租")) {
            result.setContractType("租赁合同");
        } else if (text.contains("服务") || text.contains("咨询") || text.contains("技术")) {
            result.setContractType("服务合同");
        } else if (text.contains("借款") || text.contains("贷款")) {
            result.setContractType("借款合同");
        } else if (text.contains("建设") || text.contains("工程") || text.contains("施工")) {
            result.setContractType("建设工程合同");
        } else {
            result.setContractType("其他合同");
        }
    }

    public ContractReviewResult reviewContractWithTemplate(MultipartFile contractFile, MultipartFile templateFile) throws IOException {
        logger.info("开始与模板对比审查合同: {} vs {}", contractFile.getOriginalFilename(), templateFile.getOriginalFilename());
        
        // 1. 提取合同和模板文本
        String contractText = documentExtractor.extractText(contractFile);
        String templateText = documentExtractor.extractText(templateFile);
        
        // 2. 进行基础审查
        ContractReviewResult result = reviewContract(contractFile);
        
        // 3. 进行模板对比分析
        List<ContractReviewResult.TemplateComparison> comparisons = compareWithTemplate(contractText, templateText);
        result.setTemplateComparisons(comparisons);
        
        // 4. 更新审查意见书，添加模板对比信息
        updateReviewOpinionWithTemplate(result, comparisons);
        
        logger.info("模板对比审查完成");
        return result;
    }

    private List<ContractReviewResult.TemplateComparison> compareWithTemplate(String contractText, String templateText) {
        List<ContractReviewResult.TemplateComparison> comparisons = new ArrayList<>();
        
        // 简单的文本相似度对比（实际项目中可使用更复杂的NLP算法）
        // 这里只做简单的关键词对比示例
        
        // 检查关键条款是否缺失
        String[] keyTerms = {"金额", "价款", "期限", "有效期", "违约", "解除", "终止", "争议", "管辖", "仲裁", "诉讼"};
        
        for (String term : keyTerms) {
            boolean inTemplate = templateText.contains(term);
            boolean inContract = contractText.contains(term);
            
            if (inTemplate && !inContract) {
                ContractReviewResult.TemplateComparison comparison = new ContractReviewResult.TemplateComparison();
                comparison.setTemplateClause("模板中包含 \"" + term + "\" 相关条款");
                comparison.setContractClause("合同中未找到 \"" + term + "\" 相关条款");
                comparison.setDifference("合同缺少 \"" + term + "\" 相关条款");
                comparison.setSignificant(true);
                comparison.setRiskLevel(ContractReviewResult.RiskLevel.MEDIUM);
                comparisons.add(comparison);
            } else if (!inTemplate && inContract) {
                ContractReviewResult.TemplateComparison comparison = new ContractReviewResult.TemplateComparison();
                comparison.setTemplateClause("模板中未包含 \"" + term + "\" 相关条款");
                comparison.setContractClause("合同中包含 \"" + term + "\" 相关条款");
                comparison.setDifference("合同包含模板中没有的 \"" + term + "\" 条款");
                comparison.setSignificant(false);
                comparison.setRiskLevel(ContractReviewResult.RiskLevel.LOW);
                comparisons.add(comparison);
            }
        }
        
        // 检查文本相似度
        double similarity = calculateTextSimilarity(contractText, templateText);
        if (similarity < 0.5) {
            ContractReviewResult.TemplateComparison comparison = new ContractReviewResult.TemplateComparison();
            comparison.setTemplateClause("模板文本");
            comparison.setContractClause("合同文本");
            comparison.setDifference(String.format("合同与模板文本相似度较低 (%.1f%%)", similarity * 100));
            comparison.setSignificant(true);
            comparison.setRiskLevel(ContractReviewResult.RiskLevel.MEDIUM);
            comparisons.add(comparison);
        }
        
        return comparisons;
    }

    private double calculateTextSimilarity(String text1, String text2) {
        // 简单的文本相似度计算（实际项目中可使用更复杂的算法）
        if (text1 == null || text2 == null || text1.isEmpty() || text2.isEmpty()) {
            return 0.0;
        }
        
        // 这里使用简单的共同单词比例作为相似度
        String[] words1 = text1.split("\\s+");
        String[] words2 = text2.split("\\s+");
        
        int commonWords = 0;
        for (String word : words1) {
            for (String word2 : words2) {
                if (word.equals(word2)) {
                    commonWords++;
                    break;
                }
            }
        }
        
        int totalWords = Math.max(words1.length, words2.length);
        return totalWords > 0 ? (double) commonWords / totalWords : 0.0;
    }

    private void updateReviewOpinionWithTemplate(ContractReviewResult result, 
                                                   List<ContractReviewResult.TemplateComparison> comparisons) {
        if (comparisons == null || comparisons.isEmpty()) {
            return;
        }
        
        StringBuilder opinionBuilder = new StringBuilder(result.getReviewOpinion());
        
        opinionBuilder.append("\n\n### 模板对比分析\n");
        
        long significantDifferences = comparisons.stream()
            .filter(ContractReviewResult.TemplateComparison::isSignificant)
            .count();
        
        if (significantDifferences > 0) {
            opinionBuilder.append(String.format("**发现 %d 个重大差异**，建议重点关注：\n\n", significantDifferences));
        }
        
        for (int i = 0; i < comparisons.size(); i++) {
            ContractReviewResult.TemplateComparison comparison = comparisons.get(i);
            if (comparison.isSignificant()) {
                opinionBuilder.append(String.format("#### %d. %s\n", i + 1, comparison.getDifference()));
                opinionBuilder.append(String.format("- **风险等级**：%s\n", 
                    translateRiskLevel(comparison.getRiskLevel())));
                opinionBuilder.append(String.format("- **模板条款**：%s\n", comparison.getTemplateClause()));
                opinionBuilder.append(String.format("- **合同条款**：%s\n\n", comparison.getContractClause()));
            }
        }
        
        result.setReviewOpinion(opinionBuilder.toString());
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
