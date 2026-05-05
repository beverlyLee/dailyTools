package models

import (
	"time"
)

type Environment struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Key         string    `json:"key"`
	Icon        string    `json:"icon"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Config struct {
	ID              string            `json:"id"`
	EnvironmentID   string            `json:"environment_id"`
	Name            string            `json:"name"`
	Key             string            `json:"key"`
	Format          ConfigFormat      `json:"format"`
	Content         string            `json:"content"`
	EncryptedFields []string          `json:"encrypted_fields"`
	Metadata        map[string]string `json:"metadata"`
	Version         int               `json:"version"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

type ConfigFormat string

const (
	FormatKeyValue ConfigFormat = "keyvalue"
	FormatJSON     ConfigFormat = "json"
	FormatYAML     ConfigFormat = "yaml"
	FormatProperties ConfigFormat = "properties"
)

type ConfigVersion struct {
	ID          string    `json:"id"`
	ConfigID    string    `json:"config_id"`
	Version     string    `json:"version"`
	VersionNum  int       `json:"version_num"`
	Content     string    `json:"content"`
	ChangeLog   string    `json:"change_log"`
	Author      string    `json:"author"`
	CreatedAt   time.Time `json:"created_at"`
}

type ConfigKeyValue struct {
	Key         string `json:"key"`
	Value       string `json:"value"`
	IsEncrypted bool   `json:"is_encrypted"`
	Description string `json:"description"`
}

type DiffResult struct {
	LeftText   string       `json:"left_text"`
	RightText  string       `json:"right_text"`
	Operations []DiffOp     `json:"operations"`
	Blocks     []DiffBlock  `json:"blocks"`
	Stats      DiffStats    `json:"stats"`
}

type DiffOp struct {
	Type   DiffType `json:"type"`
	Text   string   `json:"text"`
	Line   int      `json:"line"`
	Column int      `json:"column"`
}

type DiffType string

const (
	DiffEqual   DiffType = "equal"
	DiffInsert  DiffType = "insert"
	DiffDelete  DiffType = "delete"
	DiffReplace DiffType = "replace"
)

type DiffBlock struct {
	Type        DiffType    `json:"type"`
	LeftLines   []DiffLine  `json:"left_lines"`
	RightLines  []DiffLine  `json:"right_lines"`
	StartLine   int         `json:"start_line"`
	EndLine     int         `json:"end_line"`
}

type DiffLine struct {
	LineNumber int    `json:"line_number"`
	Text       string `json:"text"`
	Status     string `json:"status"` // "added", "removed", "unchanged", "modified"
}

type DiffStats struct {
	TotalLines   int `json:"total_lines"`
	AddedLines   int `json:"added_lines"`
	RemovedLines int `json:"removed_lines"`
	ModifiedLines int `json:"modified_lines"`
	UnchangedLines int `json:"unchanged_lines"`
}

type FolderDiffResult struct {
	LeftPath  string                `json:"left_path"`
	RightPath string                `json:"right_path"`
	Files     []FolderDiffFile      `json:"files"`
	Stats     FolderDiffStats       `json:"stats"`
}

type FolderDiffFile struct {
	Path       string       `json:"path"`
	LeftExists bool         `json:"left_exists"`
	RightExists bool        `json:"right_exists"`
	Status     string       `json:"status"` // "added", "removed", "modified", "unchanged"
	DiffResult *DiffResult  `json:"diff_result,omitempty"`
}

type FolderDiffStats struct {
	TotalFiles     int `json:"total_files"`
	AddedFiles     int `json:"added_files"`
	RemovedFiles   int `json:"removed_files"`
	ModifiedFiles  int `json:"modified_files"`
	UnchangedFiles int `json:"unchanged_files"`
}

type MergeConflict struct {
	ID          string    `json:"id"`
	BlockIndex  int       `json:"block_index"`
	LeftText    string    `json:"left_text"`
	RightText   string    `json:"right_text"`
	Resolution  string    `json:"resolution"` // "left", "right", "both", "custom"
	CustomText  string    `json:"custom_text,omitempty"`
	StartLine   int       `json:"start_line"`
	EndLine     int       `json:"end_line"`
}

type MergeResult struct {
	Success      bool            `json:"success"`
	MergedText   string          `json:"merged_text"`
	Conflicts    []MergeConflict `json:"conflicts"`
	ResolvedCount int            `json:"resolved_count"`
	UnresolvedCount int          `json:"unresolved_count"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

type PaginationParams struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

type SortParams struct {
	Field     string `json:"field"`
	Direction string `json:"direction"` // "asc", "desc"
}

type FilterParams struct {
	Search      string            `json:"search"`
	Environment string            `json:"environment"`
	Format      ConfigFormat      `json:"format"`
	Tags        []string          `json:"tags"`
	DateRange   *DateRange        `json:"date_range"`
}

type DateRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

type ConfigExport struct {
	Format      ConfigFormat      `json:"format"`
	Content     string            `json:"content"`
	Environment string            `json:"environment"`
	Metadata    map[string]string `json:"metadata"`
}

type ConfigImport struct {
	Format        ConfigFormat      `json:"format"`
	Content       string            `json:"content"`
	EnvironmentID string            `json:"environment_id"`
	Name          string            `json:"name"`
	Key           string            `json:"key"`
	EncryptFields bool              `json:"encrypt_fields"`
}
