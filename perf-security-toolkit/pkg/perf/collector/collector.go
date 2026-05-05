package collector

import (
	"context"
	"runtime"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
)

type Config struct {
	Duration     time.Duration
	ProcessName  string
	ProcessPID   int32
	MonitorCPU   bool
	MonitorMemory bool
	MonitorIO    bool
	MonitorLock  bool
	Interval     time.Duration
}

type CollectedData struct {
	SystemInfo    SystemInfo       `json:"system_info"`
	CPUData       []CPUSample      `json:"cpu_data"`
	MemoryData    []MemorySample   `json:"memory_data"`
	IOData        []IOSample       `json:"io_data"`
	NetworkData   []NetworkSample  `json:"network_data"`
	ProcessData   *ProcessData     `json:"process_data,omitempty"`
	StartAt       time.Time        `json:"start_at"`
	EndAt         time.Time        `json:"end_at"`
	SamplesCount  int              `json:"samples_count"`
}

type SystemInfo struct {
	Hostname     string `json:"hostname"`
	OS           string `json:"os"`
	Architecture string `json:"architecture"`
	CPUs         int    `json:"cpus"`
	TotalMemory  uint64 `json:"total_memory"`
}

type CPUSample struct {
	Timestamp     time.Time      `json:"timestamp"`
	TotalUsage    float64        `json:"total_usage"`
	PerCPUUsage   []float64      `json:"per_cpu_usage,omitempty"`
	LoadAverage   *LoadAverage   `json:"load_average,omitempty"`
}

type LoadAverage struct {
	Load1  float64 `json:"load_1"`
	Load5  float64 `json:"load_5"`
	Load15 float64 `json:"load_15"`
}

type MemorySample struct {
	Timestamp     time.Time `json:"timestamp"`
	Total         uint64    `json:"total"`
	Available     uint64    `json:"available"`
	Used          uint64    `json:"used"`
	UsedPercent   float64   `json:"used_percent"`
	Buffers       uint64    `json:"buffers,omitempty"`
	Cached        uint64    `json:"cached,omitempty"`
	SwapTotal     uint64    `json:"swap_total"`
	SwapUsed      uint64    `json:"swap_used"`
	SwapUsedPercent float64 `json:"swap_used_percent"`
}

type IOSample struct {
	Timestamp     time.Time `json:"timestamp"`
	ReadBytes     uint64    `json:"read_bytes"`
	WriteBytes    uint64    `json:"write_bytes"`
	ReadCount     uint64    `json:"read_count"`
	WriteCount    uint64    `json:"write_count"`
	ReadBytesPerSec uint64  `json:"read_bytes_per_sec"`
	WriteBytesPerSec uint64 `json:"write_bytes_per_sec"`
}

type NetworkSample struct {
	Timestamp      time.Time `json:"timestamp"`
	BytesSent      uint64    `json:"bytes_sent"`
	BytesRecv      uint64    `json:"bytes_recv"`
	PacketsSent    uint64    `json:"packets_sent"`
	PacketsRecv    uint64    `json:"packets_recv"`
	BytesSentPerSec uint64   `json:"bytes_sent_per_sec"`
	BytesRecvPerSec uint64   `json:"bytes_recv_per_sec"`
}

type ProcessData struct {
	PID           int32              `json:"pid"`
	Name          string             `json:"name"`
	CPUData       []ProcessCPUSample `json:"cpu_data"`
	MemoryData    []ProcessMemSample `json:"memory_data"`
	IOData        []ProcessIOSample  `json:"io_data"`
	ThreadCount   []int              `json:"thread_count"`
	OpenFiles     []int              `json:"open_files"`
}

type ProcessCPUSample struct {
	Timestamp    time.Time `json:"timestamp"`
	CPUPercent   float64   `json:"cpu_percent"`
}

type ProcessMemSample struct {
	Timestamp    time.Time `json:"timestamp"`
	RSS          uint64    `json:"rss"`
	VMS          uint64    `json:"vms"`
	Percent      float32   `json:"percent"`
}

type ProcessIOSample struct {
	Timestamp    time.Time `json:"timestamp"`
	ReadBytes    uint64    `json:"read_bytes"`
	WriteBytes   uint64    `json:"write_bytes"`
}

type Collector struct {
	config Config
}

func New(config Config) *Collector {
	if config.Interval == 0 {
		config.Interval = 1 * time.Second
	}
	return &Collector{config: config}
}

