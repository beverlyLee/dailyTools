use super::error::*;
use super::models::*;
use chrono::Utc;

pub struct WebSocketParser {
    pending_frames: Vec<u8>,
}

impl WebSocketParser {
    pub fn new() -> Self {
        Self {
            pending_frames: Vec::new(),
        }
    }
    
    pub fn parse_frame(&mut self, data: &[u8], is_from_client: bool) -> Result<Option<WebSocketFrame>> {
        if data.len() < 2 {
            return Ok(None);
        }
        
        let byte0 = data[0];
        let byte1 = data[1];
        
        let fin = (byte0 & 0x80) != 0;
        let rsv1 = (byte0 & 0x40) != 0;
        let rsv2 = (byte0 & 0x20) != 0;
        let rsv3 = (byte0 & 0x10) != 0;
        let opcode = byte0 & 0x0F;
        
        let masked = (byte1 & 0x80) != 0;
        let mut payload_len = (byte1 & 0x7F) as u64;
        
        let mut offset = 2;
        
        if payload_len == 126 {
            if data.len() < 4 {
                return Ok(None);
            }
            payload_len = u16::from_be_bytes([data[2], data[3]]) as u64;
            offset += 2;
        } else if payload_len == 127 {
            if data.len() < 10 {
                return Ok(None);
            }
            payload_len = u64::from_be_bytes([
                data[2], data[3], data[4], data[5],
                data[6], data[7], data[8], data[9],
            ]);
            offset += 8;
        }
        
        let masking_key: Option<[u8; 4]> = if masked {
            if data.len() < offset + 4 {
                return Ok(None);
            }
            Some([data[offset], data[offset + 1], data[offset + 2], data[offset + 3]])
        } else {
            None
        };
        
        if masked {
            offset += 4;
        }
        
        if data.len() < offset + payload_len as usize {
            return Ok(None);
        }
        
        let mut payload = data[offset..offset + payload_len as usize].to_vec();
        
        if let Some(mask) = masking_key {
            for i in 0..payload.len() {
                payload[i] ^= mask[i % 4];
            }
        }
        
        let opcode = match opcode {
            0x00 => WebSocketOpcode::Continuation,
            0x01 => WebSocketOpcode::Text,
            0x02 => WebSocketOpcode::Binary,
            0x08 => WebSocketOpcode::Close,
            0x09 => WebSocketOpcode::Ping,
            0x0A => WebSocketOpcode::Pong,
            _ => WebSocketOpcode::Unknown(opcode),
        };
        
        let payload_text = match opcode {
            WebSocketOpcode::Text => String::from_utf8(payload.clone()).ok(),
            _ => None,
        };
        
        let frame = WebSocketFrame {
            fin,
            rsv1,
            rsv2,
            rsv3,
            opcode,
            masked,
            masking_key,
            payload_length: payload_len,
            payload: payload.clone(),
            payload_text,
            is_from_client,
            timestamp: Utc::now(),
        };
        
        Ok(Some(frame))
    }
    
    pub fn is_websocket_upgrade(response: &HttpResponse) -> bool {
        let headers = &response.headers;
        
        let upgrade_header = headers.get("Upgrade")
            .or_else(|| headers.get("upgrade"))
            .and_then(|v| v.as_str());
        
        let connection_header = headers.get("Connection")
            .or_else(|| headers.get("connection"))
            .and_then(|v| v.as_str());
        
        response.status_code == 101 &&
            upgrade_header.map(|s| s.to_lowercase().contains("websocket")).unwrap_or(false) &&
            connection_header.map(|s| s.to_lowercase().contains("upgrade")).unwrap_or(false)
    }
    
    pub fn create_mock_websocket_session() -> WebSocketSession {
        let frames = vec![
            WebSocketFrame {
                fin: true,
                rsv1: false,
                rsv2: false,
                rsv3: false,
                opcode: WebSocketOpcode::Text,
                masked: true,
                masking_key: Some([0x01, 0x02, 0x03, 0x04]),
                payload_length: 13,
                payload: b"Hello Server!".to_vec(),
                payload_text: Some("Hello Server!".to_string()),
                is_from_client: true,
                timestamp: Utc::now(),
            },
            WebSocketFrame {
                fin: true,
                rsv1: false,
                rsv2: false,
                rsv3: false,
                opcode: WebSocketOpcode::Text,
                masked: false,
                masking_key: None,
                payload_length: 12,
                payload: b"Hello Client!".to_vec(),
                payload_text: Some("Hello Client!".to_string()),
                is_from_client: false,
                timestamp: Utc::now(),
            },
            WebSocketFrame {
                fin: true,
                rsv1: false,
                rsv2: false,
                rsv3: false,
                opcode: WebSocketOpcode::Binary,
                masked: true,
                masking_key: Some([0x05, 0x06, 0x07, 0x08]),
                payload_length: 4,
                payload: vec![0x01, 0x02, 0x03, 0x04],
                payload_text: None,
                is_from_client: true,
                timestamp: Utc::now(),
            },
        ];
        
        WebSocketSession {
            frames,
            handshake_request: None,
            handshake_response: None,
            is_client_masked: true,
        }
    }
}

impl Default for WebSocketParser {
    fn default() -> Self {
        Self::new()
    }
}
