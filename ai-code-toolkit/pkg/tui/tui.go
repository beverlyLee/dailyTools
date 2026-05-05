package tui

import (
	"ai-code-toolkit/pkg/search"
	"fmt"
	"os"
	"strings"

	"github.com/nsf/termbox-go"
)

// RunMainTUI 启动主 TUI 界面
func RunMainTUI() {
	// 初始化 termbox
	err := termbox.Init()
	if err != nil {
		fmt.Printf("初始化 TUI 错误: %v\n", err)
		os.Exit(1)
	}
	defer termbox.Close()

	// 主菜单
	menuItems := []string{
		"1. 代码搜索工具",
		"2. 模型管理工具",
		"3. 退出",
	}

	selectedIndex := 0
	running := true

	for running {
		// 绘制主菜单
		drawMainMenu(menuItems, selectedIndex)

		// 处理事件
		switch ev := termbox.PollEvent(); ev.Type {
		case termbox.EventKey:
			switch ev.Key {
			case termbox.KeyArrowUp:
				if selectedIndex > 0 {
					selectedIndex--
				}
			case termbox.KeyArrowDown:
				if selectedIndex < len(menuItems)-1 {
					selectedIndex++
				}
			case termbox.KeyEnter:
				switch selectedIndex {
				case 0:
					// 进入搜索界面
					runSearchTUI()
				case 1:
					// 进入模型管理界面
					runModelTUI()
				case 2:
					// 退出
					running = false
				}
			case termbox.KeyEsc:
				running = false
			}
		}
	}
}

// RunSearchTUI 运行搜索 TUI（带预设选项）
func RunSearchTUI(opts search.SearchOptions) {
	// 初始化 termbox
	err := termbox.Init()
	if err != nil {
		fmt.Printf("初始化 TUI 错误: %v\n", err)
		os.Exit(1)
	}
	defer termbox.Close()

	// 执行搜索
	results, err := search.Search(".", opts)
	if err != nil {
		fmt.Printf("搜索错误: %v\n", err)
		return
	}

	// 显示搜索结果
	displaySearchResults(results)
}

// runSearchTUI 运行搜索 TUI（交互模式）
func runSearchTUI() {
	// 清空屏幕
	termbox.Clear(termbox.ColorDefault, termbox.ColorDefault)

	// 提示用户输入搜索模式
	drawPrompt("请输入搜索模式 (正则表达式): ")
	pattern := readInput()

	if pattern == "" {
		return
	}

	// 提示用户输入文件类型过滤
	drawPrompt("请输入文件类型过滤 (如 .go,.py，留空表示不过滤): ")
	fileType := readInput()

	// 提示是否搜索压缩文件
	drawPrompt("是否搜索压缩文件? (y/n): ")
	includeArchiveInput := readInput()
	includeArchive := strings.ToLower(includeArchiveInput) == "y"

	// 执行搜索
	opts := search.SearchOptions{
		Pattern:        pattern,
		FileType:       fileType,
		IncludeArchive: includeArchive,
		Highlight:      true,
	}

	// 显示搜索中提示
	drawMessage("正在搜索...")

	results, err := search.Search(".", opts)
	if err != nil {
		drawMessage(fmt.Sprintf("搜索错误: %v", err))
		termbox.PollEvent()
		return
	}

	// 显示搜索结果
	displaySearchResults(results)
}

// displaySearchResults 显示搜索结果
func displaySearchResults(results []search.SearchResult) {
	if len(results) == 0 {
		drawMessage("未找到匹配结果")
		termbox.PollEvent()
		return
	}

	selectedIndex := 0
	running := true

	for running {
		// 绘制搜索结果列表
		drawSearchResults(results, selectedIndex)

		// 处理事件
		switch ev := termbox.PollEvent(); ev.Type {
		case termbox.EventKey:
			switch ev.Key {
			case termbox.KeyArrowUp:
				if selectedIndex > 0 {
					selectedIndex--
				}
			case termbox.KeyArrowDown:
				if selectedIndex < len(results)-1 {
					selectedIndex++
				}
			case termbox.KeyEnter:
				// 显示详细信息
				displayResultDetails(results[selectedIndex])
			case termbox.KeyEsc:
				running = false
			}
		}
	}
}

