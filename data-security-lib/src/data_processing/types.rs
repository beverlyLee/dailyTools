//! 数据处理基础类型定义
//! 
//! 定义数据表、列、单元格等核心数据结构

use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 数据值类型枚举
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DataValue {
    /// 空值
    Null,
    /// 布尔值
    Bool(bool),
    /// 整数
    Int(i64),
    /// 浮点数
    Float(f64),
    /// 字符串
    String(String),
    /// 日期
    Date(NaiveDate),
    /// 日期时间
    DateTime(DateTime<Utc>),
    /// 列表
    List(Vec<DataValue>),
    /// 对象/映射
    Object(HashMap<String, DataValue>),
}

impl DataValue {
    /// 检查是否为空值
    pub fn is_null(&self) -> bool {
        matches!(self, DataValue::Null)
    }

    /// 检查是否为数字类型
    pub fn is_numeric(&self) -> bool {
        matches!(self, DataValue::Int(_) | DataValue::Float(_))
    }

    /// 尝试转换为 i64
    pub fn as_i64(&self) -> Option<i64> {
        match self {
            DataValue::Int(v) => Some(*v),
            DataValue::Float(v) => Some(*v as i64),
            DataValue::String(v) => v.parse::<i64>().ok(),
            _ => None,
        }
    }

    /// 尝试转换为 f64
    pub fn as_f64(&self) -> Option<f64> {
        match self {
            DataValue::Int(v) => Some(*v as f64),
            DataValue::Float(v) => Some(*v),
            DataValue::String(v) => v.parse::<f64>().ok(),
            _ => None,
        }
    }

    /// 尝试转换为字符串
    pub fn as_string(&self) -> Option<String> {
        match self {
            DataValue::String(v) => Some(v.clone()),
            DataValue::Int(v) => Some(v.to_string()),
            DataValue::Float(v) => Some(v.to_string()),
            DataValue::Bool(v) => Some(v.to_string()),
            DataValue::Date(v) => Some(v.to_string()),
            DataValue::DateTime(v) => Some(v.to_string()),
            _ => None,
        }
    }
}

impl Default for DataValue {
    fn default() -> Self {
        DataValue::Null
    }
}

impl std::fmt::Display for DataValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DataValue::Null => write!(f, "NULL"),
            DataValue::Bool(v) => write!(f, "{}", v),
            DataValue::Int(v) => write!(f, "{}", v),
            DataValue::Float(v) => write!(f, "{}", v),
            DataValue::String(v) => write!(f, "\"{}\"", v),
            DataValue::Date(v) => write!(f, "{}", v),
            DataValue::DateTime(v) => write!(f, "{}", v),
            DataValue::List(v) => write!(f, "{:?}", v),
            DataValue::Object(v) => write!(f, "{:?}", v),
        }
    }
}

/// 列类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ColumnType {
    /// 自动推断
    Auto,
    /// 整数
    Integer,
    /// 浮点数
    Float,
    /// 字符串
    String,
    /// 布尔值
    Boolean,
    /// 日期
    Date,
    /// 日期时间
    DateTime,
}

/// 列定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Column {
    /// 列名
    pub name: String,
    /// 列类型
    pub column_type: ColumnType,
    /// 是否可空
    pub nullable: bool,
}

impl Column {
    /// 创建新的列定义
    pub fn new(name: &str, column_type: ColumnType) -> Self {
        Self {
            name: name.to_string(),
            column_type,
            nullable: true,
        }
    }

    /// 设置是否可空
    pub fn nullable(mut self, nullable: bool) -> Self {
        self.nullable = nullable;
        self
    }
}

/// 数据表
/// 
/// 核心数据结构，用于存储和操作表格数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataFrame {
    /// 列定义
    columns: Vec<Column>,
    /// 列名到索引的映射
    column_index: HashMap<String, usize>,
    /// 数据行，每行是一个 DataValue 向量
    rows: Vec<Vec<DataValue>>,
}

