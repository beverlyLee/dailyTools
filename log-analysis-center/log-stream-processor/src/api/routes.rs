use crate::api::handlers::*;
use crate::sources::http::receive_log;
use crate::storage::LogStorage;
use crate::engine::RuleEngine;
use actix_web::web;
use std::sync::Arc;

pub fn configure_routes(cfg: &mut web::ServiceConfig) {
    cfg.route("/health", web::get().to(get_health))
        .service(
            web::scope("/api")
                .route("/logs", web::post().to(receive_log))
                .route("/logs", web::get().to(get_logs))
                .route("/logs/search", web::post().to(search_logs_lucene))
                .route("/stats", web::get().to(get_stats))
                .route("/rules", web::get().to(get_rules))
                .route("/rules", web::post().to(create_rule))
                .route("/rules/{rule_id}", web::delete().to(delete_rule))
                .route("/alerts", web::get().to(get_alerts)),
        );
}
