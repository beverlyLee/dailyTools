package logparser

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type LogFormat string

const (
	FormatUnknown LogFormat = "unknown"
	FormatJSON    LogFormat = "json"
	FormatSyslog  LogFormat = "syslog"
	FormatNginx   LogFormat = "nginx"
	FormatText    LogFormat = "text"
)

type LogEntry struct {
	Timestamp time.Time
	Level     string
	Message   string
	Fields    map[string]interface{}
	Raw       string
	Format    LogFormat
}

type LogParser struct {
	detectedFormat LogFormat
}

func NewLogParser() *LogParser {
	return &LogParser{}
}

func (p *LogParser) DetectFormat(content string) LogFormat {
	if strings.HasPrefix(content, "{") || strings.HasPrefix(strings.TrimSpace(content), "{") {
		var obj map[string]interface{}
		if err := json.Unmarshal([]byte(content), &obj); err == nil {
			return FormatJSON
		}
	}
	
	if p.isSyslog(content) {
		return FormatSyslog
	}
	
	if p.isNginx(content) {
		return FormatNginx
	}
	
	return FormatText
}

func (p *LogParser) isSyslog(line string) bool {
	syslogPattern := regexp.MustCompile(`^(<\d+>)?(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+\S+\s+\S+:`)
	return syslogPattern.MatchString(line)
}

func (p *LogParser) isNginx(line string) bool {
	nginxPattern := regexp.MustCompile(`^(\S+)\s+-\s+(\S+)\s+\[([^\]]+)\]\s+"(\w+)\s+(\S+)\s+(\S+)"\s+(\d{3})\s+(\d+)`)
	return nginxPattern.MatchString(line)
}

func (p *LogParser) ParseLine(line string) (*LogEntry, error) {
	if len(strings.TrimSpace(line)) == 0 {
		return nil, nil
	}
	
	format := p.DetectFormat(line)
	
	switch format {
	case FormatJSON:
		return p.parseJSON(line)
	case FormatSyslog:
		return p.parseSyslog(line)
	case FormatNginx:
		return p.parseNginx(line)
	default:
		return p.parseText(line)
	}
}

func (p *LogParser) parseJSON(line string) (*LogEntry, error) {
	var fields map[string]interface{}
	if err := json.Unmarshal([]byte(line), &fields); err != nil {
		return nil, err
	}
	
	entry := &LogEntry{
		Raw:    line,
		Format: FormatJSON,
		Fields: fields,
	}
	
	if ts, ok := fields["timestamp"]; ok {
		entry.Timestamp = p.parseTime(ts)
	} else if ts, ok := fields["@timestamp"]; ok {
		entry.Timestamp = p.parseTime(ts)
	} else if ts, ok := fields["time"]; ok {
		entry.Timestamp = p.parseTime(ts)
	}
	
	if level, ok := fields["level"]; ok {
		entry.Level = fmt.Sprintf("%v", level)
	} else if level, ok := fields["log.level"]; ok {
		entry.Level = fmt.Sprintf("%v", level)
	}
	
	if msg, ok := fields["message"]; ok {
		entry.Message = fmt.Sprintf("%v", msg)
	} else if msg, ok := fields["msg"]; ok {
		entry.Message = fmt.Sprintf("%v", msg)
	}
	
	return entry, nil
}

func (p *LogParser) parseSyslog(line string) (*LogEntry, error) {
	entry := &LogEntry{
		Raw:    line,
		Format: FormatSyslog,
		Fields: make(map[string]interface{}),
	}
	
	syslogPattern := regexp.MustCompile(
		`^(<\d+>)?(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+):\s*(.*)$`)
	
	matches := syslogPattern.FindStringSubmatch(line)
	if len(matches) >= 6 {
		entry.Timestamp = p.parseSyslogTime(matches[2])
		entry.Fields["host"] = matches[3]
		entry.Fields["process"] = matches[4]
		entry.Message = matches[5]
		
		if strings.Contains(strings.ToLower(entry.Message), "error") {
			entry.Level = "ERROR"
		} else if strings.Contains(strings.ToLower(entry.Message), "warn") {
			entry.Level = "WARN"
		} else if strings.Contains(strings.ToLower(entry.Message), "debug") {
			entry.Level = "DEBUG"
		} else {
			entry.Level = "INFO"
		}
	} else {
		entry.Message = line
	}
	
	return entry, nil
}

