use super::error::*;
use super::models::*;
use chrono::Utc;
use std::collections::HashMap;
use uuid::Uuid;

pub struct FileExtractor {
    extracted_files: HashMap<String, ExtractedFile>,
}

impl FileExtractor {
    pub fn new() -> Self {
        Self {
            extracted_files: HashMap::new(),
        }
    }
    
    pub fn extract_from_http_response(&mut self, response: &HttpResponse, session_id: &str) -> Result<Option<ExtractedFile>> {
        let content_type = match &response.content_type {
            Some(ct) => ct.to_lowercase(),
            None => return Ok(None),
        };
        
        let is_extractable = content_type.contains("image") ||
            content_type.contains("javascript") ||
            content_type.contains("css") ||
            content_type.contains("pdf") ||
            content_type.contains("font") ||
            content_type.contains("octet-stream");
        
        if !is_extractable || response.body.is_empty() {
            return Ok(None);
        }
        
        let filename = self.guess_filename(&response.headers, &content_type);
        let preview = self.generate_preview(&response.body, &content_type);
        
        let file = ExtractedFile {
            id: Uuid::new_v4().to_string(),
            name: filename.clone(),
            filename: filename,
            content_type: content_type.clone(),
            data: response.body.clone(),
            size: response.body.len() as u64,
            source_url: None,
            source_session: session_id.to_string(),
            extracted_at: Utc::now(),
            preview,
        };
        
        self.extracted_files.insert(file.id.clone(), file.clone());
        
        Ok(Some(file))
    }
    
    pub fn extract_from_http_request(&mut self, request: &HttpRequest, session_id: &str) -> Result<Option<ExtractedFile>> {
        let content_type = match &request.content_type {
            Some(ct) => ct.to_lowercase(),
            None => return Ok(None),
        };
        
        let is_extractable = content_type.contains("multipart/form-data") ||
            content_type.contains("image") ||
            content_type.contains("octet-stream");
        
        if !is_extractable || request.body.is_empty() {
            return Ok(None);
        }
        
        let filename = self.guess_filename(&request.headers, &content_type);
        let preview = self.generate_preview(&request.body, &content_type);
        
        let file = ExtractedFile {
            id: Uuid::new_v4().to_string(),
            name: filename.clone(),
            filename: filename,
            content_type: content_type.clone(),
            data: request.body.clone(),
            size: request.body.len() as u64,
            source_url: Some(request.url.clone()),
            source_session: session_id.to_string(),
            extracted_at: Utc::now(),
            preview,
        };
        
        self.extracted_files.insert(file.id.clone(), file.clone());
        
        Ok(Some(file))
    }
    
    fn guess_filename(&self, headers: &serde_json::Value, content_type: &str) -> String {
        if let Some(cd) = headers.get("Content-Disposition")
            .or_else(|| headers.get("content-disposition"))
            .and_then(|v| v.as_str()) {
            
            if let Some(filename_pos) = cd.to_lowercase().find("filename=") {
                let start = filename_pos + 9;
                let remaining = &cd[start..];
                let filename: String = remaining.chars()
                    .take_while(|&c| c != ';' && c != '"' && c != '\'')
                    .collect();
                if !filename.is_empty() {
                    return filename.trim_matches(&['"', '\''][..]).to_string();
                }
            }
        }
        
        let extension = match content_type {
            ct if ct.contains("image/jpeg") || ct.contains("image/jpg") => "jpg",
            ct if ct.contains("image/png") => "png",
            ct if ct.contains("image/gif") => "gif",
            ct if ct.contains("image/webp") => "webp",
            ct if ct.contains("image/svg") => "svg",
            ct if ct.contains("image/ico") || ct.contains("image/x-icon") => "ico",
            ct if ct.contains("javascript") => "js",
            ct if ct.contains("css") => "css",
            ct if ct.contains("pdf") => "pdf",
            ct if ct.contains("font/woff") => "woff",
            ct if ct.contains("font/woff2") => "woff2",
            ct if ct.contains("font/ttf") => "ttf",
            _ => "bin",
        };
        
        format!("extracted_file_{}.{}", Uuid::new_v4().to_string().split('-').next().unwrap(), extension)
    }
    
