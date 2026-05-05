package main

import (
	"ai-code-toolkit/pkg/model"
	"ai-code-toolkit/pkg/search"
	"ai-code-toolkit/pkg/tui"
	"flag"
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "search":
		handleSearch()
	case "model":
		handleModel()
	case "tui":
		handleTUI()
	default:
		fmt.Printf("未知命令: %s\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

func handleSearch() {
	searchCmd := flag.NewFlagSet("search", flag.ExitOnError)
	pattern := searchCmd.String("p", "", "搜索模式（正则表达式）")
	fileType := searchCmd.String("t", "", "文件类型过滤（如 .go, .py, .js）")
	includeArchive := searchCmd.Bool("a", false, "搜索压缩文件内的内容")
	highlight := searchCmd.Bool("h", true, "高亮显示匹配部分")
	interactive := searchCmd.Bool("i", false, "使用交互式界面（TUI）")
	searchCmd.Parse(os.Args[2:])

	if *pattern == "" {
		fmt.Println("错误: 必须提供搜索模式")
		searchCmd.Usage()
		os.Exit(1)
	}

	opts := search.SearchOptions{
		Pattern:         *pattern,
		FileType:        *fileType,
		IncludeArchive:  *includeArchive,
		Highlight:       *highlight,
	}

	if *interactive {
		tui.RunSearchTUI(opts)
	} else {
		results, err := search.Search(".", opts)
		if err != nil {
			fmt.Printf("搜索错误: %v\n", err)
			os.Exit(1)
		}
		
		for _, result := range results {
			fmt.Printf("%s:%d: %s\n", result.FilePath, result.LineNumber, result.Content)
		}
	}
}

func handleModel() {
	modelCmd := flag.NewFlagSet("model", flag.ExitOnError)
	list := modelCmd.Bool("list", false, "列出本地模型")
	download := modelCmd.String("download", "", "从 Hugging Face 下载模型（格式: 模型名称/版本）")
	start := modelCmd.String("start", "", "启动模型服务（模型名称）")
	convert := modelCmd.String("convert", "", "转换模型（格式: 输入路径:输出路径）")
	modelCmd.Parse(os.Args[2:])

	if *list {
		models, err := model.ListLocalModels()
		if err != nil {
			fmt.Printf("列出模型错误: %v\n", err)
			os.Exit(1)
		}
		
		for _, m := range models {
			fmt.Printf("模型: %s, 大小: %s, 量化级别: %s\n", m.Name, m.Size, m.QuantizationLevel)
		}
		return
	}

	if *download != "" {
		err := model.DownloadFromHuggingFace(*download)
		if err != nil {
			fmt.Printf("下载模型错误: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("模型下载完成")
		return
	}

	if *start != "" {
		err := model.StartModelService(*start)
		if err != nil {
			fmt.Printf("启动模型服务错误: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("模型服务已启动")
		return
	}

	if *convert != "" {
		// 解析输入和输出路径
		fmt.Println("模型转换功能已调用")
		return
	}

	fmt.Println("请提供一个模型管理命令")
	modelCmd.Usage()
}

func handleTUI() {
	tui.RunMainTUI()
}

func printUsage() {
	fmt.Println("AI 与代码工具集")
	fmt.Println()
	fmt.Println("用法:")
	fmt.Println("  ai-code-toolkit [命令]")
	fmt.Println()
	fmt.Println("命令:")
	fmt.Println("  search    代码搜索工具")
	fmt.Println("  model     本地 AI 模型管理工具")
	fmt.Println("  tui       启动交互式界面")
	fmt.Println()
	fmt.Println("使用 'ai-code-toolkit [命令] -h' 查看更多帮助信息")
}
