mod types;
mod sources;
mod parsers;
mod storage;
mod engine;
mod alerts;
mod api;

use crate::types::AppConfig;
use crate::storage::LogStorage;
use crate::engine::{RuleEngine, AlertManager};
use crate::alerts::{EmailChannel, WebhookChannel};
use crate::api::configure_routes;
use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use std::sync::Arc;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

#[actix_web::main]
async fn main() -> anyhow::Result<()> {
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting Log Stream Processor...");

    let config = AppConfig::default();

    let storage = Arc::new(LogStorage::new(
        config.storage.in_memory.max_log_entries,
        config.storage.in_memory.max_alerts,
    ));

    let rule_engine = Arc::new(RuleEngine::new());
    rule_engine.create_default_rules().await?;

    let mut alert_manager = AlertManager::new(Arc::clone(&storage));

    if let Some(email_config) = &config.alerts.email {
        if email_config.enabled {
            match EmailChannel::new(
                email_config.from_address.clone(),
                email_config.from_name.clone(),
                email_config.recipients.clone(),
                email_config.smtp_server.clone(),
                email_config.smtp_port,
                email_config.username.clone(),
                email_config.password.clone(),
            ) {
                Ok(email_channel) => {
                    alert_manager = alert_manager.with_email_channel(email_channel);
                    info!("Email alert channel configured");
                }
                Err(e) => {
                    tracing::warn!("Failed to configure email channel: {}", e);
                }
            }
        }
    }

    if let Some(webhook_config) = &config.alerts.webhook {
        if webhook_config.enabled {
            let webhook_channel = WebhookChannel::new(
                webhook_config.url.clone(),
                webhook_config.method.clone(),
                webhook_config.headers.clone(),
            );
            alert_manager = alert_manager.with_webhook_channel(webhook_channel);
            info!("Webhook alert channel configured");
        }
    }

    let _alert_manager = Arc::new(alert_manager);

    info!("Log Stream Processor starting on {}:{}", config.server.host, config.server.port);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(Arc::clone(&storage)))
            .app_data(web::Data::new(Arc::clone(&rule_engine)))
            .configure(configure_routes)
    })
    .workers(config.server.workers)
    .bind((config.server.host.as_str(), config.server.port))?
    .run()
    .await?;

    Ok(())
}
