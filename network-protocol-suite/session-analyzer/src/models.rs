use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use packet_sniffer::models::{Packet, Protocol, HttpInfo, TcpFlags};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TcpStreamKey {
    pub source_ip: String,
    pub source_port: u16,
    pub dest_ip: String,
    pub dest_port: u16,
}

impl TcpStreamKey {
    pub fn new(source_ip: &str, source_port: u16, dest_ip: &str, dest_port: u16) -> Self {
        Self {
            source_ip: source_ip.to_string(),
            source_port,
            dest_ip: dest_ip.to_string(),
            dest_port,
        }
    }
    
    pub fn reverse(&self) -> Self {
        Self {
            source_ip: self.dest_ip.clone(),
            source_port: self.dest_port,
            dest_ip: self.source_ip.clone(),
            dest_port: self.source_port,
        }
    }
    
    pub fn canonical(&self) -> Self {
        if (self.source_ip.as_str(), self.source_port) < (self.dest_ip.as_str(), self.dest_port) {
            self.clone()
        } else {
            self.reverse()
        }
    }
    
    pub fn to_string(&self) -> String {
        format!("{}:{} -> {}:{}", self.source_ip, self.source_port, self.dest_ip, self.dest_port)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TcpStream {
    pub key: TcpStreamKey,
    pub session_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub client_packets: Vec<TcpSegment>,
    pub server_packets: Vec<TcpSegment>,
    pub is_complete: bool,
    pub total_bytes: u64,
    pub client_bytes: u64,
    pub server_bytes: u64,
    pub protocol: Option<Protocol>,
    pub http_session: Option<HttpSession>,
    pub websocket_session: Option<WebSocketSession>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TcpSegment {
    pub packet: Packet,
    pub sequence: u32,
    pub acknowledgement: u32,
    pub flags: TcpFlags,
    pub payload: Vec<u8>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpSession {
    pub requests: Vec<HttpRequest>,
    pub responses: Vec<HttpResponse>,
    pub host: Option<String>,
    pub user_agent: Option<String>,
    pub cookies: Vec<(String, String)>,
    pub extracted_files: Vec<ExtractedFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub version: String,
    pub headers: serde_json::Value,
    pub body: Vec<u8>,
    pub body_text: Option<String>,
    pub content_type: Option<String>,
    pub content_length: u64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpResponse {
    pub version: String,
    pub status_code: u16,
    pub status_text: String,
    pub headers: serde_json::Value,
    pub body: Vec<u8>,
    pub body_text: Option<String>,
    pub content_type: Option<String>,
    pub content_length: u64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketSession {
    pub frames: Vec<WebSocketFrame>,
    pub handshake_request: Option<HttpRequest>,
    pub handshake_response: Option<HttpResponse>,
    pub is_client_masked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WebSocketOpcode {
    Continuation,
    Text,
    Binary,
    Close,
    Ping,
    Pong,
    Unknown(u8),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketFrame {
    pub fin: bool,
    pub rsv1: bool,
    pub rsv2: bool,
    pub rsv3: bool,
    pub opcode: WebSocketOpcode,
    pub masked: bool,
    pub masking_key: Option<[u8; 4]>,
    pub payload_length: u64,
    pub payload: Vec<u8>,
    pub payload_text: Option<String>,
    pub is_from_client: bool,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedFile {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub content_type: String,
    pub data: Vec<u8>,
    pub size: u64,
    pub source_url: Option<String>,
    pub source_session: String,
    pub extracted_at: DateTime<Utc>,
    pub preview: Option<FilePreview>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FilePreview {
    Image {
        width: u32,
        height: u32,
        format: String,
        thumbnail_base64: String,
    },
    Text {
        preview: String,
        line_count: u32,
    },
    Binary {
        hex_preview: String,
    },
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HexViewResult {
    pub offset: u64,
    pub hex_bytes: Vec<String>,
    pub ascii: String,
    pub raw_bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewMode {
    pub mode: ViewModeType,
    pub show_hex: bool,
    pub show_ascii: bool,
    pub bytes_per_row: u8,
    pub encoding: TextEncoding,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ViewModeType {
    Hex,
    Text,
    Split,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TextEncoding {
    Utf8,
    Latin1,
    Utf16,
    Ascii,
}

impl Default for ViewMode {
    fn default() -> Self {
        Self {
            mode: ViewModeType::Split,
            show_hex: true,
            show_ascii: true,
            bytes_per_row: 16,
            encoding: TextEncoding::Utf8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStats {
    pub total_sessions: u64,
    pub tcp_sessions: u64,
    pub http_sessions: u64,
    pub websocket_sessions: u64,
    pub total_bytes: u64,
    pub extracted_files: u64,
    pub active_sessions: u64,
}

impl Default for SessionStats {
    fn default() -> Self {
        Self {
            total_sessions: 0,
            tcp_sessions: 0,
            http_sessions: 0,
            websocket_sessions: 0,
            total_bytes: 0,
            extracted_files: 0,
            active_sessions: 0,
        }
    }
}
