import os
import re
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from git import Repo, GitCommandError


class GitService:
    def __init__(self, repo_path: Optional[str] = None):
        self.repo_path = repo_path
        self.repo = None
        
        if repo_path:
            self._init_repo()
    
    def _init_repo(self) -> bool:
        if not self.repo_path:
            return False
        
        try:
            if os.path.exists(os.path.join(self.repo_path, '.git')):
                self.repo = Repo(self.repo_path)
                return True
            else:
                return False
        except Exception:
            return False
    
    def set_repo_path(self, repo_path: str) -> Dict:
        self.repo_path = repo_path
        if self._init_repo():
            return {
                'success': True,
                'repo_name': os.path.basename(repo_path),
                'branch': self.get_current_branch()
            }
        else:
            return {
                'success': False,
                'error': f'无法打开Git仓库: {repo_path}'
            }
    
    def get_current_branch(self) -> str:
        if not self.repo:
            return None
        
        try:
            return self.repo.active_branch.name
        except Exception:
            return None
    
    def get_commits(
        self,
        since: Optional[str] = None,
        until: Optional[str] = None,
        author: Optional[str] = None,
        branch: Optional[str] = None,
        max_count: int = 100
    ) -> Dict:
        if not self.repo:
            return {
                'success': False,
                'error': '未初始化Git仓库'
            }
        
        try:
            kwargs = {}
            
            if since:
                try:
                    since_date = datetime.fromisoformat(since.replace('Z', '+00:00'))
                    kwargs['since'] = since_date
                except ValueError:
                    kwargs['since'] = since
            
            if until:
                try:
                    until_date = datetime.fromisoformat(until.replace('Z', '+00:00'))
                    kwargs['until'] = until_date
                except ValueError:
                    kwargs['until'] = until
            
            if author:
                kwargs['author'] = author
            
            if max_count:
                kwargs['max_count'] = max_count
            
            target_branch = branch or self.get_current_branch()
            
            commits = list(self.repo.iter_commits(target_branch, **kwargs))
            
            result_commits = []
            for commit in commits:
                commit_data = self._parse_commit(commit)
                result_commits.append(commit_data)
            
            return {
                'success': True,
                'commits': result_commits,
                'count': len(result_commits),
                'branch': target_branch
            }
            
        except GitCommandError as e:
            return {
                'success': False,
                'error': f'Git命令错误: {str(e)}'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _parse_commit(self, commit) -> Dict:
        try:
            files_changed = []
            for diff in commit.diff(commit.parents[0] if commit.parents else None):
                if diff.a_path:
                    files_changed.append(diff.a_path)
                if diff.b_path and diff.b_path != diff.a_path:
                    files_changed.append(diff.b_path)
        except Exception:
            files_changed = []
        
        return {
            'hash': commit.hexsha,
            'shortHash': commit.hexsha[:7],
            'author': commit.author.name,
            'authorEmail': commit.author.email,
            'committer': commit.committer.name,
            'message': commit.message.strip(),
            'summary': commit.summary,
            'date': commit.committed_datetime.isoformat(),
            'files': files_changed,
            'fileCount': len(files_changed),
            'parents': [p.hexsha for p in commit.parents]
        }
    
    def get_commits_this_week(self, author: Optional[str] = None) -> Dict:
        now = datetime.now()
        monday = now - timedelta(days=now.weekday())
        since = monday.strftime('%Y-%m-%d')
        
        return self.get_commits(since=since, author=author)
    
    def get_commits_this_month(self, author: Optional[str] = None) -> Dict:
        now = datetime.now()
        first_day = now.replace(day=1)
        since = first_day.strftime('%Y-%m-%d')
        
        return self.get_commits(since=since, author=author)
    
    def get_branches(self) -> Dict:
        if not self.repo:
            return {
                'success': False,
                'error': '未初始化Git仓库'
            }
        
        try:
            branches = []
            for branch in self.repo.branches:
                branches.append({
                    'name': branch.name,
                    'isActive': branch == self.repo.active_branch,
                    'commit': branch.commit.hexsha[:7]
                })
            
            return {
                'success': True,
                'branches': branches,
                'currentBranch': self.get_current_branch()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_contributors(self, since: Optional[str] = None) -> Dict:
        if not self.repo:
            return {
                'success': False,
                'error': '未初始化Git仓库'
            }
        
        try:
            kwargs = {}
            if since:
                kwargs['since'] = since
            
            commits = list(self.repo.iter_commits(**kwargs))
            
            contributors = {}
            for commit in commits:
                author = commit.author.name
                if author not in contributors:
                    contributors[author] = {
                        'name': author,
                        'email': commit.author.email,
                        'commitCount': 0
                    }
                contributors[author]['commitCount'] += 1
            
            result = sorted(
                contributors.values(),
                key=lambda x: x['commitCount'],
                reverse=True
            )
            
            return {
                'success': True,
                'contributors': result
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def search_commits(
        self,
        keyword: str,
        since: Optional[str] = None,
        max_count: int = 50
    ) -> Dict:
        if not self.repo:
            return {
                'success': False,
                'error': '未初始化Git仓库'
            }
        
        try:
            kwargs = {}
            if since:
                kwargs['since'] = since
            if max_count:
                kwargs['max_count'] = max_count
            
            commits = list(self.repo.iter_commits(**kwargs))
            
            pattern = re.compile(keyword, re.IGNORECASE)
            
            matching_commits = []
            for commit in commits:
                if pattern.search(commit.message) or pattern.search(commit.summary):
                    matching_commits.append(self._parse_commit(commit))
            
            return {
                'success': True,
                'commits': matching_commits,
                'count': len(matching_commits),
                'keyword': keyword
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def find_local_repos(self, search_path: str, max_depth: int = 3) -> Dict:
        repos = []
        
        try:
            for root, dirs, files in os.walk(search_path):
                current_depth = root[len(search_path):].count(os.sep)
                
                if current_depth > max_depth:
                    dirs.clear()
                    continue
                
                if '.git' in dirs:
                    repos.append({
                        'path': root,
                        'name': os.path.basename(root)
                    })
                    dirs.remove('.git')
            
            return {
                'success': True,
                'repos': repos,
                'count': len(repos)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
