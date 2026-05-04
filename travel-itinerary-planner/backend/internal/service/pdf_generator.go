package service

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"time"

	"github.com/playwright-community/playwright-go"
)

type ItineraryItem struct {
	ID           int
	ItemType     string
	Name         string
	DayNumber    int
	StartTime    string
	EndTime      string
	Cost         float64
	Notes        string
	SequenceOrder int
}

type ItineraryData struct {
	Title       string
	City        string
	StartDate   string
	EndDate     string
	TotalBudget float64
	Items       []*ItineraryItem
	GeneratedAt string
}

type PDFGenerator struct {
	pw   playwright.Playwright
	browser playwright.Browser
}

func NewPDFGenerator() (*PDFGenerator, error) {
	pw, err := playwright.Run()
	if err != nil {
		return nil, fmt.Errorf("failed to start playwright: %v", err)
	}

	browser, err := pw.Chromium.Launch()
	if err != nil {
		pw.Stop()
		return nil, fmt.Errorf("failed to launch browser: %v", err)
	}

	return &PDFGenerator{
		pw:      pw,
		browser: browser,
	}, nil
}

func (pg *PDFGenerator) Close() {
	if pg.browser != nil {
		pg.browser.Close()
	}
	if pg.pw != nil {
		pg.pw.Stop()
	}
}

