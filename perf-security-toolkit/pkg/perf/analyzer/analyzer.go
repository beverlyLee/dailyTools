package analyzer

import (
	"math"
	"sort"
	"time"

	"perf-security-toolkit/pkg/perf/collector"
)

type AnalysisResult struct {
	CPUAnalysis      CPUAnalysis      `json:"cpu_analysis"`
	MemoryAnalysis   MemoryAnalysis   `json:"memory_analysis"`
	IOAnalysis       IOAnalysis       `json:"io_analysis"`
	NetworkAnalysis  NetworkAnalysis  `json:"network_analysis"`
	ProcessAnalysis  *ProcessAnalysis `json:"process_analysis,omitempty"`
	Summary          Summary          `json:"summary"`
}

type CPUAnalysis struct {
	AverageUsage      float64           `json:"average_usage"`
	PeakUsage         float64           `json:"peak_usage"`
	MinUsage          float64           `json:"min_usage"`
	StdDev            float64           `json:"std_dev"`
	HighUsagePeriods  []TimePeriod      `json:"high_usage_periods"`
	PerCoreStats      []PerCoreStats    `json:"per_core_stats"`
	LoadAverageTrend  LoadAverageTrend  `json:"load_average_trend"`
	IsCPUConstrained  bool              `json:"is_cpu_constrained"`
}

type MemoryAnalysis struct {
	AverageUsagePercent float64         `json:"average_usage_percent"`
	PeakUsage           uint64          `json:"peak_usage"`
	PeakUsagePercent    float64         `json:"peak_usage_percent"`
	MinUsage            uint64          `json:"min_usage"`
	UsageTrend          string          `json:"usage_trend"`
	SwapUsage           SwapUsage       `json:"swap_usage"`
	IsMemoryConstrained bool            `json:"is_memory_constrained"`
	PossibleLeak        bool            `json:"possible_leak"`
}

type IOAnalysis struct {
	AverageReadBPS     uint64           `json:"average_read_bps"`
	AverageWriteBPS    uint64           `json:"average_write_bps"`
	PeakReadBPS        uint64           `json:"peak_read_bps"`
	PeakWriteBPS       uint64           `json:"peak_write_bps"`
	ReadWriteRatio     float64          `json:"read_write_ratio"`
	HighIOPeriods      []TimePeriod     `json:"high_io_periods"`
	IsIOConstrained    bool             `json:"is_io_constrained"`
}

type NetworkAnalysis struct {
	AverageSendBPS     uint64           `json:"average_send_bps"`
	AverageRecvBPS     uint64           `json:"average_recv_bps"`
	PeakSendBPS        uint64           `json:"peak_send_bps"`
	PeakRecvBPS        uint64           `json:"peak_recv_bps"`
	TotalBytesSent     uint64           `json:"total_bytes_sent"`
	TotalBytesRecv     uint64           `json:"total_bytes_recv"`
}

type ProcessAnalysis struct {
	AverageCPUPercent  float64          `json:"average_cpu_percent"`
	PeakCPUPercent     float64          `json:"peak_cpu_percent"`
	AverageMemoryRSS   uint64           `json:"average_memory_rss"`
	PeakMemoryRSS      uint64           `json:"peak_memory_rss"`
	MemoryGrowthRate   float64          `json:"memory_growth_rate"`
	AverageThreadCount float64          `json:"average_thread_count"`
	MaxThreadCount     int              `json:"max_thread_count"`
	AverageOpenFiles   float64          `json:"average_open_files"`
	MaxOpenFiles       int              `json:"max_open_files"`
}

type TimePeriod struct {
	Start       time.Time `json:"start"`
	End         time.Time `json:"end"`
	Duration    string    `json:"duration"`
	PeakValue   float64   `json:"peak_value"`
	AverageValue float64  `json:"average_value"`
}

type PerCoreStats struct {
	CoreID       int     `json:"core_id"`
	AverageUsage float64 `json:"average_usage"`
	PeakUsage    float64 `json:"peak_usage"`
}

type LoadAverageTrend struct {
	Increasing bool    `json:"increasing"`
	Rate       float64 `json:"rate"`
}

type SwapUsage struct {
	AverageUsedPercent float64 `json:"average_used_percent"`
	PeakUsedPercent    float64 `json:"peak_used_percent"`
	IsSwapping         bool    `json:"is_swapping"`
}

type Summary struct {
	OverallHealth string `json:"overall_health"`
	MainIssues    string `json:"main_issues"`
	PrimaryMetric string `json:"primary_metric"`
	PrimaryValue  string `json:"primary_value"`
}

type Analyzer struct{}

func New() *Analyzer {
	return &Analyzer{}
}