func (p *LogParser) parseSyslogTime(timeStr string) time.Time {
	year := time.Now().Year()
	layout := "Jan 2 15:04:05"
	t, err := time.Parse(layout, timeStr)
	if err != nil {
		return time.Now()
	}
	return time.Date(year, t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), 0, time.Local)
}

func (p *LogParser) parseNginx(line string) (*LogEntry, error) {
	entry := &LogEntry{
		Raw:    line,
		Format: FormatNginx,
		Fields: make(map[string]interface{}),
	}
	
	nginxPattern := regexp.MustCompile(
		`^(\S+)\s+-\s+(\S+)\s+\[([^\]]+)\]\s+"(\w+)\s+(\S+)\s+(\S+)"\s+(\d{3})\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"`)
	
	matches := nginxPattern.FindStringSubmatch(line)
	if len(matches) >= 11 {
		entry.Fields["remote_addr"] = matches[1]
		entry.Fields["remote_user"] = matches[2]
		entry.Timestamp = p.parseNginxTime(matches[3])
		entry.Fields["method"] = matches[4]
		entry.Fields["path"] = matches[5]
		entry.Fields["protocol"] = matches[6]
		entry.Fields["status"], _ = strconv.Atoi(matches[7])
		entry.Fields["body_bytes_sent"], _ = strconv.Atoi(matches[8])
		entry.Fields["http_referer"] = matches[9]
		entry.Fields["http_user_agent"] = matches[10]
		
		status := entry.Fields["status"].(int)
		if status >= 500 {
			entry.Level = "ERROR"
		} else if status >= 400 {
			entry.Level = "WARN"
		} else {
			entry.Level = "INFO"
		}
		
		entry.Message = fmt.Sprintf("%s %s %d", matches[4], matches[5], status)
	} else {
		entry.Message = line
	}
	
	return entry, nil
}

func (p *LogParser) parseNginxTime(timeStr string) time.Time {
	layout := "02/Jan/2006:15:04:05 -0700"
	t, err := time.Parse(layout, timeStr)
	if err != nil {
		return time.Now()
	}
	return t
}

func (p *LogParser) parseText(line string) (*LogEntry, error) {
	entry := &LogEntry{
		Raw:    line,
		Format: FormatText,
		Fields: make(map[string]interface{}),
	}
	
	levelPattern := regexp.MustCompile(`\b(ERROR|error|Error|WARN|warn|Warn|INFO|info|Info|DEBUG|debug|Debug)\b`)
	if matches := levelPattern.FindStringSubmatch(line); len(matches) > 0 {
		entry.Level = strings.ToUpper(matches[0])
	} else {
		entry.Level = "INFO"
	}
	
	entry.Message = line
	
	return entry, nil
}

func (p *LogParser) parseTime(value interface{}) time.Time {
	switch v := value.(type) {
	case string:
		t, err := time.Parse(time.RFC3339, v)
		if err == nil {
			return t
		}
		t, err = time.Parse("2006-01-02 15:04:05", v)
		if err == nil {
			return t
		}
		t, err = time.Parse(time.RFC3339Nano, v)
		if err == nil {
			return t
		}
	case float64:
		return time.Unix(int64(v), 0)
	}
	return time.Now()
}

func (p *LogParser) ParseFile(filename string, callback func(*LogEntry) bool) error {
	file, err := os.Open(filename)
	if err != nil {
		return fmt.Errorf("无法打开文件: %w", err)
	}
	defer file.Close()
	
	reader := bufio.NewReader(file)
	buffer := make([]byte, 1024*1024)
	
	for {
		line, isPrefix, err := reader.ReadLine()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("读取文件错误: %w", err)
		}
		
		if isPrefix {
			var fullLine []byte
			fullLine = append(fullLine, line...)
			for isPrefix {
				line, isPrefix, err = reader.ReadLine()
				if err != nil {
					break
				}
				fullLine = append(fullLine, line...)
				if len(fullLine) > len(buffer) {
					buffer = make([]byte, len(fullLine)*2)
				}
			}
			line = fullLine
		}
		
		entry, err := p.ParseLine(string(line))
		if err != nil {
			continue
		}
		if entry == nil {
			continue
		}
		
		if !callback(entry) {
			break
		}
	}
	
	return nil
}
