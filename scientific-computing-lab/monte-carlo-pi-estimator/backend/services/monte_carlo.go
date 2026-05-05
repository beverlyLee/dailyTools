package services

import (
	"math"
	"math/rand"
	"runtime"
	"sync"
	"time"
)

type PiEstimationResult struct {
	SampleSize      int64   `json:"sample_size"`
	PointsInCircle  int64   `json:"points_in_circle"`
	PointsInSquare  int64   `json:"points_in_square"`
	EstimatedPi     float64 `json:"estimated_pi"`
	ActualPi        float64 `json:"actual_pi"`
	ErrorPercentage float64 `json:"error_percentage"`
	DurationMs      int64   `json:"duration_ms"`
}

type Point struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	InCircle bool    `json:"in_circle"`
}

func CalculatePiConcurrent(totalPoints int64, numWorkers int) *PiEstimationResult {
	startTime := time.Now()

	if numWorkers <= 0 {
		numWorkers = runtime.NumCPU()
	}

	pointsPerWorker := totalPoints / int64(numWorkers)
	remainingPoints := totalPoints % int64(numWorkers)

	var wg sync.WaitGroup
	resultsChan := make(chan int64, numWorkers)

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		points := pointsPerWorker
		if i == 0 {
			points += remainingPoints
		}
		go worker(points, resultsChan, &wg)
	}

	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	var pointsInCircle int64 = 0
	for inCircle := range resultsChan {
		pointsInCircle += inCircle
	}

	estimatedPi := 4.0 * float64(pointsInCircle) / float64(totalPoints)
	actualPi := math.Pi
	errorPercentage := math.Abs(estimatedPi-actualPi) / actualPi * 100.0

	duration := time.Since(startTime)

	return &PiEstimationResult{
		SampleSize:      totalPoints,
		PointsInCircle:  pointsInCircle,
		PointsInSquare:  totalPoints,
		EstimatedPi:     estimatedPi,
		ActualPi:        actualPi,
		ErrorPercentage: errorPercentage,
		DurationMs:      duration.Milliseconds(),
	}
}

func worker(points int64, resultsChan chan<- int64, wg *sync.WaitGroup) {
	defer wg.Done()

	r := rand.New(rand.NewSource(time.Now().UnixNano() + int64(rand.Intn(1000000))))
	var inCircle int64 = 0

	for i := int64(0); i < points; i++ {
		x := r.Float64()*2 - 1
		y := r.Float64()*2 - 1

		if x*x+y*y <= 1.0 {
			inCircle++
		}
	}

	resultsChan <- inCircle
}

func GenerateSamplePoints(count int) []Point {
	points := make([]Point, count)
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	for i := 0; i < count; i++ {
		x := r.Float64()*2 - 1
		y := r.Float64()*2 - 1
		inCircle := x*x+y*y <= 1.0

		points[i] = Point{
			X:        x,
			Y:        y,
			InCircle: inCircle,
		}
	}

	return points
}
