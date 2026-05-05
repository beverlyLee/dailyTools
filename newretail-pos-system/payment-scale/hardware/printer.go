package hardware

import (
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/tarm/serial"
)

type PrinterType string

const (
	PrinterTypeSerial PrinterType = "serial"
	PrinterTypeUSB    PrinterType = "usb"
	PrinterTypeNetwork PrinterType = "network"
)

type PaperWidth int

const (
	PaperWidth58 PaperWidth = 58
	PaperWidth80 PaperWidth = 80
)

type PrinterConfig struct {
	Type       PrinterType
	Port       string
	BaudRate   int
	PaperWidth PaperWidth
}

type Printer struct {
	config   PrinterConfig
	port     io.ReadWriteCloser
	isActive bool
}

type ReceiptItem struct {
	Barcode   string
	Name      string
	Quantity  float64
	Price     float64
	Total     float64
	IsWeighted bool
}

type ReceiptData struct {
	OrderNo       string
	Date          string
	Time          string
	Cashier       string
	Items         []ReceiptItem
	TotalAmount   float64
	Discount      float64
	PayableAmount float64
	PaidAmount    float64
	Change        float64
	PaymentMethod string
	MemberNo      string
	MemberName    string
	StoreName     string
	StoreAddress  string
	StorePhone    string
	HeaderMessage string
	FooterMessage string
}

func NewPrinter(config PrinterConfig) *Printer {
	return &Printer{
		config:   config,
		isActive: false,
	}
}

func (p *Printer) Connect() error {
	if p.isActive {
		return nil
	}

	if p.config.Type == PrinterTypeSerial {
		c := &serial.Config{
			Name:        p.config.Port,
			Baud:        p.config.BaudRate,
			ReadTimeout: time.Second * 2,
			Size:        8,
			StopBits:    1,
			Parity:      serial.ParityNone,
		}

		port, err := serial.OpenPort(c)
		if err != nil {
			return fmt.Errorf("failed to open printer port: %w", err)
		}

		p.port = port
	}

	p.isActive = true
	return nil
}

func (p *Printer) Disconnect() error {
	if !p.isActive {
		return nil
	}

	if p.port != nil {
		err := p.port.Close()
		if err != nil {
			return fmt.Errorf("failed to close printer port: %w", err)
		}
	}

	p.isActive = false
	return nil
}

func (p *Printer) IsConnected() bool {
	return p.isActive
}

func (p *Printer) PrintText(text string) error {
	if !p.isActive {
		return errors.New("printer not connected")
	}

	if p.config.Type == PrinterTypeSerial && p.port == nil {
		return errors.New("serial port not initialized")
	}

	_, err := p.port.Write([]byte(text))
	if err != nil {
		return fmt.Errorf("failed to print text: %w", err)
	}

	return nil
}

func (p *Printer) PrintLine(text string) error {
	return p.PrintText(text + "\n")
}

func (p *Printer) CutPaper() error {
	if !p.isActive {
		return errors.New("printer not connected")
	}

	cutCmd := []byte{0x1D, 0x56, 0x01}
	_, err := p.port.Write(cutCmd)
	if err != nil {
		return fmt.Errorf("failed to cut paper: %w", err)
	}

	return nil
}

func (p *Printer) OpenCashDrawer() error {
	if !p.isActive {
		return errors.New("printer not connected")
	}

	drawerCmd := []byte{0x1B, 0x70, 0x00, 0x19, 0xFA}
	_, err := p.port.Write(drawerCmd)
	if err != nil {
		return fmt.Errorf("failed to open cash drawer: %w", err)
	}

	return nil
}

func (p *Printer) SetBold(enabled bool) error {
	if !p.isActive {
		return errors.New("printer not connected")
	}

	var cmd []byte
	if enabled {
		cmd = []byte{0x1B, 0x45, 0x01}
	} else {
		cmd = []byte{0x1B, 0x45, 0x00}
	}

	_, err := p.port.Write(cmd)
	return err
}

func (p *Printer) SetDoubleWidth(enabled bool) error {
	if !p.isActive {
		return errors.New("printer not connected")
	}

	var cmd []byte
	if enabled {
		cmd = []byte{0x1D, 0x21, 0x10}
	} else {
		cmd = []byte{0x1D, 0x21, 0x00}
	}

	_, err := p.port.Write(cmd)
	return err
}

