use super::error::*;
use super::models::*;
use packet_sniffer::models::{Packet, Protocol, TcpFlags};
use chrono::Utc;
use std::collections::HashMap;
use uuid::Uuid;

pub struct TcpReassembler {
    sessions: HashMap<TcpStreamKey, TcpStream>,
    session_id_map: HashMap<String, TcpStreamKey>,
}

impl TcpReassembler {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            session_id_map: HashMap::new(),
        }
    }
    
    pub fn process_packet(&mut self, packet: &Packet) -> Result<Option<&TcpStream>> {
        match packet.protocol {
            Protocol::TCP | Protocol::HTTP | Protocol::TLS => {}
            _ => return Ok(None),
        }
        
        if packet.source_ip.is_none() || packet.dest_ip.is_none() ||
           packet.source_port.is_none() || packet.dest_port.is_none() {
            return Ok(None);
        }
        
        let key = TcpStreamKey::new(
            packet.source_ip.as_ref().unwrap(),
            packet.source_port.unwrap(),
            packet.dest_ip.as_ref().unwrap(),
            packet.dest_port.unwrap(),
        );
        
        let canonical_key = key.canonical();
        
        if packet.tcp_flags.as_ref().map(|f| f.syn).unwrap_or(false) {
            if !self.sessions.contains_key(&canonical_key) {
                let session_id = Uuid::new_v4().to_string();
                let stream = TcpStream {
                    key: canonical_key.clone(),
                    session_id: session_id.clone(),
                    start_time: Utc::now(),
                    end_time: None,
                    client_packets: Vec::new(),
                    server_packets: Vec::new(),
                    is_complete: false,
                    total_bytes: 0,
                    client_bytes: 0,
                    server_bytes: 0,
                    protocol: None,
                    http_session: None,
                    websocket_session: None,
                };
                
                self.sessions.insert(canonical_key.clone(), stream);
                self.session_id_map.insert(session_id, canonical_key);
            }
        }
        
        let stream = self.sessions.get_mut(&canonical_key)
            .ok_or_else(|| AnalyzerError::TcpReassembly("无法找到或创建TCP流".to_string()))?;
        
        let is_client = key == stream.key;
        
        let segment = TcpSegment {
            packet: packet.clone(),
            sequence: packet.tcp_flags.as_ref().map(|f| f.sequence).unwrap_or(0),
            acknowledgement: packet.tcp_flags.as_ref().map(|f| f.acknowledgement).unwrap_or(0),
            flags: packet.tcp_flags.clone().unwrap_or(TcpFlags {
                fin: false, syn: false, rst: false, psh: false,
                ack: false, urg: false, ece: false, cwr: false,
                sequence: 0, acknowledgement: 0, window: 0,
            }),
            payload: packet.raw_bytes.clone(),
            timestamp: packet.timestamp,
        };
        
        let payload_len = segment.payload.len() as u64;
        
        if is_client {
            stream.client_packets.push(segment);
            stream.client_bytes += payload_len;
        } else {
            stream.server_packets.push(segment);
            stream.server_bytes += payload_len;
        }
        
        stream.total_bytes += payload_len;
        
        if stream.protocol.is_none() {
            if packet.protocol == Protocol::HTTP {
                stream.protocol = Some(Protocol::HTTP);
            } else if packet.protocol == Protocol::TLS || 
                      (packet.source_port == Some(443) || packet.dest_port == Some(443)) {
                stream.protocol = Some(Protocol::TLS);
            } else if packet.source_port == Some(80) || packet.dest_port == Some(80) {
                stream.protocol = Some(Protocol::HTTP);
            }
        }
        
        if packet.tcp_flags.as_ref().map(|f| f.fin || f.rst).unwrap_or(false) {
            stream.is_complete = true;
            stream.end_time = Some(Utc::now());
        }
        
        Ok(self.sessions.get(&canonical_key))
    }
    
    pub fn get_session(&self, session_id: &str) -> Option<&TcpStream> {
        self.session_id_map.get(session_id)
            .and_then(|key| self.sessions.get(key))
    }
    
    pub fn get_session_mut(&mut self, session_id: &str) -> Option<&mut TcpStream> {
        if let Some(key) = self.session_id_map.get(session_id) {
            self.sessions.get_mut(key)
        } else {
            None
        }
    }
    
    pub fn get_all_sessions(&self) -> Vec<&TcpStream> {
        self.sessions.values().collect()
    }
    
    pub fn get_active_sessions(&self) -> Vec<&TcpStream> {
        self.sessions.values()
            .filter(|s| !s.is_complete)
            .collect()
    }
    
    pub fn get_http_sessions(&self) -> Vec<&TcpStream> {
        self.sessions.values()
            .filter(|s| matches!(s.protocol, Some(Protocol::HTTP)))
            .collect()
    }
    
    pub fn remove_session(&mut self, session_id: &str) -> Option<TcpStream> {
        if let Some(key) = self.session_id_map.remove(session_id) {
            self.sessions.remove(&key)
        } else {
            None
        }
    }
    
    pub fn clear_all(&mut self) {
        self.sessions.clear();
        self.session_id_map.clear();
    }
    
    pub fn get_stats(&self) -> SessionStats {
        let mut stats = SessionStats::default();
        
        for session in self.sessions.values() {
            stats.total_sessions += 1;
            stats.total_bytes += session.total_bytes;
            
            if !session.is_complete {
                stats.active_sessions += 1;
            }
            
            match session.protocol {
                Some(Protocol::HTTP) => stats.http_sessions += 1,
                Some(Protocol::WebSocket) => stats.websocket_sessions += 1,
                _ => stats.tcp_sessions += 1,
            }
            
            if let Some(http) = &session.http_session {
                stats.extracted_files += http.extracted_files.len() as u64;
            }
        }
        
        stats
    }
    
    pub fn reassemble_stream_data(&self, session_id: &str, is_client: bool) -> Result<Vec<u8>> {
        let session = self.get_session(session_id)
            .ok_or_else(|| AnalyzerError::SessionNotFound(session_id.to_string()))?;
        
        let packets = if is_client {
            &session.client_packets
        } else {
            &session.server_packets
        };
        
        let mut sorted_packets: Vec<&TcpSegment> = packets.iter().collect();
        sorted_packets.sort_by_key(|p| p.sequence);
        
        let mut result = Vec::new();
        let mut expected_seq: Option<u32> = None;
        
        for packet in sorted_packets {
            if packet.payload.is_empty() {
                continue;
            }
            
            if let Some(expected) = expected_seq {
                if packet.sequence > expected {
                    let gap = packet.sequence - expected;
                    result.extend(std::iter::repeat(0x00).take(gap as usize));
                }
            }
            
            result.extend(&packet.payload);
            expected_seq = Some(packet.sequence + packet.payload.len() as u32);
        }
        
        Ok(result)
    }
}

impl Default for TcpReassembler {
    fn default() -> Self {
        Self::new()
    }
}
