use super::error::*;
use super::models::*;
use chrono::Utc;
use std::collections::HashMap;

pub struct HttpParser {
    pending_requests: HashMap<String, Vec<u8>>,
    pending_responses: HashMap<String, Vec<u8>>,
}

impl HttpParser {
    pub fn new() -> Self {
        Self {
            pending_requests: HashMap::new(),
            pending_responses: HashMap::new(),
        }
    }
    
    pub fn parse_request(&mut self, data: &[u8]) -> Result<Option<HttpRequest>> {
        if data.is_empty() {
            return Ok(None);
        }
        
        let data_str = String::from_utf8_lossy(data);
        
        let header_end = if let Some(pos) = data_str.find("\r\n\r\n") {
            pos
        } else if let Some(pos) = data_str.find("\n\n") {
            pos
        } else {
            return Ok(None);
        };
        
        let header_section = &data_str[..header_end];
        let body = &data[header_end + if data_str[header_end..].starts_with("\r\n\r\n") { 4 } else { 2 }..];
        
        let lines: Vec<&str> = header_section.split(&['\r', '\n'][..])
            .filter(|s| !s.is_empty())
            .collect();
        
        if lines.is_empty() {
            return Err(AnalyzerError::HttpParse("空的HTTP请求".to_string()));
        }
        
        let request_line = lines[0];
        let parts: Vec<&str> = request_line.split_whitespace().collect();
        
        if parts.len() < 3 {
            return Err(AnalyzerError::HttpParse(format!("无效的请求行: {}", request_line)));
        }
        
        let method = parts[0].to_string();
        let url = parts[1].to_string();
        let version = parts[2].to_string();
        
        let mut headers = serde_json::Map::new();
        let mut content_type = None;
        let mut content_length = 0u64;
        
        for line in &lines[1..] {
            if let Some(colon_pos) = line.find(':') {
                let key = line[..colon_pos].trim().to_string();
                let value = line[colon_pos + 1..].trim().to_string();
                
                if key.eq_ignore_ascii_case("Content-Type") {
                    content_type = Some(value.clone());
                }
                if key.eq_ignore_ascii_case("Content-Length") {
                    if let Ok(len) = value.parse::<u64>() {
                        content_length = len;
                    }
                }
                
                headers.insert(key, serde_json::json!(value));
            }
        }
        
        let body_text = String::from_utf8_lossy(body).to_string();
        
        let request = HttpRequest {
            method,
            url,
            version,
            headers: serde_json::json!(headers),
            body: body.to_vec(),
            body_text: Some(body_text),
            content_type,
            content_length,
            timestamp: Utc::now(),
        };
        
        Ok(Some(request))
    }
    
    pub fn parse_response(&mut self, data: &[u8]) -> Result<Option<HttpResponse>> {
        if data.is_empty() {
            return Ok(None);
        }
        
        let data_str = String::from_utf8_lossy(data);
        
        let header_end = if let Some(pos) = data_str.find("\r\n\r\n") {
            pos
        } else if let Some(pos) = data_str.find("\n\n") {
            pos
        } else {
            return Ok(None);
        };
        
        let header_section = &data_str[..header_end];
        let body = &data[header_end + if data_str[header_end..].starts_with("\r\n\r\n") { 4 } else { 2 }..];
        
        let lines: Vec<&str> = header_section.split(&['\r', '\n'][..])
            .filter(|s| !s.is_empty())
            .collect();
        
        if lines.is_empty() {
            return Err(AnalyzerError::HttpParse("空的HTTP响应".to_string()));
        }
        
        let status_line = lines[0];
        let parts: Vec<&str> = status_line.split_whitespace().collect();
        
        if parts.len() < 3 {
            return Err(AnalyzerError::HttpParse(format!("无效的状态行: {}", status_line)));
        }
        
        let version = parts[0].to_string();
        let status_code: u16 = parts[1].parse()
            .map_err(|_| AnalyzerError::HttpParse(format!("无效的状态码: {}", parts[1])))?;
        let status_text = parts[2..].join(" ");
        
        let mut headers = serde_json::Map::new();
        let mut content_type = None;
        let mut content_length = 0u64;
        
        for line in &lines[1..] {
            if let Some(colon_pos) = line.find(':') {
                let key = line[..colon_pos].trim().to_string();
                let value = line[colon_pos + 1..].trim().to_string();
                
                if key.eq_ignore_ascii_case("Content-Type") {
                    content_type = Some(value.clone());
                }
                if key.eq_ignore_ascii_case("Content-Length") {
                    if let Ok(len) = value.parse::<u64>() {
                        content_length = len;
                    }
                }
                
                headers.insert(key, serde_json::json!(value));
            }
        }
        
        let body_text = String::from_utf8_lossy(body).to_string();
        
        let response = HttpResponse {
            version,
            status_code,
            status_text,
            headers: serde_json::json!(headers),
            body: body.to_vec(),
            body_text: Some(body_text),
            content_type,
            content_length,
            timestamp: Utc::now(),
        };
        
        Ok(Some(response))
    }
    
