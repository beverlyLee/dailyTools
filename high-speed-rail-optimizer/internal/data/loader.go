package data

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type DataSourceType string

const (
	DataSourceMock   DataSourceType = "mock"
	DataSourceReal   DataSourceType = "real"
	DataSourceHybrid DataSourceType = "hybrid"
)

type SeatPrice struct {
	SeatType string `json:"seatType"`
	SeatName string `json:"seatName"`
	Price    int    `json:"price"`
}

type StopInfo struct {
	StationCode   string `json:"stationCode"`
	StationName   string `json:"stationName"`
	ArrivalTime   string `json:"arrivalTime"`
	DepartureTime string `json:"departureTime"`
	StayMinutes   int    `json:"stayMinutes"`
	Sequence      int    `json:"sequence"`
}

type Train struct {
	TrainNo         string      `json:"trainNo"`
	TrainCode       string      `json:"trainCode"`
	FromStation     string      `json:"fromStation"`
	ToStation       string      `json:"toStation"`
	FromStationName string      `json:"fromStationName"`
	ToStationName   string      `json:"toStationName"`
	DepartureTime   string      `json:"departureTime"`
	ArrivalTime     string      `json:"arrivalTime"`
	DurationMinutes int         `json:"durationMinutes"`
	DurationDisplay string      `json:"durationDisplay"`
	TrainType       string      `json:"trainType"`
	Date            string      `json:"date"`
	Prices          []SeatPrice `json:"prices"`
	Stops           []StopInfo  `json:"stops"`
	DataSource      string      `json:"dataSource"`
}

type QueryFilter struct {
	From       string
	To         string
	Date       string
	TrainTypes []string
	SeatTypes  []string
	DataSource DataSourceType
}

type DataLoader struct {
	stations      map[string]string
	timetable     []Train
	mockTimetable []Train
	dataPath      string
	apiClient     *http.Client
}

func NewDataLoader(dataPath string) *DataLoader {
	return &DataLoader{
		stations:  make(map[string]string),
		timetable: make([]Train, 0),
		dataPath:  dataPath,
		apiClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func validateTimeFormat(timeStr string) bool {
	if timeStr == "" || timeStr == "--" {
		return true
	}
	_, err := time.Parse("15:04", timeStr)
	return err == nil
}

func (dl *DataLoader) LoadStations() error {
	filePath := filepath.Join(dl.dataPath, "stations.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read stations file: %w", err)
	}

	err = json.Unmarshal(data, &dl.stations)
	if err != nil {
		return fmt.Errorf("failed to parse stations data: %w", err)
	}

	return nil
}

func (dl *DataLoader) LoadMockTimetable() error {
	filePath := filepath.Join(dl.dataPath, "timetable_mock.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read mock timetable file: %w", err)
	}

	var trains []Train
	err = json.Unmarshal(data, &trains)
	if err != nil {
		return fmt.Errorf("failed to parse mock timetable data: %w", err)
	}

	// 标记数据源并验证时间格式
	for i := range trains {
		trains[i].DataSource = "mock"
		// 验证时间格式
		if !validateTimeFormat(trains[i].DepartureTime) {
			trains[i].DepartureTime = ""
		}
		if !validateTimeFormat(trains[i].ArrivalTime) {
			trains[i].ArrivalTime = ""
		}
		// 验证经停站时间格式
		for j := range trains[i].Stops {
			if !validateTimeFormat(trains[i].Stops[j].ArrivalTime) {
				trains[i].Stops[j].ArrivalTime = ""
			}
			if !validateTimeFormat(trains[i].Stops[j].DepartureTime) {
				trains[i].Stops[j].DepartureTime = ""
			}
		}
	}

	dl.mockTimetable = trains
	return nil
}