func (a *Analyzer) Analyze(data *collector.CollectedData) (*AnalysisResult, error) {
	result := &AnalysisResult{}

	if len(data.CPUData) > 0 {
		result.CPUAnalysis = a.analyzeCPU(data.CPUData)
	}

	if len(data.MemoryData) > 0 {
		result.MemoryAnalysis = a.analyzeMemory(data.MemoryData)
	}

	if len(data.IOData) > 0 {
		result.IOAnalysis = a.analyzeIO(data.IOData)
	}

	if len(data.NetworkData) > 0 {
		result.NetworkAnalysis = a.analyzeNetwork(data.NetworkData)
	}

	if data.ProcessData != nil {
		result.ProcessAnalysis = a.analyzeProcess(data.ProcessData)
	}

	result.Summary = a.generateSummary(result)

	return result, nil
}

func (a *Analyzer) analyzeCPU(samples []collector.CPUSample) CPUAnalysis {
	analysis := CPUAnalysis{}

	if len(samples) == 0 {
		return analysis
	}

	var totalUsage float64
	analysis.PeakUsage = 0
	analysis.MinUsage = 100

	for _, s := range samples {
		totalUsage += s.TotalUsage
		if s.TotalUsage > analysis.PeakUsage {
			analysis.PeakUsage = s.TotalUsage
		}
		if s.TotalUsage < analysis.MinUsage {
			analysis.MinUsage = s.TotalUsage
		}
	}

	analysis.AverageUsage = totalUsage / float64(len(samples))

	var sumSq float64
	for _, s := range samples {
		diff := s.TotalUsage - analysis.AverageUsage
		sumSq += diff * diff
	}
	analysis.StdDev = math.Sqrt(sumSq / float64(len(samples)))

	if len(samples) > 0 && len(samples[0].PerCPUUsage) > 0 {
		for coreID := 0; coreID < len(samples[0].PerCPUUsage); coreID++ {
			var coreTotal float64
			var corePeak float64
			for _, s := range samples {
				if coreID < len(s.PerCPUUsage) {
					coreTotal += s.PerCPUUsage[coreID]
					if s.PerCPUUsage[coreID] > corePeak {
						corePeak = s.PerCPUUsage[coreID]
					}
				}
			}
			analysis.PerCoreStats = append(analysis.PerCoreStats, PerCoreStats{
				CoreID:       coreID,
				AverageUsage: coreTotal / float64(len(samples)),
				PeakUsage:    corePeak,
			})
		}
	}

	analysis.HighUsagePeriods = a.detectHighPeriods(samples, 80.0)

	if len(samples) > 2 && samples[0].LoadAverage != nil && samples[len(samples)-1].LoadAverage != nil {
		firstLoad := samples[0].LoadAverage.Load1
		lastLoad := samples[len(samples)-1].LoadAverage.Load1
		analysis.LoadAverageTrend = LoadAverageTrend{
			Increasing: lastLoad > firstLoad,
			Rate:       lastLoad - firstLoad,
		}
	}

	analysis.IsCPUConstrained = analysis.AverageUsage > 70.0 || analysis.PeakUsage > 90.0

	return analysis
}

func (a *Analyzer) analyzeMemory(samples []collector.MemorySample) MemoryAnalysis {
	analysis := MemoryAnalysis{}

	if len(samples) == 0 {
		return analysis
	}

	var totalPercent float64
	analysis.PeakUsagePercent = 0
	analysis.PeakUsage = 0
	analysis.MinUsage = ^uint64(0)

	for _, s := range samples {
		totalPercent += s.UsedPercent
		if s.Used > analysis.PeakUsage {
			analysis.PeakUsage = s.Used
			analysis.PeakUsagePercent = s.UsedPercent
		}
		if s.Used < analysis.MinUsage {
			analysis.MinUsage = s.Used
		}
	}

	analysis.AverageUsagePercent = totalPercent / float64(len(samples))

	firstSample := samples[0]
	lastSample := samples[len(samples)-1]

	if lastSample.UsedPercent > firstSample.UsedPercent+10 {
		analysis.UsageTrend = "increasing"
		analysis.PossibleLeak = true
	} else if lastSample.UsedPercent < firstSample.UsedPercent-10 {
		analysis.UsageTrend = "decreasing"
	} else {
		analysis.UsageTrend = "stable"
	}

	var swapTotalPercent float64
	var swapPeakPercent float64
	for _, s := range samples {
		swapTotalPercent += s.SwapUsedPercent
		if s.SwapUsedPercent > swapPeakPercent {
			swapPeakPercent = s.SwapUsedPercent
		}
	}

	analysis.SwapUsage = SwapUsage{
		AverageUsedPercent: swapTotalPercent / float64(len(samples)),
		PeakUsedPercent:    swapPeakPercent,
		IsSwapping:         swapPeakPercent > 5.0,
	}

	analysis.IsMemoryConstrained = analysis.AverageUsagePercent > 80.0 ||
		analysis.PeakUsagePercent > 90.0 ||
		analysis.SwapUsage.IsSwapping

	return analysis
}

