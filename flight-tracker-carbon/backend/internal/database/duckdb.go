package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/marcboeker/go-duckdb"
)

type FlightPosition struct {
	FlightNumber    string    `db:"flight_number"`
	AircraftType    string    `db:"aircraft_type"`
	Latitude        float64   `db:"latitude"`
	Longitude       float64   `db:"longitude"`
	Altitude        float64   `db:"altitude"`
	Speed           float64   `db:"speed"`
	Heading         float64   `db:"heading"`
	Origin          string    `db:"origin"`
	Destination     string    `db:"destination"`
	CO2Estimate     float64   `db:"co2_estimate"`
	Timestamp       time.Time `db:"timestamp"`
}

type Database struct {
	db *sql.DB
}

func NewDatabase(dbPath string) (*Database, error) {
	if dbPath == "" {
		dbPath = ":memory:"
	}
	
	connStr := fmt.Sprintf("%s?access_mode=READ_WRITE", dbPath)
	
	db, err := sql.Open("duckdb", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open DuckDB: %w", err)
	}
	
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping DuckDB: %w", err)
	}
	
	database := &Database{db: db}
	
	if err := database.createTables(); err != nil {
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}
	
	return database, nil
}

func (d *Database) Close() error {
	if d.db != nil {
		return d.db.Close()
	}
	return nil
}

func (d *Database) createTables() error {
	_, err := d.db.Exec(`
		CREATE TABLE IF NOT EXISTS flight_positions (
			flight_number VARCHAR NOT NULL,
			aircraft_type VARCHAR,
			latitude DOUBLE NOT NULL,
			longitude DOUBLE NOT NULL,
			altitude DOUBLE,
			speed DOUBLE,
			heading DOUBLE,
			origin VARCHAR,
			destination VARCHAR,
			co2_estimate DOUBLE DEFAULT 0,
			timestamp TIMESTAMP NOT NULL,
			PRIMARY KEY (flight_number, timestamp)
		);
		
		CREATE INDEX IF NOT EXISTS idx_flight_timestamp 
		ON flight_positions(timestamp);
		
		CREATE INDEX IF NOT EXISTS idx_flight_number 
		ON flight_positions(flight_number);
		
		CREATE TABLE IF NOT EXISTS carbon_summary (
			flight_number VARCHAR NOT NULL,
			date DATE NOT NULL,
			total_co2_kg DOUBLE DEFAULT 0,
			distance_km DOUBLE DEFAULT 0,
			flight_count INTEGER DEFAULT 0,
			PRIMARY KEY (flight_number, date)
		);
	`)
	return err
}

func (d *Database) InsertFlightPosition(pos *FlightPosition) error {
	if pos.Timestamp.IsZero() {
		pos.Timestamp = time.Now()
	}
	
	_, err := d.db.Exec(`
		INSERT INTO flight_positions 
		(flight_number, aircraft_type, latitude, longitude, altitude, speed, 
		 heading, origin, destination, co2_estimate, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, pos.FlightNumber, pos.AircraftType, pos.Latitude, pos.Longitude,
		pos.Altitude, pos.Speed, pos.Heading, pos.Origin, pos.Destination,
		pos.CO2Estimate, pos.Timestamp)
	
	return err
}

func (d *Database) GetLatestPositions() ([]*FlightPosition, error) {
	rows, err := d.db.Query(`
		SELECT DISTINCT ON (flight_number)
			flight_number, aircraft_type, latitude, longitude, altitude,
			speed, heading, origin, destination, co2_estimate, timestamp
		FROM flight_positions
		ORDER BY flight_number, timestamp DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var positions []*FlightPosition
	for rows.Next() {
		pos := &FlightPosition{}
		err := rows.Scan(
			&pos.FlightNumber, &pos.AircraftType, &pos.Latitude, &pos.Longitude,
			&pos.Altitude, &pos.Speed, &pos.Heading, &pos.Origin, &pos.Destination,
			&pos.CO2Estimate, &pos.Timestamp)
		if err != nil {
			return nil, err
		}
		positions = append(positions, pos)
	}
	
	return positions, rows.Err()
}

func (d *Database) GetFlightHistory(flightNumber string, since time.Time) ([]*FlightPosition, error) {
	rows, err := d.db.Query(`
		SELECT flight_number, aircraft_type, latitude, longitude, altitude,
			speed, heading, origin, destination, co2_estimate, timestamp
		FROM flight_positions
		WHERE flight_number = ? AND timestamp >= ?
		ORDER BY timestamp ASC
	`, flightNumber, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var positions []*FlightPosition
	for rows.Next() {
		pos := &FlightPosition{}
		err := rows.Scan(
			&pos.FlightNumber, &pos.AircraftType, &pos.Latitude, &pos.Longitude,
			&pos.Altitude, &pos.Speed, &pos.Heading, &pos.Origin, &pos.Destination,
			&pos.CO2Estimate, &pos.Timestamp)
		if err != nil {
			return nil, err
		}
		positions = append(positions, pos)
	}
	
	return positions, rows.Err()
}

func (d *Database) GetTotalCO2ByFlight(flightNumber string, since time.Time) (float64, error) {
	var totalCO2 float64
	
	err := d.db.QueryRow(`
		SELECT SUM(co2_estimate) 
		FROM flight_positions
		WHERE flight_number = ? AND timestamp >= ?
	`, flightNumber, since).Scan(&totalCO2)
	
	if err == sql.ErrNoRows {
		return 0, nil
	}
	
	return totalCO2, err
}

func (d *Database) GetCO2Stats(timeRange time.Duration) (map[string]float64, error) {
	since := time.Now().Add(-timeRange)
	
	rows, err := d.db.Query(`
		SELECT flight_number, SUM(co2_estimate) as total_co2
		FROM flight_positions
		WHERE timestamp >= ?
		GROUP BY flight_number
		ORDER BY total_co2 DESC
	`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	stats := make(map[string]float64)
	for rows.Next() {
		var flightNumber string
		var totalCO2 float64
		if err := rows.Scan(&flightNumber, &totalCO2); err != nil {
			return nil, err
		}
		stats[flightNumber] = totalCO2
	}
	
	return stats, rows.Err()
}

func (d *Database) GetAggregatedCO2ByDate(startDate, endDate time.Time) ([]struct {
	Date      time.Time
	TotalCO2  float64
	FlightCnt int
}, error) {
	rows, err := d.db.Query(`
		SELECT 
			DATE_TRUNC('day', timestamp) as flight_date,
			SUM(co2_estimate) as total_co2,
			COUNT(DISTINCT flight_number) as flight_count
		FROM flight_positions
		WHERE timestamp >= ? AND timestamp <= ?
		GROUP BY flight_date
		ORDER BY flight_date
	`, startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var results []struct {
		Date      time.Time
		TotalCO2  float64
		FlightCnt int
	}
	
	for rows.Next() {
		var r struct {
			Date      time.Time
			TotalCO2  float64
			FlightCnt int
		}
		if err := rows.Scan(&r.Date, &r.TotalCO2, &r.FlightCnt); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	
	return results, rows.Err()
}

func (d *Database) CleanOldData(retentionDays int) error {
	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	
	_, err := d.db.Exec(`
		DELETE FROM flight_positions 
		WHERE timestamp < ?
	`, cutoff)
	
	return err
}
