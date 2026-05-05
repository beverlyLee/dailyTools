"""
代码异味检测器模块
"""

import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class SmellSeverity(Enum):
    """
    代码异味严重级别
    """
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'


@dataclass
class CodeSmell:
    """
    代码异味数据类
    """
    message: str
    severity: SmellSeverity
    file: str
    line: Optional[int] = None
    column: Optional[int] = None
    code: Optional[str] = None
    suggestion: Optional[str] = None
    category: str = 'general'


class CodeSmellDetector:
    """
    代码异味检测器类
    """
    
    def __init__(self):
        """
        初始化代码异味检测器
        """
        self._setup_patterns()
        self._setup_rules()
    
    def _setup_patterns(self):
        """
        设置正则表达式模式
        """
        self.patterns = {
            'long_function': re.compile(
                r'(?:def|function|func|fn)\s+\w+\s*\([^)]*\)\s*:?.*?(?=^\s*(?:def|function|func|fn|class)\s|\Z)',
                re.DOTALL | re.MULTILINE
            ),
            'long_line': re.compile(
                r'^.{121,}$',
                re.MULTILINE
            ),
            'deep_nesting': re.compile(
                r'(?:if|elif|else|for|while|try|except|with|switch|case)\s+.*?:?\s*\n\s+(?:if|elif|else|for|while|try|except|with|switch|case)\s+.*?:?\s*\n\s+(?:if|elif|else|for|while|try|except|with|switch|case)\s+.*?:?\s*\n\s+(?:if|elif|else|for|while|try|except|with|switch|case)',
                re.MULTILINE
            ),
            'too_many_parameters': re.compile(
                r'(?:def|function|func|fn)\s+\w+\s*\((?:[^,]+,){4,}[^)]*\)',
                re.IGNORECASE
            ),
            'duplicate_code': re.compile(
                r'(.{60,}?)(?:\n\s*)+?\1',
                re.DOTALL
            ),
            'magic_numbers': re.compile(
                r'(?:if|elif|for|while|return|=|==|!=|<|>|<=|>=|\+|-|\*|/|%)\s*(?:[3-9]|[1-9]\d+)\b(?!\s*(?:\.|#|//|/\*|\))',
                re.MULTILINE
            ),
            'todo_comment': re.compile(
                r'(?:#|//|/\*)\s*(?:TODO|FIXME|HACK|XXX|BUG)\b',
                re.IGNORECASE
            ),
            'unused_variable': re.compile(
                r'(?:var|let|const|def|val|var)\s+(\w+)\s*[=:].*?(?<!\1)\s*\n(?!.*?\1)',
                re.DOTALL
            ),
            'dead_code': re.compile(
                r'(?:return|break|continue|raise|throw|exit)\s*.*?\n\s*(?:if|for|while|def|function|class|var|let|const)',
                re.DOTALL
            ),
            'primitive_obsession': re.compile(
                r'(?:str|int|float|bool|string|number|boolean)\s*\[\s*\]|'
                r'(?:dict|object|map|hash)\s*\[.*?\]\s*\[.*?\]',
                re.IGNORECASE
            ),
            'large_class': re.compile(
                r'(?:class|struct|interface)\s+\w+.*?(?=^\s*(?:class|struct|interface)\s|\Z)',
                re.DOTALL | re.MULTILINE
            ),
            'feature_envy': re.compile(
                r'\.\w+\s*\(\s*\)\s*\.\w+\s*\(\s*\)\s*\.\w+',
                re.IGNORECASE
            ),
            'inappropriate_intimacy': re.compile(
                r'self\._\w+|'
                r'this\._\w+|'
                r'(?:private|protected)\s+\w+',
                re.IGNORECASE
            ),
            'message_chains': re.compile(
                r'(?:\.\w+\s*\(\s*\)){3,}|'
                r'(?:\.\w+){4,}',
                re.IGNORECASE
            ),
            'middle_man': re.compile(
                r'(?:def|function)\s+\w+\s*\([^)]*\)\s*:?\s*\n\s*return\s+\w+\.\w+\s*\(',
                re.IGNORECASE
            ),
            'commented_out_code': re.compile(
                r'(?:#|//)\s*(?:def|function|class|if|for|while|return|import|require|var|let|const)\s+\w+',
                re.IGNORECASE
            ),
            'too_many_returns': re.compile(
                r'(?:def|function)\s+\w+.*?(?:return\s+.*?\n){3,}',
                re.DOTALL | re.IGNORECASE
            ),
            'nested_ternary': re.compile(
                r'\?.*?\?.*?:',
                re.MULTILINE
            ),
            'catch_and_ignore': re.compile(
                r'(?:except|catch)\s*(?:Exception|\w*Error)?\s*:\s*\n\s*(?:pass|continue|break|\s*#|//)',
                re.MULTILINE | re.IGNORECASE
            ),
        }
    
    def _setup_rules(self):
        """
        设置检测规则
        """
        self.rules = {
            'long_function': {
                'severity': SmellSeverity.MEDIUM,
                'category': 'size',
                'message': '函数过长',
                'suggestion': '考虑将长函数拆分为多个小函数'
            },
            'long_line': {
                'severity': SmellSeverity.LOW,
                'category': 'style',
                'message': '行过长',
                'suggestion': '考虑将长行拆分为多行'
            },
            'deep_nesting': {
                'severity': SmellSeverity.HIGH,
                'category': 'structure',
                'message': '嵌套过深',
                'suggestion': '考虑使用早返回、提取函数等方式减少嵌套'
            },
            'too_many_parameters': {
                'severity': SmellSeverity.MEDIUM,
                'category': 'size',
                'message': '参数过多',
                'suggestion': '考虑使用参数对象或构建器模式'
            },
            'duplicate_code': {
                'severity': SmellSeverity.HIGH,
                'category': 'maintainability',
                'message': '发现重复代码',
                'suggestion': '考虑提取公共代码到函数或类中'
            },
            'magic_numbers': {
                'severity': SmellSeverity.LOW,
                'category': 'readability',
                'message': '发现魔法数字',
                'suggestion': '考虑使用命名常量替代魔法数字'
            },
            'todo_comment': {
                'severity': SmellSeverity.LOW,
                'category': 'maintainability',
                'message': '发现待办事项注释',
                'suggestion': '建议及时处理 TODO/FIXME 项'
            },
            'dead_code': {
                'severity': SmellSeverity.MEDIUM,
                'category': 'maintainability',
                'message': '发现死代码',
                'suggestion': '删除或重构不可达的代码'
            },
            'primitive_obsession': {
                'severity': SmellSeverity.MEDIUM,
                'category': 'design',
                'message': '发现基本类型偏执',
                'suggestion': '考虑将相关的基本类型封装为对象'
            },
            'large_class': {
                'severity': SmellSeverity.HIGH,
                'category': 'size',
                'message': '类过大',
                'suggestion': '考虑将大类拆分为多个职责单一的小类'
            },
            'feature_envy': {
                'severity': SmellSeverity.MEDIUM,
                'category': 'design',
                'message': '发现特性依恋',
                'suggestion': '考虑将方法移到被频繁访问的类中'
            },
            'message_chains': {
                'severity': SmellSeverity.MEDIUM,
                'category': 'design',
                'message': '发现消息链',
                'suggestion': '考虑使用隐藏委托或提炼函数'
            },
            'middle_man': {
                'severity': SmellSeverity.LOW,
                'category': 'design',
                'message': '发现中间人',
                'suggestion': '考虑直接调用目标对象或移除中间人'
            },
            'commented_out_code': {
                'severity': SmellSeverity.LOW,
                'category': 'maintainability',
                'message': '发现被注释掉的代码',
                'suggestion': '删除不需要的注释代码，使用版本控制保留历史'
            },
            'too_many_returns': {
                'severity': SmellSeverity.MEDIUM,
                'category': 'control_flow',
                'message': '函数返回点过多',
                'suggestion': '考虑使用单一出口或提取条件'
            },
            'nested_ternary': {
                'severity': SmellSeverity.MEDIUM,
                'category': 'readability',
                'message': '发现嵌套的三元运算符',
                'suggestion': '考虑使用 if-else 语句提高可读性'
            },
            'catch_and_ignore': {
                'severity': SmellSeverity.HIGH,
                'category': 'error_handling',
                'message': '发现捕获并忽略异常',
                'suggestion': '至少记录日志或重新抛出异常'
            },
        }
    
    def detect(self, file_path: str, file_content: str) -> List[Dict[str, Any]]:
        """
        检测代码异味
        
        Args:
            file_path: 文件路径
            file_content: 文件内容
            
        Returns:
            List[Dict[str, Any]]: 代码异味列表
        """
        issues: List[CodeSmell] = []
        
        file_type = self._detect_file_type(file_path)
        
        issues.extend(self._detect_general_patterns(file_path, file_content))
        
        if file_type == 'python':
            issues.extend(self._detect_python_specific(file_path, file_content))
        elif file_type in ['javascript', 'typescript']:
            issues.extend(self._detect_javascript_specific(file_path, file_content))
        
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
    
    def _detect_general_patterns(self, file_path: str, content: str) -> List[CodeSmell]:
        """
        检测通用模式
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeSmell]: 代码异味列表
        """
        issues: List[CodeSmell] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if len(line) > 120:
                rule = self.rules['long_line']
                issues.append(CodeSmell(
                    message=rule['message'],
                    severity=rule['severity'],
                    file=file_path,
                    line=line_num,
                    code=line[:80] + '...' if len(line) > 80 else line,
                    suggestion=rule['suggestion'],
                    category=rule['category']
                ))
            
            if self.patterns['todo_comment'].search(line):
                rule = self.rules['todo_comment']
                issues.append(CodeSmell(
                    message=rule['message'],
                    severity=rule['severity'],
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion=rule['suggestion'],
                    category=rule['category']
                ))
            
            if self.patterns['commented_out_code'].search(line):
                rule = self.rules['commented_out_code']
                issues.append(CodeSmell(
                    message=rule['message'],
                    severity=rule['severity'],
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion=rule['suggestion'],
                    category=rule['category']
                ))
        
        if self.patterns['deep_nesting'].search(content):
            rule = self.rules['deep_nesting']
            issues.append(CodeSmell(
                message=rule['message'],
                severity=rule['severity'],
                file=file_path,
                code='嵌套层级过深',
                suggestion=rule['suggestion'],
                category=rule['category']
            ))
        
        if self.patterns['duplicate_code'].search(content):
            rule = self.rules['duplicate_code']
            issues.append(CodeSmell(
                message=rule['message'],
                severity=rule['severity'],
                file=file_path,
                code='发现重复代码块',
                suggestion=rule['suggestion'],
                category=rule['category']
            ))
        
        return issues
    
    def _detect_python_specific(self, file_path: str, content: str) -> List[CodeSmell]:
        """
        检测 Python 特定代码异味
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeSmell]: 代码异味列表
        """
        issues: List[CodeSmell] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['too_many_parameters'].search(line):
                rule = self.rules['too_many_parameters']
                issues.append(CodeSmell(
                    message=rule['message'],
                    severity=rule['severity'],
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion=rule['suggestion'],
                    category=rule['category']
                ))
            
            if self.patterns['catch_and_ignore'].search(line):
                rule = self.rules['catch_and_ignore']
                issues.append(CodeSmell(
                    message=rule['message'],
                    severity=rule['severity'],
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion=rule['suggestion'],
                    category=rule['category']
                ))
        
        function_pattern = re.compile(
            r'(?:^|\n)def\s+(\w+)\s*\([^)]*\)\s*:',
            re.MULTILINE
        )
        
        functions = function_pattern.findall(content)
        
        for func_name in functions:
            func_pattern = re.compile(
                rf'(?:^|\n)def\s+{func_name}\s*\([^)]*\)\s*:.*?(?=\n(?:def|class)\s|\Z)',
                re.DOTALL
            )
            
            func_match = func_pattern.search(content)
            if func_match:
                func_code = func_match.group(0)
                func_lines = func_code.count('\n')
                
                if func_lines > 50:
                    rule = self.rules['long_function']
                    issues.append(CodeSmell(
                        message=f"{rule['message']}: {func_name}",
                        severity=rule['severity'],
                        file=file_path,
                        code=f"函数 {func_name} 有 {func_lines} 行",
                        suggestion=rule['suggestion'],
                        category=rule['category']
                    ))
                
                return_count = func_code.count('\nreturn ') + func_code.count('\n    return ')
                if return_count > 5:
                    rule = self.rules['too_many_returns']
                    issues.append(CodeSmell(
                        message=f"{rule['message']}: {func_name}",
                        severity=rule['severity'],
                        file=file_path,
                        code=f"函数 {func_name} 有 {return_count} 个返回点",
                        suggestion=rule['suggestion'],
                        category=rule['category']
                    ))
        
        return issues
    
    def _detect_javascript_specific(self, file_path: str, content: str) -> List[CodeSmell]:
        """
        检测 JavaScript 特定代码异味
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[CodeSmell]: 代码异味列表
        """
        issues: List[CodeSmell] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            if self.patterns['nested_ternary'].search(line):
                rule = self.rules['nested_ternary']
                issues.append(CodeSmell(
                    message=rule['message'],
                    severity=rule['severity'],
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion=rule['suggestion'],
                    category=rule['category']
                ))
            
            if self.patterns['message_chains'].search(line):
                rule = self.rules['message_chains']
                issues.append(CodeSmell(
                    message=rule['message'],
                    severity=rule['severity'],
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion=rule['suggestion'],
                    category=rule['category']
                ))
        
        return issues
    
    def _issue_to_dict(self, issue: CodeSmell) -> Dict[str, Any]:
        """
        将代码异味转换为字典
        
        Args:
            issue: 代码异味对象
            
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