func (a *Analyzer) analyzeIO(samples []collector.IOSample) IOAnalysis {
	analysis := IOAnalysis{}

	if len(samples) == 0 {
		return analysis
	}

	var totalReadBPS, totalWriteBPS uint64
	analysis.PeakReadBPS = 0
	analysis.PeakWriteBPS = 0

	for _, s := range samples {
		totalReadBPS += s.ReadBytesPerSec
		totalWriteBPS += s.WriteBytesPerSec
		if s.ReadBytesPerSec > analysis.PeakReadBPS {
			analysis.PeakReadBPS = s.ReadBytesPerSec
		}
		if s.WriteBytesPerSec > analysis.PeakWriteBPS {
			analysis.PeakWriteBPS = s.WriteBytesPerSec
		}
	}

	analysis.AverageReadBPS = totalReadBPS / uint64(len(samples))
	analysis.AverageWriteBPS = totalWriteBPS / uint64(len(samples))

	if analysis.AverageWriteBPS > 0 {
		analysis.ReadWriteRatio = float64(analysis.AverageReadBPS) / float64(analysis.AverageWriteBPS)
	}

	analysis.HighIOPeriods = a.detectIOPeriods(samples)

	analysis.IsIOConstrained = analysis.PeakReadBPS > 100*1024*1024 || 
		analysis.PeakWriteBPS > 100*1024*1024

	return analysis
}

func (a *Analyzer) analyzeNetwork(samples []collector.NetworkSample) NetworkAnalysis {
	analysis := NetworkAnalysis{}

	if len(samples) == 0 {
		return analysis
	}

	var totalSendBPS, totalRecvBPS uint64
	analysis.PeakSendBPS = 0
	analysis.PeakRecvBPS = 0

	for _, s := range samples {
		totalSendBPS += s.BytesSentPerSec
		totalRecvBPS += s.BytesRecvPerSec
		if s.BytesSentPerSec > analysis.PeakSendBPS {
			analysis.PeakSendBPS = s.BytesSentPerSec
		}
		if s.BytesRecvPerSec > analysis.PeakRecvBPS {
			analysis.PeakRecvBPS = s.BytesRecvPerSec
		}
	}

	analysis.AverageSendBPS = totalSendBPS / uint64(len(samples))
	analysis.AverageRecvBPS = totalRecvBPS / uint64(len(samples))

	if len(samples) > 0 {
		analysis.TotalBytesSent = samples[len(samples)-1].BytesSent
		analysis.TotalBytesRecv = samples[len(samples)-1].BytesRecv
	}

	return analysis
}

func (a *Analyzer) analyzeProcess(pd *collector.ProcessData) *ProcessAnalysis {
	analysis := &ProcessAnalysis{}

	if len(pd.CPUData) > 0 {
		var totalCPU float64
		analysis.PeakCPUPercent = 0
		for _, s := range pd.CPUData {
			totalCPU += s.CPUPercent
			if s.CPUPercent > analysis.PeakCPUPercent {
				analysis.PeakCPUPercent = s.CPUPercent
			}
		}
		analysis.AverageCPUPercent = totalCPU / float64(len(pd.CPUData))
	}

	if len(pd.MemoryData) > 0 {
		var totalRSS uint64
		analysis.PeakMemoryRSS = 0
		for _, s := range pd.MemoryData {
			totalRSS += s.RSS
			if s.RSS > analysis.PeakMemoryRSS {
				analysis.PeakMemoryRSS = s.RSS
			}
		}
		analysis.AverageMemoryRSS = totalRSS / uint64(len(pd.MemoryData))

		if len(pd.MemoryData) >= 2 {
			first := pd.MemoryData[0].RSS
			last := pd.MemoryData[len(pd.MemoryData)-1].RSS
			if first > 0 {
				analysis.MemoryGrowthRate = float64(last-first) / float64(first) * 100
			}
		}
	}

	if len(pd.ThreadCount) > 0 {
		var totalThreads int
		analysis.MaxThreadCount = 0
		for _, c := range pd.ThreadCount {
			totalThreads += c
			if c > analysis.MaxThreadCount {
				analysis.MaxThreadCount = c
			}
		}
		analysis.AverageThreadCount = float64(totalThreads) / float64(len(pd.ThreadCount))
	}

	if len(pd.OpenFiles) > 0 {
		var totalFiles int
		analysis.MaxOpenFiles = 0
		for _, f := range pd.OpenFiles {
			totalFiles += f
			if f > analysis.MaxOpenFiles {
				analysis.MaxOpenFiles = f
			}
		}
		analysis.AverageOpenFiles = float64(totalFiles) / float64(len(pd.OpenFiles))
	}

	return analysis
}

