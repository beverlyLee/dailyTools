from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import json
import os
from datetime import datetime


@dataclass
class EnvironmentVariable:
    key: str
    value: Any
    description: Optional[str] = None
    is_secret: bool = False
    is_global: bool = False


@dataclass
class EnvironmentConfig:
    name: str
    display_name: str
    description: Optional[str] = None
    base_url: str = ""
    is_default: bool = False
    variables: Dict[str, EnvironmentVariable] = field(default_factory=dict)
    headers: Dict[str, str] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


class EnvironmentManager:
    def __init__(self):
        self.environments: Dict[str, EnvironmentConfig] = {}
        self.global_variables: Dict[str, EnvironmentVariable] = {}
        self.active_environment: Optional[str] = None

    def create_environment(
        self,
        name: str,
        display_name: Optional[str] = None,
        description: Optional[str] = None,
        base_url: str = "",
        is_default: bool = False,
        headers: Optional[Dict[str, str]] = None,
        variables: Optional[Dict[str, Any]] = None
    ) -> EnvironmentConfig:
        if name in self.environments:
            raise ValueError(f"Environment '{name}' already exists")

        env_vars = {}
        if variables:
            for key, value in variables.items():
                env_vars[key] = EnvironmentVariable(
                    key=key,
                    value=value,
                    is_global=False
                )

        env = EnvironmentConfig(
            name=name,
            display_name=display_name or name,
            description=description,
            base_url=base_url,
            is_default=is_default,
            variables=env_vars,
            headers=headers or {}
        )

        self.environments[name] = env

        if is_default or self.active_environment is None:
            self.active_environment = name

        return env

    def get_environment(self, name: str) -> Optional[EnvironmentConfig]:
        return self.environments.get(name)

    def get_active_environment(self) -> Optional[EnvironmentConfig]:
        if self.active_environment:
            return self.environments.get(self.active_environment)
        return None

    def set_active_environment(self, name: str) -> bool:
        if name not in self.environments:
            return False
        self.active_environment = name
        return True

    def update_environment(
        self,
        name: str,
        display_name: Optional[str] = None,
        description: Optional[str] = None,
        base_url: Optional[str] = None,
        is_default: Optional[bool] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Optional[EnvironmentConfig]:
        env = self.environments.get(name)
        if not env:
            return None

        if display_name is not None:
            env.display_name = display_name
        if description is not None:
            env.description = description
        if base_url is not None:
            env.base_url = base_url
        if is_default is not None:
            env.is_default = is_default
            if is_default:
                for e in self.environments.values():
                    if e.name != name:
                        e.is_default = False
        if headers is not None:
            env.headers = headers

        env.updated_at = datetime.now()
        return env

    def delete_environment(self, name: str) -> bool:
        if name not in self.environments:
            return False

        env = self.environments[name]
        if env.is_default:
            other_envs = [e for e in self.environments.values() if e.name != name]
            if other_envs:
                other_envs[0].is_default = True
                if self.active_environment == name:
                    self.active_environment = other_envs[0].name

        del self.environments[name]

        if self.active_environment == name:
            remaining = list(self.environments.values())
            self.active_environment = remaining[0].name if remaining else None

        return True

    def add_variable(
        self,
        environment_name: str,
        key: str,
        value: Any,
        description: Optional[str] = None,
        is_secret: bool = False
    ) -> bool:
        env = self.environments.get(environment_name)
        if not env:
            return False

        env.variables[key] = EnvironmentVariable(
            key=key,
            value=value,
            description=description,
            is_secret=is_secret,
            is_global=False
        )
        env.updated_at = datetime.now()
        return True

    def add_global_variable(
        self,
        key: str,
        value: Any,
        description: Optional[str] = None,
        is_secret: bool = False
    ):
        self.global_variables[key] = EnvironmentVariable(
            key=key,
            value=value,
            description=description,
            is_secret=is_secret,
            is_global=True
        )

    def get_variable(self, key: str, environment_name: Optional[str] = None) -> Optional[Any]:
        env_name = environment_name or self.active_environment

        if env_name:
            env = self.environments.get(env_name)
            if env and key in env.variables:
                return env.variables[key].value

        if key in self.global_variables:
            return self.global_variables[key].value

        return None

    def get_all_variables(self, environment_name: Optional[str] = None) -> Dict[str, Any]:
        result = {}

        for key, var in self.global_variables.items():
            result[key] = var.value

        env_name = environment_name or self.active_environment
        if env_name:
            env = self.environments.get(env_name)
            if env:
                for key, var in env.variables.items():
                    result[key] = var.value

        return result

    def delete_variable(self, key: str, environment_name: Optional[str] = None) -> bool:
        if environment_name:
            env = self.environments.get(environment_name)
            if env and key in env.variables:
                del env.variables[key]
                env.updated_at = datetime.now()
                return True
        elif key in self.global_variables:
            del self.global_variables[key]
            return True
        return False

    def resolve_variables(self, text: str, environment_name: Optional[str] = None) -> str:
        import re
        variables = self.get_all_variables(environment_name)

        pattern = r'\{\{(\w+)\}\}'

        def replace_match(match):
            var_name = match.group(1)
            return str(variables.get(var_name, match.group(0)))

        return re.sub(pattern, replace_match, text)

    def list_environments(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": env.name,
                "display_name": env.display_name,
                "description": env.description,
                "base_url": env.base_url,
                "is_default": env.is_default,
                "is_active": env.name == self.active_environment,
                "variable_count": len(env.variables),
                "headers": env.headers,
                "created_at": env.created_at.isoformat(),
                "updated_at": env.updated_at.isoformat()
            }
            for env in self.environments.values()
        ]

    def create_default_environments(self):
        self.create_environment(
            name="dev",
            display_name="开发环境",
            description="本地开发环境",
            base_url="http://localhost:8080",
            is_default=True,
            headers={"Content-Type": "application/json"},
            variables={
                "app_id": "dev_app_123",
                "api_key": "dev_secret_key"
            }
        )

        self.create_environment(
            name="test",
            display_name="测试环境",
            description="集成测试环境",
            base_url="https://test-api.example.com",
            headers={"Content-Type": "application/json"},
            variables={
                "app_id": "test_app_456",
                "api_key": "test_secret_key"
            }
        )

        self.create_environment(
            name="prod",
            display_name="生产环境",
            description="生产环境",
            base_url="https://api.example.com",
            headers={"Content-Type": "application/json"},
            variables={
                "app_id": "prod_app_789",
                "api_key": "prod_secret_key"
            }
        )

    def save_to_file(self, file_path: str):
        data = {
            "active_environment": self.active_environment,
            "global_variables": {
                key: {
                    "key": var.key,
                    "value": var.value,
                    "description": var.description,
                    "is_secret": var.is_secret,
                    "is_global": var.is_global
                }
                for key, var in self.global_variables.items()
            },
            "environments": {
                name: {
                    "name": env.name,
                    "display_name": env.display_name,
                    "description": env.description,
                    "base_url": env.base_url,
                    "is_default": env.is_default,
                    "headers": env.headers,
                    "variables": {
                        key: {
                            "key": var.key,
                            "value": var.value,
                            "description": var.description,
                            "is_secret": var.is_secret,
                            "is_global": var.is_global
                        }
                        for key, var in env.variables.items()
                    }
                }
                for name, env in self.environments.items()
            }
        }

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_from_file(self, file_path: str) -> bool:
        if not os.path.exists(file_path):
            return False

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.active_environment = data.get("active_environment")

        global_vars = data.get("global_variables", {})
        for key, var_data in global_vars.items():
            self.global_variables[key] = EnvironmentVariable(
                key=var_data["key"],
                value=var_data["value"],
                description=var_data.get("description"),
                is_secret=var_data.get("is_secret", False),
                is_global=var_data.get("is_global", True)
            )

        envs = data.get("environments", {})
        for name, env_data in envs.items():
            env_vars = {}
            for key, var_data in env_data.get("variables", {}).items():
                env_vars[key] = EnvironmentVariable(
                    key=var_data["key"],
                    value=var_data["value"],
                    description=var_data.get("description"),
                    is_secret=var_data.get("is_secret", False),
                    is_global=var_data.get("is_global", False)
                )

            self.environments[name] = EnvironmentConfig(
                name=env_data["name"],
                display_name=env_data.get("display_name", env_data["name"]),
                description=env_data.get("description"),
                base_url=env_data.get("base_url", ""),
                is_default=env_data.get("is_default", False),
                variables=env_vars,
                headers=env_data.get("headers", {})
            )

        return True
