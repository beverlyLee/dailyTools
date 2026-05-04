package carbon

import (
	"math"
)

type AircraftType string

const (
	AircraftB737 AircraftType = "B737"
	AircraftB747 AircraftType = "B747"
	AircraftB777 AircraftType = "B777"
	AircraftB787 AircraftType = "B787"
	AircraftA320 AircraftType = "A320"
	AircraftA330 AircraftType = "A330"
	AircraftA350 AircraftType = "A350"
	AircraftA380 AircraftType = "A380"
)

type AircraftInfo struct {
	Type            AircraftType
	SeatCount       int
	FuelPerHour     float64
	CO2PerFuelUnit  float64
	CruiseSpeed     float64
}

var aircraftDatabase = map[AircraftType]AircraftInfo{
	AircraftB737: {
		Type:           AircraftB737,
		SeatCount:      160,
		FuelPerHour:    2600,
		CO2PerFuelUnit: 3.16,
		CruiseSpeed:    450,
	},
	AircraftB747: {
		Type:           AircraftB747,
		SeatCount:      416,
		FuelPerHour:    12000,
		CO2PerFuelUnit: 3.16,
		CruiseSpeed:    480,
	},
	AircraftB777: {
		Type:           AircraftB777,
		SeatCount:      350,
		FuelPerHour:    7000,
		CO2PerFuelUnit: 3.16,
		CruiseSpeed:    490,
	},
	AircraftB787: {
		Type:           AircraftB787,
		SeatCount:      280,
		FuelPerHour:    5400,
		CO2PerFuelUnit: 3.16,
		CruiseSpeed:    490,
	},
	AircraftA320: {
		Type:           AircraftA320,
		SeatCount:      150,
		FuelPerHour:    2500,
		CO2PerFuelUnit: 3.16,
		CruiseSpeed:    447,
	},
	AircraftA330: {
		Type:           AircraftA330,
		SeatCount:      277,
		FuelPerHour:    5800,
		CO2PerFuelUnit: 3.16,
		CruiseSpeed:    470,
	},
	AircraftA350: {
		Type:           AircraftA350,
		SeatCount:      325,
		FuelPerHour:    5200,
		CO2PerFuelUnit: 3.16,
		CruiseSpeed:    485,
	},
	AircraftA380: {
		Type:           AircraftA380,
		SeatCount:      525,
		FuelPerHour:    14000,
		CO2PerFuelUnit: 3.16,
		CruiseSpeed:    490,
	},
}

type EmissionResult struct {
	TotalCO2Kg           float64
	CO2PerPassengerKg    float64
	DistanceKm           float64
	FuelUsedLiters       float64
}

const (
	KnotsToKmPerHour = 1.852
	EarthRadiusKm    = 6371.0
)

type Calculator struct {
	radiusFactor float64
}

func NewCalculator() *Calculator {
	return &Calculator{
		radiusFactor: EarthRadiusKm,
	}
}

func (c *Calculator) GetAircraftInfo(aircraftType AircraftType) (AircraftInfo, bool) {
	info, ok := aircraftDatabase[aircraftType]
	return info, ok
}

func (c *Calculator) CalculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0
	
	lat1 = lat1 * math.Pi / 180.0
	lat2 = lat2 * math.Pi / 180.0
	
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Sin(dLon/2)*math.Sin(dLon/2)*math.Cos(lat1)*math.Cos(lat2)
	calc := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	
	return c.radiusFactor * calc
}

func (c *Calculator) CalculateEmission(
	lat1, lon1, lat2, lon2 float64,
	aircraftType AircraftType,
	passengerLoadFactor float64,
) (*EmissionResult, error) {
	if passengerLoadFactor <= 0 || passengerLoadFactor > 1.0 {
		passengerLoadFactor = 0.85
	}
	
	aircraft, ok := c.GetAircraftInfo(aircraftType)
	if !ok {
		aircraft = aircraftDatabase[AircraftA320]
	}
	
	distance := c.CalculateDistance(lat1, lon1, lat2, lon2)
	
	takeoffLandingFuel := 600.0
	
	cruiseSpeedKmPerHour := aircraft.CruiseSpeed * KnotsToKmPerHour
	cruiseHours := distance / cruiseSpeedKmPerHour
	
	cruiseFuel := cruiseHours * aircraft.FuelPerHour
	
	totalFuel := takeoffLandingFuel + cruiseFuel
	
	totalCO2 := totalFuel * aircraft.CO2PerFuelUnit
	
	actualPassengers := float64(aircraft.SeatCount) * passengerLoadFactor
	co2PerPassenger := totalCO2 / actualPassengers
	
	return &EmissionResult{
		TotalCO2Kg:           totalCO2,
		CO2PerPassengerKg:    co2PerPassenger,
		DistanceKm:           distance,
		FuelUsedLiters:       totalFuel,
	}, nil
}

func (c *Calculator) CalculateRealTimeEmission(
	previousLat, previousLon float64,
	currentLat, currentLon float64,
	aircraftType AircraftType,
	timeDeltaHours float64,
) (float64, error) {
	aircraft, ok := c.GetAircraftInfo(aircraftType)
	if !ok {
		aircraft = aircraftDatabase[AircraftA320]
	}
	
	distance := c.CalculateDistance(previousLat, previousLon, currentLat, currentLon)
	
	if distance == 0 {
		fuelConsumption := aircraft.FuelPerHour * timeDeltaHours * 0.3
		return fuelConsumption * aircraft.CO2PerFuelUnit, nil
	}
	
	speed := distance / timeDeltaHours
	
	cruiseSpeedKmPerHour := aircraft.CruiseSpeed * KnotsToKmPerHour
	relativeSpeed := speed / cruiseSpeedKmPerHour
	
	var fuelRatio float64
	if relativeSpeed < 0.3 {
		fuelRatio = 0.6
	} else if relativeSpeed < 0.7 {
		fuelRatio = 0.8
	} else {
		fuelRatio = 1.0
	}
	
	fuelConsumption := aircraft.FuelPerHour * timeDeltaHours * fuelRatio
	
	co2Emission := fuelConsumption * aircraft.CO2PerFuelUnit
	
	return co2Emission, nil
}
