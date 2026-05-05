package optimizer

import (
	"perf-security-toolkit/pkg/perf/analyzer"
	"perf-security-toolkit/pkg/perf/bottleneck"
)

type Suggestion struct {
	ID               string              `json:"id"`
	Title            string              `json:"title"`
	Description      string              `json:"description"`
	Severity         bottleneck.Severity `json:"severity"`
	Category         string              `json:"category"`
	Priority         int                 `json:"priority"`
	Steps            []Step              `json:"steps"`
	CodeExamples     []CodeExample       `json:"code_examples,omitempty"`
	ExpectedImpact   string              `json:"expected_impact"`
	References       []Reference         `json:"references,omitempty"`
	RelatedBottleneck *bottleneck.Bottleneck `json:"related_bottleneck,omitempty"`
}

type Step struct {
	Order       int    `json:"order"`
	Action      string `json:"action"`
	Details     string `json:"details"`
	CheckPoint  string `json:"check_point,omitempty"`
}

type CodeExample struct {
	Language    string `json:"language"`
	Title       string `json:"title"`
	Before      string `json:"before"`
	After       string `json:"after"`
	Explanation string `json:"explanation"`
}

type Reference struct {
	Title string `json:"title"`
	URL   string `json:"url"`
}

type Generator struct{}

func New() *Generator {
	return &Generator{}
}

func (g *Generator) Generate(bottlenecks []bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) ([]Suggestion, error) {
	var suggestions []Suggestion

	for _, bn := range bottlenecks {
		suggestion := g.generateSuggestionForBottleneck(bn, analysis)
		if suggestion != nil {
			suggestions = append(suggestions, *suggestion)
		}
	}

	suggestions = g.deduplicateSuggestions(suggestions)
	g.sortSuggestionsByPriority(suggestions)

	return suggestions, nil
}

func (g *Generator) generateSuggestionForBottleneck(bn bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) *Suggestion {
	switch bn.Type {
	case bottleneck.BottleneckCPU:
		return g.generateCPUSuggestion(bn, analysis)
	case bottleneck.BottleneckMemory:
		return g.generateMemorySuggestion(bn, analysis)
	case bottleneck.BottleneckMemoryLeak:
		return g.generateMemoryLeakSuggestion(bn, analysis)
	case bottleneck.BottleneckIO:
		return g.generateIOSuggestion(bn, analysis)
	case bottleneck.BottleneckNetwork:
		return g.generateNetworkSuggestion(bn, analysis)
	case bottleneck.BottleneckLock:
		return g.generateLockSuggestion(bn, analysis)
	case bottleneck.BottleneckDeadlock:
		return g.generateDeadlockSuggestion(bn, analysis)
	case bottleneck.BottleneckHotFunction:
		return g.generateHotFunctionSuggestion(bn, analysis)
	default:
		return nil
	}
}