func (a *Analyzer) detectHighPeriods(samples []collector.CPUSample, threshold float64) []TimePeriod {
	var periods []TimePeriod
	var inPeriod bool
	var periodStart int
	var periodValues []float64

	for i, s := range samples {
		if s.TotalUsage >= threshold {
			if !inPeriod {
				inPeriod = true
				periodStart = i
				periodValues = []float64{s.TotalUsage}
			} else {
				periodValues = append(periodValues, s.TotalUsage)
			}
		} else if inPeriod {
			if i-periodStart >= 3 {
				var sum float64
				var peak float64
				for _, v := range periodValues {
					sum += v
					if v > peak {
						peak = v
					}
				}
				periods = append(periods, TimePeriod{
					Start:        samples[periodStart].Timestamp,
					End:          samples[i-1].Timestamp,
					Duration:     samples[i-1].Timestamp.Sub(samples[periodStart].Timestamp).String(),
					PeakValue:    peak,
					AverageValue: sum / float64(len(periodValues)),
				})
			}
			inPeriod = false
		}
	}

	if inPeriod && len(samples)-periodStart >= 3 {
		var sum float64
		var peak float64
		for _, v := range periodValues {
			sum += v
			if v > peak {
				peak = v
			}
		}
		periods = append(periods, TimePeriod{
			Start:        samples[periodStart].Timestamp,
			End:          samples[len(samples)-1].Timestamp,
			Duration:     samples[len(samples)-1].Timestamp.Sub(samples[periodStart].Timestamp).String(),
			PeakValue:    peak,
			AverageValue: sum / float64(len(periodValues)),
		})
	}

	return periods
}

func (a *Analyzer) detectIOPeriods(samples []collector.IOSample) []TimePeriod {
	var periods []TimePeriod
	threshold := uint64(50 * 1024 * 1024)
	var inPeriod bool
	var periodStart int
	var periodValues []float64

	for i, s := range samples {
		totalIO := s.ReadBytesPerSec + s.WriteBytesPerSec
		if totalIO >= threshold {
			if !inPeriod {
				inPeriod = true
				periodStart = i
				periodValues = []float64{float64(totalIO)}
			} else {
				periodValues = append(periodValues, float64(totalIO))
			}
		} else if inPeriod {
			if i-periodStart >= 2 {
				var sum float64
				var peak float64
				for _, v := range periodValues {
					sum += v
					if v > peak {
						peak = v
					}
				}
				periods = append(periods, TimePeriod{
					Start:        samples[periodStart].Timestamp,
					End:          samples[i-1].Timestamp,
					Duration:     samples[i-1].Timestamp.Sub(samples[periodStart].Timestamp).String(),
					PeakValue:    peak,
					AverageValue: sum / float64(len(periodValues)),
				})
			}
			inPeriod = false
		}
	}

	return periods
}

func (a *Analyzer) generateSummary(result *AnalysisResult) Summary {
	issues := []string{}
	criticalMetrics := []struct {
		name  string
		value string
		score float64
	}{
		{"CPU", "正常", 100 - result.CPUAnalysis.AverageUsage},
		{"内存", "正常", 100 - result.MemoryAnalysis.AverageUsagePercent},
	}

	if result.CPUAnalysis.IsCPUConstrained {
		issues = append(issues, "CPU使用率过高")
	}
	if result.MemoryAnalysis.IsMemoryConstrained {
		issues = append(issues, "内存压力大")
	}
	if result.MemoryAnalysis.PossibleLeak {
		issues = append(issues, "可能存在内存泄漏")
	}
	if result.IOAnalysis.IsIOConstrained {
		issues = append(issues, "IO负载高")
	}

	health := "健康"
	if len(issues) >= 2 {
		health = "需关注"
	} else if len(issues) >= 1 {
		health = "警告"
	}

	mainIssue := "无明显问题"
	if len(issues) > 0 {
		mainIssue = issues[0]
	}

	sort.Slice(criticalMetrics, func(i, j int) bool {
		return criticalMetrics[i].score < criticalMetrics[j].score
	})

	return Summary{
		OverallHealth: health,
		MainIssues:    mainIssue,
		PrimaryMetric: criticalMetrics[0].name,
		PrimaryValue:  criticalMetrics[0].value,
	}
}
