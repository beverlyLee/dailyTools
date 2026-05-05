from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import re
import os

from .rule_engine import get_rule_engine, RuleEngine, rule_match_to_dict
from .format_checker import get_format_checker, FormatCheckerService
from .bert_service import get_bert_service, BaseBERTService, bert_result_to_dict
from ..config import settings


@dataclass
class CorrectionResult:
    rule_id: str
    rule_name: str
    category: str
    original_text: str
    suggested_text: Optional[str]
    position_start: int
    position_end: int
    explanation: str
    severity: str
    confidence: int
    source: str = "rule"


@dataclass
class PolishSuggestionResult:
    category: str
    original_phrase: str
    suggested_phrase: str
    position_start: int
    position_end: int
    explanation: str
    confidence: float


@dataclass
class ProofreadResult:
    text: str
    word_count: int
    character_count: int
    
    corrections: List[CorrectionResult] = field(default_factory=list)
    format_issues: Dict[str, Any] = field(default_factory=dict)
    polish_suggestions: List[PolishSuggestionResult] = field(default_factory=list)
    
    statistics: Dict[str, Any] = field(default_factory=dict)
    summary: str = ""


class ProofreadService:
    
    def __init__(
        self,
        rule_engine: Optional[RuleEngine] = None,
        format_checker: Optional[FormatCheckerService] = None,
        bert_service: Optional[BaseBERTService] = None
    ):
        self.rule_engine = rule_engine or get_rule_engine()
        self.format_checker = format_checker or get_format_checker()
        self.bert_service = bert_service or get_bert_service(
            use_real_bert=settings.USE_BERT_MODEL,
            model_path=settings.BERT_MODEL_PATH
        )
    
    def proofread(self, text: str, options: Optional[Dict[str, bool]] = None) -> ProofreadResult:
        options = options or {
            "check_rules": True,
            "check_format": True,
            "check_bert": True,
            "suggest_polish": True
        }
        
        word_count = self._count_words(text)
        character_count = len(text)
        
        result = ProofreadResult(
            text=text,
            word_count=word_count,
            character_count=character_count
        )
        
        if options.get("check_rules", True):
            rule_matches = self.rule_engine.run_all(text)
            for match in rule_matches:
                result.corrections.append(CorrectionResult(
                    rule_id=match.rule_id,
                    rule_name=match.rule_name,
                    category=match.category,
                    original_text=match.original_text,
                    suggested_text=match.suggested_text,
                    position_start=match.position_start,
                    position_end=match.position_end,
                    explanation=match.explanation,
                    severity=match.severity,
                    confidence=match.confidence,
                    source="rule"
                ))
        
        if options.get("check_format", True):
            result.format_issues = self.format_checker.check_all(text)
        
        if options.get("check_bert", True):
            try:
                political_checks = self.bert_service.check_political_terms(text)
                for check in political_checks:
                    result.corrections.append(CorrectionResult(
                        rule_id="BERT_POL_001",
                        rule_name="政治术语检查",
                        category=check.category,
                        original_text=check.original_text,
                        suggested_text=check.suggested_text,
                        position_start=check.position_start,
                        position_end=check.position_end,
                        explanation=check.explanation,
                        severity="major" if check.confidence > 0.8 else "warning",
                        confidence=int(check.confidence * 100),
                        source="bert"
                    ))
                
                grammar_checks = self.bert_service.check_grammar(text)
                for check in grammar_checks:
                    result.corrections.append(CorrectionResult(
                        rule_id="BERT_GRAM_001",
                        rule_name="语法搭配检查",
                        category=check.category,
                        original_text=check.original_text,
                        suggested_text=check.suggested_text,
                        position_start=check.position_start,
                        position_end=check.position_end,
                        explanation=check.explanation,
                        severity="minor",
                        confidence=int(check.confidence * 100),
                        source="bert"
                    ))
            except Exception as e:
                print(f"BERT检查出错: {e}")
        
        if options.get("suggest_polish", True):
            try:
                polish_results = self.bert_service.suggest_polishing(text)
                for r in polish_results:
                    result.polish_suggestions.append(PolishSuggestionResult(
                        category=r.category,
                        original_phrase=r.original_text,
                        suggested_phrase=r.suggested_text or r.original_text,
                        position_start=r.position_start,
                        position_end=r.position_end,
                        explanation=r.explanation,
                        confidence=r.confidence
                    ))
            except Exception as e:
                print(f"润色建议出错: {e}")
        
        result.corrections.sort(key=lambda c: c.position_start)
        result.statistics = self._generate_statistics(result)
        result.summary = self._generate_summary(result)
        
        return result
    
    def _count_words(self, text: str) -> int:
        chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
        english_words = len(re.findall(r'[a-zA-Z]+', text))
        return chinese_chars + english_words
    
    def _generate_statistics(self, result: ProofreadResult) -> Dict[str, Any]:
        category_counts = {}
        severity_counts = {"major": 0, "warning": 0, "minor": 0, "info": 0}
        
        for correction in result.corrections:
            category = correction.category
            category_counts[category] = category_counts.get(category, 0) + 1
            
            if correction.severity in severity_counts:
                severity_counts[correction.severity] += 1
        
        format_severity = {
            "major": len(result.format_issues.get("issues_by_severity", {}).get("major", [])),
            "warning": len(result.format_issues.get("issues_by_severity", {}).get("warning", [])),
            "minor": len(result.format_issues.get("issues_by_severity", {}).get("minor", [])),
            "info": len(result.format_issues.get("issues_by_severity", {}).get("info", [])),
        }
        
        for level, count in format_severity.items():
            severity_counts[level] += count
        
        return {
            "total_corrections": len(result.corrections),
            "total_format_issues": result.format_issues.get("total_issues", 0),
            "total_polish_suggestions": len(result.polish_suggestions),
            "category_distribution": category_counts,
            "severity_distribution": severity_counts,
            "word_count": result.word_count,
            "character_count": result.character_count
        }
    
    def _generate_summary(self, result: ProofreadResult) -> str:
        stats = result.statistics
        severity = stats.get("severity_distribution", {})
        
        parts = []
        
        major = severity.get("major", 0)
        warning = severity.get("warning", 0)
        minor = severity.get("minor", 0)
        
        if major > 0:
            parts.append(f"严重问题 {major} 个")
        if warning > 0:
            parts.append(f"警告 {warning} 个")
        if minor > 0:
            parts.append(f"次要问题 {minor} 个")
        
        polish_count = stats.get("total_polish_suggestions", 0)
        if polish_count > 0:
            parts.append(f"润色建议 {polish_count} 条")
        
        if not parts:
            return f"文档校对完成，共 {stats.get('word_count', 0)} 字，未发现明显问题。"
        
        return f"文档校对完成，共 {stats.get('word_count', 0)} 字，发现：{'、'.join(parts)}。"
    
    def apply_correction(self, text: str, correction: CorrectionResult) -> str:
        if correction.suggested_text is None:
            return text
        
        if correction.position_start < 0 or correction.position_end > len(text):
            return text
        
        return text[:correction.position_start] + correction.suggested_text + text[correction.position_end:]
    
    def apply_all_corrections(self, text: str, corrections: List[CorrectionResult]) -> str:
        sorted_corrections = sorted(corrections, key=lambda c: c.position_start, reverse=True)
        
        result = text
        for correction in sorted_corrections:
            if correction.suggested_text is not None:
                result = self.apply_correction(result, correction)
        
        return result


def proofread_result_to_dict(result: ProofreadResult) -> Dict[str, Any]:
    return {
        "text": result.text,
        "word_count": result.word_count,
        "character_count": result.character_count,
        "corrections": [
            {
                "rule_id": c.rule_id,
                "rule_name": c.rule_name,
                "category": c.category,
                "original_text": c.original_text,
                "suggested_text": c.suggested_text,
                "position_start": c.position_start,
                "position_end": c.position_end,
                "explanation": c.explanation,
                "severity": c.severity,
                "confidence": c.confidence,
                "source": c.source
            }
            for c in result.corrections
        ],
        "format_issues": result.format_issues,
        "polish_suggestions": [
            {
                "category": p.category,
                "original_phrase": p.original_phrase,
                "suggested_phrase": p.suggested_phrase,
                "position_start": p.position_start,
                "position_end": p.position_end,
                "explanation": p.explanation,
                "confidence": p.confidence
            }
            for p in result.polish_suggestions
        ],
        "statistics": result.statistics,
        "summary": result.summary
    }


def get_proofread_service() -> ProofreadService:
    return ProofreadService()
