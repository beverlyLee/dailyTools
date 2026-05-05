package complexity

type ComplexityResult struct {
	FilePath           string  `json:"file_path"`
	CyclomaticComplexity int   `json:"cyclomatic_complexity"`
	CognitiveComplexity  int   `json:"cognitive_complexity"`
	Functions          []FunctionResult `json:"functions"`
}

type FunctionResult struct {
	Name                 string `json:"name"`
	Line                 int    `json:"line"`
	CyclomaticComplexity int    `json:"cyclomatic_complexity"`
	CognitiveComplexity  int    `json:"cognitive_complexity"`
}

type Report struct {
	Files       []ComplexityResult `json:"files"`
	TotalFiles  int                `json:"total_files"`
	AvgCyclomatic float64          `json:"avg_cyclomatic"`
	AvgCognitive  float64          `json:"avg_cognitive"`
	ThresholdBreached bool         `json:"threshold_breached"`
}

type Config struct {
	CyclomaticThreshold int
	CognitiveThreshold  int
	IgnorePatterns      []string
}
