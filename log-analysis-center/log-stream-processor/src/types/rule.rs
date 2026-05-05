use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub conditions: Vec<Condition>,
    pub actions: Vec<Action>,
    pub enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    pub field: String,
    pub operator: Operator,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Operator {
    Equals,
    NotEquals,
    Contains,
    NotContains,
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
    RegexMatch,
    RegexNotMatch,
    In,
    NotIn,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Action {
    pub action_type: ActionType,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionType {
    Email,
    Webhook,
    CreateAlert,
    AddTag,
}

impl Rule {
    pub fn new(name: String, conditions: Vec<Condition>, actions: Vec<Action>) -> Self {
        let now = chrono::Utc::now();
        Rule {
            id: Uuid::new_v4(),
            name,
            description: None,
            conditions,
            actions,
            enabled: true,
            created_at: now,
            updated_at: now,
        }
    }
}
