import serial
import serial.tools.list_ports
from serial.tools.list_ports_common import ListPortInfo
from typing import List, Optional, Callable
from PySide6.QtCore import QThread, Signal, QObject
from datetime import datetime
import re


class SerialConfig:
    BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600]
    DATA_BITS = [5, 6, 7, 8]
    STOP_BITS = [1, 1.5, 2]
    PARITY = ['N', 'E', 'O', 'M', 'S']
    PARITY_NAMES = {'N': '无', 'E': '偶校验', 'O': '奇校验', 'M': '标记', 'S': '空格'}
    FLOW_CONTROL = ['无', 'RTS/CTS', 'XON/XOFF']

    def __init__(self):
        self.port_name: str = ""
        self.baud_rate: int = 115200
        self.data_bits: int = 8
        self.stop_bits: float = 1.0
        self.parity: str = 'N'
        self.flow_control: str = '无'
        self.timeout: float = 0.1


class SerialWorker(QThread):
    data_received = Signal(bytes)
    error_occurred = Signal(str)
    disconnected = Signal()

    def __init__(self, serial_port: serial.Serial):
        super().__init__()
        self.serial_port = serial_port
        self.running = True

    def run(self):
        while self.running and self.serial_port.is_open:
            try:
                if self.serial_port.in_waiting > 0:
                    data = self.serial_port.read(self.serial_port.in_waiting)
                    if data:
                        self.data_received.emit(data)
                else:
                    self.msleep(10)
            except serial.SerialException as e:
                self.error_occurred.emit(str(e))
                self.running = False
                break
            except Exception as e:
                self.error_occurred.emit(str(e))
        self.disconnected.emit()

    def stop(self):
        self.running = False


class SerialManager(QObject):
    data_received = Signal(str, str)
    data_sent = Signal(str, str)
    connected = Signal()
    disconnected = Signal()
    error = Signal(str)

    def __init__(self):
        super().__init__()
        self.config = SerialConfig()
        self.serial_port: Optional[serial.Serial] = None
        self.worker: Optional[SerialWorker] = None
        self._is_connected = False

    @staticmethod
    def get_available_ports() -> List[ListPortInfo]:
        return list(serial.tools.list_ports.comports())

    @staticmethod
    def get_port_names() -> List[str]:
        ports = serial.tools.list_ports.comports()
        return [port.device for port in ports]

    def connect(self, config: SerialConfig = None) -> bool:
        if config:
            self.config = config
        
        if not self.config.port_name:
            self.error.emit("未选择串口")
            return False

        try:
            parity_map = {
                'N': serial.PARITY_NONE,
                'E': serial.PARITY_EVEN,
                'O': serial.PARITY_ODD,
                'M': serial.PARITY_MARK,
                'S': serial.PARITY_SPACE
            }

            rtscts = self.config.flow_control == 'RTS/CTS'
            xonxoff = self.config.flow_control == 'XON/XOFF'

            self.serial_port = serial.Serial(
                port=self.config.port_name,
                baudrate=self.config.baud_rate,
                bytesize=self.config.data_bits,
                parity=parity_map[self.config.parity],
                stopbits=self.config.stop_bits,
                timeout=self.config.timeout,
                rtscts=rtscts,
                xonxoff=xonxoff
            )

            self.worker = SerialWorker(self.serial_port)
            self.worker.data_received.connect(self._on_data_received)
            self.worker.error_occurred.connect(self._on_error)
            self.worker.disconnected.connect(self._on_disconnected)
            self.worker.start()

            self._is_connected = True
            self.connected.emit()
            return True

        except serial.SerialException as e:
            self.error.emit(f"打开串口失败: {str(e)}")
            return False
        except Exception as e:
            self.error.emit(f"连接错误: {str(e)}")
            return False

    def disconnect(self):
        if self.worker:
            self.worker.stop()
            self.worker.wait(1000)
            self.worker = None

        if self.serial_port and self.serial_port.is_open:
            try:
                self.serial_port.close()
            except:
                pass

        self.serial_port = None
        self._is_connected = False
        self.disconnected.emit()

    def is_connected(self) -> bool:
        return self._is_connected and self.serial_port and self.serial_port.is_open

    def send_data(self, data: str, is_hex: bool = False) -> bool:
        if not self.is_connected():
            self.error.emit("串口未连接")
            return False

        try:
            if is_hex:
                hex_str = re.sub(r'[\s,;:]+', '', data.strip())
                if len(hex_str) % 2 != 0:
                    self.error.emit("十六进制数据长度必须为偶数")
                    return False
                try:
                    bytes_data = bytes.fromhex(hex_str)
                except ValueError:
                    self.error.emit("无效的十六进制数据")
                    return False
            else:
                bytes_data = data.encode('utf-8', errors='replace')

            self.serial_port.write(bytes_data)
            
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            if is_hex:
                display_data = ' '.join(f'{b:02X}' for b in bytes_data)
            else:
                display_data = data
            self.data_sent.emit(timestamp, display_data)
            
            return True

        except serial.SerialException as e:
            self.error.emit(f"发送失败: {str(e)}")
            self.disconnect()
            return False
        except Exception as e:
            self.error.emit(f"发送错误: {str(e)}")
            return False

    def _on_data_received(self, data: bytes):
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        hex_display = ' '.join(f'{b:02X}' for b in data)
        try:
            ascii_display = data.decode('utf-8', errors='replace')
        except:
            ascii_display = ''.join(chr(b) if 32 <= b < 127 else '?' for b in data)
        self.data_received.emit(timestamp, hex_display)

    def _on_error(self, error_msg: str):
        self.error.emit(error_msg)

    def _on_disconnected(self):
        self._is_connected = False
        self.disconnected.emit()
