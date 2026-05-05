package imageanalyzer

import (
	"archive/tar"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

func AnalyzeImage(imageName string) (*ImageAnalysisReport, error) {
	report := &ImageAnalysisReport{
		ImageName:  imageName,
		AnalyzedAt: time.Now(),
	}

	tempDir, err := os.MkdirTemp("", "image-analysis-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	if err := exportImage(imageName, tempDir); err != nil {
		return nil, fmt.Errorf("failed to export image: %w", err)
	}

	layers, err := extractLayers(tempDir)
	if err != nil {
		return nil, fmt.Errorf("failed to extract layers: %w", err)
	}
	report.Layers = layers

	for _, layer := range layers {
		report.ImageSize += layer.Size
		report.TotalFiles += len(layer.Files)
	}

	report.DuplicateFiles = findDuplicateFiles(layers)
	report.RedundantFiles = findRedundantFiles(layers)
	report.OptimizationTips = generateOptimizationTips(report)

	return report, nil
}

func exportImage(imageName, tempDir string) error {
	cmd := fmt.Sprintf("docker save -o %s/image.tar %s", tempDir, imageName)
	return runCommand(cmd)
}

func extractLayers(tempDir string) ([]LayerInfo, error) {
	tarPath := filepath.Join(tempDir, "image.tar")
	f, err := os.Open(tarPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var layers []LayerInfo
	tr := tar.NewReader(f)

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}

		if hdr.Name == "manifest.json" {
			manifestData, err := io.ReadAll(tr)
			if err != nil {
				return nil, err
			}
			layers, err = parseManifest(manifestData)
			if err != nil {
				return nil, err
			}
			continue
		}

		if strings.HasSuffix(hdr.Name, "/layer.tar") {
			layerDir := filepath.Join(tempDir, "layers", hdr.Name[:len(hdr.Name)-10])
			os.MkdirAll(layerDir, 0755)
			
			layerTarPath := filepath.Join(layerDir, "layer.tar")
			layerF, err := os.Create(layerTarPath)
			if err != nil {
				return nil, err
			}
			io.Copy(layerF, tr)
			layerF.Close()

			layerFiles, err := analyzeLayerFiles(layerTarPath)
			if err != nil {
				return nil, err
			}

			for i := range layers {
				if strings.Contains(hdr.Name, layers[i].ID) {
					layers[i].Files = layerFiles
					layers[i].Size = calculateLayerSize(layerFiles)
				}
			}
		}
	}

	return layers, nil
}

func analyzeLayerFiles(layerTarPath string) ([]FileInfo, error) {
	f, err := os.Open(layerTarPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var files []FileInfo
	tr := tar.NewReader(f)

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}

		if hdr.Typeflag == tar.TypeReg {
			hash, err := calculateFileHash(tr)
			if err != nil {
				return nil, err
			}

			files = append(files, FileInfo{
				Path:    hdr.Name,
				Size:    hdr.Size,
				ModTime: hdr.ModTime,
				Hash:    hash,
				Mode:    uint32(hdr.Mode),
			})
		}
	}

	return files, nil
}