func (g *Generator) generateCPUSuggestion(bn bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) *Suggestion {
	return &Suggestion{
		ID:          bn.SuggestionID,
		Title:       "优化CPU使用率",
		Description: "系统CPU使用率过高，需要识别并优化热点代码路径",
		Severity:    bn.Severity,
		Category:    "CPU",
		Priority:    1,
		Steps: []Step{
			{Order: 1, Action: "分析CPU热点函数", Details: "使用pprof或类似工具定位CPU消耗最高的函数", CheckPoint: "确定Top 5热点函数"},
			{Order: 2, Action: "检查算法复杂度", Details: "验证热点函数是否存在O(n²)或更高复杂度的算法", CheckPoint: "确认算法复杂度"},
			{Order: 3, Action: "优化循环和内存访问", Details: "优化循环结构，减少不必要的计算，提高缓存命中率", CheckPoint: "循环优化完成"},
			{Order: 4, Action: "考虑并行化", Details: "将可并行的计算任务拆分为多个goroutine/线程", CheckPoint: "并行化改造完成"},
			{Order: 5, Action: "验证优化效果", Details: "重新运行性能测试，确认CPU使用率下降", CheckPoint: "CPU使用率改善验证"},
		},
		CodeExamples: []CodeExample{
			{
				Language: "Go",
				Title:    "优化嵌套循环",
				Before: `for i := 0; i < len(data); i++ {
    for j := 0; j < len(data); j++ {
        process(data[i], data[j])
    }
}`,
				After: `// 使用映射减少重复计算
lookup := make(map[string]int)
for _, item := range data {
    lookup[item.Key] = item.Value
}

for i := 0; i < len(data); i++ {
    if val, ok := lookup[data[i].RelatedKey]; ok {
        process(data[i], val)
    }
}`,
				Explanation: "将O(n²)复杂度优化为O(n)，通过预处理数据减少嵌套循环",
			},
			{
				Language: "Go",
				Title:    "使用goroutine并行处理",
				Before: `func processItems(items []Item) {
    for _, item := range items {
        heavyComputation(item)
    }
}`,
				After: `func processItems(items []Item) {
    var wg sync.WaitGroup
    semaphore := make(chan struct{}, runtime.NumCPU())
    
    for _, item := range items {
        wg.Add(1)
        semaphore <- struct{}{}
        go func(i Item) {
            defer wg.Done()
            defer func() { <-semaphore }()
            heavyComputation(i)
        }(item)
    }
    wg.Wait()
}`,
				Explanation: "使用goroutine和信号量并行处理，限制并发数避免过度调度",
			},
		},
		ExpectedImpact: "预期CPU使用率降低30%-70%，具体取决于优化前的瓶颈类型",
		References: []Reference{
			{Title: "Go pprof 性能分析", URL: "https://go.dev/blog/pprof"},
			{Title: "火焰图分析指南", URL: "http://www.brendangregg.com/flamegraphs.html"},
		},
		RelatedBottleneck: &bn,
	}
}

func (g *Generator) generateMemorySuggestion(bn bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) *Suggestion {
	return &Suggestion{
		ID:          bn.SuggestionID,
		Title:       "优化内存使用",
		Description: "系统内存压力大，需要优化内存分配和释放策略",
		Severity:    bn.Severity,
		Category:    "Memory",
		Priority:    1,
		Steps: []Step{
			{Order: 1, Action: "分析内存分配模式", Details: "使用内存分析工具找出内存分配热点", CheckPoint: "定位内存分配热点"},
			{Order: 2, Action: "检查大对象分配", Details: "识别是否存在频繁分配的大对象", CheckPoint: "确认大对象分配情况"},
			{Order: 3, Action: "实施对象池", Details: "对频繁分配/释放的对象使用对象池复用", CheckPoint: "对象池集成完成"},
			{Order: 4, Action: "减少不必要的拷贝", Details: "优化数据传递方式，减少值拷贝", CheckPoint: "拷贝优化完成"},
			{Order: 5, Action: "考虑升级硬件", Details: "如优化后仍不足，考虑增加物理内存", CheckPoint: "硬件评估完成"},
		},
		CodeExamples: []CodeExample{
			{
				Language: "Go",
				Title:    "使用sync.Pool对象池",
				Before: `func processRequest(req *Request) {
    buffer := make([]byte, 4096)
    // 使用buffer...
    // buffer会被GC回收
}`,
				After: `var bufferPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 4096)
    },
}

func processRequest(req *Request) {
    buffer := bufferPool.Get().([]byte)
    defer bufferPool.Put(buffer[:0])
    // 使用buffer...
}`,
				Explanation: "使用sync.Pool复用对象，减少GC压力",
			},
			{
				Language: "Go",
				Title:    "避免不必要的字符串拼接",
				Before: `func buildMessage(parts []string) string {
    result := ""
    for _, p := range parts {
        result += p
    }
    return result
}`,
				After: `func buildMessage(parts []string) string {
    var sb strings.Builder
    sb.Grow(len(parts) * 10)
    for _, p := range parts {
        sb.WriteString(p)
    }
    return sb.String()
}`,
				Explanation: "使用strings.Builder预分配容量，避免多次内存分配",
			},
		},
		ExpectedImpact: "预期内存分配减少50%-80%，GC压力显著降低",
		References: []Reference{
			{Title: "Go 内存优化指南", URL: "https://go.dev/doc/effective_go#allocation"},
			{Title: "sync.Pool 最佳实践", URL: "https://medium.com/@cep21/how-to-properly-use-sync-pool-in-go-2a207a53e9b"},
		},
		RelatedBottleneck: &bn,
	}
}

