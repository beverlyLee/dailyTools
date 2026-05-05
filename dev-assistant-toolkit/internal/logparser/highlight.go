package logparser

import (
	"fmt"
	"regexp"
	"strings"
)

type HighlightConfig struct {
	ShowTimestamp bool
	ShowLevel     bool
	ShowMessage   bool
	ShowFields    bool
	ColorLevel    map[string]string
	HighlightWords []string
}

const (
	ColorReset     = "\033[0m"
	ColorBlack     = "\033[30m"
	ColorRed       = "\033[31m"
	ColorGreen     = "\033[32m"
	ColorYellow    = "\033[33m"
	ColorBlue      = "\033[34m"
	ColorMagenta   = "\033[35m"
	ColorCyan      = "\033[36m"
	ColorWhite     = "\033[37m"
	ColorBrightBlack = "\033[90m"
	ColorBrightRed   = "\033[91m"
	ColorBrightGreen = "\033[92m"
	ColorBrightYellow = "\033[93m"
	ColorBrightBlue   = "\033[94m"
	ColorBrightMagenta = "\033[95m"
	ColorBrightCyan    = "\033[96m"
	ColorBrightWhite   = "\033[97m"
	
	BGColorBlack   = "\033[40m"
	BGColorRed     = "\033[41m"
	BGColorGreen   = "\033[42m"
	BGColorYellow  = "\033[43m"
	BGColorBlue    = "\033[44m"
	BGColorMagenta = "\033[45m"
	BGColorCyan    = "\033[46m"
	BGColorWhite   = "\033[47m"
)

func DefaultHighlightConfig() *HighlightConfig {
	return &HighlightConfig{
		ShowTimestamp: true,
		ShowLevel:     true,
		ShowMessage:   true,
		ShowFields:    true,
		ColorLevel: map[string]string{
			"ERROR":   ColorBrightRed,
			"WARN":    ColorBrightYellow,
			"WARNING": ColorBrightYellow,
			"INFO":    ColorBrightGreen,
			"DEBUG":   ColorBrightBlack,
			"TRACE":   ColorBrightBlack,
		},
		HighlightWords: []string{},
	}
}

type Highlighter struct {
	config *HighlightConfig
}

func NewHighlighter(config *HighlightConfig) *Highlighter {
	if config == nil {
		config = DefaultHighlightConfig()
	}
	return &Highlighter{config: config}
}

func (h *Highlighter) Highlight(entry *LogEntry, query *Query) string {
	var result strings.Builder
	
	if h.config.ShowTimestamp && !entry.Timestamp.IsZero() {
		ts := entry.Timestamp.Format("2006-01-02 15:04:05")
		result.WriteString(ColorCyan)
		result.WriteString("[")
		result.WriteString(ts)
		result.WriteString("]")
		result.WriteString(ColorReset)
		result.WriteString(" ")
	}
	
	if h.config.ShowLevel && entry.Level != "" {
		levelColor := h.getLevelColor(entry.Level)
		levelStr := fmt.Sprintf("[%5s]", entry.Level)
		
		if levelColor != "" {
			result.WriteString(levelColor)
			result.WriteString(levelStr)
			result.WriteString(ColorReset)
		} else {
			result.WriteString(levelStr)
		}
		result.WriteString(" ")
	}
	
	if h.config.ShowMessage && entry.Message != "" {
		message := h.highlightWords(entry.Message, query)
		result.WriteString(message)
	}
	
	if h.config.ShowFields && len(entry.Fields) > 0 {
		result.WriteString(" ")
		result.WriteString(ColorBrightBlack)
		result.WriteString("(")
		
		first := true
		for k, v := range entry.Fields {
			if !first {
				result.WriteString(", ")
			}
			first = false
			
			fieldStr := fmt.Sprintf("%s=%v", k, v)
			fieldStr = h.highlightWords(fieldStr, query)
			result.WriteString(fieldStr)
		}
		
		result.WriteString(")")
		result.WriteString(ColorReset)
	}
	
	return result.String()
}

func (h *Highlighter) getLevelColor(level string) string {
	level = strings.ToUpper(level)
	if color, ok := h.config.ColorLevel[level]; ok {
		return color
	}
	return ColorWhite
}

func (h *Highlighter) highlightWords(text string, query *Query) string {
	wordsToHighlight := make([]string, 0)
	
	for _, word := range h.config.HighlightWords {
		wordsToHighlight = append(wordsToHighlight, word)
	}
	
	if query != nil {
		for _, cond := range query.Conditions {
			if cond.Operator == "=~" || cond.Operator == "CONTAINS" ||
				cond.Operator == "STARTS" || cond.Operator == "ENDS" {
				if strVal, ok := cond.Value.(string); ok {
					wordsToHighlight = append(wordsToHighlight, strVal)
				}
			}
		}
	}
	
	if len(wordsToHighlight) == 0 {
		return text
	}
	
	result := text
	for _, word := range wordsToHighlight {
		if word == "" {
			continue
		}
		re := regexp.MustCompile("(?i)" + regexp.QuoteMeta(word))
		result = re.ReplaceAllStringFunc(result, func(match string) string {
			return BGColorYellow + ColorBlack + match + ColorReset
		})
	}
	
	return result
}

func FormatEntry(entry *LogEntry) string {
	highlighter := NewHighlighter(nil)
	return highlighter.Highlight(entry, nil)
}

func FormatEntryWithQuery(entry *LogEntry, query *Query) string {
	highlighter := NewHighlighter(nil)
	return highlighter.Highlight(entry, query)
}

func Colorize(text, color string) string {
	return color + text + ColorReset
}

func Success(msg string) string {
	return ColorGreen + "✓ " + ColorReset + msg
}

func Error(msg string) string {
	return ColorRed + "✗ " + ColorReset + msg
}

func Warning(msg string) string {
	return ColorYellow + "⚠ " + ColorReset + msg
}

func Info(msg string) string {
	return ColorCyan + "ℹ " + ColorReset + msg
}
