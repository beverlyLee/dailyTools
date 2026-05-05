import socket
import struct
from datetime import datetime
from PyQt6.QtCore import QThread, pyqtSignal, QObject
from queue import Queue

try:
    from scapy.all import sniff, get_if_list, conf
    from scapy.layers.l2 import Ether
    from scapy.layers.inet import IP, TCP, UDP, ICMP
    from scapy.layers.dns import DNS, DNSQR, DNSRR
    from scapy.layers.http import HTTPRequest, HTTPResponse
    HAS_SCAPY = True
except ImportError:
    HAS_SCAPY = False

class PacketSniffer(QThread):
    packet_captured = pyqtSignal(object)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, interface, bpf_filter=''):
        super().__init__()
        self.interface = interface
        self.bpf_filter = bpf_filter
        self.is_running = True
        self.packet_count = 0
    
    def run(self):
        if not HAS_SCAPY:
            self.error_occurred.emit("scapy 未安装，请运行: pip install scapy")
            return
        
        try:
            sniff(
                iface=self.interface,
                prn=self._process_packet,
                filter=self.bpf_filter,
                store=0,
                stop_filter=lambda x: not self.is_running
            )
        except Exception as e:
            self.error_occurred.emit(f"抓包错误: {str(e)}")
    
    def _process_packet(self, packet):
        if not self.is_running:
            return
        
        self.packet_count += 1
        self.packet_captured.emit(packet)
    
    def stop(self):
        self.is_running = False
        self.wait()

