package flights

import (
	"fmt"
	"math"
	"math/rand"
	"sync"
	"time"

	"flight-tracker-carbon/internal/carbon"
	"flight-tracker-carbon/internal/database"
)

type SimulatedFlight struct {
	FlightNumber string
	AircraftType carbon.AircraftType
	Origin       string
	Destination  string
	
	CurrentLat  float64
	CurrentLon  float64
	TargetLat   float64
	TargetLon   float64
	Altitude    float64
	Speed       float64
	Heading     float64
	
	TotalCO2    float64
	LastUpdate  time.Time
	
	mu sync.RWMutex
}

type FlightSimulator struct {
	flights   map[string]*SimulatedFlight
	calc      *carbon.Calculator
	db        *database.Database
	randGen   *rand.Rand
	mu        sync.RWMutex
}

func NewFlightSimulator(calc *carbon.Calculator, db *database.Database) *FlightSimulator {
	return &FlightSimulator{
		flights: make(map[string]*SimulatedFlight),
		calc:    calc,
		db:      db,
		randGen: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (s *FlightSimulator) GenerateInitialFlights(count int) {
	airports := []struct {
		code string
		lat  float64
		lon  float64
	}{
		{"PEK", 40.0799, 116.6031},
		{"SHA", 31.1443, 121.8083},
		{"JFK", 40.6413, -73.7781},
		{"LHR", 51.4700, -0.4543},
		{"CDG", 49.0097, 2.5479},
		{"DXB", 25.2532, 55.3657},
		{"SYD", -33.9462, 151.1772},
		{"HND", 35.5494, 139.7798},
		{"SIN", 1.3644, 103.9915},
		{"FRA", 50.0379, 8.5622},
		{"LAX", 33.9425, -118.4081},
		{"ORD", 41.9742, -87.9073},
	}
	
	aircraftTypes := []carbon.AircraftType{
		carbon.AircraftB737, carbon.AircraftB747, carbon.AircraftB777,
		carbon.AircraftB787, carbon.AircraftA320, carbon.AircraftA330,
		carbon.AircraftA350, carbon.AircraftA380,
	}
	
	airlines := []string{"CA", "MU", "AA", "BA", "AF", "EK", "QF", "NH", "SQ", "LH", "UA", "DL"}
	
	s.mu.Lock()
	defer s.mu.Unlock()
	
	for i := 0; i < count; i++ {
		originIdx := s.randGen.Intn(len(airports))
		destIdx := s.randGen.Intn(len(airports))
		for destIdx == originIdx {
			destIdx = s.randGen.Intn(len(airports))
		}
		
		origin := airports[originIdx]
		dest := airports[destIdx]
		
		progress := s.randGen.Float64()
		currentLat := origin.lat + (dest.lat-origin.lat)*progress
		currentLon := origin.lon + (dest.lon-origin.lon)*progress
		
		airline := airlines[s.randGen.Intn(len(airlines))]
		flightNum := s.randGen.Intn(9999)
		
		acType := aircraftTypes[s.randGen.Intn(len(aircraftTypes))]
		
		flight := &SimulatedFlight{
			FlightNumber:  fmt.Sprintf("%s%04d", airline, flightNum),
			AircraftType:  acType,
			Origin:        origin.code,
			Destination:   dest.code,
			CurrentLat:    currentLat,
			CurrentLon:    currentLon,
			TargetLat:     dest.lat,
			TargetLon:     dest.lon,
			Altitude:      float64(30000 + s.randGen.Intn(10000)),
			Speed:         450.0,
			Heading:       s.randGen.Float64() * 360,
			TotalCO2:      0,
			LastUpdate:    time.Now(),
		}
		
		s.flights[flight.FlightNumber] = flight
	}
}

func (s *FlightSimulator) UpdateAllFlights() {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	now := time.Now()
	
	for _, flight := range s.flights {
		flight.mu.Lock()
		
		timeDelta := now.Sub(flight.LastUpdate).Hours()
		if timeDelta <= 0 {
			flight.mu.Unlock()
			continue
		}
		
		prevLat := flight.CurrentLat
		prevLon := flight.CurrentLon
		
		dLat := flight.TargetLat - flight.CurrentLat
		dLon := flight.TargetLon - flight.CurrentLon
		
		distance := math.Sqrt(dLat*dLat + dLon*dLon)
		
		if distance > 0.01 {
			speedDegPerHour := flight.Speed / 111.0
			
			latStep := (dLat / distance) * speedDegPerHour * timeDelta
			lonStep := (dLon / distance) * speedDegPerHour * timeDelta
			
			flight.CurrentLat += latStep
			flight.CurrentLon += lonStep
			
			flight.Heading = math.Atan2(dLon, dLat) * 180 / math.Pi
			if flight.Heading < 0 {
				flight.Heading += 360
			}
		} else {
			airports := []struct {
				code string
				lat  float64
				lon  float64
			}{
				{"PEK", 40.0799, 116.6031},
				{"SHA", 31.1443, 121.8083},
				{"JFK", 40.6413, -73.7781},
				{"LHR", 51.4700, -0.4543},
			}
			
			flight.Origin = flight.Destination
			newDest := airports[s.randGen.Intn(len(airports))]
			flight.Destination = newDest.code
			flight.TargetLat = newDest.lat
			flight.TargetLon = newDest.lon
			flight.TotalCO2 = 0
		}
		
		co2Delta, _ := s.calc.CalculateRealTimeEmission(
			prevLat, prevLon,
			flight.CurrentLat, flight.CurrentLon,
			flight.AircraftType,
			timeDelta,
		)
		flight.TotalCO2 += co2Delta
		
		flight.LastUpdate = now
		
		if s.db != nil {
			pos := &database.FlightPosition{
				FlightNumber: flight.FlightNumber,
				AircraftType: string(flight.AircraftType),
				Latitude:     flight.CurrentLat,
				Longitude:    flight.CurrentLon,
				Altitude:     flight.Altitude,
				Speed:        flight.Speed,
				Heading:      flight.Heading,
				Origin:       flight.Origin,
				Destination:  flight.Destination,
				CO2Estimate:  flight.TotalCO2,
				Timestamp:    now,
			}
			_ = s.db.InsertFlightPosition(pos)
		}
		
		flight.mu.Unlock()
	}
}

func (s *FlightSimulator) GetAllFlights() []*SimulatedFlight {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	flights := make([]*SimulatedFlight, 0, len(s.flights))
	for _, f := range s.flights {
		flights = append(flights, f)
	}
	return flights
}

func (s *FlightSimulator) GetFlightSnapshot(flight *SimulatedFlight) map[string]interface{} {
	flight.mu.RLock()
	defer flight.mu.RUnlock()
	
	return map[string]interface{}{
		"flight_number": flight.FlightNumber,
		"aircraft_type": string(flight.AircraftType),
		"origin":        flight.Origin,
		"destination":   flight.Destination,
		"latitude":      flight.CurrentLat,
		"longitude":     flight.CurrentLon,
		"altitude":      flight.Altitude,
		"speed":         flight.Speed,
		"heading":       flight.Heading,
		"co2_estimate":  flight.TotalCO2,
		"timestamp":     flight.LastUpdate.Unix(),
	}
}
