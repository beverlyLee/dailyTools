package configcheck

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

type ConfigCheck struct {
	configChecker *ConfigChecker
}

type ConfigChecker struct{}

type ConfigIssue struct {
	ID          string            `json:"id"`
	RuleID      string            `json:"rule_id"`
	Severity    IssueSeverity     `json:"severity"`
	Category    string            `json:"category"`
	Title       string            `json:"title"`
	Description string            `json:"description"`
	Remediation string            `json:"remediation"`
	Evidence    string            `json:"evidence,omitempty"`
	References  []string          `json:"references,omitempty"`
	FoundAt     time.Time         `json:"found_at"`
}

type IssueSeverity string

const (
	SeverityCritical IssueSeverity = "Critical"
	SeverityHigh     IssueSeverity = "High"
	SeverityMedium   IssueSeverity = "Medium"
	SeverityLow      IssueSeverity = "Low"
	SeverityInfo     IssueSeverity = "Info"
)

type ImageConfig struct {
	Config struct {
		User         string            `json:"User"`
		ExposedPorts map[string]struct{} `json:"ExposedPorts"`
		Env          []string          `json:"Env"`
		Cmd          []string          `json:"Cmd"`
		Entrypoint   []string          `json:"Entrypoint"`
		Volumes      map[string]struct{} `json:"Volumes"`
		WorkingDir   string            `json:"WorkingDir"`
		Labels       map[string]string `json:"Labels"`
		Healthcheck  interface{}       `json:"Healthcheck"`
	} `json:"config"`
	Architecture string    `json:"Architecture"`
	OS           string    `json:"os"`
	Created      time.Time `json:"created"`
	DockerVersion string   `json:"docker_version"`
}

type SecurityRule struct {
	ID          string
	Severity    IssueSeverity
	Category    string
	Title       string
	Description string
	Check       func(config *ImageConfig, history []HistoryLayer) *ConfigIssue
	Remediation string
	References  []string
}

type HistoryLayer struct {
	Created    time.Time `json:"created"`
	CreatedBy  string    `json:"created_by"`
	Comment    string    `json:"comment"`
	EmptyLayer bool      `json:"empty_layer,omitempty"`
	Size       int64     `json:"size,omitempty"`
}

func New() *ConfigChecker {
	return &ConfigChecker{}
}

func (c *ConfigChecker) Check(imageName string) ([]ConfigIssue, error) {
	var issues []ConfigIssue

	config, history, err := c.getImageConfig(imageName)
	if err != nil {
		return nil, fmt.Errorf("failed to get image config: %w", err)
	}

	rules := c.getSecurityRules()

	for _, rule := range rules {
		if issue := rule.Check(config, history); issue != nil {
			issue.ID = fmt.Sprintf("CCI-%s", rule.ID)
			issue.RuleID = rule.ID
			issue.Severity = rule.Severity
			issue.Category = rule.Category
			issue.Title = rule.Title
			issue.Remediation = rule.Remediation
			issue.References = rule.References
			issue.FoundAt = time.Now()
			issues = append(issues, *issue)
		}
	}

	return issues, nil
}

func (c *ConfigChecker) getImageConfig(imageName string) (*ImageConfig, []HistoryLayer, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", "inspect", imageName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to inspect image: %w, output: %s", err, string(output))
	}

	var inspectData []struct {
		Config  *ImageConfig   `json:"Config"`
		History []HistoryLayer `json:"History,omitempty"`
	}

	if err := json.Unmarshal(output, &inspectData); err != nil {
		return nil, nil, fmt.Errorf("failed to parse inspect output: %w", err)
	}

	if len(inspectData) == 0 {
		return nil, nil, fmt.Errorf("no image data found")
	}

	return inspectData[0].Config, inspectData[0].History, nil
}