func calculateFileHash(tr *tar.Reader) (string, error) {
	h := sha256.New()
	if _, err := io.Copy(h, tr); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func calculateLayerSize(files []FileInfo) int64 {
	var size int64
	for _, f := range files {
		size += f.Size
	}
	return size
}

func findDuplicateFiles(layers []LayerInfo) []DuplicateFile {
	hashMap := make(map[string][]string)
	hashSize := make(map[string]int64)
	hashLayers := make(map[string][]string)

	for _, layer := range layers {
		for _, file := range layer.Files {
			hashMap[file.Hash] = append(hashMap[file.Hash], file.Path)
			hashSize[file.Hash] = file.Size
			hashLayers[file.Hash] = append(hashLayers[file.Hash], layer.ID)
		}
	}

	var duplicates []DuplicateFile
	for hash, paths := range hashMap {
		if len(paths) > 1 {
			// Remove duplicates in same layer
			uniquePaths := make(map[string]bool)
			for _, path := range paths {
				uniquePaths[path] = true
			}
			
			if len(uniquePaths) > 1 {
				var uniquePathsList []string
				for path := range uniquePaths {
					uniquePathsList = append(uniquePathsList, path)
				}
				
				uniqueLayers := make(map[string]bool)
				for _, layerID := range hashLayers[hash] {
					uniqueLayers[layerID] = true
				}
				
				var uniqueLayersList []string
				for layerID := range uniqueLayers {
					uniqueLayersList = append(uniqueLayersList, layerID)
				}

				duplicates = append(duplicates, DuplicateFile{
					Hash:      hash,
					Paths:     uniquePathsList,
					TotalSize: hashSize[hash] * int64(len(uniquePaths)),
					LayerIDs:  uniqueLayersList,
				})
			}
		}
	}

	return duplicates
}

func findRedundantFiles(layers []LayerInfo) []RedundantFile {
	var redundant []RedundantFile

	redundantPatterns := []struct {
		Pattern     string
		Reason      string
		Suggestion  string
	}{
		{
			Pattern:    `\.log$`,
			Reason:     "Log files should not be included in images",
			Suggestion: "Add *.log to .dockerignore or use --no-cache-dir",
		},
		{
			Pattern:    `\.pyc$|__pycache__`,
			Reason:     "Python bytecode files are unnecessary",
			Suggestion: "Use --no-cache-dir pip install and clean pycache",
		},
		{
			Pattern:    `\.git`,
			Reason:     "Git metadata should not be in images",
			Suggestion: "Add .git to .dockerignore",
		},
		{
			Pattern:    `apt/lists|apt/cache`,
			Reason:     "APT cache files are redundant",
			Suggestion: "Use rm -rf /var/lib/apt/lists/* after apt-get install",
		},
		{
			Pattern:    `\/tmp\/`,
			Reason:     "Temporary files should not be in final image",
			Suggestion: "Clean up temporary files in the same RUN command",
		},
	}

	for _, layer := range layers {
		for _, file := range layer.Files {
			for _, pattern := range redundantPatterns {
				matched, _ := regexp.MatchString(pattern.Pattern, file.Path)
				if matched {
					redundant = append(redundant, RedundantFile{
						Path:       file.Path,
						Size:       file.Size,
						Reason:     pattern.Reason,
						Suggestion: pattern.Suggestion,
					})
				}
			}
		}
	}

	return redundant
}

func generateOptimizationTips(report *ImageAnalysisReport) []OptimizationTip {
	var tips []OptimizationTip

	if len(report.DuplicateFiles) > 0 {
		var totalSize int64
		for _, dup := range report.DuplicateFiles {
			totalSize += dup.TotalSize
		}
		
		tips = append(tips, OptimizationTip{
			Title:       "Duplicate Files Found",
			Description: fmt.Sprintf("Found %d duplicate files totaling %.2f MB", len(report.DuplicateFiles), float64(totalSize)/1024/1024),
			Severity:    "High",
			Suggestion:  "Use COPY with --from in multi-stage builds or consolidate files in a single layer",
			Impact:      "Can reduce image size significantly",
		})
	}

	if len(report.RedundantFiles) > 0 {
		var totalSize int64
		for _, red := range report.RedundantFiles {
			totalSize += red.Size
		}
		
		tips = append(tips, OptimizationTip{
			Title:       "Redundant Files Found",
			Description: fmt.Sprintf("Found %d redundant files totaling %.2f MB", len(report.RedundantFiles), float64(totalSize)/1024/1024),
			Severity:    "Medium",
			Suggestion:  "Clean up build artifacts, use .dockerignore, and remove temporary files",
			Impact:      "Reduces image size and improves security",
		})
	}

	if len(report.Layers) > 10 {
		tips = append(tips, OptimizationTip{
			Title:       "Too Many Layers",
			Description: fmt.Sprintf("Image has %d layers, which may affect performance", len(report.Layers)),
			Severity:    "Medium",
			Suggestion:  "Consider merging RUN commands using && to reduce layer count",
			Impact:      "Improves pull and push performance, reduces storage overhead",
		})
	}

	hasMultipleRuns := false
	for _, layer := range report.Layers {
		if strings.Contains(layer.CreatedBy, "RUN") {
			if hasMultipleRuns {
				tips = append(tips, OptimizationTip{
					Title:       "Multiple RUN Commands",
					Description: "Consider merging consecutive RUN commands to reduce layers",
					Severity:    "Low",
					Suggestion:  "Combine RUN commands with && and clean up in the same command",
					Impact:      "Reduces layer count and potential intermediate layer size",
				})
				break
			}
			hasMultipleRuns = true
		}
	}

	return tips
}

func runCommand(cmd string) error {
	// This is a simplified version. In a real implementation,
	// you would use exec.Command to run the actual docker command.
	return nil
}

func parseManifest(data []byte) ([]LayerInfo, error) {
	// Simplified parsing. In real implementation, use proper JSON parsing.
	return []LayerInfo{}, nil
}