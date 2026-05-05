package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"file-viz-toolkit/pkg/dedup"

	"github.com/spf13/cobra"
)

var dedupCmd = &cobra.Command{
	Use:   "dedup [路径]",
	Short: "文件去重工具",
	Long:  `扫描指定目录，查找重复文件并提供交互式删除功能。`,
	Args:  cobra.MaximumNArgs(1),
	RunE:  runDedup,
}

var (
	minSize           int64
	maxSize           int64
	includeExtensions []string
	excludeDirs       []string
	checkHardLinks    bool
	cleanEmptyDirs    bool
	autoMode          bool
)

func init() {
	rootCmd.AddCommand(dedupCmd)

	dedupCmd.Flags().Int64Var(&minSize, "min-size", 0, "最小文件大小（字节），默认0表示不限制")
	dedupCmd.Flags().Int64Var(&maxSize, "max-size", 0, "最大文件大小（字节），默认0表示不限制")
	dedupCmd.Flags().StringSliceVarP(&includeExtensions, "extensions", "e", []string{}, "包含的文件扩展名，例如：.jpg,.png,.pdf")
	dedupCmd.Flags().StringSliceVarP(&excludeDirs, "exclude-dirs", "x", []string{}, "排除的目录，例如：.git,node_modules")
	dedupCmd.Flags().BoolVarP(&checkHardLinks, "check-hardlinks", "l", false, "检测硬链接文件")
	dedupCmd.Flags().BoolVarP(&cleanEmptyDirs, "clean-empty-dirs", "c", false, "清理空文件夹")
	dedupCmd.Flags().BoolVarP(&autoMode, "auto", "a", false, "自动模式，保留第一个文件并删除其他重复文件")
}

func runDedup(cmd *cobra.Command, args []string) error {
	var rootPath string
	if len(args) > 0 {
		rootPath = args[0]
	} else {
		var err error
		rootPath, err = os.Getwd()
		if err != nil {
			return fmt.Errorf("获取当前工作目录失败: %v", err)
		}
	}

	absPath, err := filepath.Abs(rootPath)
	if err != nil {
		return fmt.Errorf("获取绝对路径失败: %v", err)
	}

	fmt.Printf("扫描目录: %s\n", absPath)

	config := &dedup.ScannerConfig{
		MinSize:           minSize,
		MaxSize:           maxSize,
		IncludeExtensions: includeExtensions,
		ExcludeDirs:       excludeDirs,
		CheckHardLinks:    checkHardLinks,
	}

	service := dedup.NewDedupService(config)

	groups, err := service.FindDuplicates(absPath)
	if err != nil {
		return fmt.Errorf("查找重复文件失败: %v", err)
	}

	var deletedFiles, deletedDirs int

	if len(groups) > 0 {
		deletedFiles, err = service.ProcessDuplicates(groups, autoMode)
		if err != nil {
			return fmt.Errorf("处理重复文件失败: %v", err)
		}
	}

	if cleanEmptyDirs {
		deletedDirs, err = service.CleanEmptyDirs(absPath)
		if err != nil {
			return fmt.Errorf("清理空文件夹失败: %v", err)
		}
	}

	fmt.Println("\n========================================")
	fmt.Println("操作完成总结:")
	fmt.Printf("  处理的重复文件组: %d\n", len(groups))
	fmt.Printf("  删除的文件数量: %d\n", deletedFiles)
	fmt.Printf("  删除的空文件夹数量: %d\n", deletedDirs)
	fmt.Println("========================================")

	return nil
}
