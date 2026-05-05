//! 缺失值处理模块
//! 
//! 提供填充默认值、删除缺失行等功能

use crate::data_processing::types::{DataFrame, DataValue, ProcessResult, ProcessingStats};
use std::collections::HashMap;

/// 缺失值填充策略
#[derive(Debug, Clone)]
pub enum FillStrategy {
    /// 使用指定值填充
    Value(DataValue),
    /// 使用列的平均值填充（仅适用于数值列）
    Mean,
    /// 使用列的中位数填充（仅适用于数值列）
    Median,
    /// 使用列的众数填充
    Mode,
    /// 使用前一个非空值填充（向前填充）
    Forward,
    /// 使用后一个非空值填充（向后填充）
    Backward,
    /// 使用线性插值填充（仅适用于数值列）
    LinearInterpolate,
}

/// 缺失值处理器
pub struct MissingValueHandler;

impl MissingValueHandler {
    /// 检查 DataFrame 中是否存在缺失值
    pub fn has_missing(df: &DataFrame) -> bool {
        for row in df.iter_rows() {
            for value in row {
                if value.is_null() {
                    return true;
                }
            }
        }
        false
    }

    /// 统计每列的缺失值数量
    pub fn count_missing_by_column(df: &DataFrame) -> HashMap<String, usize> {
        let mut result = HashMap::new();

        for col_name in df.column_names() {
            if let Some(col_data) = df.get_column_data(col_name) {
                let count = col_data.iter().filter(|v| v.is_null()).count();
                result.insert(col_name.to_string(), count);
            }
        }

        result
    }

    /// 统计每行的缺失值数量
    pub fn count_missing_by_row(df: &DataFrame) -> Vec<usize> {
        df.iter_rows()
            .map(|row| row.iter().filter(|v| v.is_null()).count())
            .collect()
    }

    /// 删除包含缺失值的行
    pub fn drop_rows_with_missing(df: &mut DataFrame) -> ProcessResult<()> {
        let original_len = df.row_count();
        let mut stats = ProcessingStats {
            total_rows: original_len,
            ..Default::default()
        };

        df.rows_mut().retain(|row| {
            let has_missing = row.iter().any(|v| v.is_null());
            if has_missing {
                stats.deleted_rows += 1;
            }
            !has_missing
        });

        ProcessResult {
            data: (),
            warnings: Vec::new(),
            stats,
        }
    }

    /// 删除所有值都缺失的行
    pub fn drop_rows_all_missing(df: &mut DataFrame) -> ProcessResult<()> {
        let original_len = df.row_count();
        let mut stats = ProcessingStats {
            total_rows: original_len,
            ..Default::default()
        };

        df.rows_mut().retain(|row| {
            let all_missing = row.iter().all(|v| v.is_null());
            if all_missing {
                stats.deleted_rows += 1;
            }
            !all_missing
        });

        ProcessResult {
            data: (),
            warnings: Vec::new(),
            stats,
        }
    }

    /// 删除包含缺失值的列
    pub fn drop_columns_with_missing(df: &mut DataFrame) -> ProcessResult<()> {
        let missing_counts = Self::count_missing_by_column(df);
        let columns_to_drop: Vec<String> = missing_counts
            .into_iter()
            .filter(|(_, count)| *count > 0)
            .map(|(name, _)| name)
            .collect();

        // TODO: 实现删除列的功能
        // 这里需要修改 DataFrame 的结构，比较复杂
        // 简单起见，先返回一个提示

        ProcessResult {
            data: (),
            warnings: vec![format!(
                "Columns with missing values: {:?}",
                columns_to_drop
            )],
            stats: ProcessingStats::default(),
        }
    }