func (c *Collector) Collect() (*CollectedData, error) {
	startAt := time.Now()

	systemInfo, err := c.collectSystemInfo()
	if err != nil {
		return nil, err
	}

	var processData *ProcessData
	if c.config.ProcessName != "" || c.config.ProcessPID > 0 {
		processData, err = c.initProcessData()
		if err != nil {
			return nil, err
		}
	}

	samplesCount := int(c.config.Duration / c.config.Interval)
	
	var cpuData []CPUSample
	var memoryData []MemorySample
	var ioData []IOSample
	var networkData []NetworkSample

	ctx, cancel := context.WithTimeout(context.Background(), c.config.Duration)
	defer cancel()

	ticker := time.NewTicker(c.config.Interval)
	defer ticker.Stop()

	var wg sync.WaitGroup
	var mu sync.Mutex

	prevDiskIO, _ := disk.IOCounters()
	prevNetIO, _ := net.IOCounters(true)

	for {
		select {
		case <-ctx.Done():
			goto COLLECTED
		case t := <-ticker.C:
			wg.Add(1)
			go func(timestamp time.Time) {
				defer wg.Done()

				if c.config.MonitorCPU {
					cpuSample := c.collectCPUSample(timestamp)
					mu.Lock()
					cpuData = append(cpuData, cpuSample)
					mu.Unlock()
				}

				if c.config.MonitorMemory {
					memSample := c.collectMemorySample(timestamp)
					mu.Lock()
					memoryData = append(memoryData, memSample)
					mu.Unlock()
				}

				if c.config.MonitorIO {
					currentDiskIO, err := disk.IOCounters()
					if err == nil && prevDiskIO != nil {
						ioSample := c.calculateIOSample(timestamp, prevDiskIO, currentDiskIO)
						mu.Lock()
						ioData = append(ioData, ioSample)
						prevDiskIO = currentDiskIO
						mu.Unlock()
					}
				}

				currentNetIO, err := net.IOCounters(true)
				if err == nil && prevNetIO != nil {
					netSample := c.calculateNetworkSample(timestamp, prevNetIO, currentNetIO)
					mu.Lock()
					networkData = append(networkData, netSample)
					prevNetIO = currentNetIO
					mu.Unlock()
				}

				if processData != nil {
					c.collectProcessSamples(timestamp, processData)
				}
			}(t)
		}
	}

COLLECTED:
	wg.Wait()

	return &CollectedData{
		SystemInfo:   *systemInfo,
		CPUData:      cpuData,
		MemoryData:   memoryData,
		IOData:       ioData,
		NetworkData:  networkData,
		ProcessData:  processData,
		StartAt:      startAt,
		EndAt:        time.Now(),
		SamplesCount: samplesCount,
	}, nil
}

func (c *Collector) collectSystemInfo() (*SystemInfo, error) {
	hostInfo, err := host.Info()
	if err != nil {
		return nil, err
	}

	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	cpuCount := runtime.NumCPU()

	return &SystemInfo{
		Hostname:     hostInfo.Hostname,
		OS:           hostInfo.OS,
		Architecture: hostInfo.KernelArch,
		CPUs:         cpuCount,
		TotalMemory:  memInfo.Total,
	}, nil
}

func (c *Collector) collectCPUSample(timestamp time.Time) CPUSample {
	sample := CPUSample{Timestamp: timestamp}

	percent, err := cpu.Percent(0, true)
	if err == nil && len(percent) > 0 {
		sample.PerCPUUsage = percent
		total := 0.0
		for _, p := range percent {
			total += p
		}
		sample.TotalUsage = total / float64(len(percent))
	}

	loadAvg, err := load.Avg()
	if err == nil {
		sample.LoadAverage = &LoadAverage{
			Load1:  loadAvg.Load1,
			Load5:  loadAvg.Load5,
			Load15: loadAvg.Load15,
		}
	}

	return sample
}

func (c *Collector) collectMemorySample(timestamp time.Time) MemorySample {
	sample := MemorySample{Timestamp: timestamp}

	vmem, err := mem.VirtualMemory()
	if err == nil {
		sample.Total = vmem.Total
		sample.Available = vmem.Available
		sample.Used = vmem.Used
		sample.UsedPercent = vmem.UsedPercent
		sample.Buffers = vmem.Buffers
		sample.Cached = vmem.Cached
	}

	swap, err := mem.SwapMemory()
	if err == nil {
		sample.SwapTotal = swap.Total
		sample.SwapUsed = swap.Used
		sample.SwapUsedPercent = swap.UsedPercent
	}

	return sample
}

