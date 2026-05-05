package complexity

import (
	"encoding/json"
	"fmt"
	"html/template"
	"os"
)

type ReportGenerator struct{}

func NewReportGenerator() *ReportGenerator {
	return &ReportGenerator{}
}

func (rg *ReportGenerator) GenerateJSON(report *Report, outputPath string) error {
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return err
	}

	if outputPath == "" {
		fmt.Println(string(data))
		return nil
	}

	return os.WriteFile(outputPath, data, 0644)
}

func (rg *ReportGenerator) GenerateHTML(report *Report, outputPath string, templatePath string) error {
	var t *template.Template
	var err error

	if templatePath != "" {
		t, err = template.ParseFiles(templatePath)
	} else {
		t, err = template.New("report").Parse(defaultHTMLTemplate)
	}

	if err != nil {
		return err
	}

	if outputPath == "" {
		return t.Execute(os.Stdout, report)
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()

	return t.Execute(file, report)
}

const defaultHTMLTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Code Complexity Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .file { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .file-header { background: #e9e9e9; padding: 10px; cursor: pointer; }
        .file-content { padding: 10px; display: none; }
        .file-content.show { display: block; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f2f2f2; }
        .high { background: #ffcccc; }
        .warning { background: #ffffcc; }
    </style>
</head>
<body>
    <h1>Code Complexity Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Files:</strong> {{.TotalFiles}}</p>
        <p><strong>Average Cyclomatic Complexity:</strong> {{.AvgCyclomatic}}</p>
        <p><strong>Average Cognitive Complexity:</strong> {{.AvgCognitive}}</p>
        <p><strong>Threshold Breached:</strong> {{.ThresholdBreached}}</p>
    </div>

    <h2>Files</h2>
    {{range .Files}}
    <div class="file">
        <div class="file-header" onclick="toggleContent(this)">
            <strong>{{.FilePath}}</strong> - 
            Cyclomatic: {{.CyclomaticComplexity}}, Cognitive: {{.CognitiveComplexity}}
        </div>
        <div class="file-content">
            <table>
                <tr>
                    <th>Function</th>
                    <th>Line</th>
                    <th>Cyclomatic Complexity</th>
                    <th>Cognitive Complexity</th>
                </tr>
                {{range .Functions}}
                <tr>
                    <td>{{.Name}}</td>
                    <td>{{.Line}}</td>
                    <td>{{.CyclomaticComplexity}}</td>
                    <td>{{.CognitiveComplexity}}</td>
                </tr>
                {{end}}
            </table>
        </div>
    </div>
    {{end}}

    <script>
        function toggleContent(header) {
            var content = header.nextElementSibling;
            content.classList.toggle('show');
        }
    </script>
</body>
</html>
`