    pub fn is_http_request(data: &[u8]) -> bool {
        let methods = ["GET ", "POST ", "PUT ", "DELETE ", "HEAD ", "OPTIONS ", "PATCH ", "CONNECT ", "TRACE "];
        let data_str = String::from_utf8_lossy(data);
        methods.iter().any(|m| data_str.starts_with(m))
    }
    
    pub fn is_http_response(data: &[u8]) -> bool {
        let data_str = String::from_utf8_lossy(data);
        data_str.starts_with("HTTP/")
    }
    
    pub fn extract_http_info_from_packet(&mut self, packet: &crate::models::TcpSegment) -> Result<Option<HttpInfoType>> {
        let data = &packet.payload;
        
        if Self::is_http_request(data) {
            if let Some(request) = self.parse_request(data)? {
                return Ok(Some(HttpInfoType::Request(request)));
            }
        }
        
        if Self::is_http_response(data) {
            if let Some(response) = self.parse_response(data)? {
                return Ok(Some(HttpInfoType::Response(response)));
            }
        }
        
        Ok(None)
    }
}

pub enum HttpInfoType {
    Request(HttpRequest),
    Response(HttpResponse),
}

impl Default for HttpParser {
    fn default() -> Self {
        Self::new()
    }
}

pub fn create_mock_http_session() -> HttpSession {
    let mut cookies = Vec::new();
    cookies.push(("session_id".to_string(), "abc123xyz".to_string()));
    cookies.push(("user_token".to_string(), "token_12345".to_string()));
    
    let requests = vec![
        HttpRequest {
            method: "GET".to_string(),
            url: "/index.html".to_string(),
            version: "HTTP/1.1".to_string(),
            headers: serde_json::json!({
                "Host": "example.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            }),
            body: Vec::new(),
            body_text: None,
            content_type: None,
            content_length: 0,
            timestamp: Utc::now(),
        },
        HttpRequest {
            method: "GET".to_string(),
            url: "/style.css".to_string(),
            version: "HTTP/1.1".to_string(),
            headers: serde_json::json!({
                "Host": "example.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/css,*/*;q=0.1",
                "Referer": "https://example.com/index.html",
            }),
            body: Vec::new(),
            body_text: None,
            content_type: None,
            content_length: 0,
            timestamp: Utc::now(),
        },
    ];
    
    let responses = vec![
        HttpResponse {
            version: "HTTP/1.1".to_string(),
            status_code: 200,
            status_text: "OK".to_string(),
            headers: serde_json::json!({
                "Content-Type": "text/html; charset=utf-8",
                "Content-Length": "1234",
                "Server": "nginx/1.18.0",
                "Date": "Tue, 05 May 2025 12:00:00 GMT",
                "Cache-Control": "public, max-age=3600",
            }),
            body: b"<html><head><title>Example</title></head><body><h1>Hello World</h1></body></html>".to_vec(),
            body_text: Some("<html><head><title>Example</title></head><body><h1>Hello World</h1></body></html>".to_string()),
            content_type: Some("text/html; charset=utf-8".to_string()),
            content_length: 1234,
            timestamp: Utc::now(),
        },
    ];
    
    HttpSession {
        requests,
        responses,
        host: Some("example.com".to_string()),
        user_agent: Some("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36".to_string()),
        cookies,
        extracted_files: Vec::new(),
    }
}
