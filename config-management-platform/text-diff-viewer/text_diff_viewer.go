package textdiffviewer

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"config-management-platform/backend/pkg/diff"
)

type TextDiffViewer struct {
	history        *DiffHistory
	maxHistorySize int
	mu             sync.RWMutex
}

type DiffHistory struct {
	Entries []*DiffHistoryEntry `json:"entries"`
}

type DiffHistoryEntry struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Type      string    `json:"type"`
	LeftPath  string    `json:"left_path,omitempty"`
	RightPath string    `json:"right_path,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	Result    *diff.DiffResult `json:"result,omitempty"`
	FolderResult *diff.FolderDiffResult `json:"folder_result,omitempty"`
}

type DiffHighlightConfig struct {
	AddedColor       string `json:"added_color"`
	RemovedColor     string `json:"removed_color"`
	ModifiedColor    string `json:"modified_color"`
	HighlightMode    string `json:"highlight_mode"`
	ShowLineNumbers  bool   `json:"show_line_numbers"`
	ContextLines     int    `json:"context_lines"`
	IgnoreWhitespace bool   `json:"ignore_whitespace"`
}

type MergeWizard struct {
	Result      *diff.MergeResult
	LeftText    string
	RightText   string
	BaseText    string
	Resolutions map[string]string
}

func NewTextDiffViewer() *TextDiffViewer {
	return &TextDiffViewer{
		history: &DiffHistory{
			Entries: []*DiffHistoryEntry{},
		},
		maxHistorySize: 50,
	}
}

func NewTextDiffViewerWithHistorySize(maxSize int) *TextDiffViewer {
	return &TextDiffViewer{
		history: &DiffHistory{
			Entries: []*DiffHistoryEntry{},
		},
		maxHistorySize: maxSize,
	}
}

func (tdv *TextDiffViewer) CompareTexts(leftText, rightText string, title string) (*diff.DiffResult, error) {
	result := diff.ComputeTextDiff(leftText, rightText)
	
	tdv.mu.Lock()
	defer tdv.mu.Unlock()
	
	entry := &DiffHistoryEntry{
		ID:        generateID(),
		Title:     title,
		Type:      "text",
		CreatedAt: time.Now(),
		Result:    result,
	}
	
	tdv.addHistoryEntry(entry)
	
	return result, nil
}

func (tdv *TextDiffViewer) CompareWords(leftText, rightText string, title string) (*diff.DiffResult, error) {
	result := diff.ComputeWordDiff(leftText, rightText)
	
	tdv.mu.Lock()
	defer tdv.mu.Unlock()
	
	entry := &DiffHistoryEntry{
		ID:        generateID(),
		Title:     title,
		Type:      "word",
		CreatedAt: time.Now(),
		Result:    result,
	}
	
	tdv.addHistoryEntry(entry)
	
	return result, nil
}

func (tdv *TextDiffViewer) CompareFiles(leftPath, rightPath string, title string) (*diff.DiffResult, error) {
	leftContent, err := os.ReadFile(leftPath)
	if err != nil {
		return nil, fmt.Errorf("无法读取左侧文件: %w", err)
	}
	
	rightContent, err := os.ReadFile(rightPath)
	if err != nil {
		return nil, fmt.Errorf("无法读取右侧文件: %w", err)
	}
	
	result := diff.ComputeTextDiff(string(leftContent), string(rightContent))
	
	tdv.mu.Lock()
	defer tdv.mu.Unlock()
	
	entry := &DiffHistoryEntry{
		ID:        generateID(),
		Title:     title,
		Type:      "file",
		LeftPath:  leftPath,
		RightPath: rightPath,
		CreatedAt: time.Now(),
		Result:    result,
	}
	
	tdv.addHistoryEntry(entry)
	
	return result, nil
}

func (tdv *TextDiffViewer) CompareFolders(leftPath, rightPath string, recursive bool, title string) (*diff.FolderDiffResult, error) {
	result, err := diff.ComputeFolderDiff(leftPath, rightPath, recursive)
	if err != nil {
		return nil, err
	}
	
	tdv.mu.Lock()
	defer tdv.mu.Unlock()
	
	entry := &DiffHistoryEntry{
		ID:           generateID(),
		Title:        title,
		Type:         "folder",
		LeftPath:     leftPath,
		RightPath:    rightPath,
		CreatedAt:    time.Now(),
		FolderResult: result,
	}
	
	tdv.addHistoryEntry(entry)
	
	return result, nil
}

func (tdv *TextDiffViewer) MergeTexts(leftText, rightText, baseText string) (*diff.MergeResult, error) {
	result := diff.MergeTexts(leftText, rightText, baseText)
	
	return result, nil
}

func (tdv *TextDiffViewer) CreateMergeWizard(leftText, rightText, baseText string) *MergeWizard {
	result := diff.MergeTexts(leftText, rightText, baseText)
	
	return &MergeWizard{
		Result:      result,
		LeftText:    leftText,
		RightText:   rightText,
		BaseText:    baseText,
		Resolutions: make(map[string]string),
	}
}

func (mw *MergeWizard) ResolveConflict(conflictID string, resolution string, customText ...string) error {
	conflictFound := false
	for i := range mw.Result.Conflicts {
		if mw.Result.Conflicts[i].ID == conflictID {
			conflictFound = true
			mw.Result.Conflicts[i].Resolution = resolution
			
			if resolution == "custom" && len(customText) > 0 {
				mw.Result.Conflicts[i].CustomText = customText[0]
			}
			
			mw.Resolutions[conflictID] = resolution
			mw.Result.ResolvedCount++
			mw.Result.UnresolvedCount--
			break
		}
	}
	
	if !conflictFound {
		return fmt.Errorf("冲突 '%s' 不存在", conflictID)
	}
	
	return nil
}

func (mw *MergeWizard) ResolveAllConflicts(resolution string) {
	for i := range mw.Result.Conflicts {
		if mw.Result.Conflicts[i].Resolution == "unresolved" {
			mw.Result.Conflicts[i].Resolution = resolution
			mw.Resolutions[mw.Result.Conflicts[i].ID] = resolution
			mw.Result.ResolvedCount++
			mw.Result.UnresolvedCount--
		}
	}
}

func (mw *MergeWizard) GenerateMergedText() string {
	if mw.Result.UnresolvedCount > 0 {
		return ""
	}
	
	leftLines := splitLines(mw.LeftText)
	rightLines := splitLines(mw.RightText)
	
	result := buildMergedText(leftLines, rightLines, mw.Result)
	
	return result
}

func (tdv *TextDiffViewer) GenerateUnifiedDiff(result *diff.DiffResult) string {
	var buf bytes.Buffer
	
	buf.WriteString("--- a/left.txt\n")
	buf.WriteString("+++ b/right.txt\n")
	
	for _, block := range result.Blocks {
		switch block.Type {
		case diff.DiffEqual:
			for _, line := range block.LeftLines {
				buf.WriteString(fmt.Sprintf(" %s\n", line.Text))
			}
		case diff.DiffDelete:
			for _, line := range block.LeftLines {
				buf.WriteString(fmt.Sprintf("-%s\n", line.Text))
			}
		case diff.DiffInsert:
			for _, line := range block.RightLines {
				buf.WriteString(fmt.Sprintf("+%s\n", line.Text))
			}
		}
	}
	
	return buf.String()
}

func (tdv *TextDiffViewer) GenerateSideBySideHTML(result *diff.DiffResult, config *DiffHighlightConfig) string {
	if config == nil {
		config = tdv.getDefaultHighlightConfig()
	}
	
	var html bytes.Buffer
	
	html.WriteString(`
