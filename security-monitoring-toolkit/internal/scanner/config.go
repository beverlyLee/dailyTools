package scanner

import (
	"path/filepath"
	"strings"
)

type ScannerConfig struct {
	Rules           []*ScanRule
	IgnorePatterns  []string
	IgnoreDirs      []string
	IgnoreExtensions []string
	MaxFileSizeKB   int64
	Workers         int
	ContextLines    int
	IncludeTests    bool
}

func DefaultConfig() *ScannerConfig {
	return &ScannerConfig{
		Rules:           DefaultRules,
		IgnorePatterns:  DefaultIgnorePatterns,
		IgnoreDirs:      []string{".git", "node_modules", "vendor", "dist", "build", "__pycache__"},
		IgnoreExtensions: []string{".exe", ".dll", ".so", ".dylib", ".zip", ".tar", ".gz", ".rar", ".7z", ".pdf"},
		MaxFileSizeKB:   500,
		Workers:         4,
		ContextLines:    2,
		IncludeTests:    false,
	}
}

func (c *ScannerConfig) ShouldIgnore(path string) bool {
	base := filepath.Base(path)
	ext := strings.ToLower(filepath.Ext(path))

	for _, p := range c.IgnorePatterns {
		if strings.Contains(p, "*") {
			matched, _ := filepath.Match(p, base)
			if matched {
				return true
			}
			matched, _ = filepath.Match(p, path)
			if matched {
				return true
			}
		} else {
			if strings.Contains(path, p) || base == p {
				return true
			}
		}
	}

	for _, dir := range c.IgnoreDirs {
		if strings.Contains(path, dir+string(filepath.Separator)) {
			return true
		}
		if base == dir {
			return true
		}
	}

	for _, ignoredExt := range c.IgnoreExtensions {
		if ext == ignoredExt {
			return true
		}
	}

	if !c.IncludeTests {
		testPatterns := []string{
			"test_", "_test.", ".test.",
			"spec_", "_spec.", ".spec.",
		}
		for _, p := range testPatterns {
			if strings.Contains(path, p) {
				return true
			}
		}
	}

	return false
}

func (c *ScannerConfig) AddRule(rule *ScanRule) {
	c.Rules = append(c.Rules, rule)
}

func (c *ScannerConfig) AddIgnorePattern(pattern string) {
	c.IgnorePatterns = append(c.IgnorePatterns, pattern)
}
