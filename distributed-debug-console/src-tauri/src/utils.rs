use chrono::{DateTime, Utc};

pub fn format_duration(ms: u64) -> String {
    if ms < 1000 {
        format!("{}ms", ms)
    } else if ms < 60000 {
        format!("{:.2}s", ms as f64 / 1000.0)
    } else if ms < 3600000 {
        format!("{:.2}m", ms as f64 / 60000.0)
    } else {
        format!("{:.2}h", ms as f64 / 3600000.0)
    }
}

pub fn format_timestamp(dt: DateTime<Utc>) -> String {
    dt.format("%Y-%m-%d %H:%M:%S.%3f").to_string()
}

pub fn parse_timestamp(ts: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(ts) {
        return Some(dt.with_timezone(&Utc));
    }
    
    if let Ok(ms) = ts.parse::<i64>() {
        return Utc.timestamp_opt(ms / 1000, ((ms % 1000) * 1_000_000) as u32).single();
    }
    
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(500), "500ms");
        assert_eq!(format_duration(1500), "1.50s");
        assert_eq!(format_duration(60000), "1.00m");
        assert_eq!(format_duration(3600000), "1.00h");
    }

    #[test]
    fn test_format_timestamp() {
        let dt = Utc.timestamp_opt(1600000000, 123456789).unwrap();
        let formatted = format_timestamp(dt);
        assert!(formatted.contains("2020"));
    }
}