    /// 使用指定策略填充缺失值
    pub fn fill_missing(
        df: &mut DataFrame,
        column_name: &str,
        strategy: FillStrategy,
    ) -> Result<ProcessResult<()>, String> {
        let col_idx = df
            .column_index(column_name)
            .ok_or_else(|| format!("Column not found: {}", column_name))?;

        let mut stats = ProcessingStats {
            total_rows: df.row_count(),
            ..Default::default()
        };
        let mut warnings = Vec::new();

        match strategy {
            FillStrategy::Value(value) => {
                for row in df.rows_mut() {
                    if row[col_idx].is_null() {
                        row[col_idx] = value.clone();
                        stats.filled_missing += 1;
                        stats.modified_rows += 1;
                    }
                }
            }
            FillStrategy::Mean => {
                let values: Vec<f64> = df
                    .iter_rows()
                    .filter_map(|row| {
                        if row[col_idx].is_null() {
                            None
                        } else {
                            row[col_idx].as_f64()
                        }
                    })
                    .collect();

                if values.is_empty() {
                    warnings.push("No non-null values to compute mean".to_string());
                } else {
                    let mean = values.iter().sum::<f64>() / values.len() as f64;
                    for row in df.rows_mut() {
                        if row[col_idx].is_null() {
                            row[col_idx] = DataValue::Float(mean);
                            stats.filled_missing += 1;
                            stats.modified_rows += 1;
                        }
                    }
                }
            }
            FillStrategy::Median => {
                let mut values: Vec<f64> = df
                    .iter_rows()
                    .filter_map(|row| {
                        if row[col_idx].is_null() {
                            None
                        } else {
                            row[col_idx].as_f64()
                        }
                    })
                    .collect();

                if values.is_empty() {
                    warnings.push("No non-null values to compute median".to_string());
                } else {
                    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
                    let median = if values.len() % 2 == 0 {
                        let mid = values.len() / 2;
                        (values[mid - 1] + values[mid]) / 2.0
                    } else {
                        values[values.len() / 2]
                    };

                    for row in df.rows_mut() {
                        if row[col_idx].is_null() {
                            row[col_idx] = DataValue::Float(median);
                            stats.filled_missing += 1;
                            stats.modified_rows += 1;
                        }
                    }
                }
            }
            FillStrategy::Mode => {
                // 简单实现：统计出现次数最多的值
                let mut frequency: HashMap<DataValue, usize> = HashMap::new();
                for row in df.iter_rows() {
                    if !row[col_idx].is_null() {
                        *frequency.entry(row[col_idx].clone()).or_insert(0) += 1;
                    }
                }

                if frequency.is_empty() {
                    warnings.push("No non-null values to compute mode".to_string());
                } else {
                    let mode = frequency
                        .into_iter()
                        .max_by_key(|&(_, count)| count)
                        .map(|(val, _)| val)
                        .unwrap();

                    for row in df.rows_mut() {
                        if row[col_idx].is_null() {
                            row[col_idx] = mode.clone();
                            stats.filled_missing += 1;
                            stats.modified_rows += 1;
                        }
                    }
                }
            }
            FillStrategy::Forward => {
                let mut last_valid: Option<DataValue> = None;
                for row in df.rows_mut() {
                    if row[col_idx].is_null() {
                        if let Some(ref val) = last_valid {
                            row[col_idx] = val.clone();
                            stats.filled_missing += 1;
                            stats.modified_rows += 1;
                        }
                    } else {
                        last_valid = Some(row[col_idx].clone());
                    }
                }
            }
            FillStrategy::Backward => {
                // 先收集所有值
                let mut values: Vec<Option<DataValue>> = df
                    .iter_rows()
                    .map(|row| {
                        if row[col_idx].is_null() {
                            None
                        } else {
                            Some(row[col_idx].clone())
                        }
                    })
                    .collect();

                // 向后填充
                let mut next_valid: Option<DataValue> = None;
                for i in (0..values.len()).rev() {
                    if values[i].is_none() {
                        if let Some(ref val) = next_valid {
                            values[i] = Some(val.clone());
                            stats.filled_missing += 1;
                            stats.modified_rows += 1;
                        }
                    } else {
                        next_valid = values[i].clone();
                    }
                }

                // 应用回 DataFrame
                for (i, row) in df.rows_mut().iter_mut().enumerate() {
                    if let Some(ref val) = values[i] {
                        row[col_idx] = val.clone();
                    }
                }
            }
            FillStrategy::LinearInterpolate => {
                // 简单实现
                warnings.push("Linear interpolation not fully implemented".to_string());
            }
        }

        Ok(ProcessResult {
            data: (),
            warnings,
            stats,
        })
    }

    /// 快速填充所有列的缺失值（使用默认值）
    pub fn quick_fill_all(df: &mut DataFrame) -> ProcessResult<()> {
        let mut total_stats = ProcessingStats {
            total_rows: df.row_count(),
            ..Default::default()
        };
        let mut total_warnings = Vec::new();

        for col_name in df.column_names() {
            // 根据列类型选择默认填充值
            // 这里简化处理，使用空字符串或0
            let strategy = FillStrategy::Value(DataValue::String("".to_string()));

            match Self::fill_missing(df, col_name, strategy) {
                Ok(result) => {
                    total_stats.filled_missing += result.stats.filled_missing;
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