<style>
.diff-container { display: flex; font-family: monospace; font-size: 14px; }
.diff-column { flex: 1; margin: 0 5px; }
.diff-line { display: flex; min-height: 20px; line-height: 20px; }
.diff-line-number { width: 40px; text-align: right; padding-right: 10px; color: #999; user-select: none; }
.diff-content { flex: 1; padding-left: 10px; white-space: pre-wrap; }
.diff-added { background-color: #e6ffec; }
.diff-removed { background-color: #ffebe9; }
.diff-unchanged { background-color: #f6f8fa; }
.diff-gap { background-color: #f1f1f1; color: #999; text-align: center; }
</style>
<div class="diff-container">
`)
	
	html.WriteString(`<div class="diff-column">`)
	html.WriteString(tdv.generateSideBySideColumnHTML(result, "left", config))
	html.WriteString(`</div>`)
	
	html.WriteString(`<div class="diff-column">`)
	html.WriteString(tdv.generateSideBySideColumnHTML(result, "right", config))
	html.WriteString(`</div>`)
	
	html.WriteString(`</div>`)
	
	return html.String()
}

func (tdv *TextDiffViewer) getDefaultHighlightConfig() *DiffHighlightConfig {
	return &DiffHighlightConfig{
		AddedColor:       "#e6ffec",
		RemovedColor:     "#ffebe9",
		ModifiedColor:    "#fff8c5",
		HighlightMode:    "background",
		ShowLineNumbers:  true,
		ContextLines:     3,
		IgnoreWhitespace: false,
	}
}

func (tdv *TextDiffViewer) generateSideBySideColumnHTML(result *diff.DiffResult, side string, config *DiffHighlightConfig) string {
	var html bytes.Buffer
	
	for _, block := range result.Blocks {
		var lines []diff.DiffLine
		var lineClass string
		
		switch block.Type {
		case diff.DiffEqual:
			lines = block.LeftLines
			lineClass = "diff-unchanged"
		case diff.DiffDelete:
			if side == "left" {
				lines = block.LeftLines
				lineClass = "diff-removed"
			}
		case diff.DiffInsert:
			if side == "right" {
				lines = block.RightLines
				lineClass = "diff-added"
			}
		}
		
		for _, line := range lines {
			html.WriteString(fmt.Sprintf(`<div class="diff-line %s">`, lineClass))
			if config.ShowLineNumbers {
				html.WriteString(fmt.Sprintf(`<span class="diff-line-number">%d</span>`, line.LineNumber))
			}
			html.WriteString(fmt.Sprintf(`<span class="diff-content">%s</span>`, escapeHTML(line.Text)))
			html.WriteString(`</div>`)
		}
	}
	
	return html.String()
}

func (tdv *TextDiffViewer) GetHistory() []*DiffHistoryEntry {
	tdv.mu.RLock()
	defer tdv.mu.RUnlock()
	
	entries := make([]*DiffHistoryEntry, len(tdv.history.Entries))
	copy(entries, tdv.history.Entries)
	
	return entries
}

func (tdv *TextDiffViewer) GetHistoryEntry(id string) (*DiffHistoryEntry, error) {
	tdv.mu.RLock()
	defer tdv.mu.RUnlock()
	
	for _, entry := range tdv.history.Entries {
		if entry.ID == id {
			return entry, nil
		}
	}
	
	return nil, fmt.Errorf("历史记录 '%s' 不存在", id)
}

func (tdv *TextDiffViewer) ClearHistory() {
	tdv.mu.Lock()
	defer tdv.mu.Unlock()
	
	tdv.history.Entries = []*DiffHistoryEntry{}
}

func (tdv *TextDiffViewer) addHistoryEntry(entry *DiffHistoryEntry) {
	tdv.history.Entries = append([]*DiffHistoryEntry{entry}, tdv.history.Entries...)
	
	if len(tdv.history.Entries) > tdv.maxHistorySize {
		tdv.history.Entries = tdv.history.Entries[:tdv.maxHistorySize]
	}
}

func generateID() string {
	timestamp := time.Now().UnixNano()
	return fmt.Sprintf("diff_%d", timestamp)
}

func splitLines(text string) []string {
	if text == "" {
		return []string{}
	}
	return strings.Split(text, "\n")
}

func buildMergedText(leftLines, rightLines []string, result *diff.MergeResult) string {
	if result.Success {
		return result.MergedText
	}
	
	return strings.Join(leftLines, "\n")
}

func escapeHTML(text string) string {
	text = strings.ReplaceAll(text, "&", "&amp;")
	text = strings.ReplaceAll(text, "<", "&lt;")
	text = strings.ReplaceAll(text, ">", "&gt;")
	text = strings.ReplaceAll(text, `"`, "&quot;")
	text = strings.ReplaceAll(text, "'", "&#39;")
	return text
}