func (dl *DataLoader) LoadTimetable() error {
	filePath := filepath.Join(dl.dataPath, "timetable.json")
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read timetable file: %w", err)
	}

	var trains []Train
	err = json.Unmarshal(data, &trains)
	if err != nil {
		return fmt.Errorf("failed to parse timetable data: %w", err)
	}

	// 标记数据源并验证时间格式
	for i := range trains {
		if trains[i].DataSource == "" {
			trains[i].DataSource = "real"
		}
		// 验证时间格式
		if !validateTimeFormat(trains[i].DepartureTime) {
			trains[i].DepartureTime = ""
		}
		if !validateTimeFormat(trains[i].ArrivalTime) {
			trains[i].ArrivalTime = ""
		}
		// 验证经停站时间格式
		for j := range trains[i].Stops {
			if !validateTimeFormat(trains[i].Stops[j].ArrivalTime) {
				trains[i].Stops[j].ArrivalTime = ""
			}
			if !validateTimeFormat(trains[i].Stops[j].DepartureTime) {
				trains[i].Stops[j].DepartureTime = ""
			}
		}
	}

	dl.timetable = trains
	return nil
}

func (dl *DataLoader) FetchRealTimeData(from, to, date string) ([]Train, error) {
	url := "https://kyfw.12306.cn/otn/leftTicket/query"
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return dl.getFallbackData(from, to, date), fmt.Errorf("failed to create request: %w", err)
	}

	q := req.URL.Query()
	q.Add("leftTicketDTO.train_date", date)
	q.Add("leftTicketDTO.from_station", from)
	q.Add("leftTicketDTO.to_station", to)
	q.Add("purpose_codes", "ADULT")
	req.URL.RawQuery = q.Encode()

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.12306.cn/")
	req.Header.Set("Accept", "application/json, text/javascript, */*; q=0.01")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")

	data, err := dl.fetchWithRetry(req, 3)
	if err != nil {
		return dl.getFallbackData(from, to, date), fmt.Errorf("fetch failed: %w", err)
	}

	var result struct {
		HTTPStatus int    `json:"httpstatus"`
		Message    string `json:"message"`
		Data       struct {
			Result []string `json:"result"`
		} `json:"data"`
	}

	if err := json.Unmarshal(data, &result); err != nil {
		return dl.getFallbackData(from, to, date), fmt.Errorf("json parse failed: %w", err)
	}

	if result.HTTPStatus != 200 {
		return dl.getFallbackData(from, to, date), fmt.Errorf("12306 API error: %d - %s", result.HTTPStatus, result.Message)
	}

	var trains []Train
	for _, item := range result.Data.Result {
		train, err := dl.parse12306Result(item, date)
		if err == nil && train != nil {
			trains = append(trains, *train)
		}
	}

	if len(trains) == 0 {
		return dl.getFallbackData(from, to, date), fmt.Errorf("no trains found from 12306 API")
	}

	return trains, nil
}

func (dl *DataLoader) getFallbackData(from, to, date string) []Train {
	var result []Train
	for _, train := range dl.mockTimetable {
		if (from == "" || train.FromStation == from) &&
			(to == "" || train.ToStation == to) &&
			(date == "" || train.Date == date) {
			result = append(result, train)
		}
	}
	return result
}

func (dl *DataLoader) parse12306Result(itemStr, date string) (*Train, error) {
	parts := strings.Split(itemStr, "|")
	if len(parts) < 30 {
		return nil, fmt.Errorf("invalid result format")
	}

	trainNo := parts[3]
	fromStation := parts[6]
	toStation := parts[7]
	departureTime := parts[8]
	arrivalTime := parts[9]
	durationStr := parts[10]

	durationMinutes := 0
	if strings.Contains(durationStr, ":") {
		durParts := strings.Split(durationStr, ":")
		if len(durParts) == 2 {
			h, _ := time.ParseDuration(durParts[0] + "h")
			m, _ := time.ParseDuration(durParts[1] + "m")
			durationMinutes = int((h + m).Minutes())
		}
	}

	trainType := "K"
	if strings.HasPrefix(trainNo, "G") {
		trainType = "G"
	} else if strings.HasPrefix(trainNo, "D") {
		trainType = "D"
	} else if strings.HasPrefix(trainNo, "C") {
		trainType = "C"
	}

	prices := []SeatPrice{
		{SeatType: "second", SeatName: "二等座", Price: 553},
		{SeatType: "first", SeatName: "一等座", Price: 885},
		{SeatType: "business", SeatName: "商务座", Price: 1659},
	}

	fromName, _ := dl.stations[fromStation]
	toName, _ := dl.stations[toStation]

	return &Train{
		TrainNo:         trainNo,
		TrainCode:       trainNo,
		FromStation:     fromStation,
		ToStation:       toStation,
		FromStationName: fromName,
		ToStationName:   toName,
		DepartureTime:   departureTime,
		ArrivalTime:     arrivalTime,
		DurationMinutes: durationMinutes,
		DurationDisplay: durationStr,
		TrainType:       trainType,
		Date:            date,
		Prices:          prices,
		Stops:           []StopInfo{},
		DataSource:      "12306",
	}, nil
}

