package scanner

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/security-monitoring-toolkit/internal/common"
)

type Scanner struct {
	config *ScannerConfig
}

func NewScanner(config *ScannerConfig) *Scanner {
	if config == nil {
		config = DefaultConfig()
	}
	return &Scanner{config: config}
}

type fileJob struct {
	path string
}

type scanResult struct {
	path     string
	findings []common.Finding
	err      error
}

func (s *Scanner) Scan(targetPath string) (*common.ScanReport, error) {
	info, err := os.Stat(targetPath)
	if err != nil {
		return nil, fmt.Errorf("failed to access target path: %w", err)
	}

	startTime := time.Now()
	scanID := common.GenerateID()

	var filesToScan []string

	if info.IsDir() {
		filesToScan, err = s.collectFiles(targetPath)
		if err != nil {
			return nil, err
		}
	} else {
		if !s.config.ShouldIgnore(targetPath) {
			filesToScan = append(filesToScan, targetPath)
		}
	}

	findings, scannedFiles, ignoredFiles := s.scanFilesParallel(filesToScan)

	report := &common.ScanReport{
		ScanID:       scanID,
		StartTime:    startTime,
		EndTime:      time.Now(),
		TargetPath:   targetPath,
		TotalFiles:   len(filesToScan),
		ScannedFiles: scannedFiles,
		Findings:     findings,
		SeverityCounts: make(map[common.SeverityLevel]int),
		IgnoredFiles: ignoredFiles,
	}

	for _, f := range findings {
		report.SeverityCounts[f.Severity]++
	}

	return report, nil
}

func (s *Scanner) collectFiles(root string) ([]string, error) {
	var files []string

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if info.IsDir() {
			base := filepath.Base(path)
			for _, ignoredDir := range s.config.IgnoreDirs {
				if base == ignoredDir {
					return filepath.SkipDir
				}
			}
			return nil
		}

		if !s.config.ShouldIgnore(path) {
			if s.config.MaxFileSizeKB > 0 {
				if info.Size() > s.config.MaxFileSizeKB*1024 {
					return nil
				}
			}

			isBinary, _ := common.IsBinaryFile(path)
			if !isBinary {
				files = append(files, path)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return files, nil
}

func (s *Scanner) scanFilesParallel(files []string) ([]common.Finding, int, []string) {
	var allFindings []common.Finding
	var ignoredFiles []string
	var scannedCount int
	var mu sync.Mutex

	jobs := make(chan fileJob, len(files))
	results := make(chan scanResult, len(files))

	var wg sync.WaitGroup
	workerCount := s.config.Workers
	if workerCount < 1 {
		workerCount = 1
	}

	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				findings, err := s.scanFile(job.path)
				results <- scanResult{
					path:     job.path,
					findings: findings,
					err:      err,
				}
			}
		}()
	}

	for _, file := range files {
		jobs <- fileJob{path: file}
	}
	close(jobs)

	go func() {
		wg.Wait()
		close(results)
	}()

	for result := range results {
		if result.err != nil {
			continue
		}
		mu.Lock()
		if len(result.findings) > 0 {
			allFindings = append(allFindings, result.findings...)
		}
		scannedCount++
		mu.Unlock()
	}

	return allFindings, scannedCount, ignoredFiles
}

func (s *Scanner) scanFile(path string) ([]common.Finding, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	buf := make([]byte, 1024*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	var findings []common.Finding

	for lineNum, line := range lines {
		for _, rule := range s.config.Rules {
			if !rule.Enabled {
				continue
			}

			if rule.Pattern.MatchString(line) {
				matches := rule.Pattern.FindAllString(line, -1)
				for _, match := range matches {
					if len(strings.TrimSpace(match)) == 0 {
						continue
					}

					contextLines := s.getContext(lines, lineNum, rule.ContextLines)

					finding := common.Finding{
						ID:          common.GenerateID(),
						Type:        rule.Category,
						Severity:    rule.Severity,
						Description: rule.Description,
						FilePath:    path,
						LineNumber:  lineNum + 1,
						LineContent: line,
						RuleName:    rule.Name,
						Context:     contextLines,
					}

					findings = append(findings, finding)
				}
			}
		}
	}

	return findings, nil
}

func (s *Scanner) getContext(lines []string, currentLine int, contextLines int) string {
	if contextLines <= 0 {
		return ""
	}

	start := currentLine - contextLines
	if start < 0 {
		start = 0
	}

	end := currentLine + contextLines + 1
	if end > len(lines) {
		end = len(lines)
	}

	var context strings.Builder
	for i := start; i < end; i++ {
		prefix := "   "
		if i == currentLine {
			prefix = "-> "
		}
		context.WriteString(fmt.Sprintf("%s%d: %s\n", prefix, i+1, lines[i]))
	}

	return context.String()
}
