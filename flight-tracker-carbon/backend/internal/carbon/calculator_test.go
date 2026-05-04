package carbon

import (
	"math"
	"testing"
)

const floatTolerance = 0.001

func TestNewCalculator(t *testing.T) {
	calc := NewCalculator()
	if calc == nil {
		t.Error("NewCalculator returned nil")
	}
}

func TestGetAircraftInfo(t *testing.T) {
	calc := NewCalculator()
	
	testCases := []struct {
		name     string
		acType   AircraftType
		expected bool
	}{
		{"B737 exists", AircraftB737, true},
		{"A320 exists", AircraftA320, true},
		{"B747 exists", AircraftB747, true},
		{"A380 exists", AircraftA380, true},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, ok := calc.GetAircraftInfo(tc.acType)
			if ok != tc.expected {
				t.Errorf("GetAircraftInfo(%s) ok = %v, want %v", tc.acType, ok, tc.expected)
			}
		})
	}
}

func TestCalculateDistance(t *testing.T) {
	calc := NewCalculator()
	
	testCases := []struct {
		name           string
		lat1, lon1     float64
		lat2, lon2     float64
		expectedMin    float64
		expectedMax    float64
	}{
		{
			"Same point",
			40.7128, -74.0060,
			40.7128, -74.0060,
			0, 1,
		},
		{
			"NYC to London",
			40.7128, -74.0060,
			51.5074, -0.1278,
			5500, 5600,
		},
		{
			"Beijing to Shanghai",
			39.9042, 116.4074,
			31.2304, 121.4737,
			1000, 1100,
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			distance := calc.CalculateDistance(tc.lat1, tc.lon1, tc.lat2, tc.lon2)
			if distance < tc.expectedMin || distance > tc.expectedMax {
				t.Errorf("CalculateDistance() = %.2f km, want between %.2f and %.2f", 
					distance, tc.expectedMin, tc.expectedMax)
			}
		})
	}
}

func TestCalculateDistanceSymmetry(t *testing.T) {
	calc := NewCalculator()
	
	lat1, lon1 := 40.7128, -74.0060
	lat2, lon2 := 51.5074, -0.1278
	
	d1 := calc.CalculateDistance(lat1, lon1, lat2, lon2)
	d2 := calc.CalculateDistance(lat2, lon2, lat1, lon1)
	
	if math.Abs(d1-d2) > floatTolerance {
		t.Errorf("Distance not symmetric: %.2f vs %.2f", d1, d2)
	}
}

func TestCalculateEmission(t *testing.T) {
	calc := NewCalculator()
	
	testCases := []struct {
		name               string
		lat1, lon1         float64
		lat2, lon2         float64
		aircraftType       AircraftType
		loadFactor         float64
		expectedMinCO2     float64
		expectedMaxCO2     float64
	}{
		{
			"NYC to London B747",
			40.7128, -74.0060,
			51.5074, -0.1278,
			AircraftB747,
			0.85,
			200000, 300000,
		},
		{
			"Beijing to Shanghai A320",
			39.9042, 116.4074,
			31.2304, 121.4737,
			AircraftA320,
			0.85,
			10000, 20000,
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := calc.CalculateEmission(
				tc.lat1, tc.lon1,
				tc.lat2, tc.lon2,
				tc.aircraftType,
				tc.loadFactor,
			)
			
			if err != nil {
				t.Errorf("CalculateEmission() error = %v", err)
				return
			}
			
			if result.TotalCO2Kg < tc.expectedMinCO2 || result.TotalCO2Kg > tc.expectedMaxCO2 {
				t.Errorf("CalculateEmission() TotalCO2Kg = %.2f, want between %.2f and %.2f",
					result.TotalCO2Kg, tc.expectedMinCO2, tc.expectedMaxCO2)
			}
			
			if result.DistanceKm <= 0 {
				t.Errorf("CalculateEmission() DistanceKm = %.2f, want > 0", result.DistanceKm)
			}
			
			if result.FuelUsedLiters <= 0 {
				t.Errorf("CalculateEmission() FuelUsedLiters = %.2f, want > 0", result.FuelUsedLiters)
			}
		})
	}
}

