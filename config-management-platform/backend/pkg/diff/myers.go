package diff

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode"
	"unicode/utf8"
)

type DiffType string

const (
	DiffEqual   DiffType = "equal"
	DiffInsert  DiffType = "insert"
	DiffDelete  DiffType = "delete"
)

type DiffOperation struct {
	Type   DiffType `json:"type"`
	Text   string   `json:"text"`
	Line   int      `json:"line"`
	Column int      `json:"column"`
}

type DiffBlock struct {
	Type       DiffType   `json:"type"`
	LeftLines  []DiffLine `json:"left_lines"`
	RightLines []DiffLine `json:"right_lines"`
	StartLine  int        `json:"start_line"`
	EndLine    int        `json:"end_line"`
}

type DiffLine struct {
	LineNumber int    `json:"line_number"`
	Text       string `json:"text"`
	Status     string `json:"status"`
}

type DiffResult struct {
	LeftText   string          `json:"left_text"`
	RightText  string          `json:"right_text"`
	Operations []DiffOperation `json:"operations"`
	Blocks     []DiffBlock     `json:"blocks"`
	Stats      DiffStats     `json:"stats"`
}

type DiffStats struct {
	TotalLines     int `json:"total_lines"`
	AddedLines     int `json:"added_lines"`
	RemovedLines   int `json:"removed_lines"`
	ModifiedLines  int `json:"modified_lines"`
	UnchangedLines int `json:"unchanged_lines"`
}

type FolderDiffResult struct {
	LeftPath  string             `json:"left_path"`
	RightPath string             `json:"right_path"`
	Files     []FolderDiffFile   `json:"files"`
	Stats     FolderDiffStats  `json:"stats"`
}

type FolderDiffFile struct {
	Path        string       `json:"path"`
	LeftExists  bool         `json:"left_exists"`
	RightExists bool         `json:"right_exists"`
	Status      string       `json:"status"`
	DiffResult  *DiffResult `json:"diff_result,omitempty"`
}

type FolderDiffStats struct {
	TotalFiles     int `json:"total_files"`
	AddedFiles     int `json:"added_files"`
	RemovedFiles   int `json:"removed_files"`
	ModifiedFiles  int `json:"modified_files"`
	UnchangedFiles int `json:"unchanged_files"`
}

type MergeResult struct {
	Success         bool            `json:"success"`
	MergedText      string          `json:"merged_text"`
	Conflicts       []MergeConflict `json:"conflicts"`
	ResolvedCount   int             `json:"resolved_count"`
	UnresolvedCount int             `json:"unresolved_count"`
}

type MergeConflict struct {
	ID         string `json:"id"`
	BlockIndex int    `json:"block_index"`
	LeftText   string `json:"left_text"`
	RightText  string `json:"right_text"`
	Resolution string `json:"resolution"`
	CustomText string `json:"custom_text,omitempty"`
	StartLine  int    `json:"start_line"`
	EndLine    int    `json:"end_line"`
}

type myersPath struct {
	left  []string
	right []string
}

func ComputeTextDiff(leftText, rightText string) *DiffResult {
	leftLines := splitLines(leftText)
	rightLines := splitLines(rightText)
	
	return ComputeLineDiff(leftLines, rightLines)
}

func ComputeLineDiff(leftLines, rightLines []string) *DiffResult {
	m := &myersPath{
		left:  leftLines,
		right: rightLines,
	}
	
	shortestEdit := m.shortestEditSequence()
	operations := m.backtrack(shortestEdit)
	
	blocks := groupOperationsToBlocks(operations, leftLines, rightLines)
	stats := computeStats(operations, leftLines, rightLines)
	
	return &DiffResult{
		LeftText:   strings.Join(leftLines, "\n"),
		RightText:  strings.Join(rightLines, "\n"),
		Operations: operations,
		Blocks:     blocks,
		Stats:      stats,
	}
}