func (c *ConfigChecker) getSecurityRules() []SecurityRule {
	return []SecurityRule{
		{
			ID:          "001",
			Severity:    SeverityHigh,
			Category:    "User",
			Title:       "容器以 root 用户运行",
			Description: "容器配置为以 root 用户运行，这会增加安全风险。如果容器被入侵，攻击者可能获得宿主机的 root 权限。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				if config.Config.User == "" || config.Config.User == "root" || strings.HasPrefix(config.Config.User, "0:") {
					return &ConfigIssue{
						Evidence: fmt.Sprintf("USER 指令未设置或设置为 root: '%s'", config.Config.User),
					}
				}
				return nil
			},
			Remediation: "在 Dockerfile 中使用 USER 指令创建并切换到非 root 用户。例如：\nRUN groupadd -r myuser && useradd -r -g myuser myuser\nUSER myuser",
			References:  []string{"https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#user", "CIS Docker Benchmark 4.1"},
		},
		{
			ID:          "002",
			Severity:    SeverityMedium,
			Category:    "Filesystem",
			Title:       "镜像未使用只读文件系统",
			Description: "容器运行时应使用只读文件系统，以防止攻击者在运行时修改文件系统。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				for _, layer := range history {
					if strings.Contains(strings.ToLower(layer.CreatedBy), "run") &&
						!strings.Contains(layer.CreatedBy, "VOLUME") &&
						!strings.Contains(layer.CreatedBy, "USER") {
						continue
					}
				}
				return nil
			},
			Remediation: "运行容器时使用 --read-only 标志，或在 Dockerfile 中使用 VOLUME 指令为需要写入的目录创建卷。\ndocker run --read-only -v /app/data myimage",
			References:  []string{"https://docs.docker.com/engine/reference/run/#security-configuration", "CIS Docker Benchmark 5.12"},
		},
		{
			ID:          "003",
			Severity:    SeverityHigh,
			Category:    "Privileges",
			Title:       "检测到 privileged 指令使用",
			Description: "如果容器配置为以 privileged 模式运行，将获得宿主机的所有权限，这是极高的安全风险。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				for _, layer := range history {
					if strings.Contains(strings.ToLower(layer.CreatedBy), "privileged") {
						return &ConfigIssue{
							Evidence: fmt.Sprintf("检测到 privileged 相关指令: %s", layer.CreatedBy),
						}
					}
				}
				return nil
			},
			Remediation: "避免使用 --privileged 标志。如果需要特定权限，使用 --cap-add 精确添加所需的 Linux capabilities。",
			References:  []string{"https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities", "CIS Docker Benchmark 5.4"},
		},
		{
			ID:          "004",
			Severity:    SeverityMedium,
			Category:    "Secrets",
			Title:       "可能的敏感信息泄露",
			Description: "检测到镜像构建历史中可能包含敏感信息（如密码、密钥等）。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				sensitivePatterns := []string{
					"password=", "PASSWORD=", "secret=", "SECRET=",
					"api_key=", "API_KEY=", "token=", "TOKEN=",
					"password:", "PASSWORD:", "secret:", "SECRET:",
					"AWS_SECRET", "GITHUB_TOKEN", "SSH_PRIVATE_KEY",
				}

				for _, layer := range history {
					for _, pattern := range sensitivePatterns {
						if strings.Contains(layer.CreatedBy, pattern) {
							return &ConfigIssue{
								Evidence: fmt.Sprintf("检测到可能的敏感信息模式: %s 在指令: %s", pattern, layer.CreatedBy),
							}
						}
					}
				}

				for _, env := range config.Config.Env {
					for _, pattern := range sensitivePatterns {
						if strings.Contains(env, pattern) {
							return &ConfigIssue{
								Evidence: fmt.Sprintf("检测到可能的敏感信息在环境变量: %s", env),
							}
						}
					}
				}

				return nil
			},
			Remediation: "不要在 Dockerfile 或镜像中硬编码敏感信息。使用 Docker secrets、环境变量（运行时注入）或密钥管理服务。",
			References:  []string{"https://docs.docker.com/engine/swarm/secrets/", "https://12factor.net/config"},
		},
		{
			ID:          "005",
			Severity:    SeverityLow,
			Category:    "Health",
			Title:       "缺少健康检查配置",
			Description: "镜像未配置 HEALTHCHECK，这使得容器编排系统难以判断容器是否正常运行。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				if config.Config.Healthcheck == nil {
					return &ConfigIssue{
						Evidence: "镜像未配置 HEALTHCHECK 指令",
					}
				}
				return nil
			},
			Remediation: "在 Dockerfile 中添加 HEALTHCHECK 指令。例如：\nHEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost/health || exit 1",
			References:  []string{"https://docs.docker.com/engine/reference/builder/#healthcheck"},
		},
		{
			ID:          "006",
			Severity:    SeverityMedium,
			Category:    "Update",
			Title:       "检测到包管理器更新指令缺失",
			Description: "在安装软件包之前未更新包索引，可能会安装过时的、存在漏洞的软件包版本。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				hasUpdate := false
				hasInstall := false

				for _, layer := range history {
					createdBy := strings.ToLower(layer.CreatedBy)
					if strings.Contains(createdBy, "apt-get update") ||
						strings.Contains(createdBy, "apt update") ||
						strings.Contains(createdBy, "yum update") ||
						strings.Contains(createdBy, "dnf update") ||
						strings.Contains(createdBy, "apk upgrade") {
						hasUpdate = true
					}
					if strings.Contains(createdBy, "apt-get install") ||
						strings.Contains(createdBy, "apt install") ||
						strings.Contains(createdBy, "yum install") ||
						strings.Contains(createdBy, "dnf install") ||
						strings.Contains(createdBy, "apk add") {
						hasInstall = true
					}
				}

				if hasInstall && !hasUpdate {
					return &ConfigIssue{
						Evidence: "检测到包安装指令但未检测到包索引更新指令",
					}
				}
				return nil
			},
			Remediation: "在安装软件包之前更新包索引。例如：\nRUN apt-get update && apt-get install -y <packages>",
			References:  []string{"https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#run"},
		},
		{
			ID:          "007",
			Severity:    SeverityLow,
			Category:    "Image",
			Title:       "使用 latest 标签",
			Description: "使用 latest 标签可能导致不可预测的构建行为，因为 latest 指向的版本可能会变化。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				for _, layer := range history {
					if strings.HasPrefix(layer.CreatedBy, "FROM") && strings.Contains(layer.CreatedBy, ":latest") {
						return &ConfigIssue{
							Evidence: fmt.Sprintf("检测到使用 latest 标签: %s", layer.CreatedBy),
						}
					}
				}
				return nil
			},
			Remediation: "使用具体的版本标签而非 latest。例如：\nFROM node:20-alpine 而非 FROM node:latest",
			References:  []string{"https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#from"},
		},
		{
			ID:          "008",
			Severity:    SeverityHigh,
			Category:    "Network",
			Title:       "暴露了敏感端口",
			Description: "镜像暴露了可能的敏感端口，如 SSH、数据库端口等。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				sensitivePorts := map[string]string{
					"22/tcp":   "SSH",
					"3306/tcp": "MySQL",
					"5432/tcp": "PostgreSQL",
					"27017/tcp": "MongoDB",
					"6379/tcp": "Redis",
					"11211/tcp": "Memcached",
				}

				for port, service := range sensitivePorts {
					if _, exists := config.Config.ExposedPorts[port]; exists {
						return &ConfigIssue{
							Evidence: fmt.Sprintf("检测到暴露敏感端口 %s (%s)", port, service),
						}
					}
				}
				return nil
			},
			Remediation: "仅暴露必要的端口。对于数据库等服务，考虑不在镜像中暴露端口，而是通过 Docker 网络进行内部通信。",
			References:  []string{"https://docs.docker.com/engine/reference/builder/#expose", "CIS Docker Benchmark 5.15"},
		},
		{
			ID:          "009",
			Severity:    SeverityMedium,
			Category:    "User",
			Title:       "未设置工作目录",
			Description: "镜像未设置 WORKDIR，命令可能在意外的目录中执行。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				if config.Config.WorkingDir == "" || config.Config.WorkingDir == "/" {
					return &ConfigIssue{
						Evidence: fmt.Sprintf("工作目录设置为: '%s'", config.Config.WorkingDir),
					}
				}
				return nil
			},
			Remediation: "在 Dockerfile 中设置明确的工作目录。例如：\nWORKDIR /app",
			References:  []string{"https://docs.docker.com/engine/reference/builder/#workdir"},
		},
		{
			ID:          "010",
			Severity:    SeverityLow,
			Category:    "Image",
			Title:       "基础镜像已过时",
			Description: "基于旧版本的基础镜像可能包含已知漏洞。",
			Check: func(config *ImageConfig, history []HistoryLayer) *ConfigIssue {
				if config.DockerVersion != "" {
					oldVersions := []string{"17.", "18.", "19.", "20.10"}
					for _, old := range oldVersions {
						if strings.HasPrefix(config.DockerVersion, old) {
							return &ConfigIssue{
								Evidence: fmt.Sprintf("Docker 版本: %s 可能已过时", config.DockerVersion),
							}
						}
					}
				}
				return nil
			},
			Remediation: "定期更新基础镜像到最新稳定版本，并重新构建应用镜像。",
			References:  []string{"https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#keep-your-images-small"},
		},
	}
}

