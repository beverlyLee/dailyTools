use crate::types::{LogEntry, Rule, Condition, Operator, Action, ActionType, Alert, AlertSeverity};
use regex::Regex;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct RuleEngine {
    rules: Arc<RwLock<HashMap<String, Rule>>>,
}

impl RuleEngine {
    pub fn new() -> Self {
        RuleEngine {
            rules: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn add_rule(&self, rule: Rule) -> anyhow::Result<()> {
        let mut rules = self.rules.write().await;
        rules.insert(rule.id.to_string(), rule);
        Ok(())
    }

    pub async fn remove_rule(&self, rule_id: &str) -> anyhow::Result<()> {
        let mut rules = self.rules.write().await;
        rules.remove(rule_id);
        Ok(())
    }

    pub async fn get_rules(&self) -> anyhow::Result<Vec<Rule>> {
        let rules = self.rules.read().await;
        Ok(rules.values().cloned().collect())
    }

    pub async fn evaluate_log(&self, log: &LogEntry) -> anyhow::Result<Vec<Action>> {
        let rules = self.rules.read().await;
        let mut triggered_actions = Vec::new();

        for rule in rules.values() {
            if !rule.enabled {
                continue;
            }

            if self.evaluate_conditions(log, &rule.conditions)? {
                for action in &rule.actions {
                    triggered_actions.push(action.clone());
                }
            }
        }

        Ok(triggered_actions)
    }

    fn evaluate_conditions(&self, log: &LogEntry, conditions: &[Condition]) -> anyhow::Result<bool> {
        if conditions.is_empty() {
            return Ok(false);
        }

        for condition in conditions {
            if !self.evaluate_single_condition(log, condition)? {
                return Ok(false);
            }
        }

        Ok(true)
    }

    fn evaluate_single_condition(&self, log: &LogEntry, condition: &Condition) -> anyhow::Result<bool> {
        let field_value = self.get_field_value(log, &condition.field);
        let condition_value = &condition.value;

        match condition.operator {
            Operator::Equals => Ok(field_value == *condition_value),
            Operator::NotEquals => Ok(field_value != *condition_value),
            Operator::Contains => {
                let field_str = field_value.as_str().unwrap_or("");
                let cond_str = condition_value.as_str().unwrap_or("");
                Ok(field_str.contains(cond_str))
            }
            Operator::NotContains => {
                let field_str = field_value.as_str().unwrap_or("");
                let cond_str = condition_value.as_str().unwrap_or("");
                Ok(!field_str.contains(cond_str))
            }
            Operator::GreaterThan => {
                let field_num = field_value.as_f64().unwrap_or(0.0);
                let cond_num = condition_value.as_f64().unwrap_or(0.0);
                Ok(field_num > cond_num)
            }
            Operator::LessThan => {
                let field_num = field_value.as_f64().unwrap_or(0.0);
                let cond_num = condition_value.as_f64().unwrap_or(0.0);
                Ok(field_num < cond_num)
            }
            Operator::GreaterThanOrEqual => {
                let field_num = field_value.as_f64().unwrap_or(0.0);
                let cond_num = condition_value.as_f64().unwrap_or(0.0);
                Ok(field_num >= cond_num)
            }
            Operator::LessThanOrEqual => {
                let field_num = field_value.as_f64().unwrap_or(0.0);
                let cond_num = condition_value.as_f64().unwrap_or(0.0);
                Ok(field_num <= cond_num)
            }
            Operator::RegexMatch => {
                let field_str = field_value.as_str().unwrap_or("");
                let cond_str = condition_value.as_str().unwrap_or("");
                let regex = Regex::new(cond_str)?;
                Ok(regex.is_match(field_str))
            }
            Operator::RegexNotMatch => {
                let field_str = field_value.as_str().unwrap_or("");
                let cond_str = condition_value.as_str().unwrap_or("");
                let regex = Regex::new(cond_str)?;
                Ok(!regex.is_match(field_str))
            }
            Operator::In => {
                if let serde_json::Value::Array(arr) = condition_value {
                    Ok(arr.contains(&field_value))
                } else {
                    Ok(false)
                }
            }
            Operator::NotIn => {
                if let serde_json::Value::Array(arr) = condition_value {
                    Ok(!arr.contains(&field_value))
                } else {
                    Ok(true)
                }
            }
        }
    }

    fn get_field_value(&self, log: &LogEntry, field: &str) -> serde_json::Value {
        match field {
            "id" => serde_json::json!(log.id.to_string()),
            "timestamp" => serde_json::json!(log.timestamp.to_rfc3339()),
            "source" => serde_json::json!(format!("{:?}", log.source)),
            "level" => serde_json::json!(log.level.to_string()),
            "message" => serde_json::json!(&log.message),
            "service" => log.service.clone().map(|s| serde_json::json!(s)).unwrap_or(serde_json::Value::Null),
            "hostname" => log.hostname.clone().map(|h| serde_json::json!(h)).unwrap_or(serde_json::Value::Null),
            "tags" => serde_json::json!(&log.tags),
            _ => {
                if let Some(value) = log.fields.get(field) {
                    value.clone()
                } else {
                    serde_json::Value::Null
                }
            }
        }
    }

    pub async fn create_default_rules(&self) -> anyhow::Result<()> {
        let error_alert_rule = Rule::new(
            "High Error Rate Alert".to_string(),
            vec![
                Condition {
                    field: "level".to_string(),
                    operator: Operator::In,
                    value: serde_json::json!(["ERROR", "FATAL", "CRITICAL"]),
                },
            ],
            vec![
                Action {
                    action_type: ActionType::CreateAlert,
                    config: serde_json::json!({
                        "severity": "HIGH",
                        "title": "Error log detected",
                        "message": "An error or fatal level log was detected"
                    }),
                },
            ],
        );

        let warn_alert_rule = Rule::new(
            "Warning Alert".to_string(),
            vec![
                Condition {
                    field: "level".to_string(),
                    operator: Operator::Equals,
                    value: serde_json::json!("WARN"),
                },
            ],
            vec![
                Action {
                    action_type: ActionType::CreateAlert,
                    config: serde_json::json!({
                        "severity": "MEDIUM",
                        "title": "Warning log detected",
                        "message": "A warning level log was detected"
                    }),
                },
            ],
        );

        let failed_request_rule = Rule::new(
            "Failed Request Alert".to_string(),
            vec![
                Condition {
                    field: "status_code".to_string(),
                    operator: Operator::GreaterThanOrEqual,
                    value: serde_json::json!(500),
                },
            ],
            vec![
                Action {
                    action_type: ActionType::CreateAlert,
                    config: serde_json::json!({
                        "severity": "HIGH",
                        "title": "Server Error Detected",
                        "message": "A 5xx status code was detected in the logs"
                    }),
                },
            ],
        );

        self.add_rule(error_alert_rule).await?;
        self.add_rule(warn_alert_rule).await?;
        self.add_rule(failed_request_rule).await?;

        Ok(())
    }
}
