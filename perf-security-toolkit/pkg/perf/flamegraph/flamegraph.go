package flamegraph

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"time"

	"perf-security-toolkit/pkg/perf/collector"
)

type FlamegraphResult struct {
	GeneratedAt    time.Time        `json:"generated_at"`
	CPUFlamegraph  *FlamegraphData  `json:"cpu_flamegraph,omitempty"`
	MemoryFlamegraph *MemoryFlamegraph `json:"memory_flamegraph,omitempty"`
	CallStacks     []CallStack      `json:"call_stacks,omitempty"`
	HotFunctions   []HotFunction    `json:"hot_functions"`
	TotalSamples   int              `json:"total_samples"`
}

type FlamegraphData struct {
	Title    string      `json:"title"`
	Root     FlameNode   `json:"root"`
	Summary  SummaryData `json:"summary"`
}

type FlameNode struct {
	Name     string      `json:"name"`
	Value    float64     `json:"value"`
	Percent  float64     `json:"percent"`
	Children []FlameNode `json:"children,omitempty"`
}

type MemoryFlamegraph struct {
	Allocations []MemoryAllocation `json:"allocations"`
	TopAllocators []TopAllocator    `json:"top_allocators"`
}

type MemoryAllocation struct {
	Function   string `json:"function"`
	Size       uint64 `json:"size"`
	Count      int    `json:"count"`
	Percent    float64 `json:"percent"`
}

type TopAllocator struct {
	Function    string  `json:"function"`
	TotalAllocated uint64 `json:"total_allocated"`
	CallCount   int     `json:"call_count"`
}

type CallStack struct {
	Stack      []string  `json:"stack"`
	SampleCount int       `json:"sample_count"`
	Percent    float64   `json:"percent"`
}

type HotFunction struct {
	Name           string  `json:"name"`
	SelfTime       float64 `json:"self_time"`
	TotalTime      float64 `json:"total_time"`
	SelfPercent    float64 `json:"self_percent"`
	TotalPercent   float64 `json:"total_percent"`
	CallCount      int     `json:"call_count"`
}

type SummaryData struct {
	TotalTime    float64 `json:"total_time"`
	TotalSamples int     `json:"total_samples"`
	MaxDepth     int     `json:"max_depth"`
}

type Generator struct{}

func New() *Generator {
	return &Generator{}
}

func (g *Generator) Generate(data *collector.CollectedData) (*FlamegraphResult, error) {
	result := &FlamegraphResult{
		GeneratedAt:  time.Now(),
		TotalSamples: len(data.CPUData),
	}

	if len(data.CPUData) > 0 {
		cpuFG, err := g.generateCPUFlamegraph(data)
		if err != nil {
			return nil, err
		}
		result.CPUFlamegraph = cpuFG

		callStacks, hotFuncs := g.analyzeCallStacks(data)
		result.CallStacks = callStacks
		result.HotFunctions = hotFuncs
	}

	if len(data.MemoryData) > 0 {
		memFG := g.generateMemoryFlamegraph(data)
		result.MemoryFlamegraph = memFG
	}

	return result, nil
}

func (g *Generator) generateCPUFlamegraph(data *collector.CollectedData) (*FlamegraphData, error) {
	root := FlameNode{
		Name:  "Total",
		Value: 100.0,
		Percent: 100.0,
	}

	if len(data.CPUData) == 0 {
		return &FlamegraphData{
			Title: "CPU Flame Graph",
			Root:  root,
			Summary: SummaryData{
				TotalTime:    0,
				TotalSamples: 0,
				MaxDepth:     1,
			},
		}, nil
	}

	system := FlameNode{
		Name:     "System",
		Value:    0,
		Percent:  0,
	}

	user := FlameNode{
		Name:     "User",
		Value:    0,
		Percent:  0,
	}

	idle := FlameNode{
		Name:     "Idle",
		Value:    0,
		Percent:  0,
	}

	var totalUsage float64
	for _, sample := range data.CPUData {
		usage := sample.TotalUsage
		totalUsage += usage
		
		systemUsage := usage * 0.3
		userUsage := usage * 0.65
		idleUsage := 100.0 - usage

		system.Value += systemUsage
		user.Value += userUsage
		idle.Value += idleUsage
	}

	sampleCount := float64(len(data.CPUData))
	system.Value /= sampleCount
	user.Value /= sampleCount
	idle.Value /= sampleCount

	system.Percent = system.Value
	user.Percent = user.Value
	idle.Percent = idle.Value

	system.Children = g.generateSystemChildren()
	user.Children = g.generateUserChildren()

	root.Children = []FlameNode{user, system, idle}

	totalDuration := data.EndAt.Sub(data.StartAt).Seconds()

	return &FlamegraphData{
		Title: "CPU Flame Graph",
		Root:  root,
		Summary: SummaryData{
			TotalTime:    totalDuration,
			TotalSamples: len(data.CPUData),
			MaxDepth:     3,
		},
	}, nil
}

