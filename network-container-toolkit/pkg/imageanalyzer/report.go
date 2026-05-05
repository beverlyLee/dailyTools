package imageanalyzer

import (
	"fmt"
	"os"
	"strings"
	"text/tabwriter"
	"time"
)

func PrintReport(report *ImageAnalysisReport) {
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	defer w.Flush()

	fmt.Println(strings.Repeat("=", 80))
	fmt.Println("CONTAINER IMAGE OPTIMIZATION ANALYSIS REPORT")
	fmt.Println(strings.Repeat("=", 80))
	fmt.Printf("\nImage Name: %s\n", report.ImageName)
	fmt.Printf("Analysis Time: %s\n", report.AnalyzedAt.Format(time.RFC1123))
	fmt.Printf("Total Size: %.2f MB\n", float64(report.ImageSize)/1024/1024)
	fmt.Printf("Total Files: %d\n", report.TotalFiles)
	fmt.Printf("Total Layers: %d\n", len(report.Layers))
	fmt.Println("\n" + strings.Repeat("-", 80))

	if len(report.Layers) > 0 {
		fmt.Println("\nLAYER DETAILS:")
		fmt.Println(strings.Repeat("-", 80))
		fmt.Fprintf(w, "LAYER ID\tCREATED BY\tSIZE (MB)\tFILE COUNT\n")
		fmt.Fprintf(w, "-\t-\t-\t-\n")
		for _, layer := range report.Layers {
			fmt.Fprintf(w, "%s\t%s\t%.2f\t%d\n",
				shortID(layer.ID),
				shortCreatedBy(layer.CreatedBy),
				float64(layer.Size)/1024/1024,
				len(layer.Files),
			)
			// Print largest files in each layer
			if len(layer.Files) > 0 {
				largestFiles := getLargestFiles(layer.Files, 3)
				for _, file := range largestFiles {
					fmt.Fprintf(w, "\t└── %s\t%.2f KB\n", file.Path, float64(file.Size)/1024)
				}
			}
		}
		w.Flush()
	}

	if len(report.DuplicateFiles) > 0 {
		fmt.Println("\n" + strings.Repeat("-", 80))
		fmt.Println("DUPLICATE FILES FOUND:")
		fmt.Println(strings.Repeat("-", 80))
		fmt.Fprintf(w, "HASH (first 12 chars)\tFILE COUNT\tTOTAL SIZE (MB)\tEXAMPLE PATH\n")
		fmt.Fprintf(w, "-\t-\t-\t-\n")
		for _, dup := range report.DuplicateFiles {
			if len(dup.Paths) > 0 {
				fmt.Fprintf(w, "%s\t%d\t%.2f\t%s\n",
					shortID(dup.Hash),
					len(dup.Paths),
					float64(dup.TotalSize)/1024/1024,
					dup.Paths[0],
				)
			}
		}
		w.Flush()
	}

	if len(report.RedundantFiles) > 0 {
		fmt.Println("\n" + strings.Repeat("-", 80))
		fmt.Println("REDUNDANT FILES FOUND:")
		fmt.Println(strings.Repeat("-", 80))
		fmt.Fprintf(w, "PATH\tSIZE (KB)\tREASON\n")
		fmt.Fprintf(w, "-\t-\t-\n")
		for i, red := range report.RedundantFiles {
			if i >= 20 {
				fmt.Fprintf(w, "...and %d more\t\t\n", len(report.RedundantFiles)-20)
				break
			}
			fmt.Fprintf(w, "%s\t%.2f\t%s\n",
				red.Path,
				float64(red.Size)/1024,
				red.Reason,
			)
		}
		w.Flush()
	}

	if len(report.OptimizationTips) > 0 {
		fmt.Println("\n" + strings.Repeat("-", 80))
		fmt.Println("OPTIMIZATION TIPS:")
		fmt.Println(strings.Repeat("-", 80))
		for i, tip := range report.OptimizationTips {
			fmt.Printf("\n%d. [%s] %s\n", i+1, tip.Severity, tip.Title)
			fmt.Printf("   Description: %s\n", tip.Description)
			fmt.Printf("   Suggestion: %s\n", tip.Suggestion)
			fmt.Printf("   Impact: %s\n", tip.Impact)
		}
	}

	fmt.Println("\n" + strings.Repeat("=", 80))
	fmt.Println("END OF REPORT")
	fmt.Println(strings.Repeat("=", 80))
}

func shortID(id string) string {
	if len(id) > 12 {
		return id[:12]
	}
	return id
}

func shortCreatedBy(createdBy string) string {
	if len(createdBy) > 50 {
		return createdBy[:50] + "..."
	}
	return createdBy
}

func getLargestFiles(files []FileInfo, count int) []FileInfo {
	if len(files) <= count {
		return files
	}
	
	// Simple bubble sort for largest files
	result := make([]FileInfo, len(files))
	copy(result, files)
	
	for i := 0; i < len(result); i++ {
		for j := 0; j < len(result)-i-1; j++ {
			if result[j].Size < result[j+1].Size {
				result[j], result[j+1] = result[j+1], result[j]
			}
		}
	}
	
	return result[:count]
}

func SaveReportToFile(report *ImageAnalysisReport, filePath string) error {
	f, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create report file: %w", err)
	}
	defer f.Close()

	// Write JSON report
	// In real implementation, use proper JSON encoding
	_, err = fmt.Fprintf(f, `{
	"image_name": "%s",
	"analysis_time": "%s",
	"total_size_mb": %.2f,
	"total_files": %d,
	"total_layers": %d,
	"duplicate_files_count": %d,
	"redundant_files_count": %d,
	"optimization_tips_count": %d
}`,
		report.ImageName,
		report.AnalyzedAt.Format(time.RFC3339),
		float64(report.ImageSize)/1024/1024,
		report.TotalFiles,
		len(report.Layers),
		len(report.DuplicateFiles),
		len(report.RedundantFiles),
		len(report.OptimizationTips),
	)

	return err
}