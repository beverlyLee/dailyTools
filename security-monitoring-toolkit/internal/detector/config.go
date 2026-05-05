package detector

import (
	"regexp"
	"time"
)

type DetectorConfig struct {
	LearningPhaseDuration time.Duration
	AnomalyThreshold      float64
	ErrorBurstWindow      time.Duration
	ErrorBurstThreshold   int
	MaxLogPatterns        int
	PatternUpdateInterval time.Duration
	AlertThreshold        float64
	SlackWebhook          string
	WebhookURL            string
	LogFormats            []LogFormatConfig
	IgnoredPatterns       []*regexp.Regexp
	Verbose               bool
}

type LogFormatConfig struct {
	Name       string
	Pattern    *regexp.Regexp
	TimeFormat string
	TimeGroup  int
	LevelGroup int
	MsgGroup   int
}

type DetectorStats struct {
	TotalEntries        int64
	NormalEntries       int64
	AnomalousEntries    int64
	ErrorCount          int64
	WarningCount        int64
	PatternsLearned     int
	StartTime           time.Time
	LastAnomalyTime     time.Time
	ErrorRates          map[time.Time]float64
}

func DefaultConfig() *DetectorConfig {
	return &DetectorConfig{
		LearningPhaseDuration: 5 * time.Minute,
		AnomalyThreshold:      0.7,
		ErrorBurstWindow:      1 * time.Minute,
		ErrorBurstThreshold:   10,
		MaxLogPatterns:        1000,
		PatternUpdateInterval: 10 * time.Second,
		AlertThreshold:        0.8,
		LogFormats: []LogFormatConfig{
			{
				Name:       "standard",
				Pattern:    regexp.MustCompile(`^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)\s+(\w+)\s+(.*)$`),
				TimeFormat: time.RFC3339,
				TimeGroup:  1,
				LevelGroup: 2,
				MsgGroup:   3,
			},
			{
				Name:       "simple",
				Pattern:    regexp.MustCompile(`^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)$`),
				TimeFormat: "2006-01-02 15:04:05",
				TimeGroup:  1,
				LevelGroup: 2,
				MsgGroup:   3,
			},
		},
		Verbose: false,
	}
}

type PatternMatcher struct {
	templates map[string]int
	params    map[string][]string
}

func NewPatternMatcher() *PatternMatcher {
	return &PatternMatcher{
		templates: make(map[string]int),
		params:    make(map[string][]string),
	}
}