func (pg *PDFGenerator) GenerateItineraryPDF(ctx context.Context, data *ItineraryData) ([]byte, error) {
	html, err := renderItineraryHTML(data)
	if err != nil {
		return nil, fmt.Errorf("failed to render HTML: %v", err)
	}

	page, err := pg.browser.NewPage()
	if err != nil {
		return nil, fmt.Errorf("failed to create page: %v", err)
	}
	defer page.Close()

	_, err = page.Goto("data:text/html;charset=utf-8,"+html, playwright.PageGotoOptions{
		WaitUntil: playwright.WaitUntilStateNetworkidle,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to load HTML: %v", err)
	}

	pdf, err := page.PDF(playwright.PagePdfOptions{
		Format:   playwright.PdfFormatA4,
		Margin: &playwright.PagePdfMargin{
			Top:    playwright.String("1cm"),
			Bottom: playwright.String("1cm"),
			Left:   playwright.String("1cm"),
			Right:  playwright.String("1cm"),
		},
		PrintBackground: playwright.Bool(true),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %v", err)
	}

	return pdf, nil
}

func renderItineraryHTML(data *ItineraryData) (string, error) {
	const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{.Title}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #4CAF50;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .header .subtitle {
            font-size: 16px;
            color: #7f8c8d;
        }
        .trip-info {
            display: flex;
            justify-content: space-between;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .info-item {
            text-align: center;
        }
        .info-item .label {
            font-size: 12px;
            color: #95a5a6;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .info-item .value {
            font-size: 18px;
            font-weight: 600;
            color: #2c3e50;
        }
        .day-section {
            margin-bottom: 30px;
        }
        .day-header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .day-header h2 {
            font-size: 18px;
            font-weight: 600;
        }
        .timeline {
            position: relative;
            padding-left: 30px;
        }
        .timeline::before {
            content: '';
            position: absolute;
            left: 8px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #e0e0e0;
        }
        .timeline-item {
            position: relative;
            margin-bottom: 20px;
            padding: 15px;
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .timeline-item::before {
            content: '';
            position: absolute;
            left: -26px;
            top: 20px;
            width: 12px;
            height: 12px;
            background: #4CAF50;
            border-radius: 50%;
            border: 2px solid #fff;
            box-shadow: 0 0 0 2px #4CAF50;
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .item-title {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
        }
        .item-type {
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 12px;
            background: #e8f5e9;
            color: #2e7d32;
        }
        .item-type.restaurant {
            background: #fff3e0;
            color: #e65100;
        }
        .item-time {
            font-size: 14px;
            color: #7f8c8d;
            margin-bottom: 8px;
        }
        .item-cost {
            font-size: 14px;
            font-weight: 600;
            color: #e74c3c;
        }
        .item-notes {
            font-size: 13px;
            color: #95a5a6;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #f0f0f0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 12px;
            color: #95a5a6;
        }
        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        .summary h3 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #2c3e50;
        }
        .summary-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .summary-item:last-child {
            border-bottom: none;
        }
        .summary-label {
            color: #7f8c8d;
        }
        .summary-value {
            font-weight: 600;
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✈️ {{.Title}}</h1>
            <div class="subtitle">智能旅行规划行程单</div>
        </div>

        <div class="trip-info">
            <div class="info-item">
                <div class="label">目的地</div>
                <div class="value">{{.City}}</div>
            </div>
            <div class="info-item">
                <div class="label">出发日期</div>
                <div class="value">{{.StartDate}}</div>
            </div>
            <div class="info-item">
                <div class="label">结束日期</div>
                <div class="value">{{.EndDate}}</div>
            </div>
            <div class="info-item">
                <div class="label">总预算</div>
                <div class="value">¥{{.TotalBudget}}</div>
            </div>
        </div>

        {{range $day := .Items}}
        <div class="day-section">
            <div class="day-header">
                <h2>第 {{.DayNumber}} 天</h2>
            </div>
            <div class="timeline">
                {{range $item := $day.Items}}
                <div class="timeline-item">
                    <div class="item-header">
                        <span class="item-title">{{.Name}}</span>
                        <span class="item-type {{.ItemType}}">{{if eq .ItemType "attraction"}}景点{{else if eq .ItemType "restaurant"}}餐厅{{else}}其他{{end}}</span>
                    </div>
                    <div class="item-time">⏰ {{.StartTime}} - {{.EndTime}}</div>
                    {{if gt .Cost 0}}
                    <div class="item-cost">💰 费用: ¥{{.Cost}}</div>
                    {{end}}
                    {{if .Notes}}
                    <div class="item-notes">📝 {{.Notes}}</div>
                    {{end}}
                </div>
                {{end}}
            </div>
        </div>
        {{end}}

        <div class="summary">
            <h3>📊 行程摘要</h3>
            <div class="summary-item">
                <span class="summary-label">总景点数</span>
                <span class="summary-value">{{.TotalAttractions}} 个</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">总餐厅数</span>
                <span class="summary-value">{{.TotalRestaurants}} 个</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">预计总费用</span>
                <span class="summary-value">¥{{.EstimatedCost}}</span>
            </div>
        </div>

        <div class="footer">
            <p>生成时间: {{.GeneratedAt}}</p>
            <p>由智能旅行规划系统生成</p>
        </div>
    </div>
</body>
</html>
`

	type DayItem struct {
		DayNumber int
		Items     []*ItineraryItem
	}

	type TemplateData struct {
		Title            string
		City             string
		StartDate        string
		EndDate          string
		TotalBudget      float64
		Items            []DayItem
		TotalAttractions int
		TotalRestaurants int
		EstimatedCost    float64
		GeneratedAt      string
	}

	dayMap := make(map[int][]*ItineraryItem)
	totalAttractions := 0
	totalRestaurants := 0
	estimatedCost := 0.0

	for _, item := range data.Items {
		dayMap[item.DayNumber] = append(dayMap[item.DayNumber], item)
		if item.ItemType == "attraction" {
			totalAttractions++
		} else if item.ItemType == "restaurant" {
			totalRestaurants++
		}
		estimatedCost += item.Cost
	}

	var days []DayItem
	for dayNum := 1; dayNum <= len(dayMap); dayNum++ {
		if items, ok := dayMap[dayNum]; ok {
			days = append(days, DayItem{
				DayNumber: dayNum,
				Items:     items,
			})
		}
	}

	tmplData := TemplateData{
		Title:            data.Title,
		City:             data.City,
		StartDate:        data.StartDate,
		EndDate:          data.EndDate,
		TotalBudget:      data.TotalBudget,
		Items:            days,
		TotalAttractions: totalAttractions,
		TotalRestaurants: totalRestaurants,
		EstimatedCost:    estimatedCost,
		GeneratedAt:      time.Now().Format("2006-01-02 15:04:05"),
	}

	tmpl, err := template.New("itinerary").Parse(htmlTemplate)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, tmplData); err != nil {
		return "", err
	}

	return buf.String(), nil
}
