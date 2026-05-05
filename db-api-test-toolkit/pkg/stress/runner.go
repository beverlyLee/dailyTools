package stress

import (
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

type StressTestRunner struct {
	config     *StressTestConfig
	client     *http.Client
	stats      *Statistics
	stopChan   chan struct{}
	requestID  int64
	wg         sync.WaitGroup
}

func NewStressTestRunner(config *StressTestConfig) *StressTestRunner {
	client := &http.Client{
		Timeout: time.Duration(config.Timeout) * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        config.Concurrency * 2,
			MaxIdleConnsPerHost: config.Concurrency,
			IdleConnTimeout:     30 * time.Second,
		},
	}

	return &StressTestRunner{
		config:   config,
		client:   client,
		stats:    NewStatistics(),
		stopChan: make(chan struct{}),
	}
}

func (r *StressTestRunner) Run() error {
	fmt.Println("开始压力测试...")
	fmt.Printf("配置: 并发数=%d, 总请求数=%d, 超时=%ds\n",
		r.config.Concurrency, r.config.TotalRequests, r.config.Timeout)

	startTime := time.Now()

	if r.config.Duration > 0 {
		go func() {
			time.Sleep(time.Duration(r.config.Duration) * time.Second)
			close(r.stopChan)
		}()
	}

	requestChan := make(chan int, r.config.Concurrency)

	for i := 0; i < r.config.Concurrency; i++ {
		r.wg.Add(1)
		go r.worker(requestChan)
	}

	go r.printProgress()

	if r.config.Duration > 0 {
		r.sendRequestsByDuration(requestChan)
	} else {
		r.sendRequestsByCount(requestChan)
	}

	close(requestChan)
	r.wg.Wait()

	elapsed := time.Since(startTime)
	fmt.Printf("\n\n压力测试完成!\n")
	fmt.Printf("总耗时: %v\n", elapsed)

	r.printFinalReport()

	return nil
}

func (r *StressTestRunner) worker(requestChan <-chan int) {
	defer r.wg.Done()

	for {
		select {
		case _, ok := <-requestChan:
			if !ok {
				return
			}
			r.sendRequest()
			if r.config.ThinkTime > 0 {
				time.Sleep(time.Duration(r.config.ThinkTime) * time.Millisecond)
			}
		case <-r.stopChan:
			return
		}
	}
}

func (r *StressTestRunner) sendRequest() {
	startTime := time.Now()

	req, err := r.config.Request.ToHTTPRequest()
	if err != nil {
		r.stats.RecordResult(RequestResult{
			StartTime: startTime,
			EndTime:   time.Now(),
			Duration:  time.Since(startTime),
			Error:     err,
		})
		return
	}

	resp, err := r.client.Do(req)
	endTime := time.Now()
	duration := endTime.Sub(startTime)

	if err != nil {
		r.stats.RecordResult(RequestResult{
			StartTime: startTime,
			EndTime:   endTime,
			Duration:  duration,
			Error:     err,
		})
		return
	}
	defer resp.Body.Close()

	bytesRead, err := io.Copy(ioutil.Discard, resp.Body)
	if err != nil {
		r.stats.RecordResult(RequestResult{
			StartTime:  startTime,
			EndTime:    endTime,
			Duration:   duration,
			StatusCode: resp.StatusCode,
			Error:      err,
			BytesRead:  bytesRead,
		})
		return
	}

	r.stats.RecordResult(RequestResult{
		StartTime:  startTime,
		EndTime:    endTime,
		Duration:   duration,
		StatusCode: resp.StatusCode,
		Error:      nil,
		BytesRead:  bytesRead,
	})
}

func (r *StressTestRunner) sendRequestsByCount(requestChan chan<- int) {
	for i := 0; i < r.config.TotalRequests; i++ {
		select {
		case <-r.stopChan:
			return
		case requestChan <- i:
		}
	}
}

func (r *StressTestRunner) sendRequestsByDuration(requestChan chan<- int) {
	for {
		select {
		case <-r.stopChan:
			return
		case requestChan <- int(atomic.AddInt64(&r.requestID, 1)):
		}
	}
}

func (r *StressTestRunner) printProgress() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.printCurrentStats()
		case <-r.stopChan:
			return
		}
	}
}

func (r *StressTestRunner) printCurrentStats() {
	qps := r.stats.GetQPS()
	errorRate := r.stats.GetErrorRate()
	p50 := r.stats.GetLatencyPercentile(50)
	p95 := r.stats.GetLatencyPercentile(95)
	p99 := r.stats.GetLatencyPercentile(99)

	fmt.Printf("\r实时统计 - QPS: %.2f | 错误率: %.2f%% | P50: %.2fms | P95: %.2fms | P99: %.2fms",
		qps, errorRate, p50, p95, p99)
}

func (r *StressTestRunner) printFinalReport() {
	total := r.stats.GetTotalRequests()
	success := r.stats.GetSuccessRequests()
	errors := r.stats.GetErrorRequests()
	errorRate := r.stats.GetErrorRate()
	qps := r.stats.GetQPS()
	throughput := r.stats.GetThroughput()

	avgLatency := r.stats.GetAverageLatency()
	minLatency := r.stats.GetMinLatency()
	maxLatency := r.stats.GetMaxLatency()
	p50 := r.stats.GetLatencyPercentile(50)
	p95 := r.stats.GetLatencyPercentile(95)
	p99 := r.stats.GetLatencyPercentile(99)

	fmt.Println("\n=========================================")
	fmt.Println("最终测试报告")
	fmt.Println("=========================================")
	fmt.Printf("总请求数: %d\n", total)
	fmt.Printf("成功请求: %d\n", success)
	fmt.Printf("失败请求: %d\n", errors)
	fmt.Printf("错误率: %.2f%%\n", errorRate)
	fmt.Printf("QPS: %.2f\n", qps)
	fmt.Printf("吞吐量: %.2f KB/s\n", throughput)
	fmt.Println("\n延迟统计 (毫秒):")
	fmt.Printf("  平均: %.2f\n", avgLatency)
	fmt.Printf("  最小: %.2f\n", minLatency)
	fmt.Printf("  最大: %.2f\n", maxLatency)
	fmt.Printf("  P50:  %.2f\n", p50)
	fmt.Printf("  P95:  %.2f\n", p95)
	fmt.Printf("  P99:  %.2f\n", p99)

	statusCodes := r.stats.GetStatusCodes()
	if len(statusCodes) > 0 {
		fmt.Println("\nHTTP 状态码分布:")
		for code, count := range statusCodes {
			fmt.Printf("  %d: %d (%.2f%%)\n", code, count, float64(count)/float64(total)*100)
		}
	}
}

func (r *StressTestRunner) GetStatistics() *Statistics {
	return r.stats
}