func TestCalculateEmissionInvalidLoadFactor(t *testing.T) {
	calc := NewCalculator()
	
	testCases := []struct {
		name       string
		loadFactor float64
	}{
		{"Zero load factor", 0},
		{"Negative load factor", -0.5},
		{"Over 100% load factor", 1.5},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := calc.CalculateEmission(
				40.7128, -74.0060,
				51.5074, -0.1278,
				AircraftB737,
				tc.loadFactor,
			)
			
			if err != nil {
				t.Errorf("CalculateEmission() error = %v, should handle invalid load factor", err)
				return
			}
			
			if result.TotalCO2Kg <= 0 {
				t.Errorf("CalculateEmission() should return valid CO2 for invalid load factor")
			}
		})
	}
}

func TestCalculateRealTimeEmission(t *testing.T) {
	calc := NewCalculator()
	
	testCases := []struct {
		name               string
		prevLat, prevLon   float64
		currLat, currLon   float64
		aircraftType       AircraftType
		timeDelta          float64
		expectedMin        float64
		expectedMax        float64
	}{
		{
			"Short flight segment",
			40.7, -74.0,
			40.8, -74.1,
			AircraftB737,
			0.01,
			0, 100,
		},
		{
			"Stationary (idle)",
			40.7128, -74.0060,
			40.7128, -74.0060,
			AircraftB737,
			1.0,
			1000, 3000,
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			co2, err := calc.CalculateRealTimeEmission(
				tc.prevLat, tc.prevLon,
				tc.currLat, tc.currLon,
				tc.aircraftType,
				tc.timeDelta,
			)
			
			if err != nil {
				t.Errorf("CalculateRealTimeEmission() error = %v", err)
				return
			}
			
			if co2 < tc.expectedMin || co2 > tc.expectedMax {
				t.Errorf("CalculateRealTimeEmission() = %.2f, want between %.2f and %.2f",
					co2, tc.expectedMin, tc.expectedMax)
			}
		})
	}
}

func TestAircraftDatabaseConsistency(t *testing.T) {
	for acType, info := range aircraftDatabase {
		if info.SeatCount <= 0 {
			t.Errorf("Aircraft %s has invalid seat count: %d", acType, info.SeatCount)
		}
		if info.FuelPerHour <= 0 {
			t.Errorf("Aircraft %s has invalid fuel per hour: %.2f", acType, info.FuelPerHour)
		}
		if info.CruiseSpeed <= 0 {
			t.Errorf("Aircraft %s has invalid cruise speed: %.2f", acType, info.CruiseSpeed)
		}
		if info.CO2PerFuelUnit <= 0 {
			t.Errorf("Aircraft %s has invalid CO2 per fuel unit: %.2f", acType, info.CO2PerFuelUnit)
		}
	}
}

func TestEmissionResultConsistency(t *testing.T) {
	calc := NewCalculator()
	
	result, err := calc.CalculateEmission(
		40.7128, -74.0060,
		51.5074, -0.1278,
		AircraftB747,
		0.85,
	)
	
	if err != nil {
		t.Fatalf("CalculateEmission() error = %v", err)
	}
	
	expectedCO2FromFuel := result.FuelUsedLiters * 3.16
	if math.Abs(result.TotalCO2Kg-expectedCO2FromFuel) > floatTolerance*100 {
		t.Errorf("TotalCO2Kg (%.2f) should roughly equal FuelUsedLiters * 3.16 (%.2f)",
			result.TotalCO2Kg, expectedCO2FromFuel)
	}
	
	if result.CO2PerPassengerKg <= 0 {
		t.Errorf("CO2PerPassengerKg should be positive, got %.2f", result.CO2PerPassengerKg)
	}
}