func (p *Printer) SetAlignment(alignment string) error {
	if !p.isActive {
		return errors.New("printer not connected")
	}

	var cmd []byte
	switch alignment {
	case "left":
		cmd = []byte{0x1B, 0x61, 0x00}
	case "center":
		cmd = []byte{0x1B, 0x61, 0x01}
	case "right":
		cmd = []byte{0x1B, 0x61, 0x02}
	default:
		cmd = []byte{0x1B, 0x61, 0x00}
	}

	_, err := p.port.Write(cmd)
	return err
}

func (p *Printer) PrintReceipt(data ReceiptData) error {
	if !p.isActive {
		return errors.New("printer not connected")
	}

	p.SetAlignment("center")
	p.SetDoubleWidth(true)
	p.SetBold(true)
	p.PrintLine(data.StoreName)
	p.SetDoubleWidth(false)
	p.SetBold(false)
	p.PrintLine("================================================")
	p.PrintLine(data.StoreAddress)
	p.PrintLine("电话: " + data.StorePhone)
	p.PrintLine("================================================")
	p.PrintLine("")

	if data.HeaderMessage != "" {
		p.PrintLine(data.HeaderMessage)
		p.PrintLine("")
	}

	p.SetAlignment("left")
	p.PrintLine("单号: " + data.OrderNo)
	p.PrintLine("日期: " + data.Date)
	p.PrintLine("时间: " + data.Time)
	p.PrintLine("收银员: " + data.Cashier)

	if data.MemberNo != "" {
		p.PrintLine("会员号: " + data.MemberNo)
		p.PrintLine("会员名: " + data.MemberName)
	}

	p.PrintLine("================================================")

	maxWidth := 40
	if p.config.PaperWidth == PaperWidth80 {
		maxWidth = 48
	}

	for _, item := range data.Items {
		nameLen := len(item.Name)
		qtyStr := fmt.Sprintf("%.2f", item.Quantity)
		priceStr := fmt.Sprintf("%.2f", item.Price)
		totalStr := fmt.Sprintf("%.2f", item.Total)

		line := item.Name
		remaining := maxWidth - nameLen - len(qtyStr) - len(priceStr) - len(totalStr) - 3
		if remaining > 0 {
			for i := 0; i < remaining; i++ {
				line += " "
			}
		}
		line += qtyStr + " " + priceStr + " " + totalStr
		p.PrintLine(line)
	}

	p.PrintLine("================================================")
	p.SetAlignment("right")
	p.PrintLine(fmt.Sprintf("商品总额: ¥%.2f", data.TotalAmount))
	if data.Discount > 0 {
		p.PrintLine(fmt.Sprintf("优惠: -¥%.2f", data.Discount))
	}
	p.SetBold(true)
	p.PrintLine(fmt.Sprintf("应付: ¥%.2f", data.PayableAmount))
	p.PrintLine(fmt.Sprintf("实付: ¥%.2f", data.PaidAmount))
	if data.Change > 0 {
		p.PrintLine(fmt.Sprintf("找零: ¥%.2f", data.Change))
	}
	p.SetBold(false)

	p.PrintLine("支付方式: " + data.PaymentMethod)
	p.PrintLine("")

	p.SetAlignment("center")
	if data.FooterMessage != "" {
		p.PrintLine(data.FooterMessage)
	}
	p.PrintLine("")
	p.PrintLine("谢谢惠顾，欢迎下次光临！")
	p.PrintLine("")
	p.PrintLine("")
	p.PrintLine("")

	p.CutPaper()

	return nil
}

func (p *Printer) PrintTestPage() error {
	if !p.isActive {
		return errors.New("printer not connected")
	}

	p.SetAlignment("center")
	p.SetDoubleWidth(true)
	p.SetBold(true)
	p.PrintLine("测试打印")
	p.SetDoubleWidth(false)
	p.SetBold(false)
	p.PrintLine("================================================")
	p.PrintLine("")

	p.SetAlignment("left")
	p.PrintLine("1. 普通文本")
	p.PrintLine("")

	p.SetBold(true)
	p.PrintLine("2. 加粗文本")
	p.SetBold(false)
	p.PrintLine("")

	p.SetDoubleWidth(true)
	p.PrintLine("3. 倍宽文本")
	p.SetDoubleWidth(false)
	p.PrintLine("")

	p.SetAlignment("center")
	p.PrintLine("4. 居中对齐")
	p.SetAlignment("right")
	p.PrintLine("5. 右对齐")
	p.SetAlignment("left")
	p.PrintLine("")

	p.PrintLine("================================================")
	p.PrintLine("")
	p.PrintLine("测试完成")
	p.PrintLine("")
	p.PrintLine("")
	p.PrintLine("")

	p.CutPaper()

	return nil
}
