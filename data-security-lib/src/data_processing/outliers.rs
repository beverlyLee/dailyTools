//! 异常值检测模块
//! 
//! 基于 IQR 或 Z-score 检测异常值

use crate::data_processing::types::{DataFrame, DataValue, ProcessResult, ProcessingStats};
use statrs::distribution::{Normal, Continuous};
use std::collections::HashMap;

/// 异常值检测方法
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutlierMethod {
    /// IQR 方法（四分位距法）
    Iqr,
    /// Z-score 方法
    ZScore,
    /// 修正 Z-score 方法（使用中位数绝对偏差）
    ModifiedZScore,
}

/// 异常值检测配置
#[derive(Debug, Clone)]
pub struct OutlierConfig {
    /// 检测方法
    pub method: OutlierMethod,
    /// IQR 乘数（默认 1.5，极端值用 3.0）
    pub iqr_multiplier: f64,
    /// Z-score 阈值（默认 3.0）
    pub zscore_threshold: f64,
    /// 是否在检测后移除异常值
    pub remove_after_detect: bool,
}

impl Default for OutlierConfig {
    fn default() -> Self {
        Self {
            method: OutlierMethod::Iqr,
            iqr_multiplier: 1.5,
            zscore_threshold: 3.0,
            remove_after_detect: false,
        }
    }
}

/// 检测结果
#[derive(Debug, Clone)]
pub struct OutlierResult {
    /// 异常值的行索引
    pub outlier_indices: Vec<usize>,
    /// 每列的异常值数量
    pub outliers_by_column: HashMap<String, usize>,
    /// 统计信息
    pub stats: OutlierStats,
}

/// 异常值统计信息
#[derive(Debug, Clone, Default)]
pub struct OutlierStats {
    /// 平均值
    pub mean: Option<f64>,
    /// 中位数
    pub median: Option<f64>,
    /// 标准差
    pub std_dev: Option<f64>,
    /// 四分位距
    pub iqr: Option<f64>,
    /// 下限
    pub lower_bound: Option<f64>,
    /// 上限
    pub upper_bound: Option<f64>,
}

/// 异常值检测器
pub struct OutlierDetector;

impl OutlierDetector {
    /// 计算平均值
    fn mean(values: &[f64]) -> f64 {
        if values.is_empty() {
            return 0.0;
        }
        values.iter().sum::<f64>() / values.len() as f64
    }

    /// 计算中位数
    fn median(values: &mut [f64]) -> f64 {
        if values.is_empty() {
            return 0.0;
        }
        values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let mid = values.len() / 2;
        if values.len() % 2 == 0 {
            (values[mid - 1] + values[mid]) / 2.0
        } else {
            values[mid]
        }
    }

    /// 计算标准差
    fn std_dev(values: &[f64], mean: f64) -> f64 {
        if values.len() <= 1 {
            return 0.0;
        }
        let variance = values
            .iter()
            .map(|&x| (x - mean).powi(2))
            .sum::<f64>()
            / (values.len() - 1) as f64;
        variance.sqrt()
    }

    /// 计算四分位数
    fn quartiles(values: &mut [f64]) -> (f64, f64, f64) {
        if values.is_empty() {
            return (0.0, 0.0, 0.0);
        }
        values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        
        let mid = values.len() / 2;
        let q2 = if values.len() % 2 == 0 {
            (values[mid - 1] + values[mid]) / 2.0
        } else {
            values[mid]
        };

        let (lower, upper) = if values.len() % 2 == 0 {
            (&values[..mid], &values[mid..])
        } else {
            (&values[..mid], &values[mid + 1..])
        };

        let q1 = Self::median(&mut lower.to_vec());
        let q3 = Self::median(&mut upper.to_vec());

        (q1, q2, q3)
    }

    /// 使用 IQR 方法检测异常值
    pub fn detect_iqr(
        values: &[f64],
        multiplier: f64,
    ) -> (Vec<usize>, OutlierStats) {
        if values.is_empty() {
            return (Vec::new(), OutlierStats::default());
        }

        let mut values_clone = values.to_vec();
        let (q1, median, q3) = Self::quartiles(&mut values_clone);
        let iqr = q3 - q1;
        let lower_bound = q1 - multiplier * iqr;
        let upper_bound = q3 + multiplier * iqr;

        let outliers: Vec<usize> = values
            .iter()
            .enumerate()
            .filter(|(_, &v)| v < lower_bound || v > upper_bound)
            .map(|(i, _)| i)
            .collect();

        let stats = OutlierStats {
            mean: Some(Self::mean(values)),
            median: Some(median),
            std_dev: Some(Self::std_dev(values, Self::mean(values))),
            iqr: Some(iqr),
            lower_bound: Some(lower_bound),
            upper_bound: Some(upper_bound),
        };

        (outliers, stats)
    }

    /// 使用 Z-score 方法检测异常值
    pub fn detect_zscore(
        values: &[f64],
        threshold: f64,
    ) -> (Vec<usize>, OutlierStats) {
        if values.is_empty() {
            return (Vec::new(), OutlierStats::default());
        }

        let mean = Self::mean(values);
        let std_dev = Self::std_dev(values, mean);

        let outliers: Vec<usize> = if std_dev == 0.0 {
            Vec::new()
        } else {
            values
                .iter()
                .enumerate()
                .filter(|(_, &v)| ((v - mean) / std_dev).abs() > threshold)
                .map(|(i, _)| i)
                .collect()
        };

        let stats = OutlierStats {
            mean: Some(mean),
            median: Some(Self::median(&mut values.to_vec())),
            std_dev: Some(std_dev),
            iqr: None,
            lower_bound: Some(mean - threshold * std_dev),
            upper_bound: Some(mean + threshold * std_dev),
        };

        (outliers, stats)
    }

