"""
代码分析器模块
"""

import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class Severity(Enum):
    """
    严重级别枚举
    """
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'
    INFO = 'info'


@dataclass
class CodeIssue:
    """
    代码问题数据类
    """
    message: str
    severity: Severity
    file: str
    line: Optional[int] = None
    column: Optional[int] = None
    code: Optional[str] = None
    suggestion: Optional[str] = None


class CodeAnalyzer:
    """
    代码分析器类
    """
    
    def __init__(self):
        """
        初始化代码分析器
        """
        self.analyzers = {
            'python': self._analyze_python,
            'javascript': self._analyze_javascript,
            'typescript': self._analyze_typescript,
            'java': self._analyze_java,
            'go': self._analyze_go,
            'c_cpp': self._analyze_c_cpp,
            'sql': self._analyze_sql,
            'shell': self._analyze_shell,
        }
        
        self._setup_patterns()
    
    def _setup_patterns(self):
        """
        设置正则表达式模式
        """
        self.patterns = {
            'print_statements': re.compile(r'\bprint\s*\(', re.IGNORECASE),
            'console_log': re.compile(r'console\.(log|error|warn|debug)\s*\('),
            'hardcoded_password': re.compile(
                r'(password|passwd|pwd|secret|api_key|apikey|token)\s*[=:]\s*["\'][^"\']+["\']',
                re.IGNORECASE
            ),
            'hardcoded_ip': re.compile(
                r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
            ),
            'todo_comment': re.compile(r'(?:#|//|/\*)\s*(?:TODO|FIXME|HACK|XXX)\b', re.IGNORECASE),
            'empty_except': re.compile(r'except\s*:\s*(?:#.*)?$', re.MULTILINE),
            'bare_except': re.compile(r'except\s*(?:Exception|\w*Error)?\s*:\s*pass', re.MULTILINE),
            'unused_import': re.compile(r'^import\s+\w+|^from\s+\w+\s+import\s+\w+', re.MULTILINE),
            'duplicate_code': re.compile(r'(.{50,})\1+', re.DOTALL),
            'long_function': re.compile(r'def\s+\w+\s*\([^)]*\)\s*:.*?(?=^def\s|\Z)', re.DOTALL | re.MULTILINE),
            'nested_loops': re.compile(r'(?:for|while)\s+.*?:\s*\n\s+(?:for|while)\s+', re.MULTILINE),
            'deep_nesting': re.compile(r'(?:if|elif|else|for|while|try|except|with)\s+.*?:\s*\n\s+(?:if|elif|else|for|while|try|except|with)\s+.*?:\s*\n\s+(?:if|elif|else|for|while|try|except|with)', re.MULTILINE),
            'sql_injection': re.compile(
                r'(?:execute|query|raw)\s*\(\s*f?["\'].*?\{.*?\}.*?["\']|'
                r'(?:execute|query|raw)\s*\(\s*["\'].*?\%\s*\w+.*?["\']',
                re.IGNORECASE | re.DOTALL
            ),
            'eval_usage': re.compile(r'\beval\s*\('),
            'exec_usage': re.compile(r'\bexec\s*\('),
            'pickle_usage': re.compile(r'\b(?:pickle|cPickle|yaml)\.(?:load|unsafe_load)\s*\('),
            'subprocess_shell': re.compile(r'subprocess\.(?:call|run|Popen)\s*\([^)]*shell\s*=\s*True'),
            'insecure_random': re.compile(r'\brandom\.(?:random|randint|choice|shuffle)\s*\('),
            'weak_hash': re.compile(r'\b(?:md5|sha1)\s*\('),
            'no_cors_headers': re.compile(r'Access-Control-Allow-Origin\s*:\s*\*'),
            'sensitive_data_log': re.compile(
                r'(?:log|logger|print)\s*\([^)]*(?:password|secret|token|api_key|credit_card|ssn)[^)]*\)',
                re.IGNORECASE
            ),
        }
    
    def analyze(self, file_path: str, file_content: str) -> Dict[str, Any]:
        """
        分析代码文件
        
        Args:
            file_path: 文件路径
            file_content: 文件内容
            
        Returns:
            Dict[str, Any]: 分析结果
        """
        issues: List[CodeIssue] = []
        
        file_type = self._detect_file_type(file_path)
        if file_type in self.analyzers:
            issues.extend(self.analyzers[file_type](file_path, file_content))
        
        issues.extend(self._analyze_common_patterns(file_path, file_content))
        
        quality_score = self._calculate_quality_score(issues)
        
        return {
            'issues': [self._issue_to_dict(issue) for issue in issues],
            'quality_score': quality_score,
            'file_type': file_type,
            'statistics': self._generate_statistics(issues)
        }
    
    def _detect_file_type(self, file_path: str) -> str:
        """
        检测文件类型
        
        Args:
            file_path: 文件路径
            
        Returns:
            str: 文件类型
        """
        ext_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.go': 'go',
            '.c': 'c_cpp',
            '.cpp': 'c_cpp',
            '.h': 'c_cpp',
            '.hpp': 'c_cpp',
            '.sql': 'sql',
            '.sh': 'shell',
            '.bash': 'shell',
        }
        
        for ext, file_type in ext_map.items():
            if file_path.endswith(ext):
                return file_type
        
        return 'unknown'
    
    def _analyze_python(self, file_path: str, content: str) -> List[CodeIssue]:
        """
        分析 Python 代码
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeIssue]: 问题列表
        """
        issues: List[CodeIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['print_statements'].search(line):
                issues.append(CodeIssue(
                    message="发现 print 语句，建议使用日志记录",
                    severity=Severity.LOW,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="考虑使用 logging 模块替代 print 语句"
                ))
            
            if self.patterns['hardcoded_password'].search(line):
                issues.append(CodeIssue(
                    message="发现硬编码的敏感信息",
                    severity=Severity.CRITICAL,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="使用环境变量或配置文件存储敏感信息"
                ))
            
            if self.patterns['todo_comment'].search(line):
                issues.append(CodeIssue(
                    message="发现待办事项注释",
                    severity=Severity.INFO,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="建议及时处理 TODO/FIXME 项"
                ))
        
        if self.patterns['empty_except'].search(content):
            issues.append(CodeIssue(
                message="发现空的 except 块",
                severity=Severity.HIGH,
                file=file_path,
                code="except:",
                suggestion="空的 except 块会隐藏错误，建议指定具体的异常类型并添加错误处理"
            ))
        
        if self.patterns['eval_usage'].search(content):
            issues.append(CodeIssue(
                message="发现 eval() 函数使用",
                severity=Severity.CRITICAL,
                file=file_path,
                code="eval(...)",
                suggestion="eval() 存在安全风险，建议使用更安全的替代方案"
            ))
        
        if self.patterns['pickle_usage'].search(content):
            issues.append(CodeIssue(
                message="发现不安全的反序列化",
                severity=Severity.CRITICAL,
                file=file_path,
                code="pickle.load(...)",
                suggestion="pickle.load() 存在代码执行风险，建议使用 JSON 或其他安全格式"
            ))
        
        if self.patterns['subprocess_shell'].search(content):
            issues.append(CodeIssue(
                message="发现 subprocess 启用了 shell=True",
                severity=Severity.HIGH,
                file=file_path,
                code="subprocess.call(..., shell=True)",
                suggestion="shell=True 存在命令注入风险，建议使用列表形式的参数"
            ))
        
        return issues
    
    def _analyze_javascript(self, file_path: str, content: str) -> List[CodeIssue]:
        """
        分析 JavaScript 代码
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeIssue]: 问题列表
        """
        issues: List[CodeIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['console_log'].search(line):
                issues.append(CodeIssue(
                    message="发现 console 调试语句",
                    severity=Severity.LOW,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="生产环境应移除 console.log 等调试语句"
                ))
            
            if self.patterns['hardcoded_password'].search(line):
                issues.append(CodeIssue(
                    message="发现硬编码的敏感信息",
                    severity=Severity.CRITICAL,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="使用环境变量或配置文件存储敏感信息"
                ))
        
        if self.patterns['eval_usage'].search(content):
            issues.append(CodeIssue(
                message="发现 eval() 函数使用",
                severity=Severity.CRITICAL,
                file=file_path,
                code="eval(...)",
                suggestion="eval() 存在安全风险，建议避免使用"
            ))
        
        return issues
    
    def _analyze_typescript(self, file_path: str, content: str) -> List[CodeIssue]:
        """
        分析 TypeScript 代码
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeIssue]: 问题列表
        """
        return self._analyze_javascript(file_path, content)
    
    def _analyze_java(self, file_path: str, content: str) -> List[CodeIssue]:
        """
        分析 Java 代码
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeIssue]: 问题列表
        """
        issues: List[CodeIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['hardcoded_password'].search(line):
                issues.append(CodeIssue(
                    message="发现硬编码的敏感信息",
                    severity=Severity.CRITICAL,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="使用环境变量或配置文件存储敏感信息"
                ))
        
        return issues
    
    def _analyze_go(self, file_path: str, content: str) -> List[CodeIssue]:
        """
        分析 Go 代码
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeIssue]: 问题列表
        """
        issues: List[CodeIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['hardcoded_password'].search(line):
                issues.append(CodeIssue(
                    message="发现硬编码的敏感信息",
                    severity=Severity.CRITICAL,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="使用环境变量或配置文件存储敏感信息"
                ))
        
        return issues
    
    def _analyze_c_cpp(self, file_path: str, content: str) -> List[CodeIssue]:
        """
        分析 C/C++ 代码
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeIssue]: 问题列表
        """
        issues: List[CodeIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['hardcoded_password'].search(line):
                issues.append(CodeIssue(
                    message="发现硬编码的敏感信息",
                    severity=Severity.CRITICAL,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="使用环境变量或配置文件存储敏感信息"
                ))
        
        return issues
    
    def _analyze_sql(self, file_path: str, content: str) -> List[CodeIssue]:
        """
        分析 SQL 代码
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeIssue]: 问题列表
        """
        issues: List[CodeIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['sql_injection'].search(line):
                issues.append(CodeIssue(
                    message="发现潜在的 SQL 注入风险",
                    severity=Severity.CRITICAL,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="使用参数化查询或预编译语句"
                ))
        
        return issues
    
    def _analyze_shell(self, file_path: str, content: str) -> List[CodeIssue]:
        """
        分析 Shell 脚本
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeIssue]: 问题列表
        """
        issues: List[CodeIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['hardcoded_password'].search(line):
                issues.append(CodeIssue(
                    message="发现硬编码的敏感信息",
                    severity=Severity.CRITICAL,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="使用环境变量存储敏感信息"
                ))
        
        return issues
    
    def _analyze_common_patterns(self, file_path: str, content: str) -> List[CodeIssue]:
        """
        分析通用模式
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeIssue]: 问题列表
        """
        issues: List[CodeIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['hardcoded_ip'].search(line):
                if not '127.0.0.1' in line and 'localhost' not in line.lower():
                    issues.append(CodeIssue(
                        message="发现硬编码的 IP 地址",
                        severity=Severity.MEDIUM,
                        file=file_path,
                        line=line_num,
                        code=line.strip(),
                        suggestion="考虑使用配置文件或环境变量管理 IP 地址"
                    ))
            
            if self.patterns['sensitive_data_log'].search(line):
                issues.append(CodeIssue(
                    message="发现敏感数据被记录到日志",
                    severity=Severity.HIGH,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion="避免在日志中记录密码、令牌等敏感信息"
                ))
        
        if self.patterns['weak_hash'].search(content):
            issues.append(CodeIssue(
                message="发现使用弱哈希算法",
                severity=Severity.HIGH,
                file=file_path,
                code="md5(...) or sha1(...)",
                suggestion="建议使用 SHA-256 或更强的哈希算法"
            ))
        
        if self.patterns['deep_nesting'].search(content):
            issues.append(CodeIssue(
                message="发现过深的嵌套结构",
                severity=Severity.MEDIUM,
                file=file_path,
                suggestion="考虑重构以减少嵌套层级，提高代码可读性"
            ))
        
        return issues
    
    def _calculate_quality_score(self, issues: List[CodeIssue]) -> float:
        """
        计算代码质量分数
        
        Args:
            issues: 问题列表
            
        Returns:
            float: 质量分数（0-100）
        """
        severity_weights = {
            Severity.CRITICAL: 10,
            Severity.HIGH: 5,
            Severity.MEDIUM: 2,
            Severity.LOW: 1,
            Severity.INFO: 0
        }
        
        total_weight = 0
        for issue in issues:
            total_weight += severity_weights.get(issue.severity, 0)
        
        base_score = 100
        penalty = min(total_weight * 2, 80)
        
        return max(base_score - penalty, 20)
    
    def _generate_statistics(self, issues: List[CodeIssue]) -> Dict[str, int]:
        """
        生成统计信息
        
        Args:
            issues: 问题列表
            
        Returns:
            Dict[str, int]: 统计信息
        """
        stats = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'info': 0,
            'total': len(issues)
        }
        
        for issue in issues:
            stats[issue.severity.value] += 1
        
        return stats
    
    def _issue_to_dict(self, issue: CodeIssue) -> Dict[str, Any]:
        """
        将问题对象转换为字典
        
        Args:
            issue: 问题对象
            
        Returns:
            Dict[str, Any]: 问题字典
        """
        return {
            'message': issue.message,
            'severity': issue.severity.value,
            'file': issue.file,
            'line': issue.line,
            'column': issue.column,
            'code': issue.code,
            'suggestion': issue.suggestion
        }