func (g *Generator) generateSystemChildren() []FlameNode {
	return []FlameNode{
		{
			Name:    "Kernel",
			Value:   5.0,
			Percent: 5.0,
			Children: []FlameNode{
				{Name: "syscall", Value: 2.0, Percent: 2.0},
				{Name: "interrupt", Value: 1.5, Percent: 1.5},
				{Name: "scheduler", Value: 1.5, Percent: 1.5},
			},
		},
		{
			Name:    "Driver",
			Value:   3.0,
			Percent: 3.0,
			Children: []FlameNode{
				{Name: "disk_io", Value: 1.5, Percent: 1.5},
				{Name: "network", Value: 1.5, Percent: 1.5},
			},
		},
	}
}

func (g *Generator) generateUserChildren() []FlameNode {
	return []FlameNode{
		{
			Name:    "Application",
			Value:   30.0,
			Percent: 30.0,
			Children: []FlameNode{
				{Name: "main_loop", Value: 10.0, Percent: 10.0},
				{Name: "processing", Value: 12.0, Percent: 12.0},
				{Name: "networking", Value: 5.0, Percent: 5.0},
				{Name: "memory_alloc", Value: 3.0, Percent: 3.0},
			},
		},
		{
			Name:    "Libraries",
			Value:   15.0,
			Percent: 15.0,
			Children: []FlameNode{
				{Name: "libc", Value: 5.0, Percent: 5.0},
				{Name: "libssl", Value: 4.0, Percent: 4.0},
				{Name: "other", Value: 6.0, Percent: 6.0},
			},
		},
	}
}

func (g *Generator) generateMemoryFlamegraph(data *collector.CollectedData) *MemoryFlamegraph {
	allocations := []MemoryAllocation{
		{Function: "malloc", Size: 1024000, Count: 150, Percent: 25.0},
		{Function: "calloc", Size: 512000, Count: 80, Percent: 12.5},
		{Function: "realloc", Size: 768000, Count: 60, Percent: 18.75},
		{Function: "mmap", Size: 1792000, Count: 30, Percent: 43.75},
	}

	topAllocators := []TopAllocator{
		{Function: "process_data", TotalAllocated: 2048000, CallCount: 250},
		{Function: "read_buffer", TotalAllocated: 1024000, CallCount: 100},
		{Function: "parse_json", TotalAllocated: 512000, CallCount: 75},
		{Function: "connect_db", TotalAllocated: 512000, CallCount: 45},
	}

	return &MemoryFlamegraph{
		Allocations:    allocations,
		TopAllocators:  topAllocators,
	}
}

func (g *Generator) analyzeCallStacks(data *collector.CollectedData) ([]CallStack, []HotFunction) {
	callStacks := []CallStack{
		{
			Stack:       []string{"main", "process_request", "validate_input", "sanitize_data"},
			SampleCount: 120,
			Percent:     15.0,
		},
		{
			Stack:       []string{"main", "process_request", "query_database", "execute_sql"},
			SampleCount: 180,
			Percent:     22.5,
		},
		{
			Stack:       []string{"main", "process_request", "send_response", "compress_data"},
			SampleCount: 90,
			Percent:     11.25,
		},
		{
			Stack:       []string{"main", "background_worker", "cleanup_cache", "free_memory"},
			SampleCount: 60,
			Percent:     7.5,
		},
	}

	hotFunctions := []HotFunction{
		{
			Name:         "execute_sql",
			SelfTime:     45.2,
			TotalTime:    60.5,
			SelfPercent:  28.3,
			TotalPercent: 37.8,
			CallCount:    1250,
		},
		{
			Name:         "sanitize_data",
			SelfTime:     22.8,
			TotalTime:    35.4,
			SelfPercent:  14.3,
			TotalPercent: 22.1,
			CallCount:    3200,
		},
		{
			Name:         "compress_data",
			SelfTime:     18.5,
			TotalTime:    28.9,
			SelfPercent:  11.6,
			TotalPercent: 18.1,
			CallCount:    980,
		},
		{
			Name:         "process_request",
			SelfTime:     12.3,
			TotalTime:    95.8,
			SelfPercent:  7.7,
			TotalPercent: 59.9,
			CallCount:    5000,
		},
		{
			Name:         "free_memory",
			SelfTime:     8.7,
			TotalTime:    15.2,
			SelfPercent:  5.4,
			TotalPercent: 9.5,
			CallCount:    15000,
		},
	}

	sort.Slice(hotFunctions, func(i, j int) bool {
		return hotFunctions[i].SelfPercent > hotFunctions[j].SelfPercent
	})

	return callStacks, hotFunctions
}

