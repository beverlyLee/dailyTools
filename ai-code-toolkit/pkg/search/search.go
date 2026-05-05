package search

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

// SearchResult 表示单个搜索结果
type SearchResult struct {
	FilePath    string
	LineNumber  int
	Content     string
	Highlighted string
}

// SearchOptions 定义搜索选项
type SearchOptions struct {
	Pattern         string
	FileType        string
	IncludeArchive  bool
	Highlight       bool
	CaseInsensitive bool
}

// Search 执行搜索操作
func Search(rootPath string, opts SearchOptions) ([]SearchResult, error) {
	pattern := opts.Pattern
	if opts.CaseInsensitive {
		pattern = "(?i)" + pattern
	}
	
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, fmt.Errorf("无效的正则表达式: %v", err)
	}

	var results []SearchResult
	var resultsMutex sync.Mutex
	var wg sync.WaitGroup

	// 遍历目录
	err = filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		// 跳过目录
		if info.IsDir() {
			return nil
		}
		
		// 检查文件类型过滤
		if opts.FileType != "" {
			fileExt := filepath.Ext(path)
			if !strings.Contains(opts.FileType, fileExt) {
				return nil
			}
		}
		
		// 检查是否为压缩文件（如果需要包含）
		isArchive := isArchiveFile(path)
		if isArchive && !opts.IncludeArchive {
			return nil
		}
		
		// 并发处理文件搜索
		wg.Add(1)
		go func(p string) {
			defer wg.Done()
			
			var fileResults []SearchResult
			var err error
			
			if isArchive {
				fileResults, err = searchInArchive(p, re, opts)
			} else {
				fileResults, err = searchInFile(p, re, opts)
			}
			
			if err == nil && len(fileResults) > 0 {
				resultsMutex.Lock()
				results = append(results, fileResults...)
				resultsMutex.Unlock()
			}
		}(path)
		
		return nil
	})
	
	wg.Wait()
	
	if err != nil {
		return nil, err
	}
	
	return results, nil
}

// searchInFile 在普通文件中搜索
func searchInFile(filePath string, re *regexp.Regexp, opts SearchOptions) ([]SearchResult, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var results []SearchResult
	scanner := bufio.NewScanner(file)
	lineNumber := 0

	for scanner.Scan() {
		lineNumber++
		line := scanner.Text()
		
		if re.MatchString(line) {
			result := SearchResult{
				FilePath:   filePath,
				LineNumber: lineNumber,
				Content:    line,
			}
			
			if opts.Highlight {
				result.Highlighted = highlightMatches(line, re)
			}
			
			results = append(results, result)
		}
	}
	
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	
	return results, nil
}

// highlightMatches 高亮显示匹配部分
func highlightMatches(text string, re *regexp.Regexp) string {
	// ANSI 颜色码：红色高亮
	const (
		reset = "\033[0m"
		red   = "\033[31m"
	)
	
	matches := re.FindAllStringIndex(text, -1)
	if len(matches) == 0 {
		return text
	}
	
	var result strings.Builder
	lastIndex := 0
	
	for _, match := range matches {
		start, end := match[0], match[1]
		result.WriteString(text[lastIndex:start])
		result.WriteString(red)
		result.WriteString(text[start:end])
		result.WriteString(reset)
		lastIndex = end
	}
	
	result.WriteString(text[lastIndex:])
	return result.String()
}

// isArchiveFile 检查文件是否为压缩文件
func isArchiveFile(filePath string) bool {
	ext := strings.ToLower(filepath.Ext(filePath))
	archiveExts := []string{".zip", ".tar", ".tar.gz", ".tgz", ".rar", ".7z"}
	
	for _, aExt := range archiveExts {
		if ext == aExt {
			return true
		}
	}
	
	return false
}
