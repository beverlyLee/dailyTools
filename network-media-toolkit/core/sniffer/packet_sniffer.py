#!/usr/bin/env python3
"""
抓包模块：使用 Scapy 进行数据包捕获和协议解析
"""

import threading
from datetime import datetime
from typing import Dict, Any, List, Callable, Optional
from scapy.all import (
    sniff, conf, get_if_list, get_if_addr,
    IP, TCP, UDP, ICMP, ARP, DNS, DNSQR, DNSRR,
    Raw, Ether, hexdump
)
import re


class PacketSniffer:
    def __init__(self, packet_callback: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.packet_callback = packet_callback
        self.is_sniffing = False
        self.sniffer_thread = None
        self.stop_event = threading.Event()
        self.captured_packets: List[Dict[str, Any]] = []

    @staticmethod
    def get_interfaces() -> List[Dict[str, str]]:
        interfaces = []
        for iface in get_if_list():
            try:
                ip = get_if_addr(iface)
            except:
                ip = "N/A"
            
            if iface == "lo0":
                name = "Loopback (lo0)"
            elif "en" in iface:
                if iface == "en0":
                    name = f"Wi-Fi ({iface})"
                else:
                    name = f"Ethernet ({iface})"
            else:
                name = iface
            
            interfaces.append({
                "name": name,
                "interface": iface,
                "ip": ip
            })
        return interfaces

    def parse_packet(self, packet) -> Dict[str, Any]:
        packet_info = {
            "timestamp": packet.time,
            "length": len(packet),
            "summary": packet.summary(),
            "details": str(packet.show(dump=True)) if hasattr(packet, 'show') else "",
            "raw_hex": hexdump(packet, dump=True) if hasattr(packet, 'raw') else "",
            "protocol": "UNKNOWN",
            "source_ip": None,
            "dest_ip": None,
            "source_port": None,
            "dest_port": None,
            "http_method": None,
            "http_url": None,
            "http_headers": None,
            "http_body": None,
            "dns_query": None,
            "dns_response": None
        }

        if Ether in packet:
            eth = packet[Ether]
            packet_info["source_mac"] = eth.src
            packet_info["dest_mac"] = eth.dst

        if ARP in packet:
            arp = packet[ARP]
            packet_info["protocol"] = "ARP"
            packet_info["source_ip"] = arp.psrc
            packet_info["dest_ip"] = arp.pdst
            packet_info["source_mac"] = arp.hwsrc
            packet_info["dest_mac"] = arp.hwdst
            return packet_info

        if IP in packet:
            ip = packet[IP]
            packet_info["source_ip"] = ip.src
            packet_info["dest_ip"] = ip.dst

            if TCP in packet:
                tcp = packet[TCP]
                packet_info["protocol"] = "TCP"
                packet_info["source_port"] = tcp.sport
                packet_info["dest_port"] = tcp.dport
                
                if Raw in packet:
                    raw_data = packet[Raw].load
                    try:
                        http_data = raw_data.decode('utf-8', errors='ignore')
                        http_info = self.parse_http(http_data)
                        if http_info:
                            packet_info["protocol"] = "HTTP"
                            packet_info.update(http_info)
                    except:
                        pass

            elif UDP in packet:
                udp = packet[UDP]
                packet_info["protocol"] = "UDP"
                packet_info["source_port"] = udp.sport
                packet_info["dest_port"] = udp.dport

                if DNS in packet:
                    dns = packet[DNS]
                    packet_info["protocol"] = "DNS"
                    dns_info = self.parse_dns(dns)
                    packet_info.update(dns_info)

            elif ICMP in packet:
                packet_info["protocol"] = "ICMP"

        return packet_info

    def parse_http(self, data: str) -> Dict[str, Any]:
        http_info = {
            "http_method": None,
            "http_url": None,
            "http_headers": None,
            "http_body": None
        }

        request_pattern = r'^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|CONNECT|TRACE)\s+(\S+)\s+HTTP/(\d+\.\d+)'
        response_pattern = r'^HTTP/(\d+\.\d+)\s+(\d+)\s+(.+)'

        request_match = re.match(request_pattern, data)
        response_match = re.match(response_pattern, data)

        if request_match:
            http_info["http_method"] = request_match.group(1)
            http_info["http_url"] = request_match.group(2)
        elif response_match:
            http_info["http_method"] = f"HTTP/{response_match.group(1)}"
            http_info["http_url"] = f"{response_match.group(2)} {response_match.group(3)}"

        if request_match or response_match:
            parts = data.split('\r\n\r\n', 1)
            if len(parts) > 0:
                http_info["http_headers"] = parts[0]
            if len(parts) > 1:
                http_info["http_body"] = parts[1][:1000] if len(parts[1]) > 1000 else parts[1]

        if http_info["http_method"]:
            return http_info
        return None

    def parse_dns(self, dns) -> Dict[str, Any]:
        dns_info = {
            "dns_query": None,
            "dns_response": None
        }

        queries = []
        if dns.qdcount > 0 and hasattr(dns, 'qd') and dns.qd:
            for i in range(dns.qdcount):
                try:
                    q = dns.qd[i] if hasattr(dns.qd, '__getitem__') else dns.qd
                    qname = q.qname.decode('utf-8') if hasattr(q.qname, 'decode') else str(q.qname)
                    qtype = q.qtype
                    queries.append(f"{qname} (Type {qtype})")
                except:
                    pass
        dns_info["dns_query"] = "; ".join(queries) if queries else None

        responses = []
        if dns.ancount > 0 and hasattr(dns, 'an') and dns.an:
            for i in range(dns.ancount):
                try:
                    a = dns.an[i] if hasattr(dns.an, '__getitem__') else dns.an
                    rrname = a.rrname.decode('utf-8') if hasattr(a.rrname, 'decode') else str(a.rrname)
                    rtype = a.type
                    rdata = ""
                    if hasattr(a, 'rdata'):
                        if isinstance(a.rdata, bytes):
                            try:
                                rdata = a.rdata.decode('utf-8')
                            except:
                                rdata = str(a.rdata)
                        else:
                            rdata = str(a.rdata)
                    responses.append(f"{rrname} -> {rdata} (Type {rtype})")
                except:
                    pass
        dns_info["dns_response"] = "; ".join(responses) if responses else None

        return dns_info

    def _sniffer_thread(self, interface: str, bpf_filter: str):
        self.is_sniffing = True
        self.stop_event.clear()

        def packet_handler(packet):
            if self.stop_event.is_set():
                return
            try:
                packet_info = self.parse_packet(packet)
                self.captured_packets.append(packet_info)
                if self.packet_callback:
                    self.packet_callback(packet_info)
            except Exception as e:
                print(f"Error parsing packet: {e}")

        try:
            sniff(
                iface=interface,
                filter=bpf_filter,
                prn=packet_handler,
                stop_filter=lambda x: self.stop_event.is_set(),
                store=0
            )
        except Exception as e:
            print(f"Sniffer error: {e}")
        finally:
            self.is_sniffing = False

    def start_sniffing(self, interface: str, bpf_filter: str = "") -> bool:
        if self.is_sniffing:
            return False
        
        self.captured_packets = []
        self.sniffer_thread = threading.Thread(
            target=self._sniffer_thread,
            args=(interface, bpf_filter),
            daemon=True
        )
        self.sniffer_thread.start()
        return True

    def stop_sniffing(self):
        self.stop_event.set()
        if self.sniffer_thread and self.sniffer_thread.is_alive():
            self.sniffer_thread.join(timeout=2.0)
        self.is_sniffing = False

    def get_captured_packets(self) -> List[Dict[str, Any]]:
        return self.captured_packets.copy()

    def clear_captured_packets(self):
        self.captured_packets = []
