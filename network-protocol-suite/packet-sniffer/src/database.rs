use super::error::*;
use super::models::*;
use chrono::{DateTime, Utc};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use std::path::PathBuf;
use std::str::FromStr;

pub struct PacketDatabase {
    pool: SqlitePool,
}

impl PacketDatabase {
    pub async fn new(db_path: Option<PathBuf>) -> Result<Self> {
        let path = db_path.unwrap_or_else(|| {
            let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
            path.push("network-protocol-suite");
            path.push("packets.db");
            path
        });
        
        std::fs::create_dir_all(path.parent().unwrap())?;
        
        let options = SqliteConnectOptions::from_str(&path.to_string_lossy())?
            .create_if_missing(true);
        
        let pool = SqlitePool::connect_with(options).await?;
        
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS packets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                length INTEGER NOT NULL,
                protocol TEXT NOT NULL,
                source_mac TEXT,
                dest_mac TEXT,
                source_ip TEXT,
                dest_ip TEXT,
                source_port INTEGER,
                dest_port INTEGER,
                raw_hex TEXT NOT NULL,
                summary TEXT,
                details TEXT,
                tcp_flags TEXT,
                http_info TEXT,
                dns_info TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        "#).execute(&pool).await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_protocol ON packets(protocol)")
            .execute(&pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_timestamp ON packets(timestamp)")
            .execute(&pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_source_ip ON packets(source_ip)")
            .execute(&pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_dest_ip ON packets(dest_ip)")
            .execute(&pool).await?;
        
        Ok(Self { pool })
    }
    
    pub async fn insert_packet(&self, packet: &Packet) -> Result<i64> {
        let tcp_flags_json = packet.tcp_flags.as_ref()
            .map(|f| serde_json::to_string(f).unwrap_or_default());
        let http_info_json = packet.http_info.as_ref()
            .map(|h| serde_json::to_string(h).unwrap_or_default());
        let dns_info_json = packet.dns_info.as_ref()
            .map(|d| serde_json::to_string(d).unwrap_or_default());
        let details_json = packet.details.as_ref()
            .map(|d| serde_json::to_string(d).unwrap_or_default());
        
        let result = sqlx::query(r#"
            INSERT INTO packets (
                timestamp, length, protocol, source_mac, dest_mac,
                source_ip, dest_ip, source_port, dest_port, raw_hex,
                summary, details, tcp_flags, http_info, dns_info
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#)
        .bind(packet.timestamp.to_rfc3339())
        .bind(packet.length as i64)
        .bind(packet.protocol.to_string())
        .bind(&packet.source_mac)
        .bind(&packet.dest_mac)
        .bind(&packet.source_ip)
        .bind(&packet.dest_ip)
        .bind(packet.source_port.map(|p| p as i64))
        .bind(packet.dest_port.map(|p| p as i64))
        .bind(&packet.raw_hex)
        .bind(&packet.summary)
        .bind(details_json)
        .bind(tcp_flags_json)
        .bind(http_info_json)
        .bind(dns_info_json)
        .execute(&self.pool).await?;
        
        Ok(result.last_insert_rowid())
    }
    
    pub async fn get_packets(&self, limit: i64, offset: i64) -> Result<Vec<Packet>> {
        let rows = sqlx::query(r#"
            SELECT id, timestamp, length, protocol, source_mac, dest_mac,
                   source_ip, dest_ip, source_port, dest_port, raw_hex,
                   summary, details, tcp_flags, http_info, dns_info
            FROM packets
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        "#)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool).await?;
        
        let mut packets = Vec::new();
        for row in rows {
            packets.push(self.row_to_packet(row)?);
        }
        
        Ok(packets)
    }
    
    pub async fn get_packet_by_id(&self, id: i64) -> Result<Option<Packet>> {
        let row = sqlx::query(r#"
            SELECT id, timestamp, length, protocol, source_mac, dest_mac,
                   source_ip, dest_ip, source_port, dest_port, raw_hex,
                   summary, details, tcp_flags, http_info, dns_info
            FROM packets
            WHERE id = ?
        "#)
        .bind(id)
        .fetch_optional(&self.pool).await?;
        
        match row {
            Some(row) => Ok(Some(self.row_to_packet(row)?)),
            None => Ok(None),
        }
    }
    
    pub async fn search_packets(&self, query: &str, limit: i64) -> Result<Vec<Packet>> {
        let search_pattern = format!("%{}%", query);
        let rows = sqlx::query(r#"
            SELECT id, timestamp, length, protocol, source_mac, dest_mac,
                   source_ip, dest_ip, source_port, dest_port, raw_hex,
                   summary, details, tcp_flags, http_info, dns_info
            FROM packets
            WHERE source_ip LIKE ? OR dest_ip LIKE ? OR protocol LIKE ? 
               OR summary LIKE ? OR source_port LIKE ? OR dest_port LIKE ?
            ORDER BY timestamp DESC
            LIMIT ?
        "#)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(limit)
        .fetch_all(&self.pool).await?;
        
        let mut packets = Vec::new();
        for row in rows {
            packets.push(self.row_to_packet(row)?);
        }
        
        Ok(packets)
    }
    
    pub async fn get_packet_count(&self) -> Result<i64> {
        let (count,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM packets")
            .fetch_one(&self.pool).await?;
        Ok(count)
    }
    
    pub async fn clear_packets(&self) -> Result<i64> {
        let result = sqlx::query("DELETE FROM packets")
            .execute(&self.pool).await?;
        Ok(result.rows_affected() as i64)
    }
    
    pub async fn delete_packet(&self, id: i64) -> Result<bool> {
        let result = sqlx::query("DELETE FROM packets WHERE id = ?")
            .bind(id)
            .execute(&self.pool).await?;
        Ok(result.rows_affected() > 0)
    }
    
    fn row_to_packet(&self, row: sqlx::sqlite::SqliteRow) -> Result<Packet> {
        use sqlx::Row;
        
        let id: Option<i64> = row.try_get("id")?;
        let timestamp_str: String = row.try_get("timestamp")?;
        let timestamp = DateTime::parse_from_rfc3339(&timestamp_str)
            .map_err(|e| SnifferError::ProtocolParse(format!("时间戳解析失败: {}", e)))?
            .with_timezone(&Utc);
        
        let length: i64 = row.try_get("length")?;
        let protocol_str: String = row.try_get("protocol")?;
        let protocol = Protocol::from(protocol_str.as_str());
        
        let source_mac: Option<String> = row.try_get("source_mac")?;
        let dest_mac: Option<String> = row.try_get("dest_mac")?;
        let source_ip: Option<String> = row.try_get("source_ip")?;
        let dest_ip: Option<String> = row.try_get("dest_ip")?;
        let source_port: Option<i64> = row.try_get("source_port")?;
        let dest_port: Option<i64> = row.try_get("dest_port")?;
        let raw_hex: String = row.try_get("raw_hex")?;
        let summary: Option<String> = row.try_get("summary")?;
        let details_str: Option<String> = row.try_get("details")?;
        let tcp_flags_str: Option<String> = row.try_get("tcp_flags")?;
        let http_info_str: Option<String> = row.try_get("http_info")?;
        let dns_info_str: Option<String> = row.try_get("dns_info")?;
        
        let raw_bytes = hex::decode(&raw_hex).unwrap_or_default();
        
        let details: Option<serde_json::Value> = details_str
            .and_then(|s| serde_json::from_str(&s).ok());
        
        let tcp_flags: Option<TcpFlags> = tcp_flags_str
            .and_then(|s| serde_json::from_str(&s).ok());
        
        let http_info: Option<HttpInfo> = http_info_str
            .and_then(|s| serde_json::from_str(&s).ok());
        
        let dns_info: Option<DnsInfo> = dns_info_str
            .and_then(|s| serde_json::from_str(&s).ok());
        
        Ok(Packet {
            id,
            timestamp,
            length: length as u32,
            protocol,
            source_mac,
            dest_mac,
            source_ip,
            dest_ip,
            source_port: source_port.map(|p| p as u16),
            dest_port: dest_port.map(|p| p as u16),
            raw_hex,
            raw_bytes,
            summary: summary.unwrap_or_default(),
            details,
            tcp_flags,
            http_info,
            dns_info,
        })
    }
}
