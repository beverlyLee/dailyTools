package imageanalyzer

import (
	"time"
)

type ImageAnalysisReport struct {
	ImageName       string
	ImageSize       int64
	AnalyzedAt      time.Time
	Layers          []LayerInfo
	TotalFiles      int
	DuplicateFiles  []DuplicateFile
	RedundantFiles  []RedundantFile
	OptimizationTips []OptimizationTip
}

type LayerInfo struct {
	ID          string
	CreatedBy   string
	Size        int64
	Files       []FileInfo
	Diff        *LayerDiff
}

type FileInfo struct {
	Path    string
	Size    int64
	ModTime time.Time
	Hash    string
	Mode    uint32
}

type LayerDiff struct {
	AddedFiles   []FileInfo
	ModifiedFiles []FileInfo
	DeletedFiles  []string
}

type DuplicateFile struct {
	Hash        string
	Paths       []string
	TotalSize   int64
	LayerIDs    []string
}

type RedundantFile struct {
	Path        string
	Size        int64
	Reason      string
	Suggestion  string
}

type OptimizationTip struct {
	Title       string
	Description string
	Severity    string
	Suggestion  string
	Impact      string
}