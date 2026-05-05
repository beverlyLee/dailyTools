package search

import (
	"archive/tar"
	"archive/zip"
	"bufio"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// searchInArchive 在压缩文件中搜索
func searchInArchive(archivePath string, re *regexp.Regexp, opts SearchOptions) ([]SearchResult, error) {
	ext := strings.ToLower(filepath.Ext(archivePath))
	
	switch ext {
	case ".zip":
		return searchInZip(archivePath, re, opts)
	case ".tar":
		return searchInTar(archivePath, re, opts)
	case ".gz", ".tgz":
		// 检查是否是 tar.gz
		if strings.HasSuffix(archivePath, ".tar.gz") || strings.HasSuffix(archivePath, ".tgz") {
			return searchInTarGz(archivePath, re, opts)
		}
		// 普通 gz 文件
		return searchInGz(archivePath, re, opts)
	default:
		return nil, fmt.Errorf("不支持的压缩文件格式: %s", ext)
	}
}

// searchInZip 在 ZIP 文件中搜索
func searchInZip(zipPath string, re *regexp.Regexp, opts SearchOptions) ([]SearchResult, error) {
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	var results []SearchResult

	for _, file := range reader.File {
		// 跳过目录
		if file.FileInfo().IsDir() {
			continue
		}

		// 检查文件类型过滤
		if opts.FileType != "" {
			fileExt := filepath.Ext(file.Name)
			if !strings.Contains(opts.FileType, fileExt) {
				continue
			}
		}

		// 打开压缩文件中的文件
		rc, err := file.Open()
		if err != nil {
			continue
		}

		fileResults, err := searchInReader(rc, zipPath+"/"+file.Name, re, opts)
		rc.Close()

		if err == nil {
			results = append(results, fileResults...)
		}
	}

	return results, nil
}

// searchInTar 在 TAR 文件中搜索
func searchInTar(tarPath string, re *regexp.Regexp, opts SearchOptions) ([]SearchResult, error) {
	file, err := os.Open(tarPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	return searchInTarReader(file, tarPath, re, opts)
}

// searchInTarGz 在 TAR.GZ 文件中搜索
func searchInTarGz(tarGzPath string, re *regexp.Regexp, opts SearchOptions) ([]SearchResult, error) {
	file, err := os.Open(tarGzPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return nil, err
	}
	defer gzReader.Close()

	return searchInTarReader(gzReader, tarGzPath, re, opts)
}

// searchInTarReader 从 tar 读取器中搜索
func searchInTarReader(reader io.Reader, archivePath string, re *regexp.Regexp, opts SearchOptions) ([]SearchResult, error) {
	tarReader := tar.NewReader(reader)
	var results []SearchResult

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}

		// 只处理普通文件
		if header.Typeflag != tar.TypeReg {
			continue
		}

		// 检查文件类型过滤
		if opts.FileType != "" {
			fileExt := filepath.Ext(header.Name)
			if !strings.Contains(opts.FileType, fileExt) {
				continue
			}
		}

		fileResults, err := searchInReader(tarReader, archivePath+"/"+header.Name, re, opts)
		if err == nil {
			results = append(results, fileResults...)
		}
	}

	return results, nil
}

// searchInGz 在 GZIP 文件中搜索
func searchInGz(gzPath string, re *regexp.Regexp, opts SearchOptions) ([]SearchResult, error) {
	file, err := os.Open(gzPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return nil, err
	}
	defer gzReader.Close()

	// 获取解压后的文件名
	baseName := filepath.Base(gzPath)
	uncompressedName := strings.TrimSuffix(baseName, ".gz")

	return searchInReader(gzReader, gzPath+"/"+uncompressedName, re, opts)
}

// searchInReader 从 io.Reader 中搜索
func searchInReader(reader io.Reader, filePath string, re *regexp.Regexp, opts SearchOptions) ([]SearchResult, error) {
	var results []SearchResult
	scanner := bufio.NewScanner(reader)
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