func (c *ConfigChecker) CheckRuntimeConfig(containerID string) ([]ConfigIssue, error) {
	var issues []ConfigIssue

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", "inspect", containerID)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to inspect container: %w", err)
	}

	var containerData []struct {
		HostConfig struct {
			Privileged      bool              `json:"Privileged"`
			ReadonlyRootfs  bool              `json:"ReadonlyRootfs"`
			CapAdd          []string          `json:"CapAdd"`
			CapDrop         []string          `json:"CapDrop"`
			SecurityOpt     []string          `json:"SecurityOpt"`
			PidMode         string            `json:"PidMode"`
			NetworkMode     string            `json:"NetworkMode"`
		} `json:"HostConfig"`
	}

	if err := json.Unmarshal(output, &containerData); err != nil {
		return nil, fmt.Errorf("failed to parse container inspect: %w", err)
	}

	if len(containerData) == 0 {
		return issues, nil
	}

	hc := containerData[0].HostConfig

	if hc.Privileged {
		issues = append(issues, ConfigIssue{
			ID:          "CCI-003",
			RuleID:      "003",
			Severity:    SeverityCritical,
			Category:    "Runtime",
			Title:       "容器以 privileged 模式运行",
			Description: "容器配置为以 privileged 模式运行，这会授予容器宿主机的所有权限。",
			Evidence:    "HostConfig.Privileged = true",
			Remediation: "立即停止使用 --privileged 标志。使用 --cap-add 精确添加所需的 capabilities。",
			FoundAt:     time.Now(),
		})
	}

	if !hc.ReadonlyRootfs {
		issues = append(issues, ConfigIssue{
			ID:          "CCI-002",
			RuleID:      "002",
			Severity:    SeverityMedium,
			Category:    "Runtime",
			Title:       "容器未使用只读文件系统",
			Description: "容器运行时未使用只读文件系统，攻击者可能修改文件系统。",
			Evidence:    "HostConfig.ReadonlyRootfs = false",
			Remediation: "使用 --read-only 标志运行容器，并为需要写入的目录挂载卷。",
			FoundAt:     time.Now(),
		})
	}

	hasSensitiveCap := false
	sensitiveCaps := []string{"ALL", "SYS_ADMIN", "NET_ADMIN", "SYS_PTRACE"}
	for _, cap := range hc.CapAdd {
		for _, sensitive := range sensitiveCaps {
			if strings.EqualFold(cap, sensitive) {
				hasSensitiveCap = true
				issues = append(issues, ConfigIssue{
					ID:          "CCI-011",
					RuleID:      "011",
					Severity:    SeverityHigh,
					Category:    "Runtime",
					Title:       "容器添加了敏感的 Linux capabilities",
					Description: fmt.Sprintf("容器被添加了敏感 capability: %s", cap),
					Evidence:    fmt.Sprintf("HostConfig.CapAdd contains: %s", cap),
					Remediation: "移除不必要的 capabilities。仅添加容器运行必需的最小 capabilities。",
					FoundAt:     time.Now(),
				})
			}
		}
	}

	if !hasSensitiveCap {
		needDropAll := true
		for _, cap := range hc.CapDrop {
			if strings.EqualFold(cap, "ALL") {
				needDropAll = false
				break
			}
		}
		if needDropAll && len(hc.CapDrop) == 0 {
			issues = append(issues, ConfigIssue{
				ID:          "CCI-012",
				RuleID:      "012",
				Severity:    SeverityLow,
				Category:    "Runtime",
				Title:       "容器未删除默认 capabilities",
				Description: "最佳实践是先删除所有 capabilities，再添加必需的。",
				Evidence:    "HostConfig.CapDrop 为空或不包含 ALL",
				Remediation: "使用 --cap-drop=ALL --cap-add=<必需的cap> 运行容器。",
				FoundAt:     time.Now(),
			})
		}
	}

	if hc.PidMode == "host" {
		issues = append(issues, ConfigIssue{
			ID:          "CCI-013",
			RuleID:      "013",
			Severity:    SeverityCritical,
			Category:    "Runtime",
			Title:       "容器使用宿主 PID 命名空间",
			Description: "容器共享宿主机的 PID 命名空间，可以看到宿主机所有进程。",
			Evidence:    "HostConfig.PidMode = host",
			Remediation: "移除 --pid=host 标志。",
			FoundAt:     time.Now(),
		})
	}

	if hc.NetworkMode == "host" {
		issues = append(issues, ConfigIssue{
			ID:          "CCI-014",
			RuleID:      "014",
			Severity:    SeverityHigh,
			Category:    "Runtime",
			Title:       "容器使用宿主网络命名空间",
			Description: "容器共享宿主机的网络栈，绕过了 Docker 的网络隔离。",
			Evidence:    "HostConfig.NetworkMode = host",
			Remediation: "移除 --net=host 标志。使用 Docker 网络进行容器间通信。",
			FoundAt:     time.Now(),
		})
	}

	return issues, nil
}