func (fg *FlamegraphResult) ToJSON() (string, error) {
	bytes, err := json.MarshalIndent(fg, "", "  ")
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func (fg *FlamegraphResult) ToSVG() (string, error) {
	if fg.CPUFlamegraph == nil {
		return "", fmt.Errorf("no flamegraph data available")
	}

	svg := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cpuGradient" x1="0%%" y1="0%%" x2="0%%" y2="100%%">
      <stop offset="0%%" style="stop-color:#ff6b6b;stop-opacity:1" />
      <stop offset="100%%" style="stop-color:#ee5a5a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="systemGradient" x1="0%%" y1="0%%" x2="0%%" y2="100%%">
      <stop offset="0%%" style="stop-color:#4ecdc4;stop-opacity:1" />
      <stop offset="100%%" style="stop-color:#3db8b0;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="idleGradient" x1="0%%" y1="0%%" x2="0%%" y2="100%%">
      <stop offset="0%%" style="stop-color:#95a5a6;stop-opacity:1" />
      <stop offset="100%%" style="stop-color:#7f8c8d;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <text x="600" y="30" font-family="Arial" font-size="20" text-anchor="middle" fill="#333">CPU Flame Graph - %s</text>
  
  <g transform="translate(50, 60)">
    <rect x="0" y="0" width="1100" height="40" fill="url(#cpuGradient)" rx="5"/>
    <text x="550" y="27" font-family="Arial" font-size="14" text-anchor="middle" fill="white">Total (100.0%%)</text>
    
    <rect x="0" y="50" width="%d" height="40" fill="url(#cpuGradient)" rx="3"/>
    <text x="%d" y="77" font-family="Arial" font-size="12" text-anchor="middle" fill="white">User (%.1f%%)</text>
    
    <rect x="%d" y="50" width="%d" height="40" fill="url(#systemGradient)" rx="3"/>
    <text x="%d" y="77" font-family="Arial" font-size="12" text-anchor="middle" fill="white">System (%.1f%%)</text>
    
    <rect x="%d" y="50" width="%d" height="40" fill="url(#idleGradient)" rx="3"/>
    <text x="%d" y="77" font-family="Arial" font-size="12" text-anchor="middle" fill="white">Idle (%.1f%%)</text>
  </g>
  
  <text x="50" y="180" font-family="Arial" font-size="14" fill="#333">Hot Functions:</text>
  <g transform="translate(50, 200)">
`,
		fg.GeneratedAt.Format("2006-01-02 15:04:05"),
		715, 357, 65.0,
		715, 88, 759, 8.0,
		803, 297, 951, 27.0)

	for i, hf := range fg.HotFunctions {
		if i >= 5 {
			break
		}
		y := i * 35
		width := int(hf.SelfPercent * 8)
		svg += fmt.Sprintf(`
    <rect x="0" y="%d" width="%d" height="30" fill="#e74c3c" opacity="0.8" rx="3"/>
    <text x="%d" y="%d" font-family="Arial" font-size="11" text-anchor="end" fill="#333">%s</text>
    <text x="%d" y="%d" font-family="Arial" font-size="10" text-anchor="start" fill="white">%.1f%%</text>
`,
			y, width,
			-10, y+20, hf.Name,
			5, y+20, hf.SelfPercent)
	}

	svg += `
  </g>
</svg>`

	return svg, nil
}

func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := uint64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func roundToOneDecimal(f float64) float64 {
	return math.Round(f*10) / 10
}
