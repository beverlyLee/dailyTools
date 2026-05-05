package logparser

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"
)

var LogParserCmd = &cobra.Command{
	Use:   "log",
	Short: "日志分析工具",
	Long:  "高性能日志分析器，支持多格式解析、查询过滤和终端高亮显示",
}

var parseCmd = &cobra.Command{
	Use:   "parse [file]",
	Short: "解析日志文件",
	Long:  "解析并显示日志文件内容，自动识别格式",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		filename := args[0]
		queryStr, _ := cmd.Flags().GetString("query")
		limit, _ := cmd.Flags().GetInt("limit")
		format, _ := cmd.Flags().GetString("format")
		noColor, _ := cmd.Flags().GetBool("no-color")
		follow, _ := cmd.Flags().GetBool("follow")
		
		parser := NewLogParser()
		queryParser := NewQueryParser()
		
		var query *Query
		if queryStr != "" {
			var err error
			query, err = queryParser.Parse(queryStr)
			if err != nil {
				return fmt.Errorf("解析查询条件失败: %w", err)
			}
			if limit > 0 {
				query.Limit = limit
			}
		} else {
			query = &Query{
				Conditions: []QueryCondition{},
				Logic:      "AND",
				Limit:      limit,
			}
		}
		
		if follow {
			return followLog(filename, parser, query, noColor)
		}
		
		fmt.Printf("📂 解析文件: %s\n\n", filename)
		
		startTime := time.Now()
		var count, matched int
		
		highlighter := NewHighlighter(nil)
		if noColor {
			highlighter.config.ShowTimestamp = true
			highlighter.config.ShowLevel = true
			highlighter.config.ShowMessage = true
			highlighter.config.ShowFields = true
		}
		
		err := parser.ParseFile(filename, func(entry *LogEntry) bool {
			count++
			
			if query == nil || query.Matches(entry) {
				if query.Offset > 0 && matched < query.Offset {
					matched++
					return true
				}
				
				if query.Limit > 0 && matched-query.Offset >= query.Limit {
					return false
				}
				
				matched++
				
				if noColor {
					fmt.Println(entry.Raw)
				} else {
					fmt.Println(highlighter.Highlight(entry, query))
				}
				
				if format == "json" {
					jsonData, _ := MarshalJSON(entry)
					fmt.Println(string(jsonData))
				}
			}
			
			return true
		})
		
		if err != nil {
			return err
		}
		
		duration := time.Since(startTime)
		fmt.Println()
		fmt.Printf("📊 统计: 总行数=%d, 匹配行数=%d, 耗时=%v\n", count, matched, duration)
		
		return nil
	},
}

var detectCmd = &cobra.Command{
	Use:   "detect [file]",
	Short: "检测日志格式",
	Long:  "自动检测日志文件的格式",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		filename := args[0]
		parser := NewLogParser()
		
		file, err := os.Open(filename)
		if err != nil {
			return fmt.Errorf("无法打开文件: %w", err)
		}
		defer file.Close()
		
		buffer := make([]byte, 4096)
		n, _ := file.Read(buffer)
		
		format := parser.DetectFormat(string(buffer[:n]))
		
		fmt.Printf("📂 文件: %s\n", filename)
		fmt.Printf("📋 检测到的格式: %s\n", format)
		fmt.Println()
		fmt.Println("支持的格式:")
		fmt.Println("  - json:    JSON 格式日志")
		fmt.Println("  - syslog:  Syslog 格式")
		fmt.Println("  - nginx:   Nginx 访问日志")
		fmt.Println("  - text:    纯文本格式")
		
		return nil
	},
}

var queryHelpCmd = &cobra.Command{
	Use:   "query-help",
	Short: "显示查询语法帮助",
	Long:  "显示日志查询语言的语法说明和示例",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("📋 日志查询语言帮助")
		fmt.Println("====================")
		fmt.Println()
		fmt.Println("比较操作符:")
		fmt.Println("  =, ==    等于")
		fmt.Println("  !=       不等于")
		fmt.Println("  >        大于")
		fmt.Println("  >=       大于等于")
		fmt.Println("  <        小于")
		fmt.Println("  <=       小于等于")
		fmt.Println("  =~, CONTAINS  包含")
		fmt.Println("  !~       不包含")
		fmt.Println("  STARTS   以...开头")
		fmt.Println("  ENDS     以...结尾")
		fmt.Println()
		fmt.Println("逻辑操作符:")
		fmt.Println("  AND      与 (默认)")
		fmt.Println("  OR       或")
		fmt.Println()
		fmt.Println("内置字段:")
		fmt.Println("  level       日志级别 (ERROR, WARN, INFO, DEBUG)")
		fmt.Println("  message     日志消息")
		fmt.Println("  timestamp   时间戳")
		fmt.Println("  format      日志格式")
		fmt.Println()
		fmt.Println("示例:")
		fmt.Println("  level == ERROR")
		fmt.Println("  message =~ 'error'")
		fmt.Println("  status >= 500")
		fmt.Println("  level == ERROR AND message =~ 'database'")
		fmt.Println("  level == WARN OR level == ERROR")
		fmt.Println("  timestamp >= '2024-01-01' LIMIT 100")
		fmt.Println()
		fmt.Println("用法:")
		fmt.Println("  dat log parse app.log -q 'level == ERROR'")
		fmt.Println("  dat log parse access.log -q 'status >= 500' --limit 50")
	},
}

