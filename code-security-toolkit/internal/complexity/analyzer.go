package complexity

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"regexp"
)

type Analyzer struct {
	config Config
}

func NewAnalyzer(config Config) *Analyzer {
	return &Analyzer{config: config}
}

func (a *Analyzer) AnalyzeDirectory(dir string) (*Report, error) {
	var results []ComplexityResult
	fset := token.NewFileSet()

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() && a.shouldIgnore(path) {
			return filepath.SkipDir
		}

		if !info.IsDir() && filepath.Ext(path) == ".go" && !a.shouldIgnore(path) {
			result, err := a.analyzeFile(fset, path)
			if err != nil {
				return err
			}
			results = append(results, result)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return a.generateReport(results), nil
}

func (a *Analyzer) AnalyzeFile(filePath string) (*Report, error) {
	if filepath.Ext(filePath) != ".go" {
		return nil, fmt.Errorf("only .go files are supported")
	}

	fset := token.NewFileSet()
	result, err := a.analyzeFile(fset, filePath)
	if err != nil {
		return nil, err
	}

	return a.generateReport([]ComplexityResult{result}), nil
}

func (a *Analyzer) analyzeFile(fset *token.FileSet, filePath string) (ComplexityResult, error) {
	file, err := parser.ParseFile(fset, filePath, nil, parser.ParseComments)
	if err != nil {
		return ComplexityResult{}, err
	}

	var fileResult ComplexityResult
	fileResult.FilePath = filePath

	ast.Inspect(file, func(n ast.Node) bool {
		switch funcDecl := n.(type) {
		case *ast.FuncDecl:
			funcResult := a.analyzeFunction(fset, funcDecl)
			fileResult.Functions = append(fileResult.Functions, funcResult)
			fileResult.CyclomaticComplexity += funcResult.CyclomaticComplexity
			fileResult.CognitiveComplexity += funcResult.CognitiveComplexity
		}
		return true
	})

	return fileResult, nil
}

func (a *Analyzer) analyzeFunction(fset *token.FileSet, funcDecl *ast.FuncDecl) FunctionResult {
	pos := fset.Position(funcDecl.Pos())
	result := FunctionResult{
		Name: funcDecl.Name.Name,
		Line: pos.Line,
	}

	cc := 1
	cog := 0
	nestingLevel := 0

	ast.Inspect(funcDecl.Body, func(n ast.Node) bool {
		switch n.(type) {
		case *ast.IfStmt:
			cc++
			cog += 1 + nestingLevel
			nestingLevel++
		case *ast.ForStmt, *ast.RangeStmt:
			cc++
			cog += 1 + nestingLevel
			nestingLevel++
		case *ast.SwitchStmt, *ast.TypeSwitchStmt:
			cc++
			cog += 1 + nestingLevel
			nestingLevel++
		case *ast.SelectStmt:
			cc++
			cog += 1 + nestingLevel
			nestingLevel++
		case *ast.CaseClause, *ast.CommClause:
			cc++
		case *ast.BinaryExpr:
			be := n.(*ast.BinaryExpr)
			if be.Op == token.LAND || be.Op == token.LOR {
				cc++
				cog += 1
			}
		}
		return true
	})

	result.CyclomaticComplexity = cc
	result.CognitiveComplexity = cog
	return result
}

func (a *Analyzer) shouldIgnore(path string) bool {
	for _, pattern := range a.config.IgnorePatterns {
		matched, err := regexp.MatchString(pattern, path)
		if err == nil && matched {
			return true
		}
	}
	return false
}

func (a *Analyzer) generateReport(results []ComplexityResult) *Report {
	report := &Report{
		Files:      results,
		TotalFiles: len(results),
	}

	var totalCyclomatic, totalCognitive int
	var thresholdBreached bool

	for _, file := range results {
		totalCyclomatic += file.CyclomaticComplexity
		totalCognitive += file.CognitiveComplexity

		if a.config.CyclomaticThreshold > 0 && file.CyclomaticComplexity > a.config.CyclomaticThreshold {
			thresholdBreached = true
		}
		if a.config.CognitiveThreshold > 0 && file.CognitiveComplexity > a.config.CognitiveThreshold {
			thresholdBreached = true
		}

		for _, fn := range file.Functions {
			if a.config.CyclomaticThreshold > 0 && fn.CyclomaticComplexity > a.config.CyclomaticThreshold {
				thresholdBreached = true
			}
			if a.config.CognitiveThreshold > 0 && fn.CognitiveComplexity > a.config.CognitiveThreshold {
				thresholdBreached = true
			}
		}
	}

	if len(results) > 0 {
		report.AvgCyclomatic = float64(totalCyclomatic) / float64(len(results))
		report.AvgCognitive = float64(totalCognitive) / float64(len(results))
	}
	report.ThresholdBreached = thresholdBreached

	return report
}
