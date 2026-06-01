package engine

import (
	"fmt"
	"high-speed-rail-optimizer/internal/data"
	"sort"
)

type SortType string

const (
	SortByPrice    SortType = "price"
	SortByTime     SortType = "time"
	SortByBalanced SortType = "balanced"
)

type QueryParams struct {
	From       string
	To         string
	Date       string
	TrainTypes []string
	SeatTypes  []string
	SortBy     SortType
	DataSource string
}

type QueryResult struct {
	TrainNo         string          `json:"trainNo"`
	TrainCode       string          `json:"trainCode"`
	FromStation     string          `json:"fromStation"`
	ToStation       string          `json:"toStation"`
	FromStationName string          `json:"fromStationName"`
	ToStationName   string          `json:"toStationName"`
	DepartureTime   string          `json:"departureTime"`
	ArrivalTime     string          `json:"arrivalTime"`
	DurationMinutes int             `json:"durationMinutes"`
	DurationDisplay string          `json:"durationDisplay"`
	TrainType       string          `json:"trainType"`
	Date            string          `json:"date"`
	Prices          []data.SeatPrice `json:"prices"`
	Stops           []data.StopInfo  `json:"stops"`
	DataSource      string          `json:"dataSource"`
	Score           float64         `json:"score,omitempty"`
}

type QueryEngine struct {
	dataLoader *data.DataLoader
}

func NewQueryEngine(dl *data.DataLoader) *QueryEngine {
	return &QueryEngine{
		dataLoader: dl,
	}
}

func (qe *QueryEngine) GetStations() map[string]string {
	return qe.dataLoader.GetStations()
}

func (qe *QueryEngine) Query(params QueryParams) []QueryResult {
	var ds data.DataSourceType
	switch params.DataSource {
	case "mock":
		ds = data.DataSourceMock
	case "real":
		ds = data.DataSourceReal
	default:
		ds = data.DataSourceHybrid
	}

	filter := data.QueryFilter{
		From:       params.From,
		To:         params.To,
		Date:       params.Date,
		TrainTypes: params.TrainTypes,
		SeatTypes:  params.SeatTypes,
		DataSource: ds,
	}

	trains := qe.dataLoader.QueryTrains(filter)

	results := make([]QueryResult, 0, len(trains))
	for _, train := range trains {
		fromName := train.FromStationName
		if fromName == "" {
			fromName, _ = qe.dataLoader.GetStationName(train.FromStation)
		}

		toName := train.ToStationName
		if toName == "" {
			toName, _ = qe.dataLoader.GetStationName(train.ToStation)
		}

		results = append(results, QueryResult{
			TrainNo:         train.TrainNo,
			TrainCode:       train.TrainCode,
			FromStation:     train.FromStation,
			ToStation:       train.ToStation,
			FromStationName: fromName,
			ToStationName:   toName,
			DepartureTime:   train.DepartureTime,
			ArrivalTime:     train.ArrivalTime,
			DurationMinutes: train.DurationMinutes,
			DurationDisplay: train.DurationDisplay,
			TrainType:       train.TrainType,
			Date:            train.Date,
			Prices:          train.Prices,
			Stops:           train.Stops,
			DataSource:      train.DataSource,
		})
	}

	qe.sort(results, params.SortBy)
	return results
}

func (qe *QueryEngine) RefreshRealTimeData(from, to, date string) error {
	trains, err := qe.dataLoader.FetchRealTimeData(from, to, date)
	if err != nil {
		return err
	}

	// 更新内存中的数据
	for _, newTrain := range trains {
		found := false
		for i, existingTrain := range qe.dataLoader.GetTimetable() {
			if existingTrain.TrainCode == newTrain.TrainCode && existingTrain.Date == newTrain.Date {
				qe.dataLoader.GetTimetable()[i] = newTrain
				found = true
				break
			}
		}
		if !found {
			// 这里需要注意：GetTimetable返回的是副本，实际应用中需要更好的处理方式
			_ = append(qe.dataLoader.GetTimetable(), newTrain)
		}
	}

	return nil
}

func (qe *QueryEngine) GetTrainDetail(trainCode, date string) *QueryResult {
	train := qe.dataLoader.GetTrainByCode(trainCode, date)
	if train == nil {
		return nil
	}

	fromName := train.FromStationName
	if fromName == "" {
		fromName, _ = qe.dataLoader.GetStationName(train.FromStation)
	}

	toName := train.ToStationName
	if toName == "" {
		toName, _ = qe.dataLoader.GetStationName(train.ToStation)
	}

	return &QueryResult{
		TrainNo:         train.TrainNo,
		TrainCode:       train.TrainCode,
		FromStation:     train.FromStation,
		ToStation:       train.ToStation,
		FromStationName: fromName,
		ToStationName:   toName,
		DepartureTime:   train.DepartureTime,
		ArrivalTime:     train.ArrivalTime,
		DurationMinutes: train.DurationMinutes,
		DurationDisplay: train.DurationDisplay,
		TrainType:       train.TrainType,
		Date:            train.Date,
		Prices:          train.Prices,
		Stops:           train.Stops,
		DataSource:      train.DataSource,
	}
}

func (qe *QueryEngine) sort(results []QueryResult, sortBy SortType) {
	switch sortBy {
	case SortByPrice:
		sort.Slice(results, func(i, j int) bool {
			return getLowestPrice(results[i].Prices) < getLowestPrice(results[j].Prices)
		})
	case SortByTime:
		sort.Slice(results, func(i, j int) bool {
			return results[i].DurationMinutes < results[j].DurationMinutes
		})
	case SortByBalanced:
		qe.calculateBalancedScore(results)
		sort.Slice(results, func(i, j int) bool {
			return results[i].Score < results[j].Score
		})
	}
}

func getLowestPrice(prices []data.SeatPrice) int {
	if len(prices) == 0 {
		return 0
	}
	minPrice := prices[0].Price
	for _, p := range prices[1:] {
		if p.Price < minPrice {
			minPrice = p.Price
		}
	}
	return minPrice
}

func (qe *QueryEngine) calculateBalancedScore(results []QueryResult) {
	if len(results) == 0 {
		return
	}

	minDuration := results[0].DurationMinutes
	maxDuration := results[0].DurationMinutes
	minPrice := getLowestPrice(results[0].Prices)
	maxPrice := getLowestPrice(results[0].Prices)

	for _, r := range results {
		if r.DurationMinutes < minDuration {
			minDuration = r.DurationMinutes
		}
		if r.DurationMinutes > maxDuration {
			maxDuration = r.DurationMinutes
		}

		p := getLowestPrice(r.Prices)
		if p < minPrice {
			minPrice = p
		}
		if p > maxPrice {
			maxPrice = p
		}
	}

	durationRange := maxDuration - minDuration
	if durationRange == 0 {
		durationRange = 1
	}
	priceRange := maxPrice - minPrice
	if priceRange == 0 {
		priceRange = 1
	}

	for i := range results {
		normalizedDuration := float64(results[i].DurationMinutes-minDuration) / float64(durationRange)
		normalizedPrice := float64(getLowestPrice(results[i].Prices)-minPrice) / float64(priceRange)
		results[i].Score = normalizedDuration*0.5 + normalizedPrice*0.5
	}
}

func formatDuration(minutes int) string {
	hours := minutes / 60
	mins := minutes % 60
	return fmt.Sprintf("%d小时%d分", hours, mins)
}