var statsCmd = &cobra.Command{
	Use:   "stats [file]",
	Short: "显示日志统计信息",
	Long:  "分析日志文件并显示统计信息",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		filename := args[0]
		parser := NewLogParser()
		
		startTime := time.Now()
		var totalCount int
		levelCounts := make(map[string]int)
		formatCounts := make(map[LogFormat]int)
		var firstTime, lastTime time.Time
		
		err := parser.ParseFile(filename, func(entry *LogEntry) bool {
			totalCount++
			levelCounts[entry.Level]++
			formatCounts[entry.Format]++
			
			if !entry.Timestamp.IsZero() {
				if firstTime.IsZero() || entry.Timestamp.Before(firstTime) {
					firstTime = entry.Timestamp
				}
				if lastTime.IsZero() || entry.Timestamp.After(lastTime) {
					lastTime = entry.Timestamp
				}
			}
			
			return true
		})
		
		if err != nil {
			return err
		}
		
		duration := time.Since(startTime)
		
		fmt.Println("📊 日志统计信息")
		fmt.Println("================")
		fmt.Printf("📂 文件: %s\n", filename)
		fmt.Printf("📝 总日志数: %d\n", totalCount)
		fmt.Printf("⏱️  解析耗时: %v\n", duration)
		fmt.Println()
		
		fmt.Println("📋 级别分布:")
		for level, count := range levelCounts {
			percent := float64(count) / float64(totalCount) * 100
			fmt.Printf("  %s: %d (%.1f%%)\n", level, count, percent)
		}
		fmt.Println()
		
		fmt.Println("📁 格式分布:")
		for format, count := range formatCounts {
			percent := float64(count) / float64(totalCount) * 100
			fmt.Printf("  %s: %d (%.1f%%)\n", format, count, percent)
		}
		fmt.Println()
		
		if !firstTime.IsZero() {
			fmt.Printf("📅 时间范围: %s - %s\n", 
				firstTime.Format("2006-01-02 15:04:05"),
				lastTime.Format("2006-01-02 15:04:05"))
		}
		
		return nil
	},
}

func followLog(filename string, parser *LogParser, query *Query, noColor bool) error {
	fmt.Println("🔄 实时追踪模式 (按 Ctrl+C 退出)...")
	fmt.Println()
	
	highlighter := NewHighlighter(nil)
	
	file, err := os.Open(filename)
	if err != nil {
		return fmt.Errorf("无法打开文件: %w", err)
	}
	defer file.Close()
	
	file.Seek(0, 2)
	
	buffer := make([]byte, 1024)
	var lineBuffer []byte
	
	for {
		n, err := file.Read(buffer)
		if err != nil {
			if err.Error() == "EOF" {
				time.Sleep(100 * time.Millisecond)
				continue
			}
			return err
		}
		
		lineBuffer = append(lineBuffer, buffer[:n]...)
		
		for {
			idx := -1
			for i, b := range lineBuffer {
				if b == '\n' {
					idx = i
					break
				}
			}
			
			if idx == -1 {
				break
			}
			
			line := string(lineBuffer[:idx])
			lineBuffer = lineBuffer[idx+1:]
			
			entry, err := parser.ParseLine(line)
			if err != nil || entry == nil {
				continue
			}
			
			if query == nil || query.Matches(entry) {
				if noColor {
					fmt.Println(entry.Raw)
				} else {
					fmt.Println(highlighter.Highlight(entry, query))
				}
			}
		}
	}
}

func MarshalJSON(entry *LogEntry) ([]byte, error) {
	type jsonLogEntry struct {
		Timestamp string                 `json:"timestamp"`
		Level     string                 `json:"level"`
		Message   string                 `json:"message"`
		Fields    map[string]interface{} `json:"fields,omitempty"`
		Format    string                 `json:"format"`
	}
	
	j := jsonLogEntry{
		Timestamp: entry.Timestamp.Format(time.RFC3339),
		Level:     entry.Level,
		Message:   entry.Message,
		Fields:    entry.Fields,
		Format:    string(entry.Format),
	}
	
	return json.Marshal(j)
}

func init() {
	LogParserCmd.AddCommand(parseCmd)
	LogParserCmd.AddCommand(detectCmd)
	LogParserCmd.AddCommand(queryHelpCmd)
	LogParserCmd.AddCommand(statsCmd)
	
	parseCmd.Flags().StringP("query", "q", "", "查询条件")
	parseCmd.Flags().IntP("limit", "n", 0, "限制输出行数")
	parseCmd.Flags().StringP("format", "f", "", "输出格式 (json)")
	parseCmd.Flags().Bool("no-color", false, "禁用彩色输出")
	parseCmd.Flags().BoolP("tail", "t", false, "显示最后 N 行")
	parseCmd.Flags().BoolP("follow", "F", false, "实时追踪日志")
}
