package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"perf-security-toolkit/pkg/security/configcheck"
	"perf-security-toolkit/pkg/security/scanner"
)

type Config struct {
	Provider  string
	Model     string
	APIKey    string
	BaseURL   string
	Timeout   time.Duration
	MaxTokens int
}

type Client struct {
	config Config
	client *http.Client
}

type Explanation struct {
	VulnerabilityID string   `json:"vulnerability_id"`
	Title           string   `json:"title"`
	RiskLevel       string   `json:"risk_level"`
	RiskDescription string   `json:"risk_description"`
	Impact          string   `json:"impact"`
	FixSteps        []string `json:"fix_steps"`
	CodeExample     string   `json:"code_example,omitempty"`
	References      []string `json:"references,omitempty"`
}

type LLMRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float64       `json:"temperature,omitempty"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type LLMResponse struct {
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type ClaudeResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func New(config Config) *Client {
	if config.APIKey == "" {
		config.APIKey = os.Getenv("LLM_API_KEY")
		if config.APIKey == "" {
			config.APIKey = os.Getenv("OPENAI_API_KEY")
		}
	}

	if config.BaseURL == "" {
		switch config.Provider {
		case "claude":
			config.BaseURL = "https://api.anthropic.com/v1/messages"
		default:
			config.BaseURL = "https://api.openai.com/v1/chat/completions"
		}
	}

	if config.Model == "" {
		switch config.Provider {
		case "claude":
			config.Model = "claude-3-opus-20240229"
		default:
			config.Model = "gpt-4"
		}
	}

	if config.Timeout == 0 {
		config.Timeout = 60 * time.Second
	}

	if config.MaxTokens == 0 {
		config.MaxTokens = 2000
	}

	return &Client{
		config: config,
		client: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

func (c *Client) ExplainVulnerabilities(
	osVulns []scanner.OSVulnerability,
	appVulns []scanner.AppVulnerability,
	configIssues []configcheck.ConfigIssue,
) ([]Explanation, error) {
	var explanations []Explanation

	for _, vuln := range osVulns {
		exp, err := c.explainOSVulnerability(vuln)
		if err != nil {
			continue
		}
		explanations = append(explanations, *exp)
	}

	for _, vuln := range appVulns {
		exp, err := c.explainAppVulnerability(vuln)
		if err != nil {
			continue
		}
		explanations = append(explanations, *exp)
	}

	for _, issue := range configIssues {
		exp, err := c.explainConfigIssue(issue)
		if err != nil {
			continue
		}
		explanations = append(explanations, *exp)
	}

	return explanations, nil
}

func (c *Client) explainOSVulnerability(vuln scanner.OSVulnerability) (*Explanation, error) {
	prompt := fmt.Sprintf(`请用中文详细分析以下操作系统包漏洞：

漏洞ID: %s
包名称: %s
当前版本: %s
修复版本: %s
严重程度: %s
标题: %s
描述: %s

请按以下格式返回JSON：
{
  "risk_level": "Critical/High/Medium/Low",
  "risk_description": "详细描述这个漏洞的风险",
  "impact": "描述如果不修复会产生什么影响",
  "fix_steps": ["步骤1", "步骤2", "步骤3"],
  "code_example": "修复代码或Dockerfile示例（如果适用）",
  "references": ["相关参考链接"]
}`,
		vuln.VulnerabilityID,
		vuln.PackageName,
		vuln.InstalledVersion,
		vuln.FixedVersion,
		vuln.Severity,
		vuln.Title,
		vuln.Description)

	response, err := c.callLLM(prompt)
	if err != nil {
		return nil, err
	}

	return c.parseExplanationResponse(vuln.VulnerabilityID, vuln.Title, response)
}

func (c *Client) explainAppVulnerability(vuln scanner.AppVulnerability) (*Explanation, error) {
	prompt := fmt.Sprintf(`请用中文详细分析以下应用依赖漏洞：

漏洞ID: %s
包名称: %s
生态系统: %s
当前版本: %s
修复版本: %s
严重程度: %s
标题: %s
描述: %s

