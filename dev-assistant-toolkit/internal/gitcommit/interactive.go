package gitcommit

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/AlecAivazis/survey/v2"
)

var commitTypes = []string{
	"feat: 新功能",
	"fix: 修复 bug",
	"docs: 文档更新",
	"style: 代码格式（不影响功能）",
	"refactor: 重构代码",
	"perf: 性能优化",
	"test: 测试相关",
	"chore: 构建/工具相关",
	"build: 构建系统",
	"ci: CI/CD 相关",
}

func RunInteractive(analysis *DiffAnalysis) error {
	fmt.Println("=== 智能 Git 提交助手 ===")
	fmt.Println()
	
	if len(analysis.Files) > 0 {
		fmt.Println("暂存的文件:")
		for _, f := range analysis.Files {
			fmt.Printf("  - %s\n", f)
		}
		fmt.Println()
	}
	
	if analysis.IsBreaking {
		fmt.Println("⚠️  检测到可能的破坏性变更")
		fmt.Println()
	}
	
	answers := struct {
		Type        string
		Scope       string
		Subject     string
		Body        string
		Breaking    bool
		BreakingMsg string
		Confirm     bool
	}{}
	
	defaultType := getDefaultType(analysis.CommitType)
	
	qs := []*survey.Question{
		{
			Name: "Type",
			Prompt: &survey.Select{
				Message: "选择提交类型:",
				Options: commitTypes,
				Default: defaultType,
			},
		},
		{
			Name: "Scope",
			Prompt: &survey.Input{
				Message: "范围 (可选):",
				Help:    "例如: api, ui, core 等",
			},
		},
		{
			Name: "Subject",
			Prompt: &survey.Input{
				Message: "简短描述:",
				Help:    "简洁明了地描述这次变更",
			},
			Validate: survey.Required,
		},
		{
			Name: "Body",
			Prompt: &survey.Multiline{
				Message: "详细描述 (可选):",
				Help:    "提供更详细的变更说明",
			},
		},
	}
	
	if analysis.IsBreaking {
		qs = append(qs, &survey.Question{
			Name: "Breaking",
			Prompt: &survey.Confirm{
				Message: "这是一个破坏性变更吗?",
				Default: true,
			},
		})
		qs = append(qs, &survey.Question{
			Name: "BreakingMsg",
			Prompt: &survey.Multiline{
				Message: "破坏性变更描述:",
				Help:    "描述具体的破坏性变更和迁移指南",
			},
		})
	}
	
	qs = append(qs, &survey.Question{
		Name: "Confirm",
		Prompt: &survey.Confirm{
			Message: "确认提交?",
			Default: true,
		},
	})
	
	err := survey.Ask(qs, &answers)
	if err != nil {
		return err
	}
	
	if !answers.Confirm {
		fmt.Println("提交已取消")
		return nil
	}
	
	commitMsg := buildCommitMessage(answers)
	fmt.Println("\n生成的提交信息:")
	fmt.Println("-----------------")
	fmt.Println(commitMsg)
	fmt.Println("-----------------")
	
	return executeCommit(commitMsg)
}

func getDefaultType(suggestedType string) string {
	for _, t := range commitTypes {
		if strings.HasPrefix(t, suggestedType+":") {
			return t
		}
	}
	return commitTypes[0]
}

func buildCommitMessage(answers struct {
	Type        string
	Scope       string
	Subject     string
	Body        string
	Breaking    bool
	BreakingMsg string
	Confirm     bool
}) string {
	typePart := strings.SplitN(answers.Type, ":", 2)[0]
	
	var header string
	if answers.Scope != "" {
		header = fmt.Sprintf("%s(%s): %s", typePart, answers.Scope, answers.Subject)
	} else {
		header = fmt.Sprintf("%s: %s", typePart, answers.Subject)
	}
	
	var msg strings.Builder
	msg.WriteString(header)
	
	if answers.Body != "" {
		msg.WriteString("\n\n")
		msg.WriteString(answers.Body)
	}
	
	if answers.Breaking && answers.BreakingMsg != "" {
		msg.WriteString("\n\nBREAKING CHANGE: ")
		msg.WriteString(answers.BreakingMsg)
	}
	
	return msg.String()
}

func executeCommit(message string) error {
	cmd := exec.Command("git", "commit", "-m", message)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}
