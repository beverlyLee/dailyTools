package migrate

import (
	"database/sql"
	"fmt"
)

type DatabaseType string

const (
	SQLite     DatabaseType = "sqlite"
	PostgreSQL DatabaseType = "postgres"
	MySQL      DatabaseType = "mysql"
)

type DatabaseConfig struct {
	Type     DatabaseType
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func NewDatabase(config *DatabaseConfig) (*sql.DB, error) {
	var dsn string
	var driverName string

	switch config.Type {
	case SQLite:
		dsn = config.DBName
		driverName = "sqlite3"
	case PostgreSQL:
		dsn = fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode,
		)
		driverName = "postgres"
	case MySQL:
		dsn = fmt.Sprintf(
			"%s:%s@tcp(%s:%d)/%s",
			config.User, config.Password, config.Host, config.Port, config.DBName,
		)
		driverName = "mysql"
	default:
		return nil, fmt.Errorf("unsupported database type: %s", config.Type)
	}

	db, err := sql.Open(driverName, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %v", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %v", err)
	}

	return db, nil
}
