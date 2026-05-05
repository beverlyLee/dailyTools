package detector

import (
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/security-monitoring-toolkit/internal/common"
)

type LogParser struct {
	formats []LogFormatConfig
}

func NewLogParser(formats []LogFormatConfig) *LogParser {
	if formats == nil {
		formats = DefaultConfig().LogFormats
	}
	return &LogParser{formats: formats}
}

func (p *LogParser) Parse(line string) (*common.LogEntry, bool) {
	for _, format := range p.formats {
		matches := format.Pattern.FindStringSubmatch(line)
		if matches != nil && len(matches) > format.MsgGroup {
			entry := &common.LogEntry{
				RawMessage: line,
			}

			if format.TimeGroup > 0 && format.TimeGroup < len(matches) {
				t, err := time.Parse(format.TimeFormat, matches[format.TimeGroup])
				if err == nil {
					entry.Timestamp = t
				} else {
					entry.Timestamp = time.Now()
				}
			} else {
				entry.Timestamp = time.Now()
			}

			if format.LevelGroup > 0 && format.LevelGroup < len(matches) {
				entry.Level = normalizeLogLevel(matches[format.LevelGroup])
			}

			if format.MsgGroup > 0 && format.MsgGroup < len(matches) {
				entry.RawMessage = matches[format.MsgGroup]
			}

			return entry, true
		}
	}

	return &common.LogEntry{
		Timestamp:  time.Now(),
		RawMessage: line,
		Level:      "UNKNOWN",
	}, false
}

func normalizeLogLevel(level string) string {
	level = strings.ToUpper(strings.TrimSpace(level))
	switch level {
	case "DEBG", "DEBUG", "DBG":
		return "DEBUG"
	case "INFO", "INF", "LOG":
		return "INFO"
	case "WARN", "WARNING", "WRN":
		return "WARN"
	case "ERROR", "ERR", "SEVERE", "FATAL", "CRITICAL":
		return "ERROR"
	case "PANIC":
		return "PANIC"
	default:
		return level
	}
}

var (
	numberPattern    = regexp.MustCompile(`\b\d+\.\d+\b|\b\d+\b`)
	uuidPattern      = regexp.MustCompile(`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)
	hexPattern       = regexp.MustCompile(`\b0x[0-9a-fA-F]+\b`)
	ipPattern        = regexp.MustCompile(`\b(?:\d{1,3}\.){3}\d{1,3}\b`)
	urlPattern       = regexp.MustCompile(`https?://[^\s]+`)
	emailPattern     = regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
	pathPattern      = regexp.MustCompile(`/[a-zA-Z0-9_/-]+`)
	guidPattern      = regexp.MustCompile(`\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}`)
	quotePattern     = regexp.MustCompile(`"[^"]*"`)
	singleQuotePattern = regexp.MustCompile(`'[^']*'`)
)

func ExtractTemplate(message string) (string, []string) {
	params := []string{}

	replacements := []struct {
		pattern *regexp.Regexp
		placeholder string
	}{
		{uuidPattern, "<UUID>"},
		{guidPattern, "<GUID>"},
		{emailPattern, "<EMAIL>"},
		{urlPattern, "<URL>"},
		{ipPattern, "<IP>"},
		{hexPattern, "<HEX>"},
	}

	template := message
	for _, r := range replacements {
		matches := r.pattern.FindAllString(template, -1)
		for _, match := range matches {
			params = append(params, match)
		}
		template = r.pattern.ReplaceAllString(template, r.placeholder)
	}

	quoteMatches := quotePattern.FindAllString(template, -1)
	for _, match := range quoteMatches {
		if len(match) > 2 {
			content := match[1 : len(match)-1]
			if looksLikeParameter(content) {
				params = append(params, content)
				template = strings.Replace(template, match, "<STRING>", 1)
			}
		}
	}

	singleQuoteMatches := singleQuotePattern.FindAllString(template, -1)
	for _, match := range singleQuoteMatches {
		if len(match) > 2 {
			content := match[1 : len(match)-1]
			if looksLikeParameter(content) {
				params = append(params, content)
				template = strings.Replace(template, match, "<STRING>", 1)
			}
		}
	}

	numberMatches := numberPattern.FindAllString(template, -1)
	for _, match := range numberMatches {
		if !isLikelyConstant(match) {
			params = append(params, match)
		}
	}
	template = numberPattern.ReplaceAllStringFunc(template, func(s string) string {
		if isLikelyConstant(s) {
			return s
		}
		return "<NUM>"
	})

	return template, params
}

func looksLikeParameter(s string) bool {
	if len(s) == 0 {
		return false
	}

	if regexp.MustCompile(`^[a-f0-9]{8,}$`).MatchString(s) {
		return true
	}

	if len(s) > 20 {
		return true
	}

	if regexp.MustCompile(`^[A-Z]{2,}_[A-Z_]+$`).MatchString(s) {
		return false
	}

	if regexp.MustCompile(`^\d+$`).MatchString(s) {
		return !isLikelyConstant(s)
	}

	return true
}

func isLikelyConstant(s string) bool {
	if num, err := strconv.Atoi(s); err == nil {
		if num >= 0 && num <= 100 {
			return true
		}
		if num == 200 || num == 404 || num == 500 || num == 302 || num == 301 || num == 400 || num == 401 || num == 403 || num == 502 || num == 503 {
			return true
		}
		if num == 80 || num == 443 || num == 8080 || num == 8443 || num == 3000 || num == 5000 || num == 22 {
			return true
		}
	}

	if f, err := strconv.ParseFloat(s, 64); err == nil {
		if f >= 0 && f <= 10 {
			return true
		}
	}

	return false
}

func JaroWinkler(s1, s2 string) float64 {
	if s1 == s2 {
		return 1.0
	}

	len1 := len(s1)
	len2 := len(s2)

	if len1 == 0 || len2 == 0 {
		return 0.0
	}

	matchDistance := max(len1, len2)/2 - 1
	if matchDistance < 0 {
		matchDistance = 0
	}

	matches1 := make([]bool, len1)
	matches2 := make([]bool, len2)
	matches := 0

	for i := 0; i < len1; i++ {
		start := max(0, i-matchDistance)
		end := min(len2, i+matchDistance+1)

		for j := start; j < end; j++ {
			if matches2[j] {
				continue
			}
			if s1[i] != s2[j] {
				continue
			}
			matches1[i] = true
			matches2[j] = true
			matches++
			break
		}
	}

	if matches == 0 {
		return 0.0
	}

	transpositions := 0
	k := 0
	for i := 0; i < len1; i++ {
		if !matches1[i] {
			continue
		}
		for !matches2[k] {
			k++
		}
		if s1[i] != s2[k] {
			transpositions++
		}
		k++
	}

	jaro := (float64(matches)/float64(len1) + float64(matches)/float64(len2) + float64(matches-transpositions/2)/float64(matches)) / 3.0

	prefixLen := 0
	for prefixLen < 4 && prefixLen < len1 && prefixLen < len2 && s1[prefixLen] == s2[prefixLen] {
		prefixLen++
	}

	return jaro + float64(prefixLen)*0.1*(1.0-jaro)
}

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
