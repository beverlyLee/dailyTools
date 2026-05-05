export interface NetworkInterface {
  name: string;
  description: string | null;
  ip_addresses: string[];
  mac_address: string | null;
  is_loopback: boolean;
  is_up: boolean;
  is_running: boolean;
  promiscuous: boolean;
}

export interface Protocol {
  TCP: 'TCP';
  UDP: 'UDP';
  HTTP: 'HTTP';
  HTTPS: 'HTTPS';
  DNS: 'DNS';
  ICMP: 'ICMP';
  ARP: 'ARP';
  WebSocket: 'WebSocket';
  TLS: 'TLS';
  FTP: 'FTP';
  SMTP: 'SMTP';
  POP3: 'POP3';
  IMAP: 'IMAP';
  SSH: 'SSH';
  Telnet: 'Telnet';
  Unknown: 'Unknown';
}

export type ProtocolType = 
  | 'TCP' | 'UDP' | 'HTTP' | 'HTTPS' | 'DNS' | 'ICMP' | 'ARP' 
  | 'WebSocket' | 'TLS' | 'FTP' | 'SMTP' | 'POP3' | 'IMAP' | 'SSH' 
  | 'Telnet' | string;

export interface TcpFlags {
  fin: boolean;
  syn: boolean;
  rst: boolean;
  psh: boolean;
  ack: boolean;
  urg: boolean;
  ece: boolean;
  cwr: boolean;
  sequence: number;
  acknowledgement: number;
  window: number;
}

export interface HttpInfo {
  method: string | null;
  url: string | null;
  version: string | null;
  status_code: number | null;
  status_text: string | null;
  headers: Record<string, any>;
  body: string | null;
  content_type: string | null;
  content_length: number | null;
}

export interface DnsResponse {
  name: string;
  type: string;
  class: string;
  ttl: number;
  data: string;
}

export interface DnsInfo {
  is_query: boolean;
  query_name: string | null;
  query_type: string | null;
  query_class: string | null;
  responses: DnsResponse[];
  ttl: number | null;
}

export interface Packet {
  id: number | null;
  timestamp: string;
  length: number;
  protocol: ProtocolType;
  source_mac: string | null;
  dest_mac: string | null;
  source_ip: string | null;
  dest_ip: string | null;
  source_port: number | null;
  dest_port: number | null;
  raw_hex: string;
  raw_bytes: number[];
  summary: string;
  details: Record<string, any> | null;
  tcp_flags: TcpFlags | null;
  http_info: HttpInfo | null;
  dns_info: DnsInfo | null;
}

export interface SnifferStats {
  total_packets: number;
  tcp_packets: number;
  udp_packets: number;
  http_packets: number;
  dns_packets: number;
  icmp_packets: number;
  other_packets: number;
  total_bytes: number;
  packets_per_second: number;
  bytes_per_second: number;
  start_time: string | null;
  elapsed_seconds: number;
}

export interface ApiResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface TcpStreamKey {
  source_ip: string;
  source_port: number;
  dest_ip: string;
  dest_port: number;
}

export interface TcpSegment {
  packet: Packet;
  sequence: number;
  acknowledgement: number;
  flags: TcpFlags;
  payload: number[];
  timestamp: string;
}

export interface HttpRequest {
  method: string;
  url: string;
  version: string;
  headers: Record<string, any>;
  body: number[];
  body_text: string | null;
  content_type: string | null;
  content_length: number;
  timestamp: string;
}

export interface HttpResponse {
  version: string;
  status_code: number;
  status_text: string;
  headers: Record<string, any>;
  body: number[];
  body_text: string | null;
  content_type: string | null;
  content_length: number;
  timestamp: string;
}

export interface HttpSession {
  requests: HttpRequest[];
  responses: HttpResponse[];
  host: string | null;
  user_agent: string | null;
  cookies: [string, string][];
  extracted_files: ExtractedFile[];
}

export type WebSocketOpcodeType = 
  | 'Continuation' | 'Text' | 'Binary' | 'Close' | 'Ping' | 'Pong' | number;

export interface WebSocketFrame {
  fin: boolean;
  rsv1: boolean;
  rsv2: boolean;
  rsv3: boolean;
  opcode: WebSocketOpcodeType;
  masked: boolean;
  masking_key: number[] | null;
  payload_length: number;
  payload: number[];
  payload_text: string | null;
  is_from_client: boolean;
  timestamp: string;
}

export interface WebSocketSession {
  frames: WebSocketFrame[];
  handshake_request: HttpRequest | null;
  handshake_response: HttpResponse | null;
  is_client_masked: boolean;
}

export interface TcpStream {
  key: TcpStreamKey;
  session_id: string;
  start_time: string;
  end_time: string | null;
  client_packets: TcpSegment[];
  server_packets: TcpSegment[];
  is_complete: boolean;
  total_bytes: number;
  client_bytes: number;
  server_bytes: number;
  protocol: ProtocolType | null;
  http_session: HttpSession | null;
  websocket_session: WebSocketSession | null;
}

export interface SessionStats {
  total_sessions: number;
  tcp_sessions: number;
  http_sessions: number;
  websocket_sessions: number;
  total_bytes: number;
  extracted_files: number;
  active_sessions: number;
}

export type FilePreviewType = 'Image' | 'Text' | 'Binary' | 'Unknown';

export interface FilePreview {
  type: FilePreviewType;
  width?: number;
  height?: number;
  format?: string;
  thumbnail_base64?: string;
  preview?: string;
  line_count?: number;
  hex_preview?: string;
}

export interface ExtractedFile {
  id: string;
  name: string;
  filename: string;
  content_type: string;
  data: number[];
  size: number;
  source_url: string | null;
  source_session: string;
  extracted_at: string;
  preview: FilePreview | null;
}

export type ViewModeTypeType = 'Hex' | 'Text' | 'Split';
export type TextEncodingType = 'Utf8' | 'Latin1' | 'Utf16' | 'Ascii';

export interface ViewMode {
  mode: ViewModeTypeType;
  show_hex: boolean;
  show_ascii: boolean;
  bytes_per_row: number;
  encoding: TextEncodingType;
}

export interface HexViewResult {
  offset: number;
  hex_bytes: string[];
  ascii: string;
  raw_bytes: number[];
}
