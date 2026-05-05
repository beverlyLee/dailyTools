package dedup

import (
	"os"
	"path/filepath"
	"strings"
	"syscall"
)

type Scanner struct {
	config *ScannerConfig
}

func NewScanner(config *ScannerConfig) *Scanner {
	return &Scanner{config: config}
}

func (s *Scanner) Scan(dirPath string) ([]*FileInfo, error) {
	var files []*FileInfo

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			if s.shouldExcludeDir(path) {
				return filepath.SkipDir
			}
			return nil
		}

		if s.shouldExcludeFile(path, info) {
			return nil
		}

		fileInfo := &FileInfo{
			Path:    path,
			Size:    info.Size(),
			ModTime: info.ModTime().Unix(),
			Mode:    info.Mode(),
		}

		if s.config.CheckHardLinks {
			if stat, ok := info.Sys().(*syscall.Stat_t); ok {
				fileInfo.Inode = stat.Ino
			}
		}

		files = append(files, fileInfo)
		return nil
	})

	if err != nil {
		return nil, err
	}

	return files, nil
}

func (s *Scanner) GroupBySize(files []*FileInfo) map[int64][]*FileInfo {
	sizeMap := make(map[int64][]*FileInfo)
	for _, file := range files {
		sizeMap[file.Size] = append(sizeMap[file.Size], file)
	}

	result := make(map[int64][]*FileInfo)
	for size, fileList := range sizeMap {
		if len(fileList) > 1 {
			result[size] = fileList
		}
	}

	return result
}

func (s *Scanner) shouldExcludeDir(path string) bool {
	for _, excludeDir := range s.config.ExcludeDirs {
		if strings.Contains(path, excludeDir) {
			return true
		}
	}
	return false
}

func (s *Scanner) shouldExcludeFile(path string, info os.FileInfo) bool {
	if info.Size() < s.config.MinSize {
		return true
	}

	if s.config.MaxSize > 0 && info.Size() > s.config.MaxSize {
		return true
	}

	if len(s.config.IncludeExtensions) > 0 {
		ext := strings.ToLower(filepath.Ext(path))
		found := false
		for _, includeExt := range s.config.IncludeExtensions {
			if strings.EqualFold(ext, includeExt) {
				found = true
				break
			}
		}
		if !found {
			return true
		}
	}

	return false
}
