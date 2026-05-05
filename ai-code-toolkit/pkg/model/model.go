package model

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ModelInfo 表示本地模型信息
type ModelInfo struct {
	Name              string
	Path              string
	Size              string
	QuantizationLevel string
	Format            string
	Description       string
}

// ListLocalModels 列出本地模型
func ListLocalModels() ([]ModelInfo, error) {
	// 获取模型存储目录
	modelDir, err := getModelDirectory()
	if err != nil {
		return nil, err
	}

	// 检查目录是否存在
	if _, err := os.Stat(modelDir); os.IsNotExist(err) {
		return []ModelInfo{}, nil
	}

	var models []ModelInfo

	// 遍历模型目录
	err = filepath.Walk(modelDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 只处理目录（假设每个模型在自己的目录中）
		if info.IsDir() && path != modelDir {
			// 检查是否是模型目录（包含模型文件）
			modelFiles, err := findModelFiles(path)
			if err != nil {
				return err
			}

			if len(modelFiles) > 0 {
				// 获取模型信息
				modelInfo, err := getModelInfoFromDirectory(path, modelFiles)
				if err == nil {
					models = append(models, modelInfo)
				}
			}

			// 不继续遍历子目录
			return filepath.SkipDir
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return models, nil
}

// getModelDirectory 获取模型存储目录
func getModelDirectory() (string, error) {
	// 优先使用环境变量
	modelDir := os.Getenv("AI_MODEL_DIR")
	if modelDir != "" {
		return modelDir, nil
	}

	// 默认使用用户主目录下的 .ai-models 目录
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	return filepath.Join(homeDir, ".ai-models"), nil
}

// findModelFiles 查找目录中的模型文件
func findModelFiles(dirPath string) ([]string, error) {
	var modelFiles []string

	// 常见的模型文件扩展名
	modelExtensions := []string{
		".gguf",  // GGUF 格式
		".bin",   // PyTorch 二进制格式
		".pt",    // PyTorch 格式
		".pth",   // PyTorch 格式
		".onnx",  // ONNX 格式
		".tf",    // TensorFlow 格式
		".h5",    // Keras 格式
		".keras", // Keras 格式
	}

	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() {
			ext := strings.ToLower(filepath.Ext(path))
			for _, modelExt := range modelExtensions {
				if ext == modelExt {
					modelFiles = append(modelFiles, path)
					break
				}
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return modelFiles, nil
}

// getModelInfoFromDirectory 从目录获取模型信息
func getModelInfoFromDirectory(dirPath string, modelFiles []string) (ModelInfo, error) {
	// 从目录名获取模型名称
	modelName := filepath.Base(dirPath)

	// 计算总大小
	var totalSize int64
	for _, file := range modelFiles {
		info, err := os.Stat(file)
		if err == nil {
			totalSize += info.Size()
		}
	}

	// 确定主要格式
	var format string
	for _, file := range modelFiles {
		ext := strings.ToLower(filepath.Ext(file))
		switch ext {
		case ".gguf":
			format = "GGUF"
		case ".bin", ".pt", ".pth":
			format = "PyTorch"
		case ".onnx":
			format = "ONNX"
		case ".tf", ".h5", ".keras":
			format = "TensorFlow"
		}
		if format != "" {
			break
		}
	}

	// 尝试确定量化级别
	quantizationLevel := "未知"
	if strings.Contains(strings.ToLower(modelName), "q4") {
		quantizationLevel = "Q4"
	} else if strings.Contains(strings.ToLower(modelName), "q5") {
		quantizationLevel = "Q5"
	} else if strings.Contains(strings.ToLower(modelName), "q8") {
		quantizationLevel = "Q8"
	} else if strings.Contains(strings.ToLower(modelName), "f16") {
		quantizationLevel = "F16"
	} else if strings.Contains(strings.ToLower(modelName), "f32") {
		quantizationLevel = "F32"
	}

	return ModelInfo{
		Name:              modelName,
		Path:              dirPath,
		Size:              formatSize(totalSize),
		QuantizationLevel: quantizationLevel,
		Format:            format,
		Description:       fmt.Sprintf("%s 模型，共 %d 个文件", format, len(modelFiles)),
	}, nil
}

// formatSize 格式化文件大小
func formatSize(size int64) string {
	const (
		KB = 1024
		MB = KB * 1024
		GB = MB * 1024
		TB = GB * 1024
	)

	switch {
	case size >= TB:
		return fmt.Sprintf("%.2f TB", float64(size)/float64(TB))
	case size >= GB:
		return fmt.Sprintf("%.2f GB", float64(size)/float64(GB))
	case size >= MB:
		return fmt.Sprintf("%.2f MB", float64(size)/float64(MB))
	case size >= KB:
		return fmt.Sprintf("%.2f KB", float64(size)/float64(KB))
	default:
		return fmt.Sprintf("%d B", size)
	}
}

// StartModelService 启动模型服务
func StartModelService(modelName string) error {
	// 获取模型目录
	modelDir, err := getModelDirectory()
	if err != nil {
		return err
	}

	// 构建模型路径
	modelPath := filepath.Join(modelDir, modelName)

	// 检查模型是否存在
	if _, err := os.Stat(modelPath); os.IsNotExist(err) {
		return fmt.Errorf("模型不存在: %s", modelName)
	}

	// 查找模型文件
	modelFiles, err := findModelFiles(modelPath)
	if err != nil {
		return err
	}

	if len(modelFiles) == 0 {
		return fmt.Errorf("未找到模型文件: %s", modelName)
	}

	// 这里只是一个简单的实现，实际实现可能需要：
	// 1. 检查模型格式
	// 2. 启动相应的服务（如 llama.cpp server）
	// 3. 处理服务启动参数

	fmt.Printf("启动模型服务: %s\n", modelName)
	fmt.Printf("模型路径: %s\n", modelPath)
	fmt.Printf("模型文件: %v\n", modelFiles)

	// 实际实现中，这里应该启动相应的服务进程
	// 例如，对于 GGUF 模型，可以使用 llama.cpp 的 server 命令

	return nil
}
