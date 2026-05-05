package model

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// HuggingFaceModelInfo 表示 Hugging Face 模型信息
type HuggingFaceModelInfo struct {
	ModelID       string
	Revision      string
	Author        string
	Description   string
	Tags          []string
	Downloads     int64
	LastUpdated   time.Time
}

// DownloadProgress 表示下载进度
type DownloadProgress struct {
	FileName     string
	TotalSize    int64
	Downloaded   int64
	Percentage   float64
	Speed        float64 // 字节/秒
	IsResuming   bool
	DownloadedAt time.Time
}

// DownloadFromHuggingFace 从 Hugging Face 下载模型（支持断点续传）
func DownloadFromHuggingFace(modelID string) error {
	// 解析模型 ID
	parts := strings.SplitN(modelID, "@", 2)
	actualModelID := parts[0]
	revision := "main"
	if len(parts) > 1 {
		revision = parts[1]
	}

	// 获取模型目录
	modelDir, err := getModelDirectory()
	if err != nil {
		return err
	}

	// 创建模型保存目录
	saveDir := filepath.Join(modelDir, actualModelID)
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return fmt.Errorf("创建模型目录失败: %v", err)
	}

	// 这里是一个简化实现，实际实现需要：
	// 1. 调用 Hugging Face API 获取模型文件列表
	// 2. 并行下载多个文件
	// 3. 实现断点续传
	// 4. 显示下载进度

	// 示例：下载一个模型文件
	// 实际实现中，应该先获取模型的文件列表
	fmt.Printf("开始下载模型: %s (版本: %s)\n", actualModelID, revision)
	fmt.Printf("保存目录: %s\n", saveDir)

	// 这里只是一个演示，实际实现需要调用 Hugging Face 的 API
	// 例如，使用以下 API 获取模型信息：
	// https://huggingface.co/api/models/{model_id}

	// 模拟下载进度显示
	progress := &DownloadProgress{
		FileName:     "model.safetensors",
		TotalSize:    5 * 1024 * 1024 * 1024, // 5GB 示例
		Downloaded:   0,
		IsResuming:   false,
		DownloadedAt: time.Now(),
	}

	// 检查是否存在部分下载的文件
	partialFile := filepath.Join(saveDir, progress.FileName+".part")
	if fileInfo, err := os.Stat(partialFile); err == nil {
		progress.Downloaded = fileInfo.Size()
		progress.IsResuming = true
		fmt.Printf("找到部分下载的文件，从 %s 处继续下载\n", formatSize(progress.Downloaded))
	}

	// 模拟下载过程
	displayProgress(progress)

	// 实际实现中，这里应该执行 HTTP 请求下载文件
	// 支持断点续传的关键是使用 Range 请求头

	// 模拟下载完成
	progress.Downloaded = progress.TotalSize
	progress.Percentage = 100.0
	displayProgress(progress)
	fmt.Println("\n下载完成")

	// 将部分文件重命名为完整文件
	if progress.IsResuming {
		os.Rename(partialFile, filepath.Join(saveDir, progress.FileName))
	}

	return nil
}