    fn generate_preview(&self, data: &[u8], content_type: &str) -> Option<FilePreview> {
        if content_type.contains("image") {
            let thumbnail = if data.len() > 100 {
                base64::encode(&data[..100])
            } else {
                base64::encode(data)
            };
            
            let format = if content_type.contains("png") { "PNG" }
            else if content_type.contains("jpeg") || content_type.contains("jpg") { "JPEG" }
            else if content_type.contains("gif") { "GIF" }
            else if content_type.contains("webp") { "WebP" }
            else if content_type.contains("svg") { "SVG" }
            else { "Unknown" };
            
            Some(FilePreview::Image {
                width: 0,
                height: 0,
                format: format.to_string(),
                thumbnail_base64: thumbnail,
            })
        } else if content_type.contains("text") || 
                  content_type.contains("javascript") || 
                  content_type.contains("css") ||
                  content_type.contains("json") ||
                  content_type.contains("html") ||
                  content_type.contains("xml") {
            
            let text = String::from_utf8_lossy(data);
            let preview: String = text.chars().take(500).collect();
            let line_count = preview.lines().count() as u32;
            
            Some(FilePreview::Text {
                preview,
                line_count,
            })
        } else if !data.is_empty() {
            let hex_preview: String = data.iter()
                .take(64)
                .map(|b| format!("{:02x}", b))
                .collect::<Vec<_>>()
                .join(" ");
            
            Some(FilePreview::Binary {
                hex_preview,
            })
        } else {
            Some(FilePreview::Unknown)
        }
    }
    
    pub fn get_file(&self, id: &str) -> Option<&ExtractedFile> {
        self.extracted_files.get(id)
    }
    
    pub fn get_all_files(&self) -> Vec<&ExtractedFile> {
        self.extracted_files.values().collect()
    }
    
    pub fn get_files_by_session(&self, session_id: &str) -> Vec<&ExtractedFile> {
        self.extracted_files.values()
            .filter(|f| f.source_session == session_id)
            .collect()
    }
    
    pub fn get_files_by_type(&self, content_type_pattern: &str) -> Vec<&ExtractedFile> {
        let pattern = content_type_pattern.to_lowercase();
        self.extracted_files.values()
            .filter(|f| f.content_type.to_lowercase().contains(&pattern))
            .collect()
    }
    
    pub fn remove_file(&mut self, id: &str) -> Option<ExtractedFile> {
        self.extracted_files.remove(id)
    }
    
    pub fn clear_all(&mut self) {
        self.extracted_files.clear();
    }
    
    pub fn create_mock_extracted_files() -> Vec<ExtractedFile> {
        vec![
            ExtractedFile {
                id: Uuid::new_v4().to_string(),
                name: "logo.png".to_string(),
                filename: "logo.png".to_string(),
                content_type: "image/png".to_string(),
                data: vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
                size: 8,
                source_url: Some("/images/logo.png".to_string()),
                source_session: "session-123".to_string(),
                extracted_at: Utc::now(),
                preview: Some(FilePreview::Image {
                    width: 100,
                    height: 50,
                    format: "PNG".to_string(),
                    thumbnail_base64: base64::encode(&[0x89, 0x50, 0x4E, 0x47]),
                }),
            },
            ExtractedFile {
                id: Uuid::new_v4().to_string(),
                name: "style.css".to_string(),
                filename: "style.css".to_string(),
                content_type: "text/css".to_string(),
                data: b"body { margin: 0; padding: 0; font-family: Arial; }".to_vec(),
                size: 56,
                source_url: Some("/css/style.css".to_string()),
                source_session: "session-123".to_string(),
                extracted_at: Utc::now(),
                preview: Some(FilePreview::Text {
                    preview: "body { margin: 0; padding: 0; font-family: Arial; }".to_string(),
                    line_count: 1,
                }),
            },
            ExtractedFile {
                id: Uuid::new_v4().to_string(),
                name: "app.js".to_string(),
                filename: "app.js".to_string(),
                content_type: "application/javascript".to_string(),
                data: b"console.log('Hello World');\nconst app = {};".to_vec(),
                size: 41,
                source_url: Some("/js/app.js".to_string()),
                source_session: "session-123".to_string(),
                extracted_at: Utc::now(),
                preview: Some(FilePreview::Text {
                    preview: "console.log('Hello World');\nconst app = {};".to_string(),
                    line_count: 2,
                }),
            },
        ]
    }
}

impl Default for FileExtractor {
    fn default() -> Self {
        Self::new()
    }
}