func (m *myersPath) shortestEditSequence() [][]int {
	n := len(m.left)
	mSize := len(m.right)
	maxVal := n + mSize
	
	v := make([]int, 2*maxVal+1)
	trace := make([][]int, 0)
	
	for d := 0; d <= maxVal; d++ {
		vCopy := make([]int, len(v))
		copy(vCopy, v)
		trace = append(trace, vCopy)
		
		for k := -d; k <= d; k += 2 {
			var x int
			if k == -d || (k != d && v[k-1+maxVal] < v[k+1+maxVal]) {
				x = v[k+1+maxVal]
			} else {
				x = v[k-1+maxVal] + 1
			}
			
			y := x - k
			
			for x < n && y < mSize && m.left[x] == m.right[y] {
				x++
				y++
			}
			
			v[k+maxVal] = x
			
			if x >= n && y >= mSize {
				return trace
			}
		}
	}
	
	return trace
}

func (m *myersPath) backtrack(trace [][]int) []DiffOperation {
	n := len(m.left)
	mSize := len(m.right)
	
	var operations []DiffOperation
	
	x := n
	y := mSize
	
	for d := len(trace) - 1; d >= 0; d-- {
		v := trace[d]
		k := x - y
		maxIdx := len(trace[0]) - 1
		
		var prevK int
		if k == -d || (k != d && v[k-1+maxIdx] < v[k+1+maxIdx]) {
			prevK = k + 1
		} else {
			prevK = k - 1
		}
		
		prevX := v[prevK+maxIdx]
		prevY := prevX - prevK
		
		for x > prevX && y > prevY {
			operations = append(operations, DiffOperation{
				Type:   DiffEqual,
				Text:   m.left[x-1],
				Line:   x - 1,
				Column: 0,
			})
			x--
			y--
		}
		
		if d > 0 {
			if x > prevX {
				operations = append(operations, DiffOperation{
					Type:   DiffDelete,
					Text:   m.left[x-1],
					Line:   x - 1,
					Column: 0,
				})
				x--
			} else {
				operations = append(operations, DiffOperation{
					Type:   DiffInsert,
					Text:   m.right[y-1],
					Line:   y - 1,
					Column: 0,
				})
				y--
			}
		}
	}
	
	for i, j := 0, len(operations)-1; i < j; i, j = i+1, j-1 {
		operations[i], operations[j] = operations[j], operations[i]
	}
	
	return operations
}

func groupOperationsToBlocks(operations []DiffOperation, leftLines, rightLines []string) []DiffBlock {
	var blocks []DiffBlock
	
	if len(operations) == 0 {
		return blocks
	}
	
	var currentBlock *DiffBlock
	leftLineNum := 0
	rightLineNum := 0
	
	for _, op := range operations {
		if currentBlock == nil || currentBlock.Type != op.Type {
			if currentBlock != nil {
				blocks = append(blocks, *currentBlock)
			}
			
			currentBlock = &DiffBlock{
				Type:       op.Type,
				LeftLines:  []DiffLine{},
				RightLines: []DiffLine{},
			}
		}
		
		var status string
		
		switch op.Type {
		case DiffEqual:
			status = "unchanged"
			currentBlock.LeftLines = append(currentBlock.LeftLines, DiffLine{
				LineNumber: leftLineNum + 1,
				Text:       op.Text,
				Status:     status,
			})
			currentBlock.RightLines = append(currentBlock.RightLines, DiffLine{
				LineNumber: rightLineNum + 1,
				Text:       op.Text,
				Status:     status,
			})
			leftLineNum++
			rightLineNum++
			
		case DiffDelete:
			status = "removed"
			currentBlock.LeftLines = append(currentBlock.LeftLines, DiffLine{
				LineNumber: leftLineNum + 1,
				Text:       op.Text,
				Status:     status,
			})
			leftLineNum++
			
		case DiffInsert:
			status = "added"
			currentBlock.RightLines = append(currentBlock.RightLines, DiffLine{
				LineNumber: rightLineNum + 1,
				Text:       op.Text,
				Status:     status,
			})
			rightLineNum++
		}
	}
	
	if currentBlock != nil {
		blocks = append(blocks, *currentBlock)
	}
	
	return blocks
}

