"""
代码审查模块
"""

from .analyzer import CodeAnalyzer
from .git_integration import GitIntegration
from .bug_detector import BugDetector
from .security_scanner import SecurityScanner
from .code_smell_detector import CodeSmellDetector
from .report_generator import ReportGenerator


class CodeReviewer:
    """
    代码审查主类
    """
    
    def __init__(self, repo_path=None):
        """
        初始化代码审查器
        
        Args:
            repo_path: Git 仓库路径，默认为当前目录
        """
        self.repo_path = repo_path or '.'
        self.git_integration = GitIntegration(self.repo_path)
        self.code_analyzer = CodeAnalyzer()
        self.bug_detector = BugDetector()
        self.security_scanner = SecurityScanner()
        self.code_smell_detector = CodeSmellDetector()
        self.report_generator = ReportGenerator()
    
    def review_commit(self, commit_hash=None, branch=None, since=None, until=None):
        """
        审查 Git 提交
        
        Args:
            commit_hash: 指定提交哈希
            branch: 指定分支
            since: 起始时间
            until: 结束时间
            
        Returns:
            dict: 审查结果
        """
        commit_info = None
        if commit_hash:
            commit_info = self.git_integration.get_commit_info(commit_hash)
        elif branch:
            commit_info = self.git_integration.get_branch_commits(branch, since, until)
        else:
            commit_info = self.git_integration.get_recent_commits(since, until)
        
        if not commit_info:
            return {
                'success': False,
                'error': '未找到提交信息'
            }
        
        changes = self.git_integration.get_changes(commit_hash if commit_hash else None)
        
        review_results = {
            'success': True,
            'commit_info': commit_info,
            'changes': changes,
            'analysis': {}
        }
        
        for file_path, file_content in changes.items():
            if self._is_supported_file(file_path):
                file_analysis = self._analyze_file(file_path, file_content)
                review_results['analysis'][file_path] = file_analysis
        
        return review_results
    
    def review_mr(self, mr_id, source_branch, target_branch):
        """
        审查合并请求
        
        Args:
            mr_id: 合并请求 ID
            source_branch: 源分支
            target_branch: 目标分支
            
        Returns:
            dict: 审查结果
        """
        review_results = {
            'success': True,
            'mr_id': mr_id,
            'source_branch': source_branch,
            'target_branch': target_branch,
            'changes': {},
            'analysis': {}
        }
        
        diff = self.git_integration.get_branch_diff(source_branch, target_branch)
        
        for file_path, file_content in diff.items():
            if self._is_supported_file(file_path):
                review_results['changes'][file_path] = file_content
                file_analysis = self._analyze_file(file_path, file_content)
                review_results['analysis'][file_path] = file_analysis
        
        return review_results
    
    def generate_report(self, review_results, format='markdown', output_file=None):
        """
        生成审查报告
        
        Args:
            review_results: 审查结果
            format: 报告格式（markdown 或 json）
            output_file: 输出文件路径
            
        Returns:
            str: 报告内容
        """
        return self.report_generator.generate(review_results, format, output_file)
    
    def _is_supported_file(self, file_path):
        """
        检查是否支持的文件类型
        
        Args:
            file_path: 文件路径
            
        Returns:
            bool: 是否支持
        """
        supported_extensions = [
            '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go',
            '.cpp', '.c', '.h', '.hpp', '.rs', '.rb', '.php',
            '.sh', '.bash', '.sql', '.yaml', '.yml', '.json',
            '.xml', '.html', '.css', '.scss', '.sass'
        ]
        
        for ext in supported_extensions:
            if file_path.endswith(ext):
                return True
        return False
    
    def _analyze_file(self, file_path, file_content):
        """
        分析单个文件
        
        Args:
            file_path: 文件路径
            file_content: 文件内容
            
        Returns:
            dict: 分析结果
        """
        analysis = {
            'code_quality': self.code_analyzer.analyze(file_path, file_content),
            'potential_bugs': self.bug_detector.detect(file_path, file_content),
            'security_issues': self.security_scanner.scan(file_path, file_content),
            'code_smells': self.code_smell_detector.detect(file_path, file_content)
        }
        
        return analysis