func (g *Generator) generateMemoryLeakSuggestion(bn bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) *Suggestion {
	return &Suggestion{
		ID:          bn.SuggestionID,
		Title:       "排查和修复内存泄漏",
		Description: "检测到可能的内存泄漏，需要定位泄漏源并修复",
		Severity:    bn.Severity,
		Category:    "Memory",
		Priority:    1,
		Steps: []Step{
			{Order: 1, Action: "获取内存快照", Details: "在不同时间点获取pprof heap profile", CheckPoint: "获取到对比用的内存快照"},
			{Order: 2, Action: "分析内存增长", Details: "对比快照找出持续增长的对象类型", CheckPoint: "定位泄漏的对象类型"},
			{Order: 3, Action: "检查goroutine泄漏", Details: "检查是否有未正确退出的goroutine", CheckPoint: "确认是否存在goroutine泄漏"},
			{Order: 4, Action: "检查资源未释放", Details: "检查是否有未关闭的文件、网络连接等", CheckPoint: "确认资源释放情况"},
			{Order: 5, Action: "修复并验证", Details: "修复泄漏源后持续监控内存使用", CheckPoint: "内存使用稳定，无持续增长"},
		},
		CodeExamples: []CodeExample{
			{
				Language: "Go",
				Title:    "修复goroutine泄漏",
				Before: `func processAsync(data <-chan Data) {
    go func() {
        for d := range data {
            handle(d)
        }
    }()
}`,
				After: `func processAsync(data <-chan Data, done <-chan struct{}) {
    go func() {
        for {
            select {
            case d, ok := <-data:
                if !ok {
                    return
                }
                handle(d)
            case <-done:
                return
            }
        }
    }()
}`,
				Explanation: "添加done channel来控制goroutine退出，避免泄漏",
			},
			{
				Language: "Go",
				Title:    "正确使用defer释放资源",
				Before: `func readFile(path string) ([]byte, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    
    data := make([]byte, 1024)
    n, err := f.Read(data)
    if err != nil {
        // 忘记关闭文件！
        return nil, err
    }
    
    f.Close()
    return data[:n], nil
}`,
				After: `func readFile(path string) ([]byte, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer f.Close()
    
    data := make([]byte, 1024)
    n, err := f.Read(data)
    if err != nil {
        return nil, err
    }
    
    return data[:n], nil
}`,
				Explanation: "使用defer确保资源在函数退出时被释放",
			},
		},
		ExpectedImpact: "修复后内存使用将趋于稳定，不再持续增长",
		References: []Reference{
			{Title: "Go 内存泄漏排查", URL: "https://go.dev/blog/pprof"},
			{Title: "常见Go内存泄漏模式", URL: "https://www.openmymind.net/Go-Working-With-Pprof/"},
		},
		RelatedBottleneck: &bn,
	}
}