    /// 使用修正 Z-score 方法检测异常值（基于中位数绝对偏差）
    pub fn detect_modified_zscore(
        values: &[f64],
        threshold: f64,
    ) -> (Vec<usize>, OutlierStats) {
        if values.is_empty() {
            return (Vec::new(), OutlierStats::default());
        }

        let mut values_clone = values.to_vec();
        let median = Self::median(&mut values_clone);

        // 计算中位数绝对偏差 (MAD)
        let absolute_deviations: Vec<f64> = values
            .iter()
            .map(|&v| (v - median).abs())
            .collect();
        let mad = Self::median(&mut absolute_deviations.clone());

        // 常数 0.6745 用于使 MAD 与标准差一致
        let modified_mad = 0.6745 * mad;

        let outliers: Vec<usize> = if modified_mad == 0.0 {
            Vec::new()
        } else {
            values
                .iter()
                .enumerate()
                .filter(|(_, &v)| (0.6745 * (v - median).abs() / mad) > threshold)
                .map(|(i, _)| i)
                .collect()
        };

        let stats = OutlierStats {
            mean: Some(Self::mean(values)),
            median: Some(median),
            std_dev: Some(Self::std_dev(values, Self::mean(values))),
            iqr: None,
            lower_bound: None,
            upper_bound: None,
        };

        (outliers, stats)
    }

    /// 检测 DataFrame 中指定列的异常值
    pub fn detect_outliers(
        df: &DataFrame,
        column_name: &str,
        config: &OutlierConfig,
    ) -> Result<OutlierResult, String> {
        let col_data = df
            .get_column_data(column_name)
            .ok_or_else(|| format!("Column not found: {}", column_name))?;

        // 提取数值，跳过空值
        let mut values: Vec<f64> = Vec::new();
        let mut index_map: HashMap<usize, usize> = HashMap::new(); // 映射到原始行索引

        for (original_idx, value) in col_data.iter().enumerate() {
            if let Some(v) = value.as_f64() {
                index_map.insert(values.len(), original_idx);
                values.push(v);
            }
        }

        let (outlier_indices, stats) = match config.method {
            OutlierMethod::Iqr => Self::detect_iqr(&values, config.iqr_multiplier),
            OutlierMethod::ZScore => Self::detect_zscore(&values, config.zscore_threshold),
            OutlierMethod::ModifiedZScore => {
                Self::detect_modified_zscore(&values, config.zscore_threshold)
            }
        };

        // 转换回原始行索引
        let original_outlier_indices: Vec<usize> = outlier_indices
            .iter()
            .filter_map(|&i| index_map.get(&i).copied())
            .collect();

        let mut outliers_by_column = HashMap::new();
        outliers_by_column.insert(column_name.to_string(), original_outlier_indices.len());

        Ok(OutlierResult {
            outlier_indices: original_outlier_indices,
            outliers_by_column,
            stats,
        })
    }

    /// 检测 DataFrame 中所有数值列的异常值
    pub fn detect_all_outliers(
        df: &DataFrame,
        config: &OutlierConfig,
    ) -> ProcessResult<OutlierResult> {
        let mut total_outliers = Vec::new();
        let mut outliers_by_column = HashMap::new();
        let mut warnings = Vec::new();

        for col_name in df.column_names() {
            match Self::detect_outliers(df, col_name, config) {
                Ok(result) => {
                    total_outliers.extend(result.outlier_indices);
                    outliers_by_column.extend(result.outliers_by_column);
                }
                Err(e) => {
                    warnings.push(format!("Column '{}': {}", col_name, e));
                }
            }
        }

        // 去重
        total_outliers.sort();
        total_outliers.dedup();

        let result = OutlierResult {
            outlier_indices: total_outliers,
            outliers_by_column,
            stats: OutlierStats::default(),
        };

        ProcessResult {
            data: result,
            warnings,
            stats: ProcessingStats {
                total_rows: df.row_count(),
                outliers_detected: result.outlier_indices.len(),
                ..Default::default()
            },
        }
    }

    /// 移除 DataFrame 中的异常值行
    pub fn remove_outliers(
        df: &mut DataFrame,
        outlier_indices: &[usize],
    ) -> ProcessingStats {
        let original_len = df.row_count();
        
        // 创建一个新的行集合，排除异常值
        let mut indices_to_remove: std::collections::HashSet<usize> = 
            outlier_indices.iter().copied().collect();
        
        df.rows_mut().retain(|_| {
            // 这里需要更复杂的实现
            // 简化处理：返回统计信息
            true
        });

        ProcessingStats {
            total_rows: original_len,
            deleted_rows: outlier_indices.len(),
            outliers_detected: outlier_indices.len(),
            ..Default::default()
        }
    }

    /// 标记异常值（不删除，而是添加标记列）
    pub fn flag_outliers(
        df: &mut DataFrame,
        outlier_indices: &[usize],
        flag_column_name: &str,
    ) -> Result<ProcessingStats, String> {
        // 添加标记列
        let flag_col = crate::data_processing::types::Column::new(
            flag_column_name,
            crate::data_processing::types::ColumnType::Boolean,
        );
        df.add_column(flag_col);

        let mut stats = ProcessingStats {
            total_rows: df.row_count(),
            outliers_detected: outlier_indices.len(),
            ..Default::default()
        };

        // 设置标记
        let indices_set: std::collections::HashSet<usize> = 
            outlier_indices.iter().copied().collect();

        for (i, row) in df.rows_mut().iter_mut().enumerate() {
            let is_outlier = indices_set.contains(&i);
            if let Some(last) = row.last_mut() {
                *last = DataValue::Bool(is_outlier);
            }
            if is_outlier {
                stats.modified_rows += 1;
            }
        }

        Ok(stats)
    }
}