请按以下格式返回JSON：
{
  "risk_level": "Critical/High/Medium/Low",
  "risk_description": "详细描述这个漏洞的风险",
  "impact": "描述如果不修复会产生什么影响",
  "fix_steps": ["步骤1", "步骤2", "步骤3"],
  "code_example": "修复代码或配置文件示例",
  "references": ["相关参考链接"]
}`,
		vuln.VulnerabilityID,
		vuln.PackageName,
		vuln.Ecosystem,
		vuln.InstalledVersion,
		vuln.FixedVersion,
		vuln.Severity,
		vuln.Title,
		vuln.Description)

	response, err := c.callLLM(prompt)
	if err != nil {
		return nil, err
	}

	return c.parseExplanationResponse(vuln.VulnerabilityID, vuln.Title, response)
}

func (c *Client) explainConfigIssue(issue configcheck.ConfigIssue) (*Explanation, error) {
	prompt := fmt.Sprintf(`请用中文详细分析以下容器安全配置问题：

规则ID: %s
类别: %s
严重程度: %s
标题: %s
描述: %s
证据: %s
建议修复方法: %s

请按以下格式返回JSON：
{
  "risk_level": "Critical/High/Medium/Low",
  "risk_description": "详细描述这个配置问题的安全风险",
  "impact": "描述如果不修复会产生什么影响",
  "fix_steps": ["详细的修复步骤列表"],
  "code_example": "修复后的Dockerfile或运行命令示例",
  "references": ["相关安全最佳实践链接"]
}`,
		issue.RuleID,
		issue.Category,
		issue.Severity,
		issue.Title,
		issue.Description,
		issue.Evidence,
		issue.Remediation)

	response, err := c.callLLM(prompt)
	if err != nil {
		return nil, err
	}

	return c.parseExplanationResponse(issue.ID, issue.Title, response)
}

func (c *Client) callLLM(prompt string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), c.config.Timeout)
	defer cancel()

	messages := []ChatMessage{
		{
			Role: "system",
			Content: `你是一位专业的安全分析师，擅长容器安全和漏洞分析。