// downloadFileWithResume 下载文件（支持断点续传）
func downloadFileWithResume(url string, savePath string, progressChan chan<- DownloadProgress) error {
	// 检查是否存在部分下载的文件
	var downloaded int64 = 0
	partialPath := savePath + ".part"

	if fileInfo, err := os.Stat(partialPath); err == nil {
		downloaded = fileInfo.Size()
	}

	// 创建 HTTP 请求
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	// 设置 Range 头以支持断点续传
	if downloaded > 0 {
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-", downloaded))
	}

	// 发送请求
	client := &http.Client{
		Timeout: 30 * time.Minute, // 长时间下载的超时设置
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// 检查响应状态
	if resp.StatusCode == http.StatusPartialContent && downloaded > 0 {
		// 断点续传成功
	} else if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("下载失败，状态码: %d", resp.StatusCode)
	}

	// 获取文件总大小
	var totalSize int64
	if contentRange := resp.Header.Get("Content-Range"); contentRange != "" {
		// 解析 Content-Range 头获取总大小
		// 格式: bytes 0-999/1000
		parts := strings.Split(contentRange, "/")
		if len(parts) == 2 {
			totalSize, _ = strconv.ParseInt(parts[1], 10, 64)
		}
	} else {
		totalSize = resp.ContentLength
	}

	// 打开文件（追加模式）
	var file *os.File
	var errOpen error

	if downloaded > 0 {
		file, errOpen = os.OpenFile(partialPath, os.O_APPEND|os.O_WRONLY, 0644)
	} else {
		file, errOpen = os.Create(partialPath)
	}

	if errOpen != nil {
		return errOpen
	}
	defer file.Close()

	// 设置缓冲区大小
	buffer := make([]byte, 32*1024) // 32KB 缓冲区
	startTime := time.Now()
	lastUpdateTime := startTime
	var lastDownloaded int64 = downloaded

	// 下载循环
	for {
		// 读取响应体
		n, errRead := resp.Body.Read(buffer)
		if n > 0 {
			// 写入文件
			if _, errWrite := file.Write(buffer[:n]); errWrite != nil {
				return errWrite
			}

			downloaded += int64(n)

			// 计算并显示进度（每秒更新一次）
			now := time.Now()
			if now.Sub(lastUpdateTime) >= time.Second {
				var percentage float64
				if totalSize > 0 {
					percentage = float64(downloaded) / float64(totalSize) * 100
				}

				// 计算下载速度
				elapsed := now.Sub(lastUpdateTime).Seconds()
				var speed float64
				if elapsed > 0 {
					speed = float64(downloaded-lastDownloaded) / elapsed
				}

				// 发送进度更新
				if progressChan != nil {
					progressChan <- DownloadProgress{
						FileName:     filepath.Base(savePath),
						TotalSize:    totalSize,
						Downloaded:   downloaded,
						Percentage:   percentage,
						Speed:        speed,
						IsResuming:   downloaded > int64(n),
						DownloadedAt: now,
					}
				}

				lastUpdateTime = now
				lastDownloaded = downloaded
			}
		}

		if errRead != nil {
			if errRead == io.EOF {
				// 下载完成
				break
			}
			return errRead
		}
	}

	// 重命名临时文件
	if err := os.Rename(partialPath, savePath); err != nil {
		return err
	}

	// 发送最终进度
	if progressChan != nil {
		close(progressChan)
	}

	return nil
}

// displayProgress 显示下载进度
func displayProgress(progress *DownloadProgress) {
	// 计算进度条
	barWidth := 50
	filled := int(float64(barWidth) * progress.Percentage / 100)
	bar := strings.Repeat("=", filled) + strings.Repeat(" ", barWidth-filled)

	// 格式化速度
	speedStr := formatSize(int64(progress.Speed)) + "/s"

	// 显示进度
	fmt.Printf("\r[%s] %.2f%% | %s/%s | %s",
		bar,
		progress.Percentage,
		formatSize(progress.Downloaded),
		formatSize(progress.TotalSize),
		speedStr,
	)
}

// GetHuggingFaceModelInfo 获取 Hugging Face 模型信息
func GetHuggingFaceModelInfo(modelID string) (*HuggingFaceModelInfo, error) {
	// 这里是一个简化实现，实际实现需要调用 Hugging Face API
	// API 端点: https://huggingface.co/api/models/{model_id}

	// 解析模型 ID
	parts := strings.SplitN(modelID, "@", 2)
	actualModelID := parts[0]
	revision := "main"
	if len(parts) > 1 {
		revision = parts[1]
	}

	// 模拟获取模型信息
	// 实际实现中，应该发送 HTTP 请求到 Hugging Face API

	return &HuggingFaceModelInfo{
		ModelID:     actualModelID,
		Revision:    revision,
		Author:      "未知作者",
		Description: "这是一个示例模型描述",
		Tags:        []string{"example", "model"},
		Downloads:   10000,
		LastUpdated: time.Now(),
	}, nil
}

// ListHuggingFaceModels 搜索 Hugging Face 上的模型
func ListHuggingFaceModels(query string, limit int) ([]HuggingFaceModelInfo, error) {
	// 这里是一个简化实现，实际实现需要调用 Hugging Face API
	// API 端点: https://huggingface.co/api/models?search={query}&limit={limit}

	// 模拟返回一些示例模型
	models := []HuggingFaceModelInfo{
		{
			ModelID:     "bert-base-uncased",
			Revision:    "main",
			Author:      "Google",
			Description: "BERT base model (uncased)",
			Tags:        []string{"bert", "nlp"},
			Downloads:   1000000,
			LastUpdated: time.Now().AddDate(0, -1, 0),
		},
		{
			ModelID:     "gpt2",
			Revision:    "main",
			Author:      "OpenAI",
			Description: "GPT-2 model",
			Tags:        []string{"gpt", "nlp"},
			Downloads:   500000,
			LastUpdated: time.Now().AddDate(0, -2, 0),
		},
	}

	return models, nil
}
