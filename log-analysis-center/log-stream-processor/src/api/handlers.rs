use crate::types::{LogEntry, LogLevel, Alert, Rule, Condition, Operator, Action, ActionType, AlertSeverity};
use crate::storage::LogStorage;
use crate::engine::RuleEngine;
use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub limit: Option<usize>,
    pub level: Option<String>,
    pub service: Option<String>,
    pub from_time: Option<String>,
    pub to_time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRuleRequest {
    pub name: String,
    pub description: Option<String>,
    pub conditions: Vec<ConditionDto>,
    pub actions: Vec<ActionDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionDto {
    pub field: String,
    pub operator: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionDto {
    pub action_type: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertUpdateRequest {
    pub status: Option<String>,
}

pub async fn get_health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

pub async fn get_logs(
    storage: web::Data<Arc<LogStorage>>,
    query: web::Query<SearchQuery>,
) -> impl Responder {
    let limit = query.limit.unwrap_or(100);
    
    let logs = if query.query.is_empty() {
        storage.get_logs(limit).await
    } else {
        storage.search_logs(&query.query, limit).await
    };

    match logs {
        Ok(logs) => {
            let mut filtered_logs = logs;
            
            if let Some(level_filter) = &query.level {
                filtered_logs = filtered_logs
                    .into_iter()
                    .filter(|log| log.level.to_string().to_uppercase() == level_filter.to_uppercase())
                    .collect();
            }
            
            if let Some(service_filter) = &query.service {
                filtered_logs = filtered_logs
                    .into_iter()
                    .filter(|log| {
                        log.service
                            .as_ref()
                            .map(|s| s.to_lowercase().contains(&service_filter.to_lowercase()))
                            .unwrap_or(false)
                    })
                    .collect();
            }

            HttpResponse::Ok().json(serde_json::json!({
                "total": filtered_logs.len(),
                "logs": filtered_logs
            }))
        }
        Err(e) => {
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to retrieve logs: {}", e)
            }))
        }
    }
}

pub async fn search_logs_lucene(
    storage: web::Data<Arc<LogStorage>>,
    query: web::Json<SearchQuery>,
) -> impl Responder {
    let limit = query.limit.unwrap_or(100);
    
    let logs = storage.search_logs(&query.query, limit).await;

    match logs {
        Ok(logs) => HttpResponse::Ok().json(serde_json::json!({
            "total": logs.len(),
            "query": query.query,
            "logs": logs
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Search failed: {}", e)
        })),
    }
}

pub async fn get_stats(
    storage: web::Data<Arc<LogStorage>>,
) -> impl Responder {
    let logs = match storage.get_logs(10000).await {
        Ok(logs) => logs,
        Err(_) => vec![],
    };

    let alerts = match storage.get_alerts(1000).await {
        Ok(alerts) => alerts,
        Err(_) => vec![],
    };

    let level_counts: std::collections::HashMap<String, usize> = logs
        .iter()
        .map(|log| (log.level.to_string(), 1))
        .fold(std::collections::HashMap::new(), |mut acc, (level, count)| {
            *acc.entry(level).or_insert(0) += count;
            acc
        });

    let service_counts: std::collections::HashMap<String, usize> = logs
        .iter()
        .filter_map(|log| log.service.clone())
        .fold(std::collections::HashMap::new(), |mut acc, service| {
            *acc.entry(service).or_insert(0) += 1;
            acc
        });

    let error_rate = if logs.is_empty() {
        0.0
    } else {
        let error_count = logs
            .iter()
            .filter(|log| log.level >= LogLevel::Error)
            .count();
        (error_count as f64 / logs.len() as f64) * 100.0
    };

    let severity_counts: std::collections::HashMap<String, usize> = alerts
        .iter()
        .map(|alert| (alert.severity.to_string(), 1))
        .fold(std::collections::HashMap::new(), |mut acc, (severity, count)| {
            *acc.entry(severity).or_insert(0) += count;
            acc
        });

    HttpResponse::Ok().json(serde_json::json!({
        "logs": {
            "total": logs.len(),
            "by_level": level_counts,
            "by_service": service_counts,
            "error_rate_percent": error_rate
        },
        "alerts": {
            "total": alerts.len(),
            "by_severity": severity_counts
        }
    }))
}

pub async fn get_rules(
    rule_engine: web::Data<Arc<RuleEngine>>,
) -> impl Responder {
    match rule_engine.get_rules().await {
        Ok(rules) => HttpResponse::Ok().json(serde_json::json!({
            "total": rules.len(),
            "rules": rules
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get rules: {}", e)
        })),
    }
}

pub async fn create_rule(
    rule_engine: web::Data<Arc<RuleEngine>>,
    request: web::Json<CreateRuleRequest>,
) -> impl Responder {
    let conditions: Vec<Condition> = request
        .conditions
        .iter()
        .map(|c| Condition {
            field: c.field.clone(),
            operator: match c.operator.to_uppercase().as_str() {
                "EQUALS" => Operator::Equals,
                "NOT_EQUALS" => Operator::NotEquals,
                "CONTAINS" => Operator::Contains,
                "NOT_CONTAINS" => Operator::NotContains,
                "GREATER_THAN" => Operator::GreaterThan,
                "LESS_THAN" => Operator::LessThan,
                "GREATER_THAN_OR_EQUAL" => Operator::GreaterThanOrEqual,
                "LESS_THAN_OR_EQUAL" => Operator::LessThanOrEqual,
                "REGEX_MATCH" => Operator::RegexMatch,
                "REGEX_NOT_MATCH" => Operator::RegexNotMatch,
                "IN" => Operator::In,
                "NOT_IN" => Operator::NotIn,
                _ => Operator::Equals,
            },
            value: c.value.clone(),
        })
        .collect();

    let actions: Vec<Action> = request
        .actions
        .iter()
        .map(|a| Action {
            action_type: match a.action_type.to_uppercase().as_str() {
                "EMAIL" => ActionType::Email,
                "WEBHOOK" => ActionType::Webhook,
                "CREATE_ALERT" => ActionType::CreateAlert,
                "ADD_TAG" => ActionType::AddTag,
                _ => ActionType::CreateAlert,
            },
            config: a.config.clone(),
        })
        .collect();

    let rule = Rule::new(
        request.name.clone(),
        conditions,
        actions,
    );

    match rule_engine.add_rule(rule).await {
        Ok(_) => HttpResponse::Created().json(serde_json::json!({
            "status": "success",
            "message": "Rule created successfully"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create rule: {}", e)
        })),
    }
}

pub async fn delete_rule(
    rule_engine: web::Data<Arc<RuleEngine>>,
    rule_id: web::Path<String>,
) -> impl Responder {
    match rule_engine.remove_rule(&rule_id).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Rule deleted successfully"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to delete rule: {}", e)
        })),
    }
}

pub async fn get_alerts(
    storage: web::Data<Arc<LogStorage>>,
) -> impl Responder {
    match storage.get_alerts(1000).await {
        Ok(alerts) => HttpResponse::Ok().json(serde_json::json!({
            "total": alerts.len(),
            "alerts": alerts
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get alerts: {}", e)
        })),
    }
}
