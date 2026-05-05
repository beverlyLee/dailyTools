package bottleneck

import (
	"math"
	"time"

	"perf-security-toolkit/pkg/perf/analyzer"
	"perf-security-toolkit/pkg/perf/collector"
)

type BottleneckType string

const (
	BottleneckCPU        BottleneckType = "CPU"
	BottleneckMemory     BottleneckType = "Memory"
	BottleneckIO         BottleneckType = "IO"
	BottleneckNetwork    BottleneckType = "Network"
	BottleneckLock       BottleneckType = "Lock"
	BottleneckDeadlock   BottleneckType = "Deadlock"
	BottleneckMemoryLeak BottleneckType = "MemoryLeak"
	BottleneckHotFunction BottleneckType = "HotFunction"
)

type Severity string

const (
	SeverityCritical Severity = "Critical"
	SeverityHigh     Severity = "High"
	SeverityMedium   Severity = "Medium"
	SeverityLow      Severity = "Low"
)

type Bottleneck struct {
	Type           BottleneckType `json:"type"`
	Severity       Severity       `json:"severity"`
	Description    string         `json:"description"`
	Details        string         `json:"details"`
	Impact         string         `json:"impact"`
	Metrics        Metrics        `json:"metrics"`
	DetectedAt     time.Time      `json:"detected_at"`
	SuggestionID   string         `json:"suggestion_id,omitempty"`
}

type Metrics struct {
	CurrentValue  float64 `json:"current_value"`
	Threshold     float64 `json:"threshold"`
	Unit          string  `json:"unit"`
	Trend         string  `json:"trend,omitempty"`
}

type Detector struct {
	config Config
}

type Config struct {
	CPUThreshold        float64
	MemoryThreshold     float64
	IOThreshold         float64
	NetworkThreshold    float64
	MemoryLeakThreshold float64
	HighCPUDuration     time.Duration
}

func New() *Detector {
	return &Detector{
		config: Config{
			CPUThreshold:        80.0,
			MemoryThreshold:     85.0,
			IOThreshold:         80.0,
			NetworkThreshold:    90.0,
			MemoryLeakThreshold: 10.0,
			HighCPUDuration:     5 * time.Second,
		},
	}
}

func NewWithConfig(config Config) *Detector {
	return &Detector{config: config}
}

func (d *Detector) Detect(analysis *analyzer.AnalysisResult, data *collector.CollectedData) ([]Bottleneck, error) {
	var bottlenecks []Bottleneck

	if cpuBottlenecks := d.detectCPUBottlenecks(analysis); len(cpuBottlenecks) > 0 {
		bottlenecks = append(bottlenecks, cpuBottlenecks...)
	}

	if memoryBottlenecks := d.detectMemoryBottlenecks(analysis); len(memoryBottlenecks) > 0 {
		bottlenecks = append(bottlenecks, memoryBottlenecks...)
	}

	if ioBottlenecks := d.detectIOBottlenecks(analysis); len(ioBottlenecks) > 0 {
		bottlenecks = append(bottlenecks, ioBottlenecks...)
	}

	if networkBottlenecks := d.detectNetworkBottlenecks(analysis); len(networkBottlenecks) > 0 {
		bottlenecks = append(bottlenecks, networkBottlenecks...)
	}

	if processBottlenecks := d.detectProcessBottlenecks(analysis); len(processBottlenecks) > 0 {
		bottlenecks = append(bottlenecks, processBottlenecks...)
	}

	d.sortBottlenecksBySeverity(bottlenecks)

	return bottlenecks, nil
}

func (d *Detector) detectCPUBottlenecks(analysis *analyzer.AnalysisResult) []Bottleneck {
	var bottlenecks []Bottleneck

	if analysis.CPUAnalysis.IsCPUConstrained {
		severity := SeverityMedium
		if analysis.CPUAnalysis.PeakUsage > 95.0 {
			severity = SeverityCritical
		} else if analysis.CPUAnalysis.PeakUsage > 90.0 {
			severity = SeverityHigh
		}

		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckCPU,
			Severity:    severity,
			Description: "CPU使用率过高",
			Details:     "系统CPU使用率持续处于较高水平，可能导致应用响应延迟增加",
			Impact:      "应用性能下降，用户体验变差，服务请求堆积",
			Metrics: Metrics{
				CurrentValue: analysis.CPUAnalysis.AverageUsage,
				Threshold:    d.config.CPUThreshold,
				Unit:         "%",
				Trend:        map[bool]string{true: "上升", false: "稳定"}[analysis.CPUAnalysis.LoadAverageTrend.Increasing],
			},
			DetectedAt: time.Now(),
		})
	}

	if len(analysis.CPUAnalysis.HighUsagePeriods) > 0 {
		for _, period := range analysis.CPUAnalysis.HighUsagePeriods {
			bottlenecks = append(bottlenecks, Bottleneck{
				Type:        BottleneckCPU,
				Severity:    SeverityMedium,
				Description: "CPU突发高负载",
				Details:     "检测到CPU使用率在特定时间段内超过阈值",
				Impact:      "该时间段内应用性能可能受到影响",
				Metrics: Metrics{
					CurrentValue: period.PeakValue,
					Threshold:    80.0,
					Unit:         "%",
				},
				DetectedAt: time.Now(),
			})
		}
	}

	if analysis.CPUAnalysis.LoadAverageTrend.Increasing && analysis.CPUAnalysis.LoadAverageTrend.Rate > 0.5 {
		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckCPU,
			Severity:    SeverityMedium,
			Description: "CPU负载呈上升趋势",
			Details:     "系统负载平均值正在持续上升，可能预示未来会出现CPU瓶颈",
			Impact:      "如不及时处理，可能导致系统CPU饱和",
			Metrics: Metrics{
				CurrentValue: analysis.CPUAnalysis.LoadAverageTrend.Rate,
				Threshold:    0.5,
				Unit:         "delta",
			},
			DetectedAt: time.Now(),
		})
	}

	return bottlenecks
}

