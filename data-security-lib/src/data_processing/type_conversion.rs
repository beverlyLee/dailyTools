//! 类型转换模块
//! 
//! 自动将字符串转为数字、日期等类型

use crate::data_processing::types::{ColumnType, DataFrame, DataValue, ProcessResult, ProcessingStats};
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};

/// 类型转换配置
#[derive(Debug, Clone)]
pub struct ConversionConfig {
    /// 日期格式列表，按优先级尝试
    pub date_formats: Vec<String>,
    /// 日期时间格式列表
    pub datetime_formats: Vec<String>,
    /// 是否严格模式（严格模式下转换失败会返回错误）
    pub strict: bool,
    /// 十进制分隔符
    pub decimal_separator: char,
    /// 千位分隔符
    pub thousands_separator: Option<char>,
}

impl Default for ConversionConfig {
    fn default() -> Self {
        Self {
            date_formats: vec![
                "%Y-%m-%d".to_string(),
                "%d/%m/%Y".to_string(),
                "%m/%d/%Y".to_string(),
                "%Y/%m/%d".to_string(),
            ],
            datetime_formats: vec![
                "%Y-%m-%d %H:%M:%S".to_string(),
                "%Y-%m-%dT%H:%M:%S".to_string(),
                "%Y-%m-%d %H:%M:%S%.f".to_string(),
            ],
            strict: false,
            decimal_separator: '.',
            thousands_separator: Some(','),
        }
    }
}

/// 类型转换器
pub struct TypeConverter {
    config: ConversionConfig,
}

impl TypeConverter {
    /// 创建新的类型转换器
    pub fn new(config: ConversionConfig) -> Self {
        Self { config }
    }

    /// 使用默认配置创建类型转换器
    pub fn default() -> Self {
        Self::new(ConversionConfig::default())
    }

    /// 尝试将字符串转换为整数
    pub fn to_int(&self, value: &str) -> Result<i64, String> {
        // 移除千位分隔符
        let cleaned = if let Some(sep) = self.config.thousands_separator {
            value.replace(sep, "")
        } else {
            value.to_string()
        };

        cleaned
            .trim()
            .parse::<i64>()
            .map_err(|e| format!("Failed to parse '{}' as integer: {}", value, e))
    }

    /// 尝试将字符串转换为浮点数
    pub fn to_float(&self, value: &str) -> Result<f64, String> {
        // 处理千位分隔符和十进制分隔符
        let mut cleaned = if let Some(sep) = self.config.thousands_separator {
            value.replace(sep, "")
        } else {
            value.to_string()
        };

        // 替换十进制分隔符
        if self.config.decimal_separator != '.' {
            cleaned = cleaned.replace(self.config.decimal_separator, ".");
        }

        cleaned
            .trim()
            .parse::<f64>()
            .map_err(|e| format!("Failed to parse '{}' as float: {}", value, e))
    }

    /// 尝试将字符串转换为布尔值
    pub fn to_bool(&self, value: &str) -> Result<bool, String> {
        let trimmed = value.trim().to_lowercase();
        match trimmed.as_str() {
            "true" | "yes" | "y" | "1" | "on" => Ok(true),
            "false" | "no" | "n" | "0" | "off" => Ok(false),
            _ => Err(format!("Failed to parse '{}' as boolean", value)),
        }
    }

    /// 尝试将字符串转换为日期
    pub fn to_date(&self, value: &str) -> Result<NaiveDate, String> {
        let trimmed = value.trim();

        for format in &self.config.date_formats {
            if let Ok(date) = NaiveDate::parse_from_str(trimmed, format) {
                return Ok(date);
            }
        }

        // 尝试解析 ISO 格式
        if let Ok(date) = NaiveDate::parse_from_str(trimmed, "%+") {
            return Ok(date);
        }

        Err(format!("Failed to parse '{}' as date", value))
    }

    /// 尝试将字符串转换为日期时间
    pub fn to_datetime(&self, value: &str) -> Result<DateTime<Utc>, String> {
        let trimmed = value.trim();

        // 尝试带时区的格式
        if let Ok(dt) = DateTime::parse_from_rfc3339(trimmed) {
            return Ok(dt.with_timezone(&Utc));
        }

        if let Ok(dt) = DateTime::parse_from_rfc2822(trimmed) {
            return Ok(dt.with_timezone(&Utc));
        }

        // 尝试自定义格式（假设为 UTC）
        for format in &self.config.datetime_formats {
            if let Ok(naive) = NaiveDateTime::parse_from_str(trimmed, format) {
                return Ok(DateTime::from_naive_utc_and_offset(naive, Utc));
            }
        }

        Err(format!("Failed to parse '{}' as datetime", value))
    }

