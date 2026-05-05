package notifications

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/slack-go/slack"
	"gopkg.in/gomail.v2"
)

type SlackConfig struct {
	Enabled       bool   `json:"enabled"`
	WebhookURL    string `json:"webhook_url"`
	DefaultChannel string `json:"default_channel"`
	Username      string `json:"username"`
	IconEmoji     string `json:"icon_emoji"`
}

type EmailConfig struct {
	Enabled     bool     `json:"enabled"`
	SMTPHost    string   `json:"smtp_host"`
	SMTPPort    int      `json:"smtp_port"`
	Username    string   `json:"username"`
	Password    string   `json:"password"`
	FromAddress string   `json:"from_address"`
	ToAddresses []string `json:"to_addresses"`
	UseTLS      bool     `json:"use_tls"`
}

type Notification struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Message   string                 `json:"message"`
	Status    string                 `json:"status"`
	SentAt    *time.Time             `json:"sent_at,omitempty"`
	Error     string                 `json:"error,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

type Service struct {
	mu           sync.RWMutex
	slackConfig  SlackConfig
	emailConfig  EmailConfig
	notifications []Notification
}

func NewService() *Service {
	return &Service{
		notifications: make([]Notification, 0),
	}
}

func (s *Service) SaveSlackConfig(config SlackConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.slackConfig = config
	return nil
}

func (s *Service) GetSlackConfig() SlackConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.slackConfig
}

func (s *Service) SaveEmailConfig(config EmailConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.emailConfig = config
	return nil
}

func (s *Service) GetEmailConfig() EmailConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.emailConfig
}

func (s *Service) TestSlackConnection() error {
	config := s.GetSlackConfig()
	
	if !config.Enabled {
		return errors.New("slack notifications are not enabled")
	}
	
	if config.WebhookURL == "" {
		return errors.New("slack webhook URL is not configured")
	}

	msg := &slack.WebhookMessage{
		Text:     "🔔 CI/CD Workbench - 测试消息",
		Username: config.Username,
		IconEmoji: config.IconEmoji,
		Attachments: []slack.Attachment{
			{
				Color: "good",
				Fields: []slack.AttachmentField{
					{
						Title: "状态",
						Value: "✅ Slack 连接测试成功",
						Short: true,
					},
					{
						Title: "时间",
						Value: time.Now().Format("2006-01-02 15:04:05"),
						Short: true,
					},
				},
			},
		},
	}

	err := slack.PostWebhook(config.WebhookURL, msg)
	if err != nil {
		return fmt.Errorf("failed to send slack message: %w", err)
	}

	notification := Notification{
		ID:      generateID(),
		Type:    "slack",
		Title:   "测试消息",
		Message: "Slack 连接测试成功",
		Status:  "sent",
	}
	now := time.Now()
	notification.SentAt = &now
	s.addNotification(notification)

	return nil
}

func (s *Service) TestEmailConnection() error {
	config := s.GetEmailConfig()
	
	if !config.Enabled {
		return errors.New("email notifications are not enabled")
	}
	
	if config.SMTPHost == "" {
		return errors.New("SMTP host is not configured")
	}

	m := gomail.NewMessage()
	m.SetHeader("From", config.FromAddress)
	m.SetHeader("To", config.ToAddresses...)
	m.SetHeader("Subject", "CI/CD Workbench - 测试邮件")
	m.SetBody("text/html", `
		<h1>🔔 CI/CD Workbench</h1>
		<p>这是一封测试邮件，用于验证邮件通知配置。</p>
		<p><strong>状态:</strong> ✅ 邮件连接测试成功</p>
		<p><strong>时间:</strong> `+time.Now().Format("2006-01-02 15:04:05")+`</p>
		<hr>
		<p style="color: #999; font-size: 12px;">由 CI/CD Workbench 自动发送</p>
	`)

	d := gomail.NewDialer(config.SMTPHost, config.SMTPPort, config.Username, config.Password)
	
	if err := d.DialAndSend(m); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	notification := Notification{
		ID:      generateID(),
		Type:    "email",
		Title:   "测试邮件",
		Message: "邮件连接测试成功",
		Status:  "sent",
	}
	now := time.Now()
	notification.SentAt = &now
	s.addNotification(notification)

	return nil
}

func (s *Service) SendBuildNotification(buildID, pipelineName, status string) error {
	config := s.GetSlackConfig()
	if config.Enabled && config.WebhookURL != "" {
		go func() {
			_ = s.sendSlackBuildNotification(buildID, pipelineName, status)
		}()
	}

	emailConfig := s.GetEmailConfig()
	if emailConfig.Enabled && emailConfig.SMTPHost != "" {
		go func() {
			_ = s.sendEmailBuildNotification(buildID, pipelineName, status)
		}()
	}

	return nil
}

func (s *Service) sendSlackBuildNotification(buildID, pipelineName, status string) error {
	config := s.GetSlackConfig()
	
	var color string
	var statusText string
	var statusEmoji string
	
	switch status {
	case "success":
		color = "good"
		statusText = "构建成功"
		statusEmoji = "✅"
	case "failed":
		color = "danger"
		statusText = "构建失败"
		statusEmoji = "❌"
	case "running":
		color = "warning"
		statusText = "构建开始"
		statusEmoji = "🔄"
	default:
		color = "#808080"
		statusText = status
		statusEmoji = "📋"
	}

	msg := &slack.WebhookMessage{
		Text: fmt.Sprintf("%s CI/CD 构建通知 - %s", statusEmoji, pipelineName),
		Username: config.Username,
		IconEmoji: config.IconEmoji,
		Attachments: []slack.Attachment{
			{
				Color: color,
				Fields: []slack.AttachmentField{
					{
						Title: "流水线",
						Value: pipelineName,
						Short: true,
					},
					{
						Title: "构建ID",
						Value: buildID,
						Short: true,
					},
					{
						Title: "状态",
						Value: fmt.Sprintf("%s %s", statusEmoji, statusText),
						Short: true,
					},
					{
						Title: "时间",
						Value: time.Now().Format("2006-01-02 15:04:05"),
						Short: true,
					},
				},
			},
		},
	}

	return slack.PostWebhook(config.WebhookURL, msg)
}

func (s *Service) sendEmailBuildNotification(buildID, pipelineName, status string) error {
	config := s.GetEmailConfig()
	
	var subject string
	var statusText string
	var statusEmoji string
	
	switch status {
	case "success":
		subject = fmt.Sprintf("✅ 构建成功 - %s", pipelineName)
		statusText = "构建成功"
		statusEmoji = "✅"
	case "failed":
		subject = fmt.Sprintf("❌ 构建失败 - %s", pipelineName)
		statusText = "构建失败"
		statusEmoji = "❌"
	case "running":
		subject = fmt.Sprintf("🔄 构建开始 - %s", pipelineName)
		statusText = "构建开始"
		statusEmoji = "🔄"
	default:
		subject = fmt.Sprintf("📋 构建通知 - %s", pipelineName)
		statusText = status
		statusEmoji = "📋"
	}

	m := gomail.NewMessage()
	m.SetHeader("From", config.FromAddress)
	m.SetHeader("To", config.ToAddresses...)
	m.SetHeader("Subject", subject)
	
	body := fmt.Sprintf(`
		<h1>%s CI/CD 构建通知</h1>
		<table style="border-collapse: collapse; width: 100%%; max-width: 600px;">
			<tr style="background-color: #f5f5f5;">
				<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">项目</th>
				<th style="padding: 12px; text-align: left; border: 1px solid #ddd;">值</th>
			</tr>
			<tr>
				<td style="padding: 12px; border: 1px solid #ddd;"><strong>流水线</strong></td>
				<td style="padding: 12px; border: 1px solid #ddd;">%s</td>
			</tr>
			<tr>
				<td style="padding: 12px; border: 1px solid #ddd;"><strong>构建ID</strong></td>
				<td style="padding: 12px; border: 1px solid #ddd;"><code>%s</code></td>
			</tr>
			<tr>
				<td style="padding: 12px; border: 1px solid #ddd;"><strong>状态</strong></td>
				<td style="padding: 12px; border: 1px solid #ddd;">%s %s</td>
			</tr>
			<tr>
				<td style="padding: 12px; border: 1px solid #ddd;"><strong>时间</strong></td>
				<td style="padding: 12px; border: 1px solid #ddd;">%s</td>
			</tr>
		</table>
		<hr>
		<p style="color: #999; font-size: 12px;">由 CI/CD Workbench 自动发送</p>
	`, statusEmoji, pipelineName, buildID, statusEmoji, statusText, time.Now().Format("2006-01-02 15:04:05"))
	
	m.SetBody("text/html", body)

	d := gomail.NewDialer(config.SMTPHost, config.SMTPPort, config.Username, config.Password)
	return d.DialAndSend(m)
}

func (s *Service) addNotification(notification Notification) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.notifications = append(s.notifications, notification)
}

func (s *Service) GetNotifications() []Notification {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.notifications
}

func generateID() string {
	return fmt.Sprintf("notif-%d", time.Now().UnixNano())
}
