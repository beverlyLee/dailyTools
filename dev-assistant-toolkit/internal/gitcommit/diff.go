package gitcommit

import (
	"bytes"
	"fmt"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

type DiffAnalysis struct {
	Files          []string
	CommitType     string
	Description    string
	IsBreaking     bool
	ModifiedDirs   map[string]int
}

func AnalyzeDiff() (*DiffAnalysis, error) {
	cmd := exec.Command("git", "diff", "--cached", "--name-only")
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("获取暂存区文件失败: %w", err)
	}
	
	files := strings.Split(strings.TrimSpace(out.String()), "\n")
	if len(files) == 0 || files[0] == "" {
		return nil, fmt.Errorf("暂存区没有文件")
	}
	
	modifiedDirs := make(map[string]int)
	for _, f := range files {
		dir := filepath.Dir(f)
		if dir != "." {
			modifiedDirs[dir]++
		}
	}
	
	commitType := suggestCommitType(files)
	isBreaking := checkBreakingChanges(files)
	
	return &DiffAnalysis{
		Files:        files,
		CommitType:   commitType,
		IsBreaking:   isBreaking,
		ModifiedDirs: modifiedDirs,
	}, nil
}

func suggestCommitType(files []string) string {
	var hasTests, hasDocs, hasBuild, hasConfig bool
	
	for _, f := range files {
		switch {
		case strings.Contains(f, "_test.go") || strings.Contains(f, ".spec."):
			hasTests = true
		case strings.HasSuffix(f, ".md") || strings.HasSuffix(f, ".rst"):
			hasDocs = true
		case strings.Contains(f, "package.json") || strings.Contains(f, "go.mod") ||
			strings.Contains(f, "Cargo.toml") || strings.Contains(f, "Makefile"):
			hasBuild = true
		case strings.HasSuffix(f, ".json") || strings.HasSuffix(f, ".yml") ||
			strings.HasSuffix(f, ".yaml") || strings.HasSuffix(f, ".toml"):
			hasConfig = true
		}
	}
	
	if hasTests && len(files) == 1 {
		return "test"
	}
	if hasDocs && !hasBuild && !hasConfig {
		return "docs"
	}
	if hasBuild && !hasDocs && !hasConfig {
		return "build"
	}
	
	return "feat"
}

func checkBreakingChanges(files []string) bool {
	for _, f := range files {
		content, err := getDiffContent(f)
		if err != nil {
			continue
		}
		if containsBreakingChange(content) {
			return true
		}
	}
	return false
}

func getDiffContent(filename string) (string, error) {
	cmd := exec.Command("git", "diff", "--cached", filename)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", err
	}
	return out.String(), nil
}

func containsBreakingChange(content string) bool {
	patterns := []string{
		`BREAKING CHANGE`,
		`breaking change`,
		`deprecated`,
		`remove.*parameter`,
		`change.*return`,
	}
	
	for _, p := range patterns {
		re := regexp.MustCompile("(?i)" + p)
		if re.MatchString(content) {
			return true
		}
	}
	return false
}