func (g *Generator) generateIOSuggestion(bn bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) *Suggestion {
	return &Suggestion{
		ID:          bn.SuggestionID,
		Title:       "优化I/O性能",
		Description: "系统I/O负载过高，需要优化磁盘和网络访问模式",
		Severity:    bn.Severity,
		Category:    "IO",
		Priority:    2,
		Steps: []Step{
			{Order: 1, Action: "分析I/O模式", Details: "识别是读密集还是写密集型负载", CheckPoint: "确定I/O特征"},
			{Order: 2, Action: "检查I/O对齐", Details: "验证文件读写是否按块对齐", CheckPoint: "确认I/O对齐情况"},
			{Order: 3, Action: "实施批量操作", Details: "合并小的I/O操作为批量操作", CheckPoint: "批量操作改造完成"},
			{Order: 4, Action: "添加缓存层", Details: "对热点数据添加应用层缓存", CheckPoint: "缓存层集成完成"},
			{Order: 5, Action: "考虑异步I/O", Details: "使用异步I/O减少阻塞等待", CheckPoint: "异步I/O改造完成"},
		},
		CodeExamples: []CodeExample{
			{
				Language: "Go",
				Title:    "使用bufio优化文件读写",
				Before: `func processFile(path string) error {
    f, _ := os.Open(path)
    defer f.Close()
    
    buf := make([]byte, 1)
    for {
        _, err := f.Read(buf)
        if err != nil {
            break
        }
        processByte(buf[0])
    }
    return nil
}`,
				After: `func processFile(path string) error {
    f, _ := os.Open(path)
    defer f.Close()
    
    r := bufio.NewReaderSize(f, 64*1024)
    buf := make([]byte, 1)
    for {
        _, err := r.Read(buf)
        if err != nil {
            break
        }
        processByte(buf[0])
    }
    return nil
}`,
				Explanation: "使用bufio减少系统调用次数，提高I/O效率",
			},
		},
		ExpectedImpact: "预期I/O操作次数减少50%-90%，系统响应延迟降低",
		RelatedBottleneck: &bn,
	}
}

func (g *Generator) generateNetworkSuggestion(bn bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) *Suggestion {
	return &Suggestion{
		ID:          bn.SuggestionID,
		Title:       "优化网络性能",
		Description: "网络带宽使用率过高，需要优化网络通信",
		Severity:    bn.Severity,
		Category:    "Network",
		Priority:    2,
		Steps: []Step{
			{Order: 1, Action: "分析网络流量", Details: "识别主要的网络流量来源", CheckPoint: "定位高流量操作"},
			{Order: 2, Action: "启用数据压缩", Details: "对传输的数据启用压缩", CheckPoint: "压缩功能集成完成"},
			{Order: 3, Action: "实施请求合并", Details: "合并多个小请求为批量请求", CheckPoint: "请求合并改造完成"},
			{Order: 4, Action: "添加HTTP缓存", Details: "利用HTTP缓存头减少重复请求", CheckPoint: "缓存策略配置完成"},
			{Order: 5, Action: "考虑CDN", Details: "对静态资源考虑使用CDN", CheckPoint: "CDN方案评估完成"},
		},
		ExpectedImpact: "预期网络流量减少30%-80%，传输延迟降低",
		RelatedBottleneck: &bn,
	}
}

func (g *Generator) generateLockSuggestion(bn bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) *Suggestion {
	return &Suggestion{
		ID:          bn.SuggestionID,
		Title:       "减少锁竞争",
		Description: "检测到潜在的锁竞争问题，需要优化并发控制",
		Severity:    bn.Severity,
		Category:    "Concurrency",
		Priority:    2,
		Steps: []Step{
			{Order: 1, Action: "分析锁争用", Details: "使用pprof mutex profile分析锁竞争", CheckPoint: "定位热点锁"},
			{Order: 2, Action: "缩小锁范围", Details: "减少锁持有的时间和范围", CheckPoint: "锁范围优化完成"},
			{Order: 3, Action: "使用读写锁分离", Details: "对读多写少场景使用RWMutex", CheckPoint: "读写锁改造完成"},
			{Order: 4, Action: "考虑无锁数据结构", Details: "评估使用atomic或无锁数据结构", CheckPoint: "无锁方案评估完成"},
			{Order: 5, Action: "分片数据结构", Details: "将数据分片，每个分片独立加锁", CheckPoint: "分片改造完成"},
		},
		CodeExamples: []CodeExample{
			{
				Language: "Go",
				Title:    "使用RWMutex优化读多写少场景",
				Before: `type Cache struct {
    mu    sync.Mutex
    data  map[string]interface{}
}

func (c *Cache) Get(key string) interface{} {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.data[key]
}

func (c *Cache) Set(key string, val interface{}) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.data[key] = val
}`,
				After: `type Cache struct {
    mu    sync.RWMutex
    data  map[string]interface{}
}

func (c *Cache) Get(key string) interface{} {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.data[key]
}

func (c *Cache) Set(key string, val interface{}) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.data[key] = val
}`,
				Explanation: "使用读写锁分离，允许并发读取，提高读性能",
			},
		},
		ExpectedImpact: "预期锁等待时间减少50%-90%，系统吞吐量提高",
		RelatedBottleneck: &bn,
	}
}

