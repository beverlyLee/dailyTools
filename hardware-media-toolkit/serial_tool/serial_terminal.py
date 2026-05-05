import serial
import serial.tools.list_ports
from datetime import datetime
from PyQt6.QtCore import QThread, pyqtSignal, QObject
from utils.helpers import bytes_to_hex, hex_to_bytes, timestamp_to_str

class SerialReader(QThread):
    data_received = pyqtSignal(bytes, datetime)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, serial_port):
        super().__init__()
        self.serial_port = serial_port
        self.is_running = True
    
    def run(self):
        while self.is_running:
            try:
                if self.serial_port and self.serial_port.in_waiting > 0:
                    data = self.serial_port.read(self.serial_port.in_waiting)
                    timestamp = datetime.now()
                    self.data_received.emit(data, timestamp)
            except Exception as e:
                self.error_occurred.emit(str(e))
                break
            self.msleep(10)
    
    def stop(self):
        self.is_running = False
        self.wait()

class SerialTerminal(QObject):
    data_received = pyqtSignal(bytes, datetime, str)
    data_sent = pyqtSignal(bytes, datetime, str)
    connected = pyqtSignal()
    disconnected = pyqtSignal()
    error = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        self.serial_port = None
        self.reader_thread = None
        self.display_mode = 'ASCII'
        self.auto_timestamp = True
    
    def get_available_ports(self):
        ports = serial.tools.list_ports.comports()
        return [port.device for port in ports]
    
    def connect(self, port, baudrate=115200, bytesize=8, parity='N', stopbits=1, xonxoff=False, rtscts=False, dsrdtr=False):
        try:
            if self.serial_port and self.serial_port.is_open:
                self.disconnect()
            
            parity_map = {'N': serial.PARITY_NONE, 'O': serial.PARITY_ODD, 'E': serial.PARITY_EVEN}
            stopbits_map = {1: serial.STOPBITS_ONE, 1.5: serial.STOPBITS_ONE_POINT_FIVE, 2: serial.STOPBITS_TWO}
            bytesize_map = {5: serial.FIVEBITS, 6: serial.SIXBITS, 7: serial.SEVENBITS, 8: serial.EIGHTBITS}
            
            self.serial_port = serial.Serial(
                port=port,
                baudrate=baudrate,
                bytesize=bytesize_map.get(bytesize, serial.EIGHTBITS),
                parity=parity_map.get(parity, serial.PARITY_NONE),
                stopbits=stopbits_map.get(stopbits, serial.STOPBITS_ONE),
                xonxoff=xonxoff,
                rtscts=rtscts,
                dsrdtr=dsrdtr,
                timeout=0
            )
            
            self.reader_thread = SerialReader(self.serial_port)
            self.reader_thread.data_received.connect(self._on_data_received)
            self.reader_thread.error_occurred.connect(self._on_error)
            self.reader_thread.start()
            
            self.connected.emit()
            return True
        except Exception as e:
            self.error.emit(str(e))
            return False
    
    def disconnect(self):
        try:
            if self.reader_thread:
                self.reader_thread.stop()
                self.reader_thread = None
            
            if self.serial_port and self.serial_port.is_open:
                self.serial_port.close()
            
            self.serial_port = None
            self.disconnected.emit()
            return True
        except Exception as e:
            self.error.emit(str(e))
            return False
    
    def is_connected(self):
        return self.serial_port is not None and self.serial_port.is_open
    
    def send_data(self, data, mode='ASCII'):
        if not self.is_connected():
            self.error.emit("串口未连接")
            return False
        
        try:
            if mode == 'HEX':
                bytes_data = hex_to_bytes(data)
            else:
                bytes_data = data.encode('utf-8')
            
            self.serial_port.write(bytes_data)
            timestamp = datetime.now()
            display_str = self._format_data(bytes_data, mode)
            self.data_sent.emit(bytes_data, timestamp, display_str)
            return True
        except Exception as e:
            self.error.emit(str(e))
            return False
    
    def set_display_mode(self, mode):
        self.display_mode = mode
    
    def _format_data(self, data, mode):
        if mode == 'HEX':
            return bytes_to_hex(data)
        else:
            try:
                return data.decode('utf-8', errors='replace')
            except:
                return str(data)
    
    def _on_data_received(self, data, timestamp):
        display_str = self._format_data(data, self.display_mode)
        self.data_received.emit(data, timestamp, display_str)
    
    def _on_error(self, error_msg):
        self.error.emit(error_msg)
