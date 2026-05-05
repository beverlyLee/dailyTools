package gitcommit

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type OllamaClient struct {
	BaseURL string
	Model   string
}

type OllamaRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

type OllamaResponse struct {
	Response string `json:"response"`
}

func NewOllamaClient() *OllamaClient {
	baseURL := os.Getenv("OLLAMA_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}
	
	model := os.Getenv("OLLAMA_MODEL")
	if model == "" {
		model = "llama3"
	}
	
	return &OllamaClient{
		BaseURL: baseURL,
		Model:   model,
	}
}

func (c *OllamaClient) IsAvailable() bool {
	client := http.Client{
		Timeout: 2 * time.Second,
	}
	
	resp, err := client.Get(c.BaseURL + "/api/tags")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	
	return resp.StatusCode == http.StatusOK
}

func (c *OllamaClient) GenerateCommitMessage(diff string) (string, error) {
	prompt := fmt.Sprintf(`你是一个专业的 Git 提交信息生成助手。
根据以下 git diff 内容，生成一个符合 Conventional Commits 规范的提交信息。

要求：
1. 第一行必须是: <type>(<scope>): <subject> 格式
2. type 必须是: feat, fix, docs, style, refactor, perf, test, chore, build, ci 之一
3. subject 要简洁明了，不超过 50 字符
4. 如果有重大变更，在底部添加 "BREAKING CHANGE:" 说明
5. 只返回提交信息本身，不要其他解释

Diff 内容：
%s`, diff)

	request := OllamaRequest{
		Model:  c.Model,
		Prompt: prompt,
		Stream: false,
	}
	
	body, err := json.Marshal(request)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}
	
	client := http.Client{
		Timeout: 30 * time.Second,
	}
	
	resp, err := client.Post(c.BaseURL+"/api/generate", "application/json", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("请求 Ollama 失败: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Ollama 返回错误: %s - %s", resp.Status, string(bodyBytes))
	}
	
	var response OllamaResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}
	
	return response.Response, nil
}

func GenerateWithAI(diff string) (string, error) {
	client := NewOllamaClient()
	
	if !client.IsAvailable() {
		return "", fmt.Errorf("Ollama 服务不可用，请确保 Ollama 已启动")
	}
	
	return client.GenerateCommitMessage(diff)
}
