use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Protocol {
    TCP,
    UDP,
    HTTP,
    HTTPS,
    DNS,
    ICMP,
    ARP,
    WebSocket,
    TLS,
    FTP,
    SMTP,
    POP3,
    IMAP,
    SSH,
    Telnet,
    Unknown(String),
}

impl ToString for Protocol {
    fn to_string(&self) -> String {
        match self {
            Protocol::TCP => "TCP".to_string(),
            Protocol::UDP => "UDP".to_string(),
            Protocol::HTTP => "HTTP".to_string(),
            Protocol::HTTPS => "HTTPS".to_string(),
            Protocol::DNS => "DNS".to_string(),
            Protocol::ICMP => "ICMP".to_string(),
            Protocol::ARP => "ARP".to_string(),
            Protocol::WebSocket => "WebSocket".to_string(),
            Protocol::TLS => "TLS".to_string(),
            Protocol::FTP => "FTP".to_string(),
            Protocol::SMTP => "SMTP".to_string(),
            Protocol::POP3 => "POP3".to_string(),
            Protocol::IMAP => "IMAP".to_string(),
            Protocol::SSH => "SSH".to_string(),
            Protocol::Telnet => "Telnet".to_string(),
            Protocol::Unknown(s) => s.clone(),
        }
    }
}

impl From<&str> for Protocol {
    fn from(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "TCP" => Protocol::TCP,
            "UDP" => Protocol::UDP,
            "HTTP" => Protocol::HTTP,
            "HTTPS" => Protocol::HTTPS,
            "DNS" => Protocol::DNS,
            "ICMP" => Protocol::ICMP,
            "ARP" => Protocol::ARP,
            "WEBSOCKET" => Protocol::WebSocket,
            "TLS" => Protocol::TLS,
            "FTP" => Protocol::FTP,
            "SMTP" => Protocol::SMTP,
            "POP3" => Protocol::POP3,
            "IMAP" => Protocol::IMAP,
            "SSH" => Protocol::SSH,
            "TELNET" => Protocol::Telnet,
            _ => Protocol::Unknown(s.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterface {
    pub name: String,
    pub description: Option<String>,
    pub ip_addresses: Vec<String>,
    pub mac_address: Option<String>,
    pub is_loopback: bool,
    pub is_up: bool,
    pub is_running: bool,
    pub promiscuous: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Packet {
    pub id: Option<i64>,
    pub timestamp: DateTime<Utc>,
    pub length: u32,
    pub protocol: Protocol,
    pub source_mac: Option<String>,
    pub dest_mac: Option<String>,
    pub source_ip: Option<String>,
    pub dest_ip: Option<String>,
    pub source_port: Option<u16>,
    pub dest_port: Option<u16>,
    pub raw_hex: String,
    pub raw_bytes: Vec<u8>,
    pub summary: String,
    pub details: Option<serde_json::Value>,
    pub tcp_flags: Option<TcpFlags>,
    pub http_info: Option<HttpInfo>,
    pub dns_info: Option<DnsInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TcpFlags {
    pub fin: bool,
    pub syn: bool,
    pub rst: bool,
    pub psh: bool,
    pub ack: bool,
    pub urg: bool,
    pub ece: bool,
    pub cwr: bool,
    pub sequence: u32,
    pub acknowledgement: u32,
    pub window: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpInfo {
    pub method: Option<String>,
    pub url: Option<String>,
    pub version: Option<String>,
    pub status_code: Option<u16>,
    pub status_text: Option<String>,
    pub headers: serde_json::Value,
    pub body: Option<String>,
    pub content_type: Option<String>,
    pub content_length: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsInfo {
    pub is_query: bool,
    pub query_name: Option<String>,
    pub query_type: Option<String>,
    pub query_class: Option<String>,
    pub responses: Vec<DnsResponse>,
    pub ttl: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsResponse {
    pub name: String,
    pub r#type: String,
    pub class: String,
    pub ttl: u32,
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnifferStats {
    pub total_packets: u64,
    pub tcp_packets: u64,
    pub udp_packets: u64,
    pub http_packets: u64,
    pub dns_packets: u64,
    pub icmp_packets: u64,
    pub other_packets: u64,
    pub total_bytes: u64,
    pub packets_per_second: f64,
    pub bytes_per_second: f64,
    pub start_time: Option<DateTime<Utc>>,
    pub elapsed_seconds: f64,
}

impl Default for SnifferStats {
    fn default() -> Self {
        Self {
            total_packets: 0,
            tcp_packets: 0,
            udp_packets: 0,
            http_packets: 0,
            dns_packets: 0,
            icmp_packets: 0,
            other_packets: 0,
            total_bytes: 0,
            packets_per_second: 0.0,
            bytes_per_second: 0.0,
            start_time: None,
            elapsed_seconds: 0.0,
        }
    }
}
