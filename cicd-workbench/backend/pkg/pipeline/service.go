package pipeline

import (
	"fmt"
	"regexp"
	"strings"
)

type Stage struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
	Jobs []Job  `json:"jobs"`
}

type Job struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Template    string `json:"template"`
}

type Pipeline struct {
	Stages []Stage `json:"stages"`
}

type ValidationResult struct {
	Valid   bool     `json:"valid"`
	Errors  []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

type Service struct {
	validStageTypes map[string]bool
	validJobTemplates map[string]bool
}

func NewService() *Service {
	return &Service{
		validStageTypes: map[string]bool{
			"build":   true,
			"test":    true,
			"deploy":  true,
			"notify":  true,
		},
		validJobTemplates: map[string]bool{
			"npm-install":      true,
			"npm-build":        true,
			"docker-build":     true,
			"unit-test":        true,
			"integration-test": true,
			"lint":             true,
			"deploy-dev":       true,
			"deploy-prod":      true,
			"rollback":         true,
			"slack-notify":     true,
			"email-notify":     true,
		},
	}
}

func (s *Service) Validate(pipeline *Pipeline) *ValidationResult {
	result := &ValidationResult{
		Valid:  true,
		Errors: []string{},
		Warnings: []string{},
	}

	if len(pipeline.Stages) == 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "流水线至少需要包含一个阶段")
		return result
	}

	stageIDMap := make(map[string]bool)
	for i, stage := range pipeline.Stages {
		s.validateStage(&stage, i, result, stageIDMap)
	}

	if len(result.Errors) > 0 {
		result.Valid = false
	}

	return result
}

func (s *Service) validateStage(stage *Stage, index int, result *ValidationResult, stageIDMap map[string]bool) {
	if stage.ID == "" {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d]: 缺少阶段ID", index))
	} else if stageIDMap[stage.ID] {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d]: 阶段ID '%s' 重复", index, stage.ID))
	} else {
		stageIDMap[stage.ID] = true
	}

	if stage.Name == "" {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d]: 阶段名称不能为空", index))
	} else if len(stage.Name) > 100 {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d]: 阶段名称不能超过100个字符", index))
	}

	if stage.Type == "" {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d]: 阶段类型不能为空", index))
	} else if !s.validStageTypes[stage.Type] {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d]: 无效的阶段类型 '%s'", index, stage.Type))
	}

	if len(stage.Jobs) == 0 {
		result.Warnings = append(result.Warnings, fmt.Sprintf("阶段[%d] '%s': 该阶段没有包含任何任务", index, stage.Name))
	}

	jobIDMap := make(map[string]bool)
	for j, job := range stage.Jobs {
		s.validateJob(&job, index, j, result, jobIDMap)
	}
}

func (s *Service) validateJob(job *Job, stageIndex, jobIndex int, result *ValidationResult, jobIDMap map[string]bool) {
	if job.ID == "" {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d] 任务[%d]: 缺少任务ID", stageIndex, jobIndex))
	} else if jobIDMap[job.ID] {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d] 任务[%d]: 任务ID '%s' 重复", stageIndex, jobIndex, job.ID))
	} else {
		jobIDMap[job.ID] = true
	}

	if job.Name == "" {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d] 任务[%d]: 任务名称不能为空", stageIndex, jobIndex))
	} else if len(job.Name) > 200 {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d] 任务[%d]: 任务名称不能超过200个字符", stageIndex, jobIndex))
	}

	if job.Template != "" && !s.validJobTemplates[job.Template] {
		result.Warnings = append(result.Warnings, fmt.Sprintf("阶段[%d] 任务[%d]: 未知的任务模板 '%s'", stageIndex, jobIndex, job.Template))
	}

	s.validateJobName(job.Name, stageIndex, jobIndex, result)
}

func (s *Service) validateJobName(name string, stageIndex, jobIndex int, result *ValidationResult) {
	invalidChars := regexp.MustCompile(`[<>:"/\\|?*]`)
	if invalidChars.MatchString(name) {
		result.Errors = append(result.Errors, fmt.Sprintf("阶段[%d] 任务[%d]: 任务名称包含无效字符", stageIndex, jobIndex))
	}

	if strings.TrimSpace(name) != name {
		result.Warnings = append(result.Warnings, fmt.Sprintf("阶段[%d] 任务[%d]: 任务名称包含首尾空格", stageIndex, jobIndex))
	}
}

func (s *Service) ExportToYAML(pipeline *Pipeline) (string, error) {
	return "", nil
}