    /// 自动推断并转换值的类型
    pub fn infer_and_convert(&self, value: &str) -> DataValue {
        // 先尝试整数
        if let Ok(v) = self.to_int(value) {
            return DataValue::Int(v);
        }

        // 再尝试浮点数
        if let Ok(v) = self.to_float(value) {
            return DataValue::Float(v);
        }

        // 尝试布尔值
        if let Ok(v) = self.to_bool(value) {
            return DataValue::Bool(v);
        }

        // 尝试日期时间
        if let Ok(v) = self.to_datetime(value) {
            return DataValue::DateTime(v);
        }

        // 尝试日期
        if let Ok(v) = self.to_date(value) {
            return DataValue::Date(v);
        }

        // 默认返回字符串
        DataValue::String(value.to_string())
    }

    /// 转换 DataFrame 中指定列的类型
    pub fn convert_column(
        &self,
        df: &mut DataFrame,
        column_name: &str,
        target_type: ColumnType,
    ) -> Result<ProcessResult<()>, String> {
        let col_idx = df
            .column_index(column_name)
            .ok_or_else(|| format!("Column not found: {}", column_name))?;

        let mut stats = ProcessingStats {
            total_rows: df.row_count(),
            ..Default::default()
        };
        let mut warnings = Vec::new();

        for (row_idx, row) in df.rows_mut().iter_mut().enumerate() {
            let value = &row[col_idx];

            // 跳过空值
            if value.is_null() {
                continue;
            }

            let str_value = match value.as_string() {
                Some(s) => s,
                None => {
                    // 已经是其他类型，不需要转换
                    continue;
                }
            };

            let converted = match target_type {
                ColumnType::Integer => self
                    .to_int(&str_value)
                    .map(DataValue::Int)
                    .map_err(|e| format!("Row {}: {}", row_idx, e)),
                ColumnType::Float => self
                    .to_float(&str_value)
                    .map(DataValue::Float)
                    .map_err(|e| format!("Row {}: {}", row_idx, e)),
                ColumnType::Boolean => self
                    .to_bool(&str_value)
                    .map(DataValue::Bool)
                    .map_err(|e| format!("Row {}: {}", row_idx, e)),
                ColumnType::Date => self
                    .to_date(&str_value)
                    .map(DataValue::Date)
                    .map_err(|e| format!("Row {}: {}", row_idx, e)),
                ColumnType::DateTime => self
                    .to_datetime(&str_value)
                    .map(DataValue::DateTime)
                    .map_err(|e| format!("Row {}: {}", row_idx, e)),
                ColumnType::String => Ok(DataValue::String(str_value)),
                ColumnType::Auto => Ok(self.infer_and_convert(&str_value)),
            };

            match converted {
                Ok(v) => {
                    row[col_idx] = v;
                    stats.modified_rows += 1;
                }
                Err(e) => {
                    if self.config.strict {
                        return Err(e);
                    }
                    warnings.push(e);
                    // 保持原值或设为空
                    row[col_idx] = DataValue::Null;
                }
            }
        }

        Ok(ProcessResult {
            data: (),
            warnings,
            stats,
        })
    }

    /// 自动推断并转换 DataFrame 中所有列的类型
    pub fn infer_and_convert_all(&self, df: &mut DataFrame) -> ProcessResult<()> {
        let mut total_stats = ProcessingStats {
            total_rows: df.row_count(),
            ..Default::default()
        };
        let mut total_warnings = Vec::new();

        for col_name in df.column_names() {
            match self.convert_column(df, col_name, ColumnType::Auto) {
                Ok(result) => {
                    total_stats.modified_rows += result.stats.modified_rows;
                    total_warnings.extend(result.warnings);
                }
                Err(e) => {
                    total_warnings.push(format!("Column '{}': {}", col_name, e));
                }
            }
        }

        ProcessResult {
            data: (),
            warnings: total_warnings,
            stats: total_stats,
        }
    }
}