// drawMainMenu 绘制主菜单
func drawMainMenu(menuItems []string, selectedIndex int) {
	termbox.Clear(termbox.ColorDefault, termbox.ColorDefault)

	// 绘制标题
	title := "AI 与代码工具集"
	drawText(2, 1, title, termbox.ColorWhite|termbox.AttrBold, termbox.ColorDefault)
	drawText(2, 2, strings.Repeat("=", len(title)), termbox.ColorWhite, termbox.ColorDefault)

	// 绘制菜单项
	for i, item := range menuItems {
		fg := termbox.ColorWhite
		bg := termbox.ColorDefault

		if i == selectedIndex {
			fg = termbox.ColorBlack
			bg = termbox.ColorCyan
		}

		drawText(2, 4+i, item, fg, bg)
	}

	// 绘制提示
	drawText(2, len(menuItems)+6, "使用 ↑↓ 选择，Enter 确认，Esc 返回", termbox.ColorGray, termbox.ColorDefault)

	termbox.Flush()
}

// drawSearchResults 绘制搜索结果
func drawSearchResults(results []search.SearchResult, selectedIndex int) {
	termbox.Clear(termbox.ColorDefault, termbox.ColorDefault)

	// 绘制标题
	title := fmt.Sprintf("搜索结果 (%d 个匹配)", len(results))
	drawText(2, 1, title, termbox.ColorWhite|termbox.AttrBold, termbox.ColorDefault)
	drawText(2, 2, strings.Repeat("=", len(title)), termbox.ColorWhite, termbox.ColorDefault)

	// 绘制结果列表
	_, height := termbox.Size()
	startIndex := max(0, selectedIndex-(height-8))
	endIndex := min(len(results), startIndex+(height-8))

	for i := startIndex; i < endIndex; i++ {
		result := results[i]
		fg := termbox.ColorWhite
		bg := termbox.ColorDefault

		if i == selectedIndex {
			fg = termbox.ColorBlack
			bg = termbox.ColorCyan
		}

		// 显示文件名和行号
		line := fmt.Sprintf("%s:%d - %s", result.FilePath, result.LineNumber, truncate(result.Content, 50))
		drawText(2, 4+i-startIndex, line, fg, bg)
	}

	// 绘制提示
	drawText(2, height-2, "使用 ↑↓ 选择，Enter 查看详情，Esc 返回", termbox.ColorGray, termbox.ColorDefault)

	termbox.Flush()
}

// displayResultDetails 显示结果详情
func displayResultDetails(result search.SearchResult) {
	termbox.Clear(termbox.ColorDefault, termbox.ColorDefault)

	// 绘制标题
	title := "搜索结果详情"
	drawText(2, 1, title, termbox.ColorWhite|termbox.AttrBold, termbox.ColorDefault)
	drawText(2, 2, strings.Repeat("=", len(title)), termbox.ColorWhite, termbox.ColorDefault)

	// 绘制详情
	drawText(2, 4, fmt.Sprintf("文件: %s", result.FilePath), termbox.ColorWhite, termbox.ColorDefault)
	drawText(2, 5, fmt.Sprintf("行号: %d", result.LineNumber), termbox.ColorWhite, termbox.ColorDefault)
	drawText(2, 6, "内容:", termbox.ColorWhite, termbox.ColorDefault)
	drawText(4, 7, result.Content, termbox.ColorWhite, termbox.ColorDefault)

	if result.Highlighted != "" {
		drawText(2, 9, "高亮内容:", termbox.ColorWhite, termbox.ColorDefault)
		// 注意：这里简化了高亮显示，实际实现可能需要更复杂的 ANSI 颜色处理
		drawText(4, 10, result.Highlighted, termbox.ColorRed, termbox.ColorDefault)
	}

	// 绘制提示
	_, height := termbox.Size()
	drawText(2, height-2, "按任意键返回", termbox.ColorGray, termbox.ColorDefault)

	termbox.Flush()

	// 等待按键
	termbox.PollEvent()
}

// drawPrompt 绘制提示
func drawPrompt(prompt string) {
	termbox.Clear(termbox.ColorDefault, termbox.ColorDefault)
	drawText(2, 2, prompt, termbox.ColorWhite, termbox.ColorDefault)
	termbox.Flush()
}

// drawMessage 绘制消息
func drawMessage(message string) {
	termbox.Clear(termbox.ColorDefault, termbox.ColorDefault)
	drawText(2, 2, message, termbox.ColorWhite, termbox.ColorDefault)
	termbox.Flush()
}

