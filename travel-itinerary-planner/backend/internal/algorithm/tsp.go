package algorithm

import (
	"fmt"
	"math"
	"time"
)

type Location struct {
	ID        string
	Latitude  float64
	Longitude float64
}

type TimeWindow struct {
	Start time.Time
	End   time.Time
}

type VisitPoint struct {
	Location
	TimeWindow
	Duration int
	Cost     float64
}

type TSPResult struct {
	Path        []int
	TotalDistance float64
	VisitTimes  []time.Time
	Valid       bool
}

func HaversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	lat1Rad := lat1 * math.Pi / 180
	lon1Rad := lon1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	lon2Rad := lon2 * math.Pi / 180

	dLat := lat2Rad - lat1Rad
	dLon := lon2Rad - lon1Rad

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

func CalculateTravelTime(distanceKm float64, speedKmh float64) time.Duration {
	if speedKmh <= 0 {
		speedKmh = 50.0
	}
	hours := distanceKm / speedKmh
	return time.Duration(hours * float64(time.Hour))
}

func BuildDistanceMatrix(points []VisitPoint) [][]float64 {
	n := len(points)
	matrix := make([][]float64, n)
	for i := range matrix {
		matrix[i] = make([]float64, n)
		for j := range matrix[i] {
			if i == j {
				matrix[i][j] = 0
			} else {
				matrix[i][j] = HaversineDistance(
					points[i].Latitude, points[i].Longitude,
					points[j].Latitude, points[j].Longitude,
				)
			}
		}
	}
	return matrix
}

func SolveTSPWithTimeWindows(points []VisitPoint, speedKmh float64) (*TSPResult, error) {
	if len(points) == 0 {
		return nil, fmt.Errorf("no points to visit")
	}
	if len(points) == 1 {
		return &TSPResult{
			Path:        []int{0},
			TotalDistance: 0,
			VisitTimes:  []time.Time{points[0].TimeWindow.Start},
			Valid:       true,
		}, nil
	}

	distanceMatrix := BuildDistanceMatrix(points)
	n := len(points)

	bestPath := make([]int, n)
	for i := range bestPath {
		bestPath[i] = i
	}
	bestDistance := math.Inf(1)
	bestTimes := make([]time.Time, n)
	foundValid := false

	path := make([]int, n)
	used := make([]bool, n)
	visitTimes := make([]time.Time, n)

	var backtrack func(pos int, currentDistance float64)
	backtrack = func(pos int, currentDistance float64) {
		if pos == n {
			if currentDistance < bestDistance {
				if isValidPath(points, path, distanceMatrix, speedKmh, visitTimes) {
					foundValid = true
					bestDistance = currentDistance
					copy(bestPath, path)
					copy(bestTimes, visitTimes)
				}
			}
			return
		}

		for i := 0; i < n; i++ {
			if !used[i] {
				path[pos] = i
				used[i] = true

				var newDistance float64
				if pos > 0 {
					newDistance = currentDistance + distanceMatrix[path[pos-1]][i]
				} else {
					newDistance = currentDistance
				}

				if newDistance < bestDistance {
					backtrack(pos+1, newDistance)
				}

				used[i] = false
			}
		}
	}

	backtrack(0, 0)

	if !foundValid {
		return nearestNeighborTSP(points, distanceMatrix, speedKmh)
	}

	return &TSPResult{
		Path:        bestPath,
		TotalDistance: bestDistance,
		VisitTimes:  bestTimes,
		Valid:       true,
	}, nil
}

func isValidPath(points []VisitPoint, path []int, distanceMatrix [][]float64, speedKmh float64, visitTimes []time.Time) bool {
	if len(path) == 0 {
		return false
	}

	currentTime := points[path[0]].TimeWindow.Start
	if currentTime.After(points[path[0]].TimeWindow.End) {
		return false
	}
	visitTimes[0] = currentTime

	currentTime = currentTime.Add(time.Duration(points[path[0]].Duration) * time.Minute)

	for i := 1; i < len(path); i++ {
		prev := path[i-1]
		curr := path[i]

		distance := distanceMatrix[prev][curr]
		travelTime := CalculateTravelTime(distance, speedKmh)
		arrivalTime := currentTime.Add(travelTime)

		if arrivalTime.After(points[curr].TimeWindow.End) {
			return false
		}

		if arrivalTime.Before(points[curr].TimeWindow.Start) {
			arrivalTime = points[curr].TimeWindow.Start
		}

		visitTimes[i] = arrivalTime
		currentTime = arrivalTime.Add(time.Duration(points[curr].Duration) * time.Minute)
	}

	return true
}

func nearestNeighborTSP(points []VisitPoint, distanceMatrix [][]float64, speedKmh float64) (*TSPResult, error) {
	n := len(points)
	if n == 0 {
		return nil, fmt.Errorf("no points")
	}

	path := make([]int, 0, n)
	used := make([]bool, n)
	visitTimes := make([]time.Time, 0, n)
	totalDistance := 0.0

	current := 0
	path = append(path, current)
	used[current] = true
	currentTime := points[current].TimeWindow.Start
	visitTimes = append(visitTimes, currentTime)
	currentTime = currentTime.Add(time.Duration(points[current].Duration) * time.Minute)

	for len(path) < n {
		bestNext := -1
		bestDistance := math.Inf(1)

		for i := 0; i < n; i++ {
			if !used[i] {
				distance := distanceMatrix[current][i]
				travelTime := CalculateTravelTime(distance, speedKmh)
				arrivalTime := currentTime.Add(travelTime)

				if arrivalTime.Before(points[i].TimeWindow.End) && distance < bestDistance {
					bestDistance = distance
					bestNext = i
				}
			}
		}

		if bestNext == -1 {
			for i := 0; i < n; i++ {
				if !used[i] {
					bestNext = i
					bestDistance = distanceMatrix[current][i]
					break
				}
			}
		}

		if bestNext == -1 {
			break
		}

		path = append(path, bestNext)
		used[bestNext] = true
		totalDistance += bestDistance

		travelTime := CalculateTravelTime(bestDistance, speedKmh)
		arrivalTime := currentTime.Add(travelTime)

		if arrivalTime.Before(points[bestNext].TimeWindow.Start) {
			arrivalTime = points[bestNext].TimeWindow.Start
		}

		visitTimes = append(visitTimes, arrivalTime)
		currentTime = arrivalTime.Add(time.Duration(points[bestNext].Duration) * time.Minute)
		current = bestNext
	}

	return &TSPResult{
		Path:        path,
		TotalDistance: totalDistance,
		VisitTimes:  visitTimes,
		Valid:       len(path) == n,
	}, nil
}

func OptimizePath(points []VisitPoint, speedKmh float64) (*TSPResult, error) {
	if speedKmh <= 0 {
		speedKmh = 50.0
	}

	if len(points) <= 10 {
		return SolveTSPWithTimeWindows(points, speedKmh)
	}

	return nearestNeighborTSP(points, BuildDistanceMatrix(points), speedKmh)
}