func (c *Collector) calculateIOSample(timestamp time.Time, prev, current map[string]disk.IOCountersStat) IOSample {
	sample := IOSample{Timestamp: timestamp}

	var prevReadBytes, prevWriteBytes, prevReadCount, prevWriteCount uint64
	var currReadBytes, currWriteBytes, currReadCount, currWriteCount uint64

	for _, stat := range prev {
		prevReadBytes += stat.ReadBytes
		prevWriteBytes += stat.WriteBytes
		prevReadCount += stat.ReadCount
		prevWriteCount += stat.WriteCount
	}

	for _, stat := range current {
		currReadBytes += stat.ReadBytes
		currWriteBytes += stat.WriteBytes
		currReadCount += stat.ReadCount
		currWriteCount += stat.WriteCount
	}

	sample.ReadBytes = currReadBytes
	sample.WriteBytes = currWriteBytes
	sample.ReadCount = currReadCount
	sample.WriteCount = currWriteCount

	intervalSec := uint64(c.config.Interval.Seconds())
	if intervalSec > 0 {
		sample.ReadBytesPerSec = (currReadBytes - prevReadBytes) / intervalSec
		sample.WriteBytesPerSec = (currWriteBytes - prevWriteBytes) / intervalSec
	}

	return sample
}

func (c *Collector) calculateNetworkSample(timestamp time.Time, prev, current []net.IOCountersStat) NetworkSample {
	sample := NetworkSample{Timestamp: timestamp}

	var prevBytesSent, prevBytesRecv, prevPacketsSent, prevPacketsRecv uint64
	var currBytesSent, currBytesRecv, currPacketsSent, currPacketsRecv uint64

	for _, stat := range prev {
		prevBytesSent += stat.BytesSent
		prevBytesRecv += stat.BytesRecv
		prevPacketsSent += stat.PacketsSent
		prevPacketsRecv += stat.PacketsRecv
	}

	for _, stat := range current {
		currBytesSent += stat.BytesSent
		currBytesRecv += stat.BytesRecv
		currPacketsSent += stat.PacketsSent
		currPacketsRecv += stat.PacketsRecv
	}

	sample.BytesSent = currBytesSent
	sample.BytesRecv = currBytesRecv
	sample.PacketsSent = currPacketsSent
	sample.PacketsRecv = currPacketsRecv

	intervalSec := uint64(c.config.Interval.Seconds())
	if intervalSec > 0 {
		sample.BytesSentPerSec = (currBytesSent - prevBytesSent) / intervalSec
		sample.BytesRecvPerSec = (currBytesRecv - prevBytesRecv) / intervalSec
	}

	return sample
}

func (c *Collector) initProcessData() (*ProcessData, error) {
	var proc *process.Process
	var err error

	if c.config.ProcessPID > 0 {
		proc, err = process.NewProcess(c.config.ProcessPID)
	} else {
		procs, err := process.Processes()
		if err != nil {
			return nil, err
		}
		for _, p := range procs {
			name, err := p.Name()
			if err == nil && name == c.config.ProcessName {
				proc = p
				break
			}
		}
	}

	if err != nil {
		return nil, err
	}

	name, _ := proc.Name()
	return &ProcessData{
		PID:  proc.Pid,
		Name: name,
	}, nil
}

func (c *Collector) collectProcessSamples(timestamp time.Time, pd *ProcessData) {
	proc, err := process.NewProcess(pd.PID)
	if err != nil {
		return
	}

	cpuPercent, err := proc.CPUPercent()
	if err == nil {
		pd.CPUData = append(pd.CPUData, ProcessCPUSample{
			Timestamp:  timestamp,
			CPUPercent: cpuPercent,
		})
	}

	memInfo, err := proc.MemoryInfo()
	if err == nil {
		memPercent, _ := proc.MemoryPercent()
		pd.MemoryData = append(pd.MemoryData, ProcessMemSample{
			Timestamp: timestamp,
			RSS:       memInfo.RSS,
			VMS:       memInfo.VMS,
			Percent:   memPercent,
		})
	}

	ioCounters, err := proc.IOCounters()
	if err == nil {
		pd.IOData = append(pd.IOData, ProcessIOSample{
			Timestamp:  timestamp,
			ReadBytes:  ioCounters.ReadBytes,
			WriteBytes: ioCounters.WriteBytes,
		})
	}

	threads, err := proc.NumThreads()
	if err == nil {
		pd.ThreadCount = append(pd.ThreadCount, int(threads))
	}

	openFiles, err := proc.OpenFiles()
	if err == nil {
		pd.OpenFiles = append(pd.OpenFiles, len(openFiles))
	}
}
