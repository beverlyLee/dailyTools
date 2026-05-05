package stress

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strings"
)

type HTTPMethod string

const (
	MethodGet     HTTPMethod = "GET"
	MethodPost    HTTPMethod = "POST"
	MethodPut     HTTPMethod = "PUT"
	MethodDelete  HTTPMethod = "DELETE"
	MethodPatch   HTTPMethod = "PATCH"
	MethodHead    HTTPMethod = "HEAD"
	MethodOptions HTTPMethod = "OPTIONS"
)

type RequestConfig struct {
	URL     string            `json:"url"`
	Method  HTTPMethod        `json:"method"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

type StressTestConfig struct {
	Request       RequestConfig `json:"request"`
	Concurrency   int           `json:"concurrency"`
	TotalRequests int           `json:"total_requests"`
	Duration      int           `json:"duration_seconds"`
	Timeout       int           `json:"timeout_seconds"`
	ThinkTime     int           `json:"think_time_ms"`
	OutputFormat  string        `json:"output_format"`
	OutputFile    string        `json:"output_file"`
}

func DefaultStressTestConfig() *StressTestConfig {
	return &StressTestConfig{
		Concurrency:   10,
		TotalRequests: 1000,
		Duration:      0,
		Timeout:       10,
		ThinkTime:     0,
		OutputFormat:  "json",
		OutputFile:    "",
		Request: RequestConfig{
			Method:  MethodGet,
			Headers: make(map[string]string),
		},
	}
}

func LoadConfigFromFile(filePath string) (*StressTestConfig, error) {
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	config := DefaultStressTestConfig()
	if err := json.Unmarshal(data, config); err != nil {
		return nil, err
	}

	return config, nil
}

func (c *RequestConfig) ToHTTPRequest() (*http.Request, error) {
	var body *strings.Reader
	if c.Body != "" {
		body = strings.NewReader(c.Body)
	} else {
		body = strings.NewReader("")
	}

	req, err := http.NewRequest(string(c.Method), c.URL, body)
	if err != nil {
		return nil, err
	}

	for key, value := range c.Headers {
		req.Header.Set(key, value)
	}

	return req, nil
}
