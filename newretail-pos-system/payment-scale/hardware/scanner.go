package hardware

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/tarm/serial"
)

type ScannerConfig struct {
	Port     string
	BaudRate int
}

type Scanner struct {
	config   ScannerConfig
	port     io.ReadWriteCloser
	scanner  *bufio.Scanner
	isActive bool
}

type ScannerData struct {
	Barcode  string
	BarcodeType string
	RawData  string
}

func NewScanner(config ScannerConfig) *Scanner {
	return &Scanner{
		config:   config,
		isActive: false,
	}
}

func (s *Scanner) Connect() error {
	if s.isActive {
		return nil
	}

	c := &serial.Config{
		Name:        s.config.Port,
		Baud:        s.config.BaudRate,
		ReadTimeout: time.Second * 5,
		Size:        8,
		StopBits:    1,
		Parity:      serial.ParityNone,
	}

	port, err := serial.OpenPort(c)
	if err != nil {
		return fmt.Errorf("failed to open scanner port: %w", err)
	}

	s.port = port
	s.scanner = bufio.NewScanner(port)
	s.isActive = true

	return nil
}

func (s *Scanner) Disconnect() error {
	if !s.isActive {
		return nil
	}

	if s.port != nil {
		err := s.port.Close()
		if err != nil {
			return fmt.Errorf("failed to close scanner port: %w", err)
		}
	}

	s.isActive = false
	return nil
}

func (s *Scanner) Read() (*ScannerData, error) {
	if !s.isActive {
		return nil, errors.New("scanner not connected")
	}

	if s.scanner.Scan() {
		line := s.scanner.Text()
		line = strings.TrimSpace(line)

		if line == "" {
			return nil, errors.New("empty barcode data")
		}

		barcodeType := detectBarcodeType(line)

		return &ScannerData{
			Barcode:     line,
			BarcodeType: barcodeType,
			RawData:     line,
		}, nil
	}

	if err := s.scanner.Err(); err != nil {
		return nil, fmt.Errorf("scanner read error: %w", err)
	}

	return nil, errors.New("no data from scanner")
}

func (s *Scanner) ReadWithTimeout(timeout time.Duration) (*ScannerData, error) {
	if !s.isActive {
		return nil, errors.New("scanner not connected")
	}

	type result struct {
		data *ScannerData
		err  error
	}

	resultChan := make(chan result, 1)

	go func() {
		data, err := s.Read()
		resultChan <- result{data, err}
	}()

	select {
	case r := <-resultChan:
		return r.data, r.err
	case <-time.After(timeout):
		return nil, errors.New("scanner read timeout")
	}
}

func (s *Scanner) IsConnected() bool {
	return s.isActive
}

func detectBarcodeType(barcode string) string {
	length := len(barcode)

	if length == 13 && isNumeric(barcode) {
		if isValidEAN13(barcode) {
			return "EAN-13"
		}
	}

	if length == 8 && isNumeric(barcode) {
		if isValidEAN8(barcode) {
			return "EAN-8"
		}
	}

	if length == 12 && isNumeric(barcode) {
		if isValidUPCA(barcode) {
			return "UPC-A"
		}
	}

	if strings.HasPrefix(barcode, "CODE128:") {
		return "CODE-128"
	}

	if strings.HasPrefix(barcode, "QR:") {
		return "QR-CODE"
	}

	return "UNKNOWN"
}

func isNumeric(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func isValidEAN13(barcode string) bool {
	if len(barcode) != 13 {
		return false
	}

	sum := 0
	for i := 0; i < 12; i++ {
		digit := int(barcode[i] - '0')
		if i%2 == 0 {
			sum += digit
		} else {
			sum += digit * 3
		}
	}

	checkDigit := (10 - (sum % 10)) % 10
	return checkDigit == int(barcode[12]-'0')
}

func isValidEAN8(barcode string) bool {
	if len(barcode) != 8 {
		return false
	}

	sum := 0
	for i := 0; i < 7; i++ {
		digit := int(barcode[i] - '0')
		if i%2 == 0 {
			sum += digit * 3
		} else {
			sum += digit
		}
	}

	checkDigit := (10 - (sum % 10)) % 10
	return checkDigit == int(barcode[7]-'0')
}

func isValidUPCA(barcode string) bool {
	if len(barcode) != 12 {
		return false
	}

	sum := 0
	for i := 0; i < 11; i++ {
		digit := int(barcode[i] - '0')
		if i%2 == 0 {
			sum += digit * 3
		} else {
			sum += digit
		}
	}

	checkDigit := (10 - (sum % 10)) % 10
	return checkDigit == int(barcode[11]-'0')
}
