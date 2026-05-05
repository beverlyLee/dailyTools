//! 通用数据校验与清洗库
//! 
//! 该模块提供：
//! - 类型转换：自动将字符串转为数字、日期等
//! - 缺失值处理：填充默认值、删除缺失行
//! - 异常值检测：基于 IQR 或 Z-score 检测异常
//! - 校验规则：Email、手机号、URL 等常见格式校验

mod types;
mod type_conversion;
mod missing_values;
mod outliers;
mod validation;

pub use types::*;
pub use type_conversion::*;
pub use missing_values::*;
pub use outliers::*;
pub use validation::*;