func (g *Generator) generateDeadlockSuggestion(bn bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) *Suggestion {
	return &Suggestion{
		ID:          bn.SuggestionID,
		Title:       "检测和预防死锁",
		Description: "检测到潜在的死锁风险，需要排查并发逻辑",
		Severity:    bottleneck.SeverityCritical,
		Category:    "Concurrency",
		Priority:    1,
		Steps: []Step{
			{Order: 1, Action: "审查锁顺序", Details: "确保所有goroutine以相同顺序获取锁", CheckPoint: "锁顺序一致性确认"},
			{Order: 2, Action: "避免嵌套锁", Details: "检查是否存在锁中套锁的情况", CheckPoint: "嵌套锁检查完成"},
			{Order: 3, Action: "使用超时机制", Details: "对锁获取设置超时时间", CheckPoint: "超时机制集成完成"},
			{Order: 4, Action: "使用死锁检测工具", Details: "集成死锁检测库或在测试中运行", CheckPoint: "死锁检测工具集成"},
			{Order: 5, Action: "重构设计", Details: "考虑使用channel替代共享内存", CheckPoint: "并发模型重构完成"},
		},
		ExpectedImpact: "消除死锁风险，提高系统稳定性",
		RelatedBottleneck: &bn,
	}
}

func (g *Generator) generateHotFunctionSuggestion(bn bottleneck.Bottleneck, analysis *analyzer.AnalysisResult) *Suggestion {
	return &Suggestion{
		ID:          bn.SuggestionID,
		Title:       "优化热点函数",
		Description: "检测到高CPU消耗的热点函数，需要针对性优化",
		Severity:    bn.Severity,
		Category:    "CPU",
		Priority:    1,
		Steps: []Step{
			{Order: 1, Action: "获取详细profile", Details: "使用pprof获取函数级别的CPU使用详情", CheckPoint: "定位具体热点函数"},
			{Order: 2, Action: "分析算法复杂度", Details: "审查热点函数的算法实现", CheckPoint: "确定优化切入点"},
			{Order: 3, Action: "添加缓存", Details: "对重复计算的结果添加缓存", CheckPoint: "缓存策略实施完成"},
			{Order: 4, Action: "考虑JIT或预计算", Details: "评估使用即时编译或预计算", CheckPoint: "高级优化评估完成"},
			{Order: 5, Action: "验证优化效果", Details: "运行基准测试确认性能提升", CheckPoint: "性能提升验证"},
		},
		ExpectedImpact: "热点函数执行时间减少30%-90%",
		RelatedBottleneck: &bn,
	}
}

func (g *Generator) deduplicateSuggestions(suggestions []Suggestion) []Suggestion {
	seen := make(map[string]bool)
	var result []Suggestion

	for _, s := range suggestions {
		if !seen[s.ID] {
			seen[s.ID] = true
			result = append(result, s)
		}
	}

	return result
}

func (g *Generator) sortSuggestionsByPriority(suggestions []Suggestion) {
	for i := 0; i < len(suggestions); i++ {
		for j := i + 1; j < len(suggestions); j++ {
			if suggestions[i].Priority > suggestions[j].Priority {
				suggestions[i], suggestions[j] = suggestions[j], suggestions[i]
			}
		}
	}
}
