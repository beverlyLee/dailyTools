package hardware

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/tarm/serial"
)

type ScaleType string

const (
	ScaleTypeDahua  ScaleType = "dahua"
	ScaleTypeToledo ScaleType = "toledo"
	ScaleTypeDigi   ScaleType = "digi"
)

type ScaleConfig struct {
	Port     string
	BaudRate int
	ScaleType ScaleType
}

type Scale struct {
	config   ScaleConfig
	port     io.ReadWriteCloser
	scanner  *bufio.Scanner
	isActive bool
}

type ScaleData struct {
	Weight  float64
	Unit    string
	IsStable bool
	RawData  string
}

func NewScale(config ScaleConfig) *Scale {
	return &Scale{
		config:   config,
		isActive: false,
	}
}

func (s *Scale) Connect() error {
	if s.isActive {
		return nil
	}

	c := &serial.Config{
		Name:        s.config.Port,
		Baud:        s.config.BaudRate,
		ReadTimeout: time.Second * 2,
		Size:        8,
		StopBits:    1,
		Parity:      serial.ParityNone,
	}

	port, err := serial.OpenPort(c)
	if err != nil {
		return fmt.Errorf("failed to open scale port: %w", err)
	}

	s.port = port
	s.scanner = bufio.NewScanner(port)
	s.isActive = true

	return nil
}

func (s *Scale) Disconnect() error {
	if !s.isActive {
		return nil
	}

	if s.port != nil {
		err := s.port.Close()
		if err != nil {
			return fmt.Errorf("failed to close scale port: %w", err)
		}
	}

	s.isActive = false
	return nil
}

func (s *Scale) Read() (*ScaleData, error) {
	if !s.isActive {
		return nil, errors.New("scale not connected")
	}

	switch s.config.ScaleType {
	case ScaleTypeDahua:
		return s.readDahua()
	case ScaleTypeToledo:
		return s.readToledo()
	case ScaleTypeDigi:
		return s.readDigi()
	default:
		return s.readDahua()
	}
}

func (s *Scale) readDahua() (*ScaleData, error) {
	if s.scanner.Scan() {
		line := s.scanner.Text()
		line = strings.TrimSpace(line)

		if len(line) < 8 {
			return nil, errors.New("invalid scale data format")
		}

		isStable := true
		if strings.Contains(line, "?") || strings.Contains(line, "!") {
			isStable = false
		}

		weightStr := extractNumber(line)
		if weightStr == "" {
			return nil, errors.New("failed to extract weight")
		}

		weight, err := strconv.ParseFloat(weightStr, 64)
		if err != nil {
			return nil, fmt.Errorf("failed to parse weight: %w", err)
		}

		return &ScaleData{
			Weight:   weight,
			Unit:     "kg",
			IsStable: isStable,
			RawData:  line,
		}, nil
	}

	if err := s.scanner.Err(); err != nil {
		return nil, fmt.Errorf("scale read error: %w", err)
	}

	return nil, errors.New("no data from scale")
}

func (s *Scale) readToledo() (*ScaleData, error) {
	if s.scanner.Scan() {
		line := s.scanner.Text()
		line = strings.TrimSpace(line)

		if len(line) < 10 {
			return nil, errors.New("invalid scale data format")
		}

		isStable := !strings.Contains(line, "U") && !strings.Contains(line, "M")

		weightStr := extractNumber(line)
		if weightStr == "" {
			return nil, errors.New("failed to extract weight")
		}

		weight, err := strconv.ParseFloat(weightStr, 64)
		if err != nil {
			return nil, fmt.Errorf("failed to parse weight: %w", err)
		}

		return &ScaleData{
			Weight:   weight,
			Unit:     "kg",
			IsStable: isStable,
			RawData:  line,
		}, nil
	}

	if err := s.scanner.Err(); err != nil {
		return nil, fmt.Errorf("scale read error: %w", err)
	}

	return nil, errors.New("no data from scale")
}

func (s *Scale) readDigi() (*ScaleData, error) {
	if s.scanner.Scan() {
		line := s.scanner.Text()
		line = strings.TrimSpace(line)

		if len(line) < 12 {
			return nil, errors.New("invalid scale data format")
		}

		isStable := strings.Contains(line, "ST") || strings.Contains(line, "S")

		weightStr := extractNumber(line)
		if weightStr == "" {
			return nil, errors.New("failed to extract weight")
		}

		weight, err := strconv.ParseFloat(weightStr, 64)
		if err != nil {
			return nil, fmt.Errorf("failed to parse weight: %w", err)
		}

		return &ScaleData{
			Weight:   weight,
			Unit:     "kg",
			IsStable: isStable,
			RawData:  line,
		}, nil
	}

	if err := s.scanner.Err(); err != nil {
		return nil, fmt.Errorf("scale read error: %w", err)
	}

	return nil, errors.New("no data from scale")
}

func (s *Scale) IsConnected() bool {
	return s.isActive
}

func (s *Scale) ReadStable(timeout time.Duration) (*ScaleData, error) {
	startTime := time.Now()

	for time.Since(startTime) < timeout {
		data, err := s.Read()
		if err != nil {
			time.Sleep(100 * time.Millisecond)
			continue
		}

		if data.IsStable {
			return data, nil
		}

		time.Sleep(100 * time.Millisecond)
	}

	return nil, errors.New("timeout waiting for stable weight")
}

func extractNumber(s string) string {
	var result strings.Builder
	hasDecimal := false

	for _, char := range s {
		if (char >= '0' && char <= '9') || char == '.' {
			if char == '.' {
				if hasDecimal {
					continue
				}
				hasDecimal = true
			}
			result.WriteRune(char)
		}
	}

	return result.String()
}