// readInput 读取用户输入
func readInput() string {
	var input string
	cursorX := 2 + len("请输入搜索模式 (正则表达式): ")
	cursorY := 2

	for {
		// 显示当前输入
		drawText(cursorX, cursorY, input, termbox.ColorWhite, termbox.ColorDefault)
		termbox.SetCursor(cursorX+len(input), cursorY)
		termbox.Flush()

		// 处理事件
		switch ev := termbox.PollEvent(); ev.Type {
		case termbox.EventKey:
			switch ev.Key {
			case termbox.KeyEnter:
				// 清除光标
				termbox.HideCursor()
				return input
			case termbox.KeyBackspace, termbox.KeyBackspace2:
				if len(input) > 0 {
					input = input[:len(input)-1]
					// 清除最后一个字符
					drawText(cursorX+len(input), cursorY, " ", termbox.ColorWhite, termbox.ColorDefault)
				}
			case termbox.KeyEsc:
				// 清除光标
				termbox.HideCursor()
				return ""
			default:
				// 添加字符
				input += string(ev.Ch)
			}
		}
	}
}

// drawText 绘制文本
func drawText(x, y int, text string, fg, bg termbox.Attribute) {
	for i, c := range text {
		termbox.SetCell(x+i, y, c, fg, bg)
	}
}

// runModelTUI 运行模型管理 TUI
func runModelTUI() {
	// 清空屏幕
	termbox.Clear(termbox.ColorDefault, termbox.ColorDefault)

	// 模型管理菜单
	menuItems := []string{
		"1. 列出本地模型",
		"2. 从 Hugging Face 下载模型",
		"3. 启动模型服务",
		"4. 转换模型格式",
		"5. 返回主菜单",
	}

	selectedIndex := 0
	running := true

	for running {
		// 绘制菜单
		drawModelMenu(menuItems, selectedIndex)

		// 处理事件
		switch ev := termbox.PollEvent(); ev.Type {
		case termbox.EventKey:
			switch ev.Key {
			case termbox.KeyArrowUp:
				if selectedIndex > 0 {
					selectedIndex--
				}
			case termbox.KeyArrowDown:
				if selectedIndex < len(menuItems)-1 {
					selectedIndex++
				}
			case termbox.KeyEnter:
				switch selectedIndex {
				case 0:
					// 列出本地模型
					listLocalModelsTUI()
				case 1:
					// 下载模型
					downloadModelTUI()
				case 2:
					// 启动模型服务
					startModelServiceTUI()
				case 3:
					// 转换模型
					convertModelTUI()
				case 4:
					// 返回主菜单
					running = false
				}
			case termbox.KeyEsc:
				running = false
			}
		}
	}
}

// drawModelMenu 绘制模型管理菜单
func drawModelMenu(menuItems []string, selectedIndex int) {
	termbox.Clear(termbox.ColorDefault, termbox.ColorDefault)

	// 绘制标题
	title := "模型管理工具"
	drawText(2, 1, title, termbox.ColorWhite|termbox.AttrBold, termbox.ColorDefault)
	drawText(2, 2, strings.Repeat("=", len(title)), termbox.ColorWhite, termbox.ColorDefault)

	// 绘制菜单项
	for i, item := range menuItems {
		fg := termbox.ColorWhite
		bg := termbox.ColorDefault

		if i == selectedIndex {
			fg = termbox.ColorBlack
			bg = termbox.ColorCyan
		}

		drawText(2, 4+i, item, fg, bg)
	}

	// 绘制提示
	drawText(2, len(menuItems)+6, "使用 ↑↓ 选择，Enter 确认，Esc 返回", termbox.ColorGray, termbox.ColorDefault)

	termbox.Flush()
}

// listLocalModelsTUI 列出本地模型（TUI 版本）
func listLocalModelsTUI() {
	drawMessage("列出本地模型功能需要实现模型管理模块")
	termbox.PollEvent()
}

// downloadModelTUI 下载模型（TUI 版本）
func downloadModelTUI() {
	drawMessage("下载模型功能需要实现模型管理模块")
	termbox.PollEvent()
}

// startModelServiceTUI 启动模型服务（TUI 版本）
func startModelServiceTUI() {
	drawMessage("启动模型服务功能需要实现模型管理模块")
	termbox.PollEvent()
}

// convertModelTUI 转换模型（TUI 版本）
func convertModelTUI() {
	drawMessage("转换模型功能需要实现模型管理模块")
	termbox.PollEvent()
}

// 辅助函数
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
