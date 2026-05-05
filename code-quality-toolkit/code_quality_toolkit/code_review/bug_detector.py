"""
Bug 检测器模块
"""

import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class BugSeverity(Enum):
    """
    Bug 严重级别
    """
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'


@dataclass
class BugIssue:
    """
    Bug 问题数据类
    """
    message: str
    severity: BugSeverity
    file: str
    line: Optional[int] = None
    column: Optional[int] = None
    code: Optional[str] = None
    suggestion: Optional[str] = None
    category: str = 'general'


class BugDetector:
    """
    Bug 检测器类
    """
    
    def __init__(self):
        """
        初始化 Bug 检测器
        """
        self._setup_patterns()
        self._setup_rules()
    
    def _setup_patterns(self):
        """
        设置正则表达式模式
        """
        self.patterns = {
            'null_comparison': re.compile(
                r'(?:==|!=)\s*(?:None|null|undefined|nil)',
                re.IGNORECASE
            ),
            'division_by_zero': re.compile(
                r'/\s*0(?:\.0+)?\b',
                re.IGNORECASE
            ),
            'infinite_loop': re.compile(
                r'(?:while\s+True|while\s+1|for\s*\(\s*;\s*;\s*\))',
                re.IGNORECASE
            ),
            'uninitialized_variable': re.compile(
                r'\b(\w+)\s*=\s*(?:None|null|undefined|nil)\b.*?\1\s*[+\-*/%=]',
                re.DOTALL | re.IGNORECASE
            ),
            'off_by_one': re.compile(
                r'(?:for|while)\s+\w+\s+in\s+range\s*\(\s*len\s*\(\s*\w+\s*\)\s*\)',
                re.IGNORECASE
            ),
            'race_condition': re.compile(
                r'(?:global|nonlocal)\s+\w+.*?(?:thread|Thread|async|await)',
                re.DOTALL | re.IGNORECASE
            ),
            'resource_leak': re.compile(
                r'(?:open|socket|connect)\s*\([^)]*\)(?!\s*\.close|\s*with\s+)',
                re.IGNORECASE
            ),
            'type_confusion': re.compile(
                r'(?:int|str|float|list|dict|tuple)\s*\(\s*\w+\s*\)\s*\.\s*(?:append|extend|add|update)',
                re.IGNORECASE
            ),
            'logic_error': re.compile(
                r'(?:if|elif|while)\s+not\s+not\s+',
                re.IGNORECASE
            ),
            'unreachable_code': re.compile(
                r'(?:return|break|continue|raise)\s*.*?\n\s*(?:if|for|while|def|class)',
                re.DOTALL
            ),
            'redundant_condition': re.compile(
                r'(?:if|elif)\s+\w+\s*(?:==|!=)\s+(?:True|False)',
                re.IGNORECASE
            ),
            'variable_shadowing': re.compile(
                r'\b(\w+)\s*=.*?\n\s*(?:def|for|if|while|with)\s+.*?\1\s*=',
                re.DOTALL
            ),
        }
    
    def _setup_rules(self):
        """
        设置检测规则
        """
        self.rules = {
            'null_comparison': {
                'severity': BugSeverity.LOW,
                'category': 'logic',
                'message': '发现潜在的空值比较问题',
                'suggestion': '考虑使用更明确的空值检查方式'
            },
            'division_by_zero': {
                'severity': BugSeverity.CRITICAL,
                'category': 'arithmetic',
                'message': '发现潜在的除零错误',
                'suggestion': '在除法操作前添加除数不为零的检查'
            },
            'infinite_loop': {
                'severity': BugSeverity.HIGH,
                'category': 'control_flow',
                'message': '发现潜在的无限循环',
                'suggestion': '确保循环有明确的退出条件'
            },
            'uninitialized_variable': {
                'severity': BugSeverity.HIGH,
                'category': 'variable',
                'message': '发现未初始化的变量使用',
                'suggestion': '确保变量在使用前已正确初始化'
            },
            'off_by_one': {
                'severity': BugSeverity.MEDIUM,
                'category': 'logic',
                'message': '发现潜在的边界错误（off-by-one）',
                'suggestion': '检查边界条件是否正确'
            },
            'race_condition': {
                'severity': BugSeverity.HIGH,
                'category': 'concurrency',
                'message': '发现潜在的竞态条件',
                'suggestion': '考虑使用锁或其他同步机制'
            },
            'resource_leak': {
                'severity': BugSeverity.MEDIUM,
                'category': 'resource',
                'message': '发现潜在的资源泄漏',
                'suggestion': '确保资源在使用后正确释放，建议使用 with 语句'
            },
            'type_confusion': {
                'severity': BugSeverity.HIGH,
                'category': 'type',
                'message': '发现类型混淆问题',
                'suggestion': '确保类型转换后的数据类型符合预期'
            },
            'logic_error': {
                'severity': BugSeverity.LOW,
                'category': 'logic',
                'message': '发现潜在的逻辑错误',
                'suggestion': '简化逻辑表达式以提高可读性'
            },
            'unreachable_code': {
                'severity': BugSeverity.MEDIUM,
                'category': 'control_flow',
                'message': '发现不可达代码',
                'suggestion': '删除或重构不可达的代码'
            },
            'redundant_condition': {
                'severity': BugSeverity.LOW,
                'category': 'style',
                'message': '发现冗余的条件判断',
                'suggestion': '简化条件判断，直接使用布尔值'
            },
            'variable_shadowing': {
                'severity': BugSeverity.MEDIUM,
                'category': 'variable',
                'message': '发现变量遮蔽',
                'suggestion': '避免在嵌套作用域中使用与外层相同的变量名'
            },
        }
    
    def detect(self, file_path: str, file_content: str) -> List[Dict[str, Any]]:
        """
        检测潜在的 Bug
        
        Args:
            file_path: 文件路径
            file_content: 文件内容
            
        Returns:
            List[Dict[str, Any]]: 检测到的 Bug 列表
        """
        issues: List[BugIssue] = []
        
        file_type = self._detect_file_type(file_path)
        
        issues.extend(self._detect_general_patterns(file_path, file_content))
        
        if file_type == 'python':
            issues.extend(self._detect_python_specific(file_path, file_content))
        elif file_type in ['javascript', 'typescript']:
            issues.extend(self._detect_javascript_specific(file_path, file_content))
        elif file_type == 'java':
            issues.extend(self._detect_java_specific(file_path, file_content))
        
        return [self._issue_to_dict(issue) for issue in issues]
    
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
        }
        
        for ext, file_type in ext_map.items():
            if file_path.endswith(ext):
                return file_type
        
        return 'unknown'
    
    def _detect_general_patterns(self, file_path: str, content: str) -> List[BugIssue]:
        """
        检测通用模式
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[BugIssue]: Bug 列表
        """
        issues: List[BugIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            for rule_name, pattern in self.patterns.items():
                if rule_name in self.rules and pattern.search(line):
                    rule = self.rules[rule_name]
                    issues.append(BugIssue(
                        message=rule['message'],
                        severity=rule['severity'],
                        file=file_path,
                        line=line_num,
                        code=line.strip(),
                        suggestion=rule['suggestion'],
                        category=rule['category']
                    ))
        
        return issues
    
    def _detect_python_specific(self, file_path: str, content: str) -> List[BugIssue]:
        """
        检测 Python 特定问题
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[BugIssue]: Bug 列表
        """
        issues: List[BugIssue] = []
        lines = content.split('\n')
        
        mutable_default_pattern = re.compile(
            r'def\s+\w+\s*\([^)]*=\s*(?:\[\]|\{\}|set\(\))',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if mutable_default_pattern.search(line):
                issues.append(BugIssue(
                    message='发现可变默认参数',
                    severity=BugSeverity.HIGH,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion='避免使用可变对象作为默认参数，使用 None 替代',
                    category='python_specific'
                ))
        
        attribute_error_pattern = re.compile(
            r'\.\w+\s*\(\s*\)\s*\.\w+',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if attribute_error_pattern.search(line):
                if not 'try' in line.lower() and not 'except' in line.lower():
                    issues.append(BugIssue(
                        message='发现潜在的属性错误风险',
                        severity=BugSeverity.MEDIUM,
                        file=file_path,
                        line=line_num,
                        code=line.strip(),
                        suggestion='链式调用可能导致属性错误，考虑添加空值检查',
                        category='python_specific'
                    ))
        
        return issues
    
    def _detect_javascript_specific(self, file_path: str, content: str) -> List[BugIssue]:
        """
        检测 JavaScript 特定问题
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[BugIssue]: Bug 列表
        """
        issues: List[BugIssue] = []
        lines = content.split('\n')
        
        loose_equality_pattern = re.compile(
            r'(?:==|!=)\s*(?:null|undefined|\d+|["\'][^"\']*["\'])',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if loose_equality_pattern.search(line):
                if '===' not in line and '!==' not in line:
                    issues.append(BugIssue(
                        message='发现松散相等比较',
                        severity=BugSeverity.LOW,
                        file=file_path,
                        line=line_num,
                        code=line.strip(),
                        suggestion='建议使用严格相等比较（=== 或 !==）',
                        category='javascript_specific'
                    ))
        
        hoisting_pattern = re.compile(
            r'(?:var|let|const)\s+\w+.*?\n\s*\1\s*=',
            re.DOTALL
        )
        
        if hoisting_pattern.search(content):
            issues.append(BugIssue(
                message='发现变量提升问题',
                severity=BugSeverity.MEDIUM,
                file=file_path,
                code='变量声明位置不当',
                suggestion='确保变量在使用前声明，建议使用 let 或 const 替代 var',
                category='javascript_specific'
            ))
        
        return issues
    
    def _detect_java_specific(self, file_path: str, content: str) -> List[BugIssue]:
        """
        检测 Java 特定问题
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[BugIssue]: Bug 列表
        """
        issues: List[BugIssue] = []
        lines = content.split('\n')
        
        null_pointer_pattern = re.compile(
            r'\.\w+\s*\(\s*\)\s*\.\w+',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if null_pointer_pattern.search(line):
                issues.append(BugIssue(
                    message='发现潜在的空指针异常风险',
                    severity=BugSeverity.HIGH,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion='链式调用可能导致空指针异常，考虑添加空值检查',
                    category='java_specific'
                ))
        
        resource_leak_pattern = re.compile(
            r'(?:new\s+(?:FileInputStream|FileOutputStream|Socket|Connection|Statement|ResultSet))\s*\([^)]*\)\s*;',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if resource_leak_pattern.search(line):
                if 'try' not in line.lower():
                    issues.append(BugIssue(
                        message='发现潜在的资源泄漏',
                        severity=BugSeverity.MEDIUM,
                        file=file_path,
                        line=line_num,
                        code=line.strip(),
                        suggestion='建议使用 try-with-resources 语句自动管理资源',
                        category='java_specific'
                    ))
        
        return issues
    
    def _issue_to_dict(self, issue: BugIssue) -> Dict[str, Any]:
        """
        将 Bug 问题转换为字典
        
        Args:
            issue: Bug 问题对象
            
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
            'suggestion': issue.suggestion,
            'category': issue.category
        }
