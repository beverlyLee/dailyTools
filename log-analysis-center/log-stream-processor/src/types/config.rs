use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub sources: SourcesConfig,
    pub alerts: AlertsConfig,
    pub storage: StorageConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourcesConfig {
    pub syslog: Option<SyslogConfig>,
    pub kafka: Option<KafkaConfig>,
    pub filebeat: Option<FilebeatConfig>,
    pub http: Option<HttpConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyslogConfig {
    pub enabled: bool,
    pub address: String,
    pub port: u16,
    pub protocol: SyslogProtocol,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyslogProtocol {
    Udp,
    Tcp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KafkaConfig {
    pub enabled: bool,
    pub brokers: Vec<String>,
    pub topics: Vec<String>,
    pub group_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilebeatConfig {
    pub enabled: bool,
    pub paths: Vec<String>,
    pub fields_under_root: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpConfig {
    pub enabled: bool,
    pub endpoint: String,
    pub token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertsConfig {
    pub email: Option<EmailConfig>,
    pub webhook: Option<WebhookConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailConfig {
    pub enabled: bool,
    pub smtp_server: String,
    pub smtp_port: u16,
    pub from_address: String,
    pub from_name: String,
    pub username: String,
    pub password: String,
    pub recipients: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookConfig {
    pub enabled: bool,
    pub url: String,
    pub method: String,
    pub headers: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    pub in_memory: InMemoryConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InMemoryConfig {
    pub max_log_entries: usize,
    pub max_alerts: usize,
    pub retention_hours: u64,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 8080,
                workers: 4,
            },
            sources: SourcesConfig {
                syslog: Some(SyslogConfig {
                    enabled: false,
                    address: "0.0.0.0".to_string(),
                    port: 514,
                    protocol: SyslogProtocol::Udp,
                }),
                kafka: None,
                filebeat: None,
                http: Some(HttpConfig {
                    enabled: true,
                    endpoint: "/api/logs".to_string(),
                    token: None,
                }),
            },
            alerts: AlertsConfig {
                email: None,
                webhook: None,
            },
            storage: StorageConfig {
                in_memory: InMemoryConfig {
                    max_log_entries: 100000,
                    max_alerts: 10000,
                    retention_hours: 24,
                },
            },
        }
    }
}
