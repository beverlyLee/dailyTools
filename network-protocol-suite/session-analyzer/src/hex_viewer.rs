use super::error::*;
use super::models::*;

pub struct HexViewer {
    view_mode: ViewMode,
}

impl HexViewer {
    pub fn new() -> Self {
        Self {
            view_mode: ViewMode::default(),
        }
    }
    
    pub fn with_mode(mode: ViewMode) -> Self {
        Self {
            view_mode: mode,
        }
    }
    
    pub fn set_mode(&mut self, mode: ViewMode) {
        self.view_mode = mode;
    }
    
    pub fn get_mode(&self) -> &ViewMode {
        &self.view_mode
    }
    
    pub fn format_hex_view(&self, data: &[u8], offset: u64) -> Vec<HexViewResult> {
        let bytes_per_row = self.view_mode.bytes_per_row as usize;
        let mut results = Vec::new();
        
        for chunk_start in (0..data.len()).step_by(bytes_per_row) {
            let chunk_end = std::cmp::min(chunk_start + bytes_per_row, data.len());
            let chunk = &data[chunk_start..chunk_end];
            
            let hex_bytes: Vec<String> = chunk.iter()
                .map(|b| format!("{:02x}", b))
                .collect();
            
            let ascii: String = chunk.iter()
                .map(|&b| {
                    if b >= 32 && b <= 126 {
                        b as char
                    } else {
                        '.'
                    }
                })
                .collect();
            
            results.push(HexViewResult {
                offset: offset + chunk_start as u64,
                hex_bytes,
                ascii,
                raw_bytes: chunk.to_vec(),
            });
        }
        
        results
    }
    
    pub fn format_text_view(&self, data: &[u8]) -> String {
        match self.view_mode.encoding {
            TextEncoding::Utf8 => String::from_utf8_lossy(data).to_string(),
            TextEncoding::Latin1 => data.iter().map(|&b| b as char).collect(),
            TextEncoding::Utf16 => {
                if data.len() % 2 == 0 {
                    let mut result = String::new();
                    for chunk in data.chunks(2) {
                        let code_point = u16::from_be_bytes([chunk[0], chunk[1]]);
                        if let Some(c) = std::char::from_u32(code_point as u32) {
                            result.push(c);
                        } else {
                            result.push('�');
                        }
                    }
                    result
                } else {
                    String::from_utf8_lossy(data).to_string()
                }
            }
            TextEncoding::Ascii => data.iter()
                .map(|&b| if b < 128 { b as char } else { '.' })
                .collect(),
        }
    }
    
    pub fn format_split_view(&self, data: &[u8], offset: u64) -> (Vec<HexViewResult>, String) {
        let hex_view = self.format_hex_view(data, offset);
        let text_view = self.format_text_view(data);
        (hex_view, text_view)
    }
    
    pub fn search_hex(&self, data: &[u8], hex_pattern: &str) -> Result<Vec<usize>> {
        let pattern_bytes = self.parse_hex_pattern(hex_pattern)?;
        
        if pattern_bytes.is_empty() {
            return Ok(Vec::new());
        }
        
        let mut positions = Vec::new();
        
        for i in 0..=data.len().saturating_sub(pattern_bytes.len()) {
            if data[i..i + pattern_bytes.len()] == pattern_bytes {
                positions.push(i);
            }
        }
        
        Ok(positions)
    }
    
    pub fn search_text(&self, data: &[u8], text_pattern: &str) -> Vec<usize> {
        let text = self.format_text_view(data);
        let mut positions = Vec::new();
        let mut start = 0;
        
        while let Some(pos) = text[start..].find(text_pattern) {
            positions.push(start + pos);
            start = start + pos + 1;
        }
        
        positions
    }
    
    fn parse_hex_pattern(&self, hex_pattern: &str) -> Result<Vec<u8>> {
        let clean_pattern: String = hex_pattern.chars()
            .filter(|c| !c.is_whitespace())
            .collect();
        
        if clean_pattern.len() % 2 != 0 {
            return Err(AnalyzerError::HexView("十六进制模式长度必须为偶数".to_string()));
        }
        
        let mut bytes = Vec::new();
        for i in (0..clean_pattern.len()).step_by(2) {
            let byte_str = &clean_pattern[i..i + 2];
            let byte = u8::from_str_radix(byte_str, 16)
                .map_err(|_| AnalyzerError::HexView(format!("无效的十六进制字节: {}", byte_str)))?;
            bytes.push(byte);
        }
        
        Ok(bytes)
    }
    
    pub fn get_byte_at(&self, data: &[u8], offset: usize) -> Option<u8> {
        data.get(offset).copied()
    }
    
    pub fn get_bytes_range(&self, data: &[u8], start: usize, length: usize) -> &[u8] {
        let end = std::cmp::min(start + length, data.len());
        if start >= data.len() {
            &[]
        } else {
            &data[start..end]
        }
    }
    
    pub fn format_as_hex_string(&self, data: &[u8], separator: &str) -> String {
        data.iter()
            .map(|b| format!("{:02x}", b))
            .collect::<Vec<_>>()
            .join(separator)
    }
    
    pub fn format_as_hex_dump(&self, data: &[u8], offset: u64) -> String {
        let mut result = String::new();
        let bytes_per_row = self.view_mode.bytes_per_row as usize;
        
        for (row_idx, chunk) in data.chunks(bytes_per_row).enumerate() {
            let row_offset = offset + (row_idx * bytes_per_row) as u64;
            
            result.push_str(&format!("{:08x}  ", row_offset));
            
            for (i, &byte) in chunk.iter().enumerate() {
                result.push_str(&format!("{:02x} ", byte));
                if i == 7 {
                    result.push_str(" ");
                }
            }
            
            let padding = (bytes_per_row - chunk.len()) * 3;
            let extra_pad = if chunk.len() <= 8 { 1 } else { 0 };
            result.push_str(&" ".repeat(padding + extra_pad));
            
            result.push_str(" |");
            for &byte in chunk {
                if byte >= 32 && byte <= 126 {
                    result.push(byte as char);
                } else {
                    result.push('.');
                }
            }
            result.push_str("|\n");
        }
        
        result
    }
    
    pub fn create_mock_hex_data() -> Vec<u8> {
        let mut data = Vec::new();
        
        data.extend_from_slice(b"GET /index.html HTTP/1.1\r\n");
        data.extend_from_slice(b"Host: example.com\r\n");
        data.extend_from_slice(b"User-Agent: Mozilla/5.0\r\n");
        data.extend_from_slice(b"Accept: text/html\r\n");
        data.extend_from_slice(b"\r\n");
        
        data.extend_from_slice(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]);
        data.extend_from_slice(&[0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40]);
        data.extend_from_slice(&[0x08, 0x06, 0x00, 0x00, 0x00, 0xAA, 0x69, 0x71]);
        data.extend_from_slice(&[0xDE, 0x00, 0x00, 0x00, 0x04, 0x73, 0x42, 0x49]);
        data.extend_from_slice(&[0x54, 0x08, 0x08, 0x08, 0x08, 0x7C, 0x08, 0x64]);
        
        data
    }
}

impl Default for HexViewer {
    fn default() -> Self {
        Self::new()
    }
}