func (dl *DataLoader) LoadAll() error {
	err := dl.LoadStations()
	if err != nil {
		return err
	}

	err = dl.LoadMockTimetable()
	if err != nil {
		fmt.Printf("Warning: failed to load mock timetable: %v\n", err)
	}

	err = dl.LoadTimetable()
	if err != nil {
		fmt.Printf("Warning: failed to load timetable, using mock data: %v\n", err)
		dl.timetable = dl.mockTimetable
	}

	return nil
}

func (dl *DataLoader) GetStations() map[string]string {
	return dl.stations
}

func (dl *DataLoader) GetStationName(code string) (string, bool) {
	name, exists := dl.stations[code]
	return name, exists
}

func (dl *DataLoader) GetTimetable() []Train {
	return dl.timetable
}

func (dl *DataLoader) GetMockTimetable() []Train {
	return dl.mockTimetable
}

func (dl *DataLoader) QueryTrains(filter QueryFilter) []Train {
	var sourceData []Train

	switch filter.DataSource {
	case DataSourceMock:
		sourceData = dl.mockTimetable
	case DataSourceReal:
		sourceData = dl.timetable
	default:
		// Hybrid - 优先使用真实数据，回退到模拟数据
		sourceData = append(dl.timetable, dl.mockTimetable...)
	}

	var result []Train
	seen := make(map[string]bool)

	for _, train := range sourceData {
		key := train.TrainCode + "_" + train.Date
		if seen[key] {
			continue
		}

		// 筛选出发站
		if filter.From != "" && !strings.EqualFold(train.FromStation, filter.From) {
			continue
		}

		// 筛选到达站
		if filter.To != "" && !strings.EqualFold(train.ToStation, filter.To) {
			continue
		}

		// 筛选日期
		if filter.Date != "" && train.Date != filter.Date {
			continue
		}

		// 筛选车次类型
		if len(filter.TrainTypes) > 0 && !contains(filter.TrainTypes, train.TrainType) {
			continue
		}

		// 筛选座位类型
		if len(filter.SeatTypes) > 0 {
			hasSeatType := false
			for _, price := range train.Prices {
				if contains(filter.SeatTypes, price.SeatType) {
					hasSeatType = true
					break
				}
			}
			if !hasSeatType {
				continue
			}
		}

		seen[key] = true
		result = append(result, train)
	}

	return result
}

func (dl *DataLoader) GetTrainByCode(trainCode, date string) *Train {
	// 优先查找真实数据
	for _, train := range dl.timetable {
		if train.TrainCode == trainCode && (date == "" || train.Date == date) {
			return &train
		}
	}

	// 回退到模拟数据
	for _, train := range dl.mockTimetable {
		if train.TrainCode == trainCode && (date == "" || train.Date == date) {
			return &train
		}
	}

	return nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, item) {
			return true
		}
	}
	return false
}

func stripBOM(data []byte) []byte {
	bom := []byte{0xef, 0xbb, 0xbf}
	if bytes.HasPrefix(data, bom) {
		return data[len(bom):]
	}
	return data
}

func isHTMLResponse(data []byte) bool {
	trimmed := bytes.TrimSpace(data)
	return bytes.HasPrefix(trimmed, []byte("<"))
}

func (dl *DataLoader) fetchWithRetry(req *http.Request, maxRetries int) ([]byte, error) {
	var lastErr error
	backoff := 500 * time.Millisecond

	for i := 0; i < maxRetries; i++ {
		if i > 0 {
			time.Sleep(backoff)
			backoff *= 2
		}

		resp, err := dl.apiClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		data, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}

		data = stripBOM(data)

		if isHTMLResponse(data) {
			lastErr = fmt.Errorf("received HTML response instead of JSON")
			continue
		}

		return data, nil
	}

	return nil, fmt.Errorf("failed after %d retries: %w", maxRetries, lastErr)
}