class PacketCapture(QObject):
    packet_received = pyqtSignal(dict)
    started = pyqtSignal()
    stopped = pyqtSignal()
    error = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        self.sniffer = None
        self.captured_packets = []
        self.max_packets = 10000
    
    def get_interfaces(self):
        if not HAS_SCAPY:
            return []
        
        interfaces = []
        try:
            if_list = get_if_list()
            for iface in if_list:
                try:
                    ip = self._get_interface_ip(iface)
                    interfaces.append({
                        'name': iface,
                        'ip': ip or 'N/A'
                    })
                except:
                    interfaces.append({
                        'name': iface,
                        'ip': 'N/A'
                    })
        except:
            pass
        
        return interfaces
    
    def _get_interface_ip(self, iface):
        try:
            import netifaces
            addrs = netifaces.ifaddresses(iface)
            if netifaces.AF_INET in addrs:
                return addrs[netifaces.AF_INET][0]['addr']
        except:
            pass
        
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            pass
        
        return None
    
    def start_capture(self, interface, bpf_filter=''):
        if self.sniffer and self.sniffer.isRunning():
            self.error.emit("抓包已在运行中")
            return False
        
        self.captured_packets = []
        self.sniffer = PacketSniffer(interface, bpf_filter)
        self.sniffer.packet_captured.connect(self._on_packet_captured)
        self.sniffer.error_occurred.connect(self._on_error)
        self.sniffer.start()
        self.started.emit()
        return True
    
    def stop_capture(self):
        if self.sniffer and self.sniffer.isRunning():
            self.sniffer.stop()
            self.sniffer = None
            self.stopped.emit()
    
    def is_capturing(self):
        return self.sniffer is not None and self.sniffer.isRunning()
    
    def _on_packet_captured(self, packet):
        packet_info = self._parse_packet(packet)
        if packet_info:
            if len(self.captured_packets) >= self.max_packets:
                self.captured_packets.pop(0)
            self.captured_packets.append(packet_info)
            self.packet_received.emit(packet_info)
    
    def _parse_packet(self, packet):
        info = {
            'timestamp': datetime.now(),
            'raw_packet': bytes(packet),
            'summary': packet.summary(),
            'layers': []
        }
        
        if Ether in packet:
            eth = packet[Ether]
            info['layers'].append('Ethernet')
            info['src_mac'] = eth.src
            info['dst_mac'] = eth.dst
            info['eth_type'] = hex(eth.type)
        
        if IP in packet:
            ip = packet[IP]
            info['layers'].append('IP')
            info['src_ip'] = ip.src
            info['dst_ip'] = ip.dst
            info['protocol'] = ip.proto
            info['ttl'] = ip.ttl
            info['ip_len'] = ip.len
        
        if TCP in packet:
            tcp = packet[TCP]
            info['layers'].append('TCP')
            info['src_port'] = tcp.sport
            info['dst_port'] = tcp.dport
            info['seq'] = tcp.seq
            info['ack'] = tcp.ack
            info['flags'] = str(tcp.flags)
            info['window'] = tcp.window
            
            if hasattr(tcp, 'payload') and len(bytes(tcp.payload)) > 0:
                info['payload'] = bytes(tcp.payload)
        
        if UDP in packet:
            udp = packet[UDP]
            info['layers'].append('UDP')
            info['src_port'] = udp.sport
            info['dst_port'] = udp.dport
            info['udp_len'] = udp.len
            
            if hasattr(udp, 'payload') and len(bytes(udp.payload)) > 0:
                info['payload'] = bytes(udp.payload)
        
        if ICMP in packet:
            icmp = packet[ICMP]
            info['layers'].append('ICMP')
            info['icmp_type'] = icmp.type
            info['icmp_code'] = icmp.code
        
        if DNS in packet:
            dns = packet[DNS]
            info['layers'].append('DNS')
            info['dns_qr'] = dns.qr
            info['dns_opcode'] = dns.opcode
            info['dns_rcode'] = dns.rcode
            
            if dns.qr == 0:
                info['dns_type'] = 'Query'
            else:
                info['dns_type'] = 'Response'
            
            if dns.qd:
                questions = []
                for i in range(dns.qdcount):
                    q = dns.qd[i]
                    questions.append({
                        'name': q.qname.decode('utf-8', errors='replace') if hasattr(q.qname, 'decode') else str(q.qname),
                        'type': q.qtype,
                        'class': q.qclass
                    })
                info['dns_questions'] = questions
            
            if dns.an:
                answers = []
                for i in range(dns.ancount):
                    a = dns.an[i]
                    answers.append({
                        'name': a.rrname.decode('utf-8', errors='replace') if hasattr(a.rrname, 'decode') else str(a.rrname),
                        'type': a.type,
                        'rdata': str(a.rdata) if hasattr(a, 'rdata') else ''
                    })
                info['dns_answers'] = answers
        
        if HTTPRequest in packet:
            http = packet[HTTPRequest]
            info['layers'].append('HTTP')
            info['http_type'] = 'Request'
            try:
                info['http_method'] = http.Method.decode('utf-8')
                info['http_path'] = http.Path.decode('utf-8')
                info['http_version'] = http.Http_Version.decode('utf-8')
                
                headers = {}
                for key in http.fields:
                    if isinstance(http.fields[key], bytes):
                        headers[key.decode('utf-8', errors='replace')] = http.fields[key].decode('utf-8', errors='replace')
                    else:
                        headers[str(key)] = str(http.fields[key])
                info['http_headers'] = headers
            except:
                pass
        
        if HTTPResponse in packet:
            http = packet[HTTPResponse]
            info['layers'].append('HTTP')
            info['http_type'] = 'Response'
            try:
                info['http_version'] = http.Http_Version.decode('utf-8')
                info['http_status'] = int(http.Status_Code)
                info['http_reason'] = http.Reason_Phrase.decode('utf-8')
                
                headers = {}
                for key in http.fields:
                    if isinstance(http.fields[key], bytes):
                        headers[key.decode('utf-8', errors='replace')] = http.fields[key].decode('utf-8', errors='replace')
                    else:
                        headers[str(key)] = str(http.fields[key])
                info['http_headers'] = headers
            except:
                pass
        
        return info
    
    def _on_error(self, error_msg):
        self.error.emit(error_msg)
    
    def get_packet_count(self):
        return len(self.captured_packets)
    
    def get_packets(self):
        return self.captured_packets.copy()
    
    def get_packet(self, index):
        if 0 <= index < len(self.captured_packets):
            return self.captured_packets[index]
        return None
    
    def clear_packets(self):
        self.captured_packets.clear()
    
    def set_max_packets(self, max_packets):
        self.max_packets = max_packets
        while len(self.captured_packets) > self.max_packets:
            self.captured_packets.pop(0)
