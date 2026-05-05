"""
Git 集成模块
"""

import os
import subprocess
from typing import Dict, List, Any, Optional
from datetime import datetime


class GitIntegration:
    """
    Git 集成类
    """
    
    def __init__(self, repo_path: str = '.'):
        """
        初始化 Git 集成
        
        Args:
            repo_path: Git 仓库路径
        """
        self.repo_path = repo_path
        self._verify_git_repo()
    
    def _verify_git_repo(self):
        """
        验证是否为 Git 仓库
        """
        git_dir = os.path.join(self.repo_path, '.git')
        if not os.path.exists(git_dir):
            raise ValueError(f"路径 {self.repo_path} 不是 Git 仓库")
    
    def _run_git_command(self, args: List[str]) -> str:
        """
        运行 Git 命令
        
        Args:
            args: 命令参数列表
            
        Returns:
            str: 命令输出
        """
        try:
            result = subprocess.run(
                ['git'] + args,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Git 命令执行失败: {e.stderr}")
    
    def get_commit_info(self, commit_hash: str) -> Dict[str, Any]:
        """
        获取提交信息
        
        Args:
            commit_hash: 提交哈希
            
        Returns:
            Dict[str, Any]: 提交信息
        """
        try:
            format_str = '%H|%an|%ae|%ad|%s|%b'
            output = self._run_git_command([
                'show', '-s', f'--format={format_str}', commit_hash
            ])
            
            parts = output.split('|', 5)
            if len(parts) >= 6:
                return {
                    'hash': parts[0],
                    'author': parts[1],
                    'email': parts[2],
                    'date': parts[3],
                    'subject': parts[4],
                    'body': parts[5] if len(parts) > 5 else ''
                }
        except:
            pass
        
        return {}
    
    def get_recent_commits(self, since: Optional[str] = None, until: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        获取最近的提交
        
        Args:
            since: 起始时间
            until: 结束时间
            
        Returns:
            List[Dict[str, Any]]: 提交列表
        """
        args = ['log', '--oneline', '-n', '20']
        
        if since:
            args.extend(['--since', since])
        if until:
            args.extend(['--until', until])
        
        try:
            output = self._run_git_command(args)
            commits = []
            
            for line in output.split('\n'):
                if line:
                    parts = line.split(' ', 1)
                    if len(parts) == 2:
                        commits.append({
                            'hash': parts[0],
                            'message': parts[1]
                        })
            
            return commits
        except:
            return []
    
    def get_branch_commits(self, branch: str, since: Optional[str] = None, until: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        获取指定分支的提交
        
        Args:
            branch: 分支名
            since: 起始时间
            until: 结束时间
            
        Returns:
            List[Dict[str, Any]]: 提交列表
        """
        args = ['log', '--oneline', branch, '-n', '50']
        
        if since:
            args.extend(['--since', since])
        if until:
            args.extend(['--until', until])
        
        try:
            output = self._run_git_command(args)
            commits = []
            
            for line in output.split('\n'):
                if line:
                    parts = line.split(' ', 1)
                    if len(parts) == 2:
                        commits.append({
                            'hash': parts[0],
                            'message': parts[1]
                        })
            
            return commits
        except:
            return []
    
    def get_changes(self, commit_hash: Optional[str] = None) -> Dict[str, str]:
        """
        获取变更内容
        
        Args:
            commit_hash: 提交哈希（可选）
            
        Returns:
            Dict[str, str]: 文件路径到内容的映射
        """
        changes = {}
        
        try:
            if commit_hash:
                diff_output = self._run_git_command(['show', commit_hash])
            else:
                diff_output = self._run_git_command(['diff', 'HEAD~1', 'HEAD'])
            
            current_file = None
            current_content = []
            
            for line in diff_output.split('\n'):
                if line.startswith('diff --git'):
                    if current_file:
                        changes[current_file] = '\n'.join(current_content)
                    
                    parts = line.split(' ')
                    if len(parts) >= 3:
                        current_file = parts[2].lstrip('b/')
                    current_content = []
                elif current_file:
                    current_content.append(line)
            
            if current_file and current_content:
                changes[current_file] = '\n'.join(current_content)
        
        except:
            pass
        
        return changes
    
    def get_branch_diff(self, source_branch: str, target_branch: str) -> Dict[str, str]:
        """
        获取两个分支之间的差异
        
        Args:
            source_branch: 源分支
            target_branch: 目标分支
            
        Returns:
            Dict[str, str]: 文件路径到内容的映射
        """
        changes = {}
        
        try:
            diff_output = self._run_git_command([
                'diff', f'{target_branch}..{source_branch}'
            ])
            
            current_file = None
            current_content = []
            
            for line in diff_output.split('\n'):
                if line.startswith('diff --git'):
                    if current_file:
                        changes[current_file] = '\n'.join(current_content)
                    
                    parts = line.split(' ')
                    if len(parts) >= 3:
                        current_file = parts[2].lstrip('b/')
                    current_content = []
                elif current_file:
                    current_content.append(line)
            
            if current_file and current_content:
                changes[current_file] = '\n'.join(current_content)
        
        except:
            pass
        
        return changes
    
    def get_file_content(self, file_path: str, commit_hash: Optional[str] = None) -> str:
        """
        获取文件内容
        
        Args:
            file_path: 文件路径
            commit_hash: 提交哈希（可选）
            
        Returns:
            str: 文件内容
        """
        try:
            if commit_hash:
                return self._run_git_command(['show', f'{commit_hash}:{file_path}'])
            else:
                full_path = os.path.join(self.repo_path, file_path)
                if os.path.exists(full_path):
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        return f.read()
        except:
            pass
        
        return ''
    
    def list_branches(self) -> List[str]:
        """
        列出所有分支
        
        Returns:
            List[str]: 分支列表
        """
        try:
            output = self._run_git_command(['branch', '-a'])
            branches = []
            
            for line in output.split('\n'):
                line = line.strip()
                if line and not line.startswith('*'):
                    branches.append(line.lstrip('remotes/origin/'))
            
            return list(set(branches))
        except:
            return []
    
    def get_current_branch(self) -> str:
        """
        获取当前分支名
        
        Returns:
            str: 分支名
        """
        try:
            return self._run_git_command(['rev-parse', '--abbrev-ref', 'HEAD'])
        except:
            return ''
    
    def get_staged_files(self) -> List[str]:
        """
        获取暂存区文件
        
        Returns:
            List[str]: 文件列表
        """
        try:
            output = self._run_git_command(['diff', '--cached', '--name-only'])
            return [f for f in output.split('\n') if f]
        except:
            return []
    
    def get_modified_files(self) -> List[str]:
        """
        获取修改但未暂存的文件
        
        Returns:
            List[str]: 文件列表
        """
        try:
            output = self._run_git_command(['diff', '--name-only'])
            return [f for f in output.split('\n') if f]
        except:
            return []
    
    def get_untracked_files(self) -> List[str]:
        """
        获取未跟踪文件
        
        Returns:
            List[str]: 文件列表
        """
        try:
            output = self._run_git_command(['ls-files', '--others', '--exclude-standard'])
            return [f for f in output.split('\n') if f]
        except:
            return []
