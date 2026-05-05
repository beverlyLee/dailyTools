"""
版本检查器模块
"""

import os
import re
import json
import subprocess
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class PackageManager(Enum):
    """
    包管理器枚举
    """
    PIP = 'pip'
    NPM = 'npm'
    YARN = 'yarn'
    PNPM = 'pnpm'
    CARGO = 'cargo'
    GO_MODULES = 'go_modules'
    MAVEN = 'maven'
    GRADLE = 'gradle'


@dataclass
class DependencyInfo:
    """
    依赖信息数据类
    """
    name: str
    current_version: str
    latest_version: Optional[str] = None
    package_manager: PackageManager = PackageManager.PIP
    is_dev_dependency: bool = False
    description: Optional[str] = None
    homepage: Optional[str] = None
    license: Optional[str] = None


class VersionChecker:
    """
    版本检查器类
    """
    
    def __init__(self, project_path: str = '.'):
        """
        初始化版本检查器
        
        Args:
            project_path: 项目路径
        """
        self.project_path = project_path
        self.package_manager = self._detect_package_manager()
        self._setup_cache()
    
    def _setup_cache(self):
        """
        设置缓存
        """
        self._version_cache: Dict[str, str] = {}
        self._package_info_cache: Dict[str, Dict[str, Any]] = {}
    
    def _detect_package_manager(self) -> PackageManager:
        """
        检测项目使用的包管理器
        
        Returns:
            PackageManager: 包管理器类型
        """
        package_files = {
            'requirements.txt': PackageManager.PIP,
            'setup.py': PackageManager.PIP,
            'pyproject.toml': PackageManager.PIP,
            'Pipfile': PackageManager.PIP,
            'package.json': PackageManager.NPM,
            'Cargo.toml': PackageManager.CARGO,
            'go.mod': PackageManager.GO_MODULES,
            'pom.xml': PackageManager.MAVEN,
            'build.gradle': PackageManager.GRADLE,
        }
        
        for filename, manager in package_files.items():
            filepath = os.path.join(self.project_path, filename)
            if os.path.exists(filepath):
                return manager
        
        return PackageManager.PIP
    
    def get_current_dependencies(self, include_dev: bool = False) -> Dict[str, Dict[str, str]]:
        """
        获取当前依赖
        
        Args:
            include_dev: 是否包含开发依赖
            
        Returns:
            Dict[str, Dict[str, str]]: 依赖信息
        """
        dependencies = {
            'production': {},
            'development': {}
        }
        
        if self.package_manager == PackageManager.PIP:
            deps = self._get_pip_dependencies()
            dependencies['production'] = deps
        
        elif self.package_manager == PackageManager.NPM:
            deps, dev_deps = self._get_npm_dependencies()
            dependencies['production'] = deps
            if include_dev:
                dependencies['development'] = dev_deps
        
        elif self.package_manager == PackageManager.CARGO:
            deps, dev_deps = self._get_cargo_dependencies()
            dependencies['production'] = deps
            if include_dev:
                dependencies['development'] = dev_deps
        
        elif self.package_manager == PackageManager.GO_MODULES:
            deps = self._get_go_dependencies()
            dependencies['production'] = deps
        
        elif self.package_manager in [PackageManager.MAVEN, PackageManager.GRADLE]:
            deps = self._get_java_dependencies()
            dependencies['production'] = deps
        
        return dependencies
    
    def get_latest_version(self, package_name: str) -> Optional[str]:
        """
        获取包的最新版本
        
        Args:
            package_name: 包名
            
        Returns:
            Optional[str]: 最新版本号
        """
        if package_name in self._version_cache:
            return self._version_cache[package_name]
        
        latest_version = None
        
        try:
            if self.package_manager == PackageManager.PIP:
                latest_version = self._get_pypi_latest_version(package_name)
            
            elif self.package_manager == PackageManager.NPM:
                latest_version = self._get_npm_latest_version(package_name)
            
            elif self.package_manager == PackageManager.CARGO:
                latest_version = self._get_crates_latest_version(package_name)
            
            elif self.package_manager == PackageManager.GO_MODULES:
                latest_version = self._get_go_proxy_latest_version(package_name)
        
        except Exception as e:
            pass
        
        if latest_version:
            self._version_cache[package_name] = latest_version
        
        return latest_version
    
    def get_package_description(self, package_name: str) -> Optional[str]:
        """
        获取包描述
        
        Args:
            package_name: 包名
            
        Returns:
            Optional[str]: 包描述
        """
        if package_name in self._package_info_cache:
            return self._package_info_cache[package_name].get('description')
        
        try:
            if self.package_manager == PackageManager.PIP:
                info = self._get_pypi_package_info(package_name)
                if info:
                    self._package_info_cache[package_name] = info
                    return info.get('description')
            
            elif self.package_manager == PackageManager.NPM:
                info = self._get_npm_package_info(package_name)
                if info:
                    self._package_info_cache[package_name] = info
                    return info.get('description')
        
        except:
            pass
        
        return None
    
    def get_changelog(self, package_name: str, version: str) -> Optional[str]:
        """
        获取变更日志
        
        Args:
            package_name: 包名
            version: 版本号
            
        Returns:
            Optional[str]: 变更日志
        """
        try:
            if self.package_manager == PackageManager.PIP:
                return self._get_pypi_changelog(package_name, version)
            
            elif self.package_manager == PackageManager.NPM:
                return self._get_npm_changelog(package_name, version)
        
        except:
            pass
        
        return None
    
    def _get_pip_dependencies(self) -> Dict[str, str]:
        """
        获取 Python 依赖
        
        Returns:
            Dict[str, str]: 依赖信息
        """
        dependencies = {}
        
        requirements_path = os.path.join(self.project_path, 'requirements.txt')
        if os.path.exists(requirements_path):
            with open(requirements_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        dep = self._parse_pip_requirement(line)
                        if dep:
                            dependencies[dep['name']] = dep['version']
        
        pyproject_path = os.path.join(self.project_path, 'pyproject.toml')
        if os.path.exists(pyproject_path):
            try:
                import tomli
                with open(pyproject_path, 'r', encoding='utf-8') as f:
                    content = tomli.load(f)
                
                if 'project' in content and 'dependencies' in content['project']:
                    for dep in content['project']['dependencies']:
                        parsed = self._parse_pip_requirement(dep)
                        if parsed:
                            dependencies[parsed['name']] = parsed['version']
                
                if 'tool' in content and 'poetry' in content['tool']:
                    poetry = content['tool']['poetry']
                    if 'dependencies' in poetry:
                        for name, version in poetry['dependencies'].items():
                            if name != 'python':
                                dependencies[name] = self._parse_poetry_version(version)
                    
                    if 'dev-dependencies' in poetry:
                        for name, version in poetry['dev-dependencies'].items():
                            dependencies[name] = self._parse_poetry_version(version)
            
            except ImportError:
                pass
            except Exception:
                pass
        
        try:
            result = subprocess.run(
                ['pip', 'list', '--format=json'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                check=True
            )
            packages = json.loads(result.stdout)
            for pkg in packages:
                name = pkg['name']
                version = pkg['version']
                if name not in dependencies:
                    dependencies[name] = version
        except:
            pass
        
        return dependencies
    
    def _parse_pip_requirement(self, line: str) -> Optional[Dict[str, str]]:
        """
        解析 pip 依赖行
        
        Args:
            line: 依赖行
            
        Returns:
            Optional[Dict[str, str]]: 解析结果
        """
        line = line.strip()
        
        patterns = [
            r'^([a-zA-Z0-9_-]+)\s*([<>=!~]+)\s*([a-zA-Z0-9._-]+)',
            r'^([a-zA-Z0-9_-]+)\s*==\s*([a-zA-Z0-9._-]+)',
            r'^([a-zA-Z0-9_-]+)\s*>=\s*([a-zA-Z0-9._-]+)',
            r'^([a-zA-Z0-9_-]+)\s*~\s*=\s*([a-zA-Z0-9._-]+)',
        ]
        
        for pattern in patterns:
            match = re.match(pattern, line)
            if match:
                groups = match.groups()
                if len(groups) >= 2:
                    name = groups[0].lower().replace('-', '_')
                    version = groups[-1]
                    return {'name': name, 'version': version}
        
        simple_match = re.match(r'^([a-zA-Z0-9_-]+)', line)
        if simple_match:
            name = simple_match.group(1).lower().replace('-', '_')
            return {'name': name, 'version': 'unknown'}
        
        return None
    
    def _parse_poetry_version(self, version_spec) -> str:
        """
        解析 Poetry 版本规范
        
        Args:
            version_spec: 版本规范
            
        Returns:
            str: 版本号
        """
        if isinstance(version_spec, str):
            match = re.match(r'[\^~]?([0-9.a-zA-Z_-]+)', version_spec)
            if match:
                return match.group(1)
            return version_spec
        elif isinstance(version_spec, dict):
            return version_spec.get('version', 'unknown')
        return 'unknown'
    
    def _get_npm_dependencies(self) -> Tuple[Dict[str, str], Dict[str, str]]:
        """
        获取 npm 依赖
        
        Returns:
            Tuple[Dict[str, str], Dict[str, str]]: 生产依赖和开发依赖
        """
        dependencies = {}
        dev_dependencies = {}
        
        package_json_path = os.path.join(self.project_path, 'package.json')
        if os.path.exists(package_json_path):
            try:
                with open(package_json_path, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                
                if 'dependencies' in content:
                    for name, version in content['dependencies'].items():
                        dependencies[name] = self._parse_npm_version(version)
                
                if 'devDependencies' in content:
                    for name, version in content['devDependencies'].items():
                        dev_dependencies[name] = self._parse_npm_version(version)
            
            except Exception:
                pass
        
        return dependencies, dev_dependencies
    
    def _parse_npm_version(self, version_spec: str) -> str:
        """
        解析 npm 版本规范
        
        Args:
            version_spec: 版本规范
            
        Returns:
            str: 版本号
        """
        match = re.match(r'[\^~>=<]?([0-9.a-zA-Z_-]+)', version_spec)
        if match:
            return match.group(1)
        return version_spec
    
    def _get_cargo_dependencies(self) -> Tuple[Dict[str, str], Dict[str, str]]:
        """
        获取 Cargo 依赖
        
        Returns:
            Tuple[Dict[str, str], Dict[str, str]]: 生产依赖和开发依赖
        """
        dependencies = {}
        dev_dependencies = {}
        
        cargo_toml_path = os.path.join(self.project_path, 'Cargo.toml')
        if os.path.exists(cargo_toml_path):
            try:
                import tomli
                with open(cargo_toml_path, 'r', encoding='utf-8') as f:
                    content = tomli.load(f)
                
                if 'dependencies' in content:
                    for name, version in content['dependencies'].items():
                        dependencies[name] = self._parse_cargo_version(version)
                
                if 'dev-dependencies' in content:
                    for name, version in content['dev-dependencies'].items():
                        dev_dependencies[name] = self._parse_cargo_version(version)
            
            except ImportError:
                pass
            except Exception:
                pass
        
        return dependencies, dev_dependencies
    
    def _parse_cargo_version(self, version_spec) -> str:
        """
        解析 Cargo 版本规范
        
        Args:
            version_spec: 版本规范
            
        Returns:
            str: 版本号
        """
        if isinstance(version_spec, str):
            match = re.match(r'[\^~>=<]?([0-9.a-zA-Z_-]+)', version_spec)
            if match:
                return match.group(1)
            return version_spec
        elif isinstance(version_spec, dict):
            return version_spec.get('version', 'unknown')
        return 'unknown'
    
    def _get_go_dependencies(self) -> Dict[str, str]:
        """
        获取 Go 依赖
        
        Returns:
            Dict[str, str]: 依赖信息
        """
        dependencies = {}
        
        go_mod_path = os.path.join(self.project_path, 'go.mod')
        if os.path.exists(go_mod_path):
            try:
                with open(go_mod_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                require_pattern = re.compile(r'require\s+([^\s]+)\s+v([^\s]+)')
                for match in require_pattern.finditer(content):
                    name = match.group(1)
                    version = match.group(2)
                    dependencies[name] = version
            
            except Exception:
                pass
        
        return dependencies
    
    def _get_java_dependencies(self) -> Dict[str, str]:
        """
        获取 Java 依赖
        
        Returns:
            Dict[str, str]: 依赖信息
        """
        dependencies = {}
        
        pom_xml_path = os.path.join(self.project_path, 'pom.xml')
        if os.path.exists(pom_xml_path):
            try:
                import xml.etree.ElementTree as ET
                tree = ET.parse(pom_xml_path)
                root = tree.getroot()
                
                namespaces = {'mvn': 'http://maven.apache.org/POM/4.0.0'}
                
                for dependency in root.findall('.//mvn:dependency', namespaces):
                    group_id = dependency.find('mvn:groupId', namespaces)
                    artifact_id = dependency.find('mvn:artifactId', namespaces)
                    version = dependency.find('mvn:version', namespaces)
                    
                    if artifact_id is not None and version is not None:
                        name = artifact_id.text
                        ver = version.text
                        if name and ver:
                            dependencies[name] = ver
            
            except Exception:
                pass
        
        return dependencies
    
    def _get_pypi_latest_version(self, package_name: str) -> Optional[str]:
        """
        从 PyPI 获取最新版本
        
        Args:
            package_name: 包名
            
        Returns:
            Optional[str]: 最新版本
        """
        try:
            import urllib.request
            import urllib.error
            
            url = f"https://pypi.org/pypi/{package_name}/json"
            
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'CodeQualityToolkit/1.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                return data.get('info', {}).get('version')
        
        except:
            return None
    
    def _get_npm_latest_version(self, package_name: str) -> Optional[str]:
        """
        从 npm 获取最新版本
        
        Args:
            package_name: 包名
            
        Returns:
            Optional[str]: 最新版本
        """
        try:
            import urllib.request
            import urllib.error
            
            url = f"https://registry.npmjs.org/{package_name}/latest"
            
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'CodeQualityToolkit/1.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                return data.get('version')
        
        except:
            return None
    
    def _get_crates_latest_version(self, package_name: str) -> Optional[str]:
        """
        从 crates.io 获取最新版本
        
        Args:
            package_name: 包名
            
        Returns:
            Optional[str]: 最新版本
        """
        try:
            import urllib.request
            import urllib.error
            
            url = f"https://crates.io/api/v1/crates/{package_name}"
            
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'CodeQualityToolkit/1.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                return data.get('crate', {}).get('max_stable_version')
        
        except:
            return None
    
    def _get_go_proxy_latest_version(self, package_name: str) -> Optional[str]:
        """
        从 Go Proxy 获取最新版本
        
        Args:
            package_name: 包名
            
        Returns:
            Optional[str]: 最新版本
        """
        try:
            import urllib.request
            import urllib.error
            
            url = f"https://proxy.golang.org/{package_name}/@latest"
            
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'CodeQualityToolkit/1.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                return data.get('Version', '').lstrip('v')
        
        except:
            return None
    
    def _get_pypi_package_info(self, package_name: str) -> Optional[Dict[str, Any]]:
        """
        从 PyPI 获取包信息
        
        Args:
            package_name: 包名
            
        Returns:
            Optional[Dict[str, Any]]: 包信息
        """
        try:
            import urllib.request
            import urllib.error
            
            url = f"https://pypi.org/pypi/{package_name}/json"
            
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'CodeQualityToolkit/1.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                info = data.get('info', {})
                return {
                    'description': info.get('summary'),
                    'homepage': info.get('home_page'),
                    'license': info.get('license')
                }
        
        except:
            return None
    
    def _get_npm_package_info(self, package_name: str) -> Optional[Dict[str, Any]]:
        """
        从 npm 获取包信息
        
        Args:
            package_name: 包名
            
        Returns:
            Optional[Dict[str, Any]]: 包信息
        """
        try:
            import urllib.request
            import urllib.error
            
            url = f"https://registry.npmjs.org/{package_name}/latest"
            
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'CodeQualityToolkit/1.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                return {
                    'description': data.get('description'),
                    'homepage': data.get('homepage'),
                    'license': data.get('license')
                }
        
        except:
            return None
    
    def _get_pypi_changelog(self, package_name: str, version: str) -> Optional[str]:
        """
        获取 PyPI 包的变更日志
        
        Args:
            package_name: 包名
            version: 版本号
            
        Returns:
            Optional[str]: 变更日志
        """
        return None
    
    def _get_npm_changelog(self, package_name: str, version: str) -> Optional[str]:
        """
        获取 npm 包的变更日志
        
        Args:
            package_name: 包名
            version: 版本号
            
        Returns:
            Optional[str]: 变更日志
        """
        return None
    
    def compare_versions(self, version1: str, version2: str) -> int:
        """
        比较两个版本号
        
        Args:
            version1: 版本号1
            version2: 版本号2
            
        Returns:
            int: -1 如果 version1 < version2, 0 如果相等, 1 如果 version1 > version2
        """
        def parse_version(version: str) -> List[int]:
            version = version.lstrip('v^~>=<')
            parts = re.split(r'[.-]', version)
            result = []
            for part in parts:
                try:
                    result.append(int(part))
                except ValueError:
                    result.append(0)
            return result
        
        v1_parts = parse_version(version1)
        v2_parts = parse_version(version2)
        
        max_len = max(len(v1_parts), len(v2_parts))
        v1_parts += [0] * (max_len - len(v1_parts))
        v2_parts += [0] * (max_len - len(v2_parts))
        
        for i in range(max_len):
            if v1_parts[i] < v2_parts[i]:
                return -1
            elif v1_parts[i] > v2_parts[i]:
                return 1
        
        return 0
    
    def get_update_type(self, current_version: str, latest_version: str) -> str:
        """
        获取更新类型
        
        Args:
            current_version: 当前版本
            latest_version: 最新版本
            
        Returns:
            str: 更新类型（major, minor, patch, other）
        """
        def get_semver_parts(version: str) -> List[int]:
            version = version.lstrip('v^~>=<')
            match = re.match(r'(\d+)\.(\d+)\.(\d+)', version)
            if match:
                return [int(match.group(1)), int(match.group(2)), int(match.group(3))]
            return [0, 0, 0]
        
        current_parts = get_semver_parts(current_version)
        latest_parts = get_semver_parts(latest_version)
        
        if latest_parts[0] > current_parts[0]:
            return 'major'
        elif latest_parts[1] > current_parts[1]:
            return 'minor'
        elif latest_parts[2] > current_parts[2]:
            return 'patch'
        else:
            return 'other'