func computeStats(operations []DiffOperation, leftLines, rightLines []string) DiffStats {
	stats := DiffStats{
		TotalLines:     max(len(leftLines), len(rightLines)),
		AddedLines:     0,
		RemovedLines:   0,
		ModifiedLines:  0,
		UnchangedLines: 0,
	}
	
	for _, op := range operations {
		switch op.Type {
		case DiffInsert:
			stats.AddedLines++
		case DiffDelete:
			stats.RemovedLines++
		case DiffEqual:
			stats.UnchangedLines++
		}
	}
	
	return stats
}

func splitLines(text string) []string {
	if text == "" {
		return []string{}
	}
	
	var lines []string
	var currentLine bytes.Buffer
	
	for i := 0; i < len(text); {
		r, size := utf8.DecodeRuneInString(text[i:])
		
		if r == '\n' {
			lines = append(lines, currentLine.String())
			currentLine.Reset()
			i += size
		} else if r == '\r' {
			if i+size < len(text) && text[i+size] == '\n' {
				lines = append(lines, currentLine.String())
				currentLine.Reset()
				i += size + 1
			} else {
				lines = append(lines, currentLine.String())
				currentLine.Reset()
				i += size
			}
		} else {
			currentLine.WriteRune(r)
			i += size
		}
	}
	
	if currentLine.Len() > 0 {
		lines = append(lines, currentLine.String())
	}
	
	return lines
}

func ComputeWordDiff(leftText, rightText string) *DiffResult {
	leftWords := splitWords(leftText)
	rightWords := splitWords(rightText)
	
	m := &myersPath{
		left:  leftWords,
		right: rightWords,
	}
	
	shortestEdit := m.shortestEditSequence()
	operations := m.backtrack(shortestEdit)
	
	wordToLineOps := wordOperationsToLineOperations(operations, leftText, rightText)
	
	blocks := groupOperationsToBlocks(wordToLineOps, splitLines(leftText), splitLines(rightText))
	stats := computeStats(wordToLineOps, splitLines(leftText), splitLines(rightText))
	
	return &DiffResult{
		LeftText:   leftText,
		RightText:  rightText,
		Operations: wordToLineOps,
		Blocks:     blocks,
		Stats:      stats,
	}
}

func splitWords(text string) []string {
	var words []string
	var currentWord bytes.Buffer
	
	for _, r := range text {
		if unicode.IsSpace(r) || unicode.IsPunct(r) || unicode.IsSymbol(r) {
			if currentWord.Len() > 0 {
				words = append(words, currentWord.String())
				currentWord.Reset()
			}
			words = append(words, string(r))
		} else {
			currentWord.WriteRune(r)
		}
	}
	
	if currentWord.Len() > 0 {
		words = append(words, currentWord.String())
	}
	
	return words
}

func wordOperationsToLineOperations(wordOps []DiffOperation, leftText, rightText string) []DiffOperation {
	leftLines := splitLines(leftText)
	rightLines := splitLines(rightText)
	
	return ComputeLineDiff(leftLines, rightLines).Operations
}

func ComputeFolderDiff(leftPath, rightPath string, recursive bool) (*FolderDiffResult, error) {
	result := &FolderDiffResult{
		LeftPath:  leftPath,
		RightPath: rightPath,
		Files:     []FolderDiffFile{},
		Stats:     FolderDiffStats{},
	}
	
	leftFiles, err := listFiles(leftPath, recursive)
	if err != nil {
		return nil, fmt.Errorf("无法列出左侧目录: %w", err)
	}
	
	rightFiles, err := listFiles(rightPath, recursive)
	if err != nil {
		return nil, fmt.Errorf("无法列出右侧目录: %w", err)
	}
	
	allFiles := make(map[string]bool)
	for path := range leftFiles {
		allFiles[path] = true
	}
	for path := range rightFiles {
		allFiles[path] = true
	}
	
	for path := range allFiles {
		leftExists := leftFiles[path]
		rightExists := rightFiles[path]
		
		var status string
		var diffResult *DiffResult
		
		if leftExists && rightExists {
			leftContent, err := os.ReadFile(filepath.Join(leftPath, path))
			if err != nil {
				return nil, fmt.Errorf("无法读取左侧文件 %s: %w", path, err)
			}
			
			rightContent, err := os.ReadFile(filepath.Join(rightPath, path))
			if err != nil {
				return nil, fmt.Errorf("无法读取右侧文件 %s: %w", path, err)
			}
			
			if string(leftContent) == string(rightContent) {
				status = "unchanged"
				result.Stats.UnchangedFiles++
			} else {
				status = "modified"
				result.Stats.ModifiedFiles++
				diffResult = ComputeTextDiff(string(leftContent), string(rightContent))
			}
		} else if leftExists {
			status = "removed"
			result.Stats.RemovedFiles++
		} else {
			status = "added"
			result.Stats.AddedFiles++
		}
		
		result.Files = append(result.Files, FolderDiffFile{
			Path:        path,
			LeftExists:  leftExists,
			RightExists: rightExists,
			Status:      status,
			DiffResult:  diffResult,
		})
		
		result.Stats.TotalFiles++
	}
	
	return result, nil
}

