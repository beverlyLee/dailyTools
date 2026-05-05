package cmd

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"file-viz-toolkit/pkg/mermaid/parser"
	"file-viz-toolkit/pkg/mermaid/renderer"
	"file-viz-toolkit/pkg/mermaid/watcher"

	"github.com/spf13/cobra"
)

var mermaidCmd = &cobra.Command{
	Use:   "mermaid [文件路径]",
	Short: "Mermaid 终端渲染器",
	Long:  `在终端中渲染 Mermaid 图表，支持 flowchart、sequenceDiagram、stateDiagram 等。`,
	Args:  cobra.MaximumNArgs(1),
	RunE:  runMermaid,
}

var (
	useColors bool
	watchMode bool
)

func init() {
	rootCmd.AddCommand(mermaidCmd)

	mermaidCmd.Flags().BoolVarP(&useColors, "colors", "c", true, "使用 ANSI 颜色渲染")
	mermaidCmd.Flags().BoolVarP(&watchMode, "watch", "w", false, "监听文件变化，实时更新渲染")
}

func runMermaid(cmd *cobra.Command, args []string) error {
	var content string
	var filePath string

	if len(args) > 0 {
		filePath = args[0]
		fileContent, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("读取文件失败: %v", err)
		}
		content = string(fileContent)
	} else {
		fmt.Println("请输入 Mermaid 图表内容（以空行结束）：")
		content = readFromStdin()
	}

	if content == "" {
		return fmt.Errorf("未提供图表内容")
	}

	p := parser.NewParser()
	diagram, err := p.Parse(content)
	if err != nil {
		return fmt.Errorf("解析图表失败: %v", err)
	}

	r := renderer.NewRenderer(useColors)
	rendered, err := r.RenderDiagram(diagram)
	if err != nil {
		return fmt.Errorf("渲染图表失败: %v", err)
	}

	fmt.Println("\n" + rendered)

	if watchMode && filePath != "" {
		return startWatchMode(filePath, r)
	}

	return nil
}

func readFromStdin() string {
	var content string
	var line string

	for {
		fmt.Scanln(&line)
		if line == "" {
			break
		}
		content += line + "\n"
	}

	return content
}

func startWatchMode(filePath string, r *renderer.Renderer) error {
	w, err := watcher.NewFileWatcher(nil)
	if err != nil {
		return fmt.Errorf("创建文件监听器失败: %v", err)
	}
	defer w.Stop()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	callback := func(changedPath string) {
		if !watcher.IsMermaidFile(changedPath) && changedPath != filePath {
			return
		}

		fmt.Println("\n╔════════════════════════════════════════════════════════════╗")
		fmt.Println("║                    文件已更新，重新渲染...                      ║")
		fmt.Println("╚════════════════════════════════════════════════════════════╝\n")

		content, err := watcher.ReadFileContent(changedPath)
		if err != nil {
			fmt.Printf("读取文件失败: %v\n", err)
			return
		}

		p := parser.NewParser()
		diagram, err := p.Parse(content)
		if err != nil {
			fmt.Printf("解析图表失败: %v\n", err)
			return
		}

		rendered, err := r.RenderDiagram(diagram)
		if err != nil {
			fmt.Printf("渲染图表失败: %v\n", err)
			return
		}

		fmt.Println(rendered)
	}

	err = w.Watch(filePath, callback)
	if err != nil {
		return fmt.Errorf("启动监听失败: %v", err)
	}

	<-sigChan
	fmt.Println("\n停止监听...")

	return nil
}