请用简洁专业的语言回答问题，并确保返回有效的JSON格式。
不要添加任何Markdown格式或额外的文字说明。`,
		},
		{
			Role:    "user",
			Content: prompt,
		},
	}

	var response string
	var err error

	switch c.config.Provider {
	case "claude":
		response, err = c.callClaude(ctx, messages)
	default:
		response, err = c.callOpenAI(ctx, messages)
	}

	return response, err
}

func (c *Client) callOpenAI(ctx context.Context, messages []ChatMessage) (string, error) {
	request := LLMRequest{
		Model:       c.config.Model,
		Messages:    messages,
		MaxTokens:   c.config.MaxTokens,
		Temperature: 0.7,
	}

	body, err := json.Marshal(request)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.config.BaseURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.config.APIKey))

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API请求失败: %s - %s", resp.Status, string(respBody))
	}

	var llmResp LLMResponse
	if err := json.Unmarshal(respBody, &llmResp); err != nil {
		return "", err
	}

	if llmResp.Error != nil {
		return "", fmt.Errorf("API错误: %s", llmResp.Error.Message)
	}

	if len(llmResp.Choices) == 0 {
		return "", fmt.Errorf("API返回空响应")
	}

	return llmResp.Choices[0].Message.Content, nil
}

func (c *Client) callClaude(ctx context.Context, messages []ChatMessage) (string, error) {
	type ClaudeRequest struct {
		Model       string        `json:"model"`
		MaxTokens   int           `json:"max_tokens"`
		Messages    []ChatMessage `json:"messages"`
		System      string        `json:"system,omitempty"`
	}

	var systemMsg string
	var userMessages []ChatMessage

	for _, msg := range messages {
		if msg.Role == "system" {
			systemMsg = msg.Content
		} else {
			userMessages = append(userMessages, msg)
		}
	}

	request := ClaudeRequest{
		Model:     c.config.Model,
		MaxTokens: c.config.MaxTokens,
		Messages:  userMessages,
		System:    systemMsg,
	}

	body, err := json.Marshal(request)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.config.BaseURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.config.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API请求失败: %s - %s", resp.Status, string(respBody))
	}

	var claudeResp ClaudeResponse
	if err := json.Unmarshal(respBody, &claudeResp); err != nil {
		return "", err
	}

	if claudeResp.Error != nil {
		return "", fmt.Errorf("API错误: %s", claudeResp.Error.Message)
	}

	if len(claudeResp.Content) == 0 {
		return "", fmt.Errorf("API返回空响应")
	}

	return claudeResp.Content[0].Text, nil
}

func (c *Client) parseExplanationResponse(id, title, response string) (*Explanation, error) {
	jsonStart := strings.Index(response, "{")
	jsonEnd := strings.LastIndex(response, "}")

	if jsonStart == -1 || jsonEnd == -1 {
		return &Explanation{
			VulnerabilityID: id,
			Title:           title,
			RiskLevel:       "Medium",
			RiskDescription: response,
			Impact:          "请参考安全建议进行修复",
			FixSteps:        []string{"更新相关包到安全版本"},
		}, nil
	}

	jsonContent := response[jsonStart : jsonEnd+1]

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(jsonContent), &result); err != nil {
		return &Explanation{
			VulnerabilityID: id,
			Title:           title,
			RiskLevel:       "Medium",
			RiskDescription: jsonContent,
		}, nil
	}

	exp := &Explanation{
		VulnerabilityID: id,
		Title:           title,
	}

	if riskLevel, ok := result["risk_level"].(string); ok {
		exp.RiskLevel = riskLevel
	} else {
		exp.RiskLevel = "Medium"
	}

	if riskDesc, ok := result["risk_description"].(string); ok {
		exp.RiskDescription = riskDesc
	}

	if impact, ok := result["impact"].(string); ok {
		exp.Impact = impact
	}

	if fixSteps, ok := result["fix_steps"].([]interface{}); ok {
		for _, step := range fixSteps {
			if s, ok := step.(string); ok {
				exp.FixSteps = append(exp.FixSteps, s)
			}
		}
	}

	if codeExample, ok := result["code_example"].(string); ok {
		exp.CodeExample = codeExample
	}

	if references, ok := result["references"].([]interface{}); ok {
		for _, ref := range references {
			if r, ok := ref.(string); ok {
				exp.References = append(exp.References, r)
			}
		}
	}

	return exp, nil
}

func (c *Client) GenerateFixCode(vulnType string, currentCode string) (string, error) {
	prompt := fmt.Sprintf(`请分析以下代码中的安全问题并提供修复后的代码。

漏洞类型: %s

当前代码:
%s

请仅返回修复后的代码，不要添加任何额外的解释。`, vulnType, currentCode)

	return c.callLLM(prompt)
}

func (c *Client) GenerateSecurityReportSummary(vulns []scanner.OSVulnerability, appVulns []scanner.AppVulnerability, configIssues []configcheck.ConfigIssue) (string, error) {
	criticalCount := 0
	highCount := 0
	mediumCount := 0

	for _, v := range vulns {
		switch v.Severity {
		case scanner.SeverityCritical:
			criticalCount++
		case scanner.SeverityHigh:
			highCount++
		case scanner.SeverityMedium:
			mediumCount++
		}
	}
	for _, v := range appVulns {
		switch v.Severity {
		case scanner.SeverityCritical:
			criticalCount++
		case scanner.SeverityHigh:
			highCount++
		case scanner.SeverityMedium:
			mediumCount++
		}
	}

	prompt := fmt.Sprintf(`请用中文生成一份容器安全扫描报告的摘要。

统计数据：
- 严重漏洞 (Critical): %d 个
- 高危漏洞 (High): %d 个
- 中危漏洞 (Medium): %d 个
- 配置问题: %d 个

请生成一份简洁专业的报告摘要，包括：
1. 整体安全状况评估
2. 最需要关注的问题
3. 建议的优先级修复顺序

请用简洁的语言描述，不超过300字。`,
		criticalCount, highCount, mediumCount, len(configIssues))

	return c.callLLM(prompt)
}