func (d *Detector) detectMemoryBottlenecks(analysis *analyzer.AnalysisResult) []Bottleneck {
	var bottlenecks []Bottleneck

	if analysis.MemoryAnalysis.IsMemoryConstrained {
		severity := SeverityMedium
		if analysis.MemoryAnalysis.PeakUsagePercent > 95.0 {
			severity = SeverityCritical
		} else if analysis.MemoryAnalysis.PeakUsagePercent > 90.0 {
			severity = SeverityHigh
		}

		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckMemory,
			Severity:    severity,
			Description: "内存使用率过高",
			Details:     "系统内存使用率接近阈值，可能触发OOM（内存不足）",
			Impact:      "应用可能被系统终止，服务中断",
			Metrics: Metrics{
				CurrentValue: analysis.MemoryAnalysis.AverageUsagePercent,
				Threshold:    d.config.MemoryThreshold,
				Unit:         "%",
			},
			DetectedAt: time.Now(),
		})
	}

	if analysis.MemoryAnalysis.SwapUsage.IsSwapping {
		severity := SeverityMedium
		if analysis.MemoryAnalysis.SwapUsage.PeakUsedPercent > 30.0 {
			severity = SeverityHigh
		}

		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckMemory,
			Severity:    severity,
			Description: "系统正在使用Swap",
			Details:     "内存压力导致系统使用交换空间，这会显著降低性能",
			Impact:      "应用响应延迟大幅增加，系统整体性能下降",
			Metrics: Metrics{
				CurrentValue: analysis.MemoryAnalysis.SwapUsage.PeakUsedPercent,
				Threshold:    5.0,
				Unit:         "%",
			},
			DetectedAt: time.Now(),
		})
	}

	if analysis.MemoryAnalysis.PossibleLeak {
		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckMemoryLeak,
			Severity:    SeverityHigh,
			Description: "可能存在内存泄漏",
			Details:     "内存使用量呈现持续上升趋势，且未释放，这可能是内存泄漏的迹象",
			Impact:      "长时间运行后内存耗尽，应用崩溃",
			Metrics: Metrics{
				CurrentValue: d.config.MemoryLeakThreshold,
				Threshold:    d.config.MemoryLeakThreshold,
				Unit:         "%",
				Trend:        analysis.MemoryAnalysis.UsageTrend,
			},
			DetectedAt: time.Now(),
		})
	}

	return bottlenecks
}

func (d *Detector) detectIOBottlenecks(analysis *analyzer.AnalysisResult) []Bottleneck {
	var bottlenecks []Bottleneck

	if analysis.IOAnalysis.IsIOConstrained {
		severity := SeverityMedium
		if analysis.IOAnalysis.PeakReadBPS > 200*1024*1024 || analysis.IOAnalysis.PeakWriteBPS > 200*1024*1024 {
			severity = SeverityHigh
		}

		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckIO,
			Severity:    severity,
			Description: "I/O负载过高",
			Details:     "磁盘I/O处于高负载状态，可能导致应用等待I/O操作完成",
			Impact:      "数据库查询变慢，文件读写延迟增加",
			Metrics: Metrics{
				CurrentValue: float64(analysis.IOAnalysis.PeakReadBPS + analysis.IOAnalysis.PeakWriteBPS),
				Threshold:    float64(100 * 1024 * 1024),
				Unit:         "B/s",
			},
			DetectedAt: time.Now(),
		})
	}

	if len(analysis.IOAnalysis.HighIOPeriods) > 0 {
		for _, period := range analysis.IOAnalysis.HighIOPeriods {
			bottlenecks = append(bottlenecks, Bottleneck{
				Type:        BottleneckIO,
				Severity:    SeverityLow,
				Description: "I/O突发高负载",
				Details:     "检测到I/O活动在特定时间段内超过正常水平",
				Impact:      "该时间段内I/O相关操作可能变慢",
				Metrics: Metrics{
					CurrentValue: period.PeakValue,
					Threshold:    float64(50 * 1024 * 1024),
					Unit:         "B/s",
				},
				DetectedAt: time.Now(),
			})
		}
	}

	return bottlenecks
}

