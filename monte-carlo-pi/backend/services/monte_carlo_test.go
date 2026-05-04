package services

import (
	"math"
	"testing"
)

func TestCalculatePiConcurrent(t *testing.T) {
	testCases := []struct {
		name       string
		sampleSize int64
		numWorkers int
	}{
		{"1000 points, 4 workers", 1000, 4},
		{"10000 points, 8 workers", 10000, 8},
		{"100000 points, auto workers", 100000, 0},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := CalculatePiConcurrent(tc.sampleSize, tc.numWorkers)

			if result.SampleSize != tc.sampleSize {
				t.Errorf("Expected sample size %d, got %d", tc.sampleSize, result.SampleSize)
			}

			if result.PointsInSquare != tc.sampleSize {
				t.Errorf("Expected points in square %d, got %d", tc.sampleSize, result.PointsInSquare)
			}

			if result.PointsInCircle < 0 || result.PointsInCircle > tc.sampleSize {
				t.Errorf("Points in circle out of range: %d (expected 0-%d)",
					result.PointsInCircle, tc.sampleSize)
			}

			pointsOutside := result.PointsInSquare - result.PointsInCircle
			if pointsOutside < 0 {
				t.Errorf("Points outside circle is negative: %d", pointsOutside)
			}

			if result.EstimatedPi <= 2.5 || result.EstimatedPi >= 3.8 {
				t.Errorf("Estimated Pi seems off: %f (expected around 3.14159)", result.EstimatedPi)
			}

			expectedPi := 4.0 * float64(result.PointsInCircle) / float64(result.PointsInSquare)
			if math.Abs(result.EstimatedPi-expectedPi) > 0.0000001 {
				t.Errorf("Estimated Pi mismatch: got %f, expected %f",
					result.EstimatedPi, expectedPi)
			}

			t.Logf("Sample: %d, InCircle: %d, Outside: %d, Estimated Pi: %.10f, Error: %.6f%%, Duration: %d ms",
				result.SampleSize, result.PointsInCircle, pointsOutside,
				result.EstimatedPi, result.ErrorPercentage, result.DurationMs)
		})
	}
}

func TestCalculatePiAccuracy(t *testing.T) {
	sampleSizes := []int64{10000, 100000, 1000000}

	for _, size := range sampleSizes {
		t.Run("Accuracy test", func(t *testing.T) {
			result := CalculatePiConcurrent(size, 0)

			expectedError := 100.0 / math.Sqrt(float64(size)) * 3

			if result.ErrorPercentage > expectedError {
				t.Logf("Warning: Error %.6f%% is higher than expected max %.6f%% for sample size %d",
					result.ErrorPercentage, expectedError, size)
			}

			t.Logf("Sample: %d, Estimated Pi: %.15f, Actual Pi: %.15f, Error: %.6f%%",
				size, result.EstimatedPi, result.ActualPi, result.ErrorPercentage)
		})
	}
}

func TestGenerateSamplePoints(t *testing.T) {
	counts := []int{10, 100, 1000}

	for _, count := range counts {
		t.Run("Generate points", func(t *testing.T) {
			points := GenerateSamplePoints(count)

			if len(points) != count {
				t.Errorf("Expected %d points, got %d", count, len(points))
			}

			for i, p := range points {
				if p.X < -1.0 || p.X > 1.0 {
					t.Errorf("Point %d X out of range: %f", i, p.X)
				}
				if p.Y < -1.0 || p.Y > 1.0 {
					t.Errorf("Point %d Y out of range: %f", i, p.Y)
				}

				expectedInCircle := (p.X*p.X + p.Y*p.Y) <= 1.0
				if p.InCircle != expectedInCircle {
					t.Errorf("Point %d in_circle mismatch: got %v, expected %v (x=%f, y=%f)",
						i, p.InCircle, expectedInCircle, p.X, p.Y)
				}
			}
		})
	}
}
