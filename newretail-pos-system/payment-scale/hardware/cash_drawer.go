package hardware

import (
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/tarm/serial"
)

type CashDrawerType string

const (
	CashDrawerTypePrinter CashDrawerType = "printer"
	CashDrawerTypeSerial  CashDrawerType = "serial"
)

type CashDrawerConfig struct {
	Type     CashDrawerType
	Port     string
	BaudRate int
}

type CashDrawer struct {
	config   CashDrawerConfig
	port     io.ReadWriteCloser
	isActive bool
	isOpen   bool
}

func NewCashDrawer(config CashDrawerConfig) *CashDrawer {
	return &CashDrawer{
		config:   config,
		isActive: false,
		isOpen:   false,
	}
}

func (cd *CashDrawer) Connect() error {
	if cd.isActive {
		return nil
	}

	if cd.config.Type == CashDrawerTypeSerial {
		c := &serial.Config{
			Name:        cd.config.Port,
			Baud:        cd.config.BaudRate,
			ReadTimeout: time.Second * 1,
			Size:        8,
			StopBits:    1,
			Parity:      serial.ParityNone,
		}

		port, err := serial.OpenPort(c)
		if err != nil {
			return fmt.Errorf("failed to open cash drawer port: %w", err)
		}

		cd.port = port
	}

	cd.isActive = true
	return nil
}

func (cd *CashDrawer) Disconnect() error {
	if !cd.isActive {
		return nil
	}

	if cd.port != nil {
		err := cd.port.Close()
		if err != nil {
			return fmt.Errorf("failed to close cash drawer port: %w", err)
		}
	}

	cd.isActive = false
	return nil
}

func (cd *CashDrawer) Open() error {
	if !cd.isActive {
		return errors.New("cash drawer not connected")
	}

	switch cd.config.Type {
	case CashDrawerTypeSerial:
		return cd.openSerial()
	case CashDrawerTypePrinter:
		return cd.openPrinter()
	default:
		return errors.New("unknown cash drawer type")
	}
}

func (cd *CashDrawer) openSerial() error {
	if cd.port == nil {
		return errors.New("serial port not initialized")
	}

	pulse := []byte{0x1B, 0x70, 0x00, 0x19, 0xFA}

	_, err := cd.port.Write(pulse)
	if err != nil {
		return fmt.Errorf("failed to send open signal to cash drawer: %w", err)
	}

	cd.isOpen = true
	return nil
}

func (cd *CashDrawer) openPrinter() error {
	cd.isOpen = true
	return nil
}

func (cd *CashDrawer) IsConnected() bool {
	return cd.isActive
}

func (cd *CashDrawer) IsOpen() bool {
	return cd.isOpen
}

func (cd *CashDrawer) Pulse() error {
	if !cd.isActive {
		return errors.New("cash drawer not connected")
	}

	if cd.config.Type == CashDrawerTypeSerial && cd.port == nil {
		return errors.New("serial port not initialized")
	}

	return cd.Open()
}

func (cd *CashDrawer) OpenWithDuration(duration time.Duration) error {
	if err := cd.Open(); err != nil {
		return err
	}

	time.AfterFunc(duration, func() {
		cd.isOpen = false
	})

	return nil
}