func (d *Detector) detectNetworkBottlenecks(analysis *analyzer.AnalysisResult) []Bottleneck {
	var bottlenecks []Bottleneck

	const highNetworkThreshold = 800 * 1024 * 1024

	if analysis.NetworkAnalysis.PeakSendBPS > highNetworkThreshold || analysis.NetworkAnalysis.PeakRecvBPS > highNetworkThreshold {
		severity := SeverityMedium
		if analysis.NetworkAnalysis.PeakSendBPS > 900*1024*1024 || analysis.NetworkAnalysis.PeakRecvBPS > 900*1024*1024 {
			severity = SeverityHigh
		}

		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckNetwork,
			Severity:    severity,
			Description: "网络带宽使用率过高",
			Details:     "网络流量接近带宽上限，可能导致网络延迟和丢包",
			Impact:      "网络请求变慢，数据传输延迟增加",
			Metrics: Metrics{
				CurrentValue: float64(maxUint64(analysis.NetworkAnalysis.PeakSendBPS, analysis.NetworkAnalysis.PeakRecvBPS)),
				Threshold:    float64(highNetworkThreshold),
				Unit:         "B/s",
			},
			DetectedAt: time.Now(),
		})
	}

	return bottlenecks
}

func (d *Detector) detectProcessBottlenecks(analysis *analyzer.AnalysisResult) []Bottleneck {
	var bottlenecks []Bottleneck

	if analysis.ProcessAnalysis == nil {
		return bottlenecks
	}

	pa := analysis.ProcessAnalysis

	if pa.PeakCPUPercent > 90.0 {
		severity := SeverityMedium
		if pa.PeakCPUPercent > 95.0 {
			severity = SeverityHigh
		}

		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckHotFunction,
			Severity:    severity,
			Description: "进程CPU使用率过高",
			Details:     "目标进程占用大量CPU资源",
			Impact:      "该进程可能成为系统瓶颈",
			Metrics: Metrics{
				CurrentValue: pa.PeakCPUPercent,
				Threshold:    90.0,
				Unit:         "%",
			},
			DetectedAt: time.Now(),
		})
	}

	if pa.MemoryGrowthRate > 5.0 {
		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckMemoryLeak,
			Severity:    SeverityHigh,
			Description: "进程内存持续增长",
			Details:     "进程内存在监控期间持续增长，可能存在内存泄漏",
			Impact:      "长时间运行后进程可能因内存不足崩溃",
			Metrics: Metrics{
				CurrentValue: pa.MemoryGrowthRate,
				Threshold:    5.0,
				Unit:         "%",
			},
			DetectedAt: time.Now(),
		})
	}

	if pa.MaxThreadCount > 1000 {
		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckLock,
			Severity:    SeverityMedium,
			Description: "线程数量过多",
			Details:     "进程创建了大量线程，可能导致锁竞争和上下文切换开销",
			Impact:      "线程管理开销增加，可能导致死锁风险",
			Metrics: Metrics{
				CurrentValue: float64(pa.MaxThreadCount),
				Threshold:    1000.0,
				Unit:         "个",
			},
			DetectedAt: time.Now(),
		})
	}

	if pa.MaxOpenFiles > 10000 {
		bottlenecks = append(bottlenecks, Bottleneck{
			Type:        BottleneckIO,
			Severity:    SeverityMedium,
			Description: "打开文件描述符过多",
			Details:     "进程打开了大量文件描述符，可能接近系统限制",
			Impact:      "可能无法打开新文件或建立网络连接",
			Metrics: Metrics{
				CurrentValue: float64(pa.MaxOpenFiles),
				Threshold:    10000.0,
				Unit:         "个",
			},
			DetectedAt: time.Now(),
		})
	}

	return bottlenecks
}

func (d *Detector) sortBottlenecksBySeverity(bottlenecks []Bottleneck) {
	severityOrder := map[Severity]int{
		SeverityCritical: 0,
		SeverityHigh:     1,
		SeverityMedium:   2,
		SeverityLow:      3,
	}

	for i := range bottlenecks {
		bottlenecks[i].SuggestionID = generateSuggestionID(bottlenecks[i].Type)
	}

	for i := 0; i < len(bottlenecks); i++ {
		for j := i + 1; j < len(bottlenecks); j++ {
			if severityOrder[bottlenecks[i].Severity] > severityOrder[bottlenecks[j].Severity] {
				bottlenecks[i], bottlenecks[j] = bottlenecks[j], bottlenecks[i]
			}
		}
	}
}

func generateSuggestionID(bottleneckType BottleneckType) string {
	typeMap := map[BottleneckType]string{
		BottleneckCPU:          "cpu-opt-001",
		BottleneckMemory:       "mem-opt-001",
		BottleneckIO:           "io-opt-001",
		BottleneckNetwork:      "net-opt-001",
		BottleneckLock:         "lock-opt-001",
		BottleneckDeadlock:     "deadlock-opt-001",
		BottleneckMemoryLeak:   "leak-opt-001",
		BottleneckHotFunction:  "hotfunc-opt-001",
	}
	return typeMap[bottleneckType]
}

func maxUint64(a, b uint64) uint64 {
	if a > b {
		return a
	}
	return b
}

func roundFloat(val float64, precision uint) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}