impl DataFrame {
    /// 创建空的数据表
    pub fn new() -> Self {
        Self {
            columns: Vec::new(),
            column_index: HashMap::new(),
            rows: Vec::new(),
        }
    }

    /// 从列定义创建数据表
    pub fn from_columns(columns: Vec<Column>) -> Self {
        let column_index = columns
            .iter()
            .enumerate()
            .map(|(i, col)| (col.name.clone(), i))
            .collect();

        Self {
            columns,
            column_index,
            rows: Vec::new(),
        }
    }

    /// 添加列
    pub fn add_column(&mut self, column: Column) {
        let index = self.columns.len();
        self.column_index.insert(column.name.clone(), index);
        self.columns.push(column);

        // 为现有行添加空值
        for row in &mut self.rows {
            row.push(DataValue::Null);
        }
    }

    /// 添加行
    pub fn add_row(&mut self, row: Vec<DataValue>) -> Result<(), String> {
        if row.len() != self.columns.len() {
            return Err(format!(
                "Row length mismatch: expected {}, got {}",
                self.columns.len(),
                row.len()
            ));
        }
        self.rows.push(row);
        Ok(())
    }

    /// 获取列数
    pub fn column_count(&self) -> usize {
        self.columns.len()
    }

    /// 获取行数
    pub fn row_count(&self) -> usize {
        self.rows.len()
    }

    /// 获取列名列表
    pub fn column_names(&self) -> Vec<&str> {
        self.columns.iter().map(|c| c.name.as_str()).collect()
    }

    /// 获取列定义
    pub fn get_column(&self, name: &str) -> Option<&Column> {
        self.column_index
            .get(name)
            .and_then(|&i| self.columns.get(i))
    }

    /// 获取列数据
    pub fn get_column_data(&self, name: &str) -> Option<Vec<&DataValue>> {
        self.column_index.get(name).map(|&idx| {
            self.rows.iter().map(|row| &row[idx]).collect()
        })
    }

    /// 获取行
    pub fn get_row(&self, index: usize) -> Option<&Vec<DataValue>> {
        self.rows.get(index)
    }

    /// 获取单元格值
    pub fn get_value(&self, row: usize, col: &str) -> Option<&DataValue> {
        self.column_index
            .get(col)
            .and_then(|&col_idx| self.rows.get(row).map(|r| &r[col_idx]))
    }

    /// 设置单元格值
    pub fn set_value(
        &mut self,
        row: usize,
        col: &str,
        value: DataValue,
    ) -> Result<(), String> {
        let col_idx = *self
            .column_index
            .get(col)
            .ok_or_else(|| format!("Column not found: {}", col))?;

        if row >= self.rows.len() {
            return Err(format!("Row index out of bounds: {}", row));
        }

        self.rows[row][col_idx] = value;
        Ok(())
    }

    /// 迭代所有行
    pub fn iter_rows(&self) -> impl Iterator<Item = &Vec<DataValue>> {
        self.rows.iter()
    }

    /// 获取可变引用的行
    pub fn rows_mut(&mut self) -> &mut Vec<Vec<DataValue>> {
        &mut self.rows
    }

    /// 获取列的索引
    pub fn column_index(&self, name: &str) -> Option<usize> {
        self.column_index.get(name).copied()
    }
}

impl Default for DataFrame {
    fn default() -> Self {
        Self::new()
    }
}

/// 数据处理结果
#[derive(Debug, Clone)]
pub struct ProcessResult<T> {
    /// 处理后的数据
    pub data: T,
    /// 处理过程中产生的警告
    pub warnings: Vec<String>,
    /// 处理统计信息
    pub stats: ProcessingStats,
}

/// 处理统计信息
#[derive(Debug, Clone, Default)]
pub struct ProcessingStats {
    /// 处理的总行数
    pub total_rows: usize,
    /// 修改的行数
    pub modified_rows: usize,
    /// 删除的行数
    pub deleted_rows: usize,
    /// 填充的缺失值数量
    pub filled_missing: usize,
    /// 检测到的异常值数量
    pub outliers_detected: usize,
}
