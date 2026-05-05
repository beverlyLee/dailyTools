"""
安全扫描器模块
"""

import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class SecuritySeverity(Enum):
    """
    安全严重级别
    """
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'
    INFO = 'info'


@dataclass
class SecurityIssue:
    """
    安全问题数据类
    """
    message: str
    severity: SecuritySeverity
    file: str
    line: Optional[int] = None
    column: Optional[int] = None
    code: Optional[str] = None
    suggestion: Optional[str] = None
    category: str = 'general'
    cwe_id: Optional[str] = None


class SecurityScanner:
    """
    安全扫描器类
    """
    
    def __init__(self):
        """
        初始化安全扫描器
        """
        self._setup_patterns()
        self._setup_rules()
    
    def _setup_patterns(self):
        """
        设置正则表达式模式
        """
        self.patterns = {
            'sql_injection': re.compile(
                r'(?:execute|query|raw|cursor\.execute)\s*\(\s*[fF]?["\'].*?\{.*?\}.*?["\']|'
                r'(?:execute|query|raw|cursor\.execute)\s*\(\s*["\'].*?\%\s*\w+.*?["\']|'
                r'(?:execute|query|raw|cursor\.execute)\s*\(\s*["\'].*?\$\{.*?\}.*?["\']',
                re.IGNORECASE | re.DOTALL
            ),
            'xss_vulnerability': re.compile(
                r'(?:innerHTML|document\.write|eval|setTimeout|setInterval)\s*\(\s*.*?\+|'
                r'render\s*\(\s*.*?\{.*?\}.*?\)|'
                r'(?:dangerouslySetInnerHTML|innerHTML)\s*=',
                re.IGNORECASE
            ),
            'command_injection': re.compile(
                r'(?:os\.system|subprocess\.(?:call|run|Popen|check_output))\s*\([^)]*\+\s*["\']|'
                r'(?:os\.system|subprocess\.(?:call|run|Popen|check_output))\s*\([^)]*\%\s*\w+|'
                r'(?:os\.system|subprocess\.(?:call|run|Popen|check_output))\s*\([^)]*\$\{',
                re.IGNORECASE
            ),
            'path_traversal': re.compile(
                r'(?:open|read_file|write_file|os\.(?:open|listdir|walk))\s*\([^)]*\.\.\/|'
                r'(?:path\.(?:join|concat))\s*\([^)]*\.\.\\',
                re.IGNORECASE
            ),
            'insecure_deserialization': re.compile(
                r'(?:pickle|cPickle|yaml|marshal|shelve)\.(?:load|loads|unsafe_load)\s*\(',
                re.IGNORECASE
            ),
            'weak_crypto': re.compile(
                r'(?:md5|sha1|des|rc2|rc4|md4)\s*\(|'
                r'(?:hashlib\.(?:md5|sha1))\s*\(|'
                r'(?:cryptography\.hazmat\.primitives\.ciphers\.algorithms\.(?:DES|RC2|RC4|Blowfish))',
                re.IGNORECASE
            ),
            'hardcoded_secrets': re.compile(
                r'(?:password|passwd|pwd|secret|api_key|apikey|token|auth_token|access_token|private_key|credential)\s*[=:]\s*["\'][^"\']{4,}["\']',
                re.IGNORECASE
            ),
            'insecure_random': re.compile(
                r'(?:random\.(?:random|randint|choice|shuffle|sample))\s*\(',
                re.IGNORECASE
            ),
            'information_disclosure': re.compile(
                r'(?:print|console\.log|logger\.(?:debug|info|warn|error))\s*\([^)]*(?:traceback|stack|exception|error\s*message)',
                re.IGNORECASE
            ),
            'cors_misconfiguration': re.compile(
                r'(?:Access-Control-Allow-Origin|CORS_ORIGIN)\s*[=:]\s*["\']\*["\']',
                re.IGNORECASE
            ),
            'csrf_vulnerability': re.compile(
                r'(?:@csrf_exempt|csrf_exempt\s*\()|'
                r'(?:CSRF_COOKIE_SECURE|CSRF_COOKIE_HTTPONLY)\s*=\s*False',
                re.IGNORECASE
            ),
            'insecure_file_permissions': re.compile(
                r'(?:os\.chmod|chmod)\s*\([^)]*0o?777',
                re.IGNORECASE
            ),
            'eval_usage': re.compile(
                r'\beval\s*\(|'
                r'(?:exec|execfile)\s*\(',
                re.IGNORECASE
            ),
            'unsafe_yaml': re.compile(
                r'yaml\.(?:load|unsafe_load)\s*\(',
                re.IGNORECASE
            ),
            'subprocess_shell': re.compile(
                r'subprocess\.(?:call|run|Popen|check_output|check_call)\s*\([^)]*shell\s*=\s*True',
                re.IGNORECASE
            ),
        }
    
    def _setup_rules(self):
        """
        设置检测规则
        """
        self.rules = {
            'sql_injection': {
                'severity': SecuritySeverity.CRITICAL,
                'category': 'injection',
                'message': '发现潜在的 SQL 注入漏洞',
                'suggestion': '使用参数化查询或预编译语句，避免字符串拼接',
                'cwe_id': 'CWE-89'
            },
            'xss_vulnerability': {
                'severity': SecuritySeverity.HIGH,
                'category': 'xss',
                'message': '发现潜在的跨站脚本（XSS）漏洞',
                'suggestion': '对用户输入进行适当的转义和验证，使用安全的渲染方法',
                'cwe_id': 'CWE-79'
            },
            'command_injection': {
                'severity': SecuritySeverity.CRITICAL,
                'category': 'injection',
                'message': '发现潜在的命令注入漏洞',
                'suggestion': '避免使用用户输入构造命令，使用安全的 API 替代',
                'cwe_id': 'CWE-78'
            },
            'path_traversal': {
                'severity': SecuritySeverity.HIGH,
                'category': 'injection',
                'message': '发现潜在的路径遍历漏洞',
                'suggestion': '验证和规范化用户提供的文件路径，避免直接拼接',
                'cwe_id': 'CWE-22'
            },
            'insecure_deserialization': {
                'severity': SecuritySeverity.CRITICAL,
                'category': 'deserialization',
                'message': '发现不安全的反序列化',
                'suggestion': '避免反序列化不受信任的数据，使用安全的序列化格式如 JSON',
                'cwe_id': 'CWE-502'
            },
            'weak_crypto': {
                'severity': SecuritySeverity.HIGH,
                'category': 'cryptography',
                'message': '发现使用弱密码算法',
                'suggestion': '使用强密码算法如 SHA-256、AES-256 等',
                'cwe_id': 'CWE-327'
            },
            'hardcoded_secrets': {
                'severity': SecuritySeverity.CRITICAL,
                'category': 'sensitive_data',
                'message': '发现硬编码的敏感信息',
                'suggestion': '使用环境变量、密钥管理服务或加密的配置文件',
                'cwe_id': 'CWE-798'
            },
            'insecure_random': {
                'severity': SecuritySeverity.MEDIUM,
                'category': 'cryptography',
                'message': '发现使用不安全的随机数生成器',
                'suggestion': '对于安全相关的操作，使用 cryptographically secure 的随机数生成器',
                'cwe_id': 'CWE-338'
            },
            'information_disclosure': {
                'severity': SecuritySeverity.MEDIUM,
                'category': 'information_leak',
                'message': '发现潜在的信息泄露',
                'suggestion': '避免在生产环境中泄露敏感信息如堆栈跟踪',
                'cwe_id': 'CWE-200'
            },
            'cors_misconfiguration': {
                'severity': SecuritySeverity.MEDIUM,
                'category': 'configuration',
                'message': '发现 CORS 配置不当',
                'suggestion': '避免使用通配符 *，明确指定允许的来源',
                'cwe_id': 'CWE-942'
            },
            'csrf_vulnerability': {
                'severity': SecuritySeverity.HIGH,
                'category': 'csrf',
                'message': '发现潜在的 CSRF 漏洞',
                'suggestion': '启用 CSRF 保护，使用 CSRF 令牌',
                'cwe_id': 'CWE-352'
            },
            'insecure_file_permissions': {
                'severity': SecuritySeverity.MEDIUM,
                'category': 'configuration',
                'message': '发现不安全的文件权限设置',
                'suggestion': '使用最小权限原则，避免 777 权限',
                'cwe_id': 'CWE-276'
            },
            'eval_usage': {
                'severity': SecuritySeverity.CRITICAL,
                'category': 'code_execution',
                'message': '发现 eval() 函数使用',
                'suggestion': '避免使用 eval()，存在代码执行风险',
                'cwe_id': 'CWE-95'
            },
            'unsafe_yaml': {
                'severity': SecuritySeverity.HIGH,
                'category': 'deserialization',
                'message': '发现不安全的 YAML 加载',
                'suggestion': '使用 yaml.safe_load() 替代 yaml.load()',
                'cwe_id': 'CWE-502'
            },
            'subprocess_shell': {
                'severity': SecuritySeverity.HIGH,
                'category': 'injection',
                'message': '发现 subprocess 使用 shell=True',
                'suggestion': '避免使用 shell=True，使用列表形式的参数',
                'cwe_id': 'CWE-78'
            },
        }
    
    def scan(self, file_path: str, file_content: str) -> List[Dict[str, Any]]:
        """
        扫描安全漏洞
        
        Args:
            file_path: 文件路径
            file_content: 文件内容
            
        Returns:
            List[Dict[str, Any]]: 安全问题列表
        """
        issues: List[SecurityIssue] = []
        
        file_type = self._detect_file_type(file_path)
        
        issues.extend(self._scan_general_patterns(file_path, file_content))
        
        if file_type == 'python':
            issues.extend(self._scan_python_specific(file_path, file_content))
        elif file_type in ['javascript', 'typescript']:
            issues.extend(self._scan_javascript_specific(file_path, file_content))
        elif file_type == 'java':
            issues.extend(self._scan_java_specific(file_path, file_content))
        
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
            '.go': 'go',
            '.php': 'php',
            '.rb': 'ruby',
        }
        
        for ext, file_type in ext_map.items():
            if file_path.endswith(ext):
                return file_type
        
        return 'unknown'
    
    def _scan_general_patterns(self, file_path: str, content: str) -> List[SecurityIssue]:
        """
        扫描通用模式
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[SecurityIssue]: 安全问题列表
        """
        issues: List[SecurityIssue] = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            for rule_name, pattern in self.patterns.items():
                if rule_name in self.rules and pattern.search(line):
                    rule = self.rules[rule_name]
                    issues.append(SecurityIssue(
                        message=rule['message'],
                        severity=rule['severity'],
                        file=file_path,
                        line=line_num,
                        code=line.strip(),
                        suggestion=rule['suggestion'],
                        category=rule['category'],
                        cwe_id=rule.get('cwe_id')
                    ))
        
        return issues
    
    def _scan_python_specific(self, file_path: str, content: str) -> List[SecurityIssue]:
        """
        扫描 Python 特定安全问题
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[SecurityIssue]: 安全问题列表
        """
        issues: List[SecurityIssue] = []
        lines = content.split('\n')
        
        django_orm_injection = re.compile(
            r'(?:Model\.objects\.(?:filter|exclude|get))\s*\(\s*\w+__.*?=\s*\{',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if django_orm_injection.search(line):
                issues.append(SecurityIssue(
                    message='发现潜在的 Django ORM 注入',
                    severity=SecuritySeverity.HIGH,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion='避免使用字典展开传递查询参数，使用明确的参数传递',
                    category='injection',
                    cwe_id='CWE-89'
                ))
        
        flask_debug_mode = re.compile(
            r'(?:app\.debug\s*=\s*True|DEBUG\s*=\s*True)',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if flask_debug_mode.search(line):
                issues.append(SecurityIssue(
                    message='发现调试模式启用',
                    severity=SecuritySeverity.MEDIUM,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion='生产环境应禁用调试模式',
                    category='configuration',
                    cwe_id='CWE-215'
                ))
        
        return issues
    
    def _scan_javascript_specific(self, file_path: str, content: str) -> List[SecurityIssue]:
        """
        扫描 JavaScript 特定安全问题
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[SecurityIssue]: 安全问题列表
        """
        issues: List[SecurityIssue] = []
        lines = content.split('\n')
        
        insecure_prototype = re.compile(
            r'(?:__proto__|constructor\.prototype)\s*\[.*?\]\s*=',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if insecure_prototype.search(line):
                issues.append(SecurityIssue(
                    message='发现潜在的原型污染漏洞',
                    severity=SecuritySeverity.HIGH,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion='避免直接修改对象原型，使用 Object.create(null)',
                    category='injection',
                    cwe_id='CWE-1321'
                ))
        
        localstorage_sensitive = re.compile(
            r'(?:localStorage|sessionStorage)\.(?:setItem|set)\s*\([^)]*(?:password|token|secret|api_key)',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if localstorage_sensitive.search(line):
                issues.append(SecurityIssue(
                    message='发现敏感数据存储在本地存储',
                    severity=SecuritySeverity.MEDIUM,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion='避免在 localStorage 中存储敏感数据',
                    category='sensitive_data',
                    cwe_id='CWE-922'
                ))
        
        return issues
    
    def _scan_java_specific(self, file_path: str, content: str) -> List[SecurityIssue]:
        """
        扫描 Java 特定安全问题
        
        Args:
            file_path: 文件路径
            content: 文件内容
            
        Returns:
            List[SecurityIssue]: 安全问题列表
        """
        issues: List[SecurityIssue] = []
        lines = content.split('\n')
        
        java_serialization = re.compile(
            r'(?:ObjectInputStream|readObject|Serializable)',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if java_serialization.search(line):
                issues.append(SecurityIssue(
                    message='发现 Java 序列化使用',
                    severity=SecuritySeverity.HIGH,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion='Java 反序列化存在安全风险，考虑使用 JSON 等替代格式',
                    category='deserialization',
                    cwe_id='CWE-502'
                ))
        
        sql_concat = re.compile(
            r'(?:Statement|PreparedStatement).*?\+\s*["\']|'
            r'(?:executeQuery|executeUpdate)\s*\([^)]*\+',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, 1):
            if sql_concat.search(line):
                issues.append(SecurityIssue(
                    message='发现潜在的 SQL 注入',
                    severity=SecuritySeverity.CRITICAL,
                    file=file_path,
                    line=line_num,
                    code=line.strip(),
                    suggestion='使用 PreparedStatement 进行参数化查询',
                    category='injection',
                    cwe_id='CWE-89'
                ))
        
        return issues
    
    def _issue_to_dict(self, issue: SecurityIssue) -> Dict[str, Any]:
        """
        将安全问题转换为字典
        
        Args:
            issue: 安全问题对象
            
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
            'category': issue.category,
            'cwe_id': issue.cwe_id
        }
