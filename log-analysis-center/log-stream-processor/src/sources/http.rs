use crate::types::{LogEntry, LogLevel};
use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpLogRequest {
    pub message: String,
    pub level: Option<String>,
    pub service: Option<String>,
    pub hostname: Option<String>,
    pub tags: Option<Vec<String>>,
    pub fields: Option<serde_json::Value>,
}

pub async fn receive_log(
    log: web::Json<HttpLogRequest>,
    storage: web::Data<crate::storage::LogStorage>,
) -> impl Responder {
    let log_entry = match parse_http_log(log.into_inner()) {
        Ok(entry) => entry,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Failed to parse log: {}", e)
            }));
        }
    };

    tracing::info!("Received log via HTTP: {}", log_entry.id);
    
    if let Err(e) = storage.add_log(log_entry.clone()).await {
        tracing::error!("Failed to store log: {}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to store log"
        }));
    }

    HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "id": log_entry.id.to_string()
    }))
}

fn parse_http_log(request: HttpLogRequest) -> anyhow::Result<LogEntry> {
    let level = match request.level {
        Some(level_str) => level_str.parse::<LogLevel>()?,
        None => LogLevel::Info,
    };

    let mut entry = LogEntry::new(
        request.message,
        level,
        crate::types::LogSource::Http,
    );

    entry.service = request.service;
    entry.hostname = request.hostname;
    entry.tags = request.tags.unwrap_or_default();
    entry.fields = request.fields.unwrap_or(serde_json::json!({}));

    Ok(entry)
}