func listFiles(dirPath string, recursive bool) (map[string]bool, error) {
	files := make(map[string]bool)
	
	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if info.IsDir() {
			return nil
		}
		
		relPath, err := filepath.Rel(dirPath, path)
		if err != nil {
			return err
		}
		
		files[relPath] = true
		
		return nil
	})
	
	if err != nil {
		return nil, err
	}
	
	return files, nil
}

func MergeTexts(leftText, rightText, baseText string) *MergeResult {
	result := &MergeResult{
		Success:         false,
		MergedText:      "",
		Conflicts:       []MergeConflict{},
		ResolvedCount:   0,
		UnresolvedCount: 0,
	}
	
	leftDiff := ComputeTextDiff(baseText, leftText)
	rightDiff := ComputeTextDiff(baseText, rightText)
	
	conflicts := detectConflicts(leftDiff, rightDiff)
	
	if len(conflicts) == 0 {
		result.Success = true
		result.MergedText = mergeWithoutConflicts(leftText, rightText, baseText)
		return result
	}
	
	result.Conflicts = conflicts
	result.UnresolvedCount = len(conflicts)
	
	return result
}

func detectConflicts(leftDiff, rightDiff *DiffResult) []MergeConflict {
	var conflicts []MergeConflict
	
	leftChanges := make(map[int]bool)
	rightChanges := make(map[int]bool)
	
	for _, op := range leftDiff.Operations {
		if op.Type != DiffEqual {
			leftChanges[op.Line] = true
		}
	}
	
	for _, op := range rightDiff.Operations {
		if op.Type != DiffEqual {
			rightChanges[op.Line] = true
		}
	}
	
	for line := range leftChanges {
		if rightChanges[line] {
			conflicts = append(conflicts, MergeConflict{
				ID:         fmt.Sprintf("conflict-%d", line),
				BlockIndex: line,
				StartLine:  line,
				EndLine:    line + 1,
				Resolution: "unresolved",
			})
		}
	}
	
	return conflicts
}

func mergeWithoutConflicts(leftText, rightText, baseText string) string {
	baseLines := splitLines(baseText)
	leftLines := splitLines(leftText)
	
	leftDiff := ComputeTextDiff(baseText, leftText)
	
	var mergedLines []string
	baseIndex := 0
	leftIndex := 0
	
	for _, block := range leftDiff.Blocks {
		switch block.Type {
		case DiffEqual:
			for range block.LeftLines {
				if baseIndex < len(baseLines) {
					mergedLines = append(mergedLines, baseLines[baseIndex])
					baseIndex++
					leftIndex++
				}
			}
		case DiffDelete:
			baseIndex += len(block.LeftLines)
			leftIndex += len(block.LeftLines)
		case DiffInsert:
			for range block.RightLines {
				if leftIndex < len(leftLines) {
					mergedLines = append(mergedLines, leftLines[leftIndex])
					leftIndex++
				}
			}
		}
	}
	
	for baseIndex < len(baseLines) {
		mergedLines = append(mergedLines, baseLines[baseIndex])
		baseIndex++
	}
	
	return strings.Join(mergedLines, "\n")
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
