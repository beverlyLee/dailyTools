//! 数据校验模块
//! 
//! 提供 Email、手机号、URL 等常见格式校验

use regex::Regex;
use std::collections::HashMap;
use url::Url as ExternalUrl;

/// 校验错误类型
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ValidationError {
    /// 格式错误
    InvalidFormat,
    /// 长度错误
    InvalidLength,
    /// 范围错误
    OutOfRange,
    /// 必填字段为空
    Required,
    /// 自定义错误
    Custom(String),
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::InvalidFormat => write!(f, "Invalid format"),
            ValidationError::InvalidLength => write!(f, "Invalid length"),
            ValidationError::OutOfRange => write!(f, "Out of range"),
            ValidationError::Required => write!(f, "Field is required"),
            ValidationError::Custom(msg) => write!(f, "{}", msg),
        }
    }
}

impl std::error::Error for ValidationError {}

/// 校验结果
#[derive(Debug, Clone)]
pub struct ValidationResult {
    /// 是否通过校验
    pub is_valid: bool,
    /// 错误列表
    pub errors: Vec<ValidationError>,
    /// 警告列表
    pub warnings: Vec<String>,
}

impl ValidationResult {
    /// 创建成功的校验结果
    pub fn success() -> Self {
        Self {
            is_valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    /// 创建失败的校验结果
    pub fn failure(errors: Vec<ValidationError>) -> Self {
        Self {
            is_valid: false,
            errors,
            warnings: Vec::new(),
        }
    }

    /// 添加错误
    pub fn add_error(&mut self, error: ValidationError) {
        self.is_valid = false;
        self.errors.push(error);
    }

    /// 添加警告
    pub fn add_warning(&mut self, warning: &str) {
        self.warnings.push(warning.to_string());
    }

    /// 合并两个校验结果
    pub fn merge(&mut self, other: ValidationResult) {
        self.is_valid = self.is_valid && other.is_valid;
        self.errors.extend(other.errors);
        self.warnings.extend(other.warnings);
    }
}

/// 校验器 trait
pub trait Validator {
    /// 校验值
    fn validate(&self, value: &str) -> ValidationResult;
}

/// Email 校验器
pub struct EmailValidator;

impl EmailValidator {
    /// 创建新的 Email 校验器
    pub fn new() -> Self {
        Self
    }

    /// 简单的 Email 格式校验
    pub fn is_valid_email(email: &str) -> bool {
        // 基本格式检查
        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 {
            return false;
        }

        let local = parts[0];
        let domain = parts[1];

        // 本地部分不能为空
        if local.is_empty() {
            return false;
        }

        // 域名部分检查
        let domain_parts: Vec<&str> = domain.split('.').collect();
        if domain_parts.len() < 2 {
            return false;
        }

        // TLD 检查
        let tld = domain_parts.last().unwrap();
        if tld.len() < 2 {
            return false;
        }

        // 使用 regex 进行更严格的检查
        let email_regex = Regex::new(
            r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        ).unwrap();

        email_regex.is_match(email)
    }
}

impl Validator for EmailValidator {
    fn validate(&self, value: &str) -> ValidationResult {
        if value.is_empty() {
            return ValidationResult::failure(vec![ValidationError::Required]);
        }

        if !Self::is_valid_email(value) {
            return ValidationResult::failure(vec![ValidationError::InvalidFormat]);
        }

        ValidationResult::success()
    }
}

impl Default for EmailValidator {
    fn default() -> Self {
        Self::new()
    }
}

/// 手机号校验器（支持中国手机号）
pub struct PhoneValidator;

impl PhoneValidator {
    /// 创建新的手机号校验器
    pub fn new() -> Self {
        Self
    }

    /// 校验中国手机号
    pub fn is_valid_chinese_phone(phone: &str) -> bool {
        // 移除空格和分隔符
        let cleaned = phone.replace([' ', '-', '(', ')'].as_ref(), "");

        // 检查是否以 +86 或 86 开头，如果是则移除
        let number = if cleaned.starts_with("+86") {
            &cleaned[3..]
        } else if cleaned.starts_with("86") {
            &cleaned[2..]
        } else {
            &cleaned
        };

        // 中国手机号规则：
        // 1. 11 位数字
        // 2. 以 1 开头
        // 3. 第二位为 3-9

        if number.len() != 11 {
            return false;
        }

        if !number.starts_with('1') {
            return false;
        }

        let second_digit = number.chars().nth(1).unwrap();
        if !('3'..='9').contains(&second_digit) {
            return false;
        }

        // 全部是数字
        number.chars().all(|c| c.is_ascii_digit())
    }

    /// 校验国际手机号（简单版本）
    pub fn is_valid_international_phone(phone: &str) -> bool {
        let cleaned = phone.replace([' ', '-', '(', ')'].as_ref(), "");

        // 国际手机号通常以 + 开头，后面跟着国家代码和号码
        if cleaned.starts_with('+') {
            let digits: String = cleaned.chars().filter(|c| c.is_ascii_digit()).collect();
            // 国际手机号通常至少 8 位数字
            digits.len() >= 8
        } else {
            // 没有 + 号，检查是否全是数字且长度合理
            let digits: String = cleaned.chars().filter(|c| c.is_ascii_digit()).collect();
            digits.len() >= 7 && digits.len() <= 15
        }
    }
}

impl Validator for PhoneValidator {
    fn validate(&self, value: &str) -> ValidationResult {
        if value.is_empty() {
            return ValidationResult::failure(vec![ValidationError::Required]);
        }

        if !Self::is_valid_chinese_phone(value) && !Self::is_valid_international_phone(value) {
            return ValidationResult::failure(vec![ValidationError::InvalidFormat]);
        }

        ValidationResult::success()
    }
}

impl Default for PhoneValidator {
    fn default() -> Self {
        Self::new()
    }
}

/// URL 校验器
pub struct UrlValidator;

impl UrlValidator {
    /// 创建新的 URL 校验器
    pub fn new() -> Self {
        Self
    }

    /// 校验 URL 格式
    pub fn is_valid_url(url: &str) -> bool {
        // 尝试使用 url 库解析
        match ExternalUrl::parse(url) {
            Ok(parsed) => {
                // 检查是否有 scheme
                parsed.scheme().is_empty() || 
                ["http", "https", "ftp", "ftps", "file", "mailto", "tel"].contains(&parsed.scheme())
            }
            Err(_) => {
                // 尝试添加 http:// 前缀再试
                let with_http = format!("http://{}", url);
                ExternalUrl::parse(&with_http).is_ok()
            }
        }
    }

    /// 检查是否为 HTTP/HTTPS URL
    pub fn is_http_url(url: &str) -> bool {
        match ExternalUrl::parse(url) {
            Ok(parsed) => parsed.scheme() == "http" || parsed.scheme() == "https",
            Err(_) => false,
        }
    }
}

impl Validator for UrlValidator {
    fn validate(&self, value: &str) -> ValidationResult {
        if value.is_empty() {
            return ValidationResult::failure(vec![ValidationError::Required]);
        }

        if !Self::is_valid_url(value) {
            return ValidationResult::failure(vec![ValidationError::InvalidFormat]);
        }

        ValidationResult::success()
    }
}

impl Default for UrlValidator {
    fn default() -> Self {
        Self::new()
    }
}

/// 长度校验器
pub struct LengthValidator {
    min: Option<usize>,
    max: Option<usize>,
}

impl LengthValidator {
    /// 创建新的长度校验器
    pub fn new(min: Option<usize>, max: Option<usize>) -> Self {
        Self { min, max }
    }

    /// 创建最小长度校验器
    pub fn min(min: usize) -> Self {
        Self {
            min: Some(min),
            max: None,
        }
    }

    /// 创建最大长度校验器
    pub fn max(max: usize) -> Self {
        Self {
            min: None,
            max: Some(max),
        }
    }

    /// 创建范围长度校验器
    pub fn range(min: usize, max: usize) -> Self {
        Self {
            min: Some(min),
            max: Some(max),
        }
    }
}

impl Validator for LengthValidator {
    fn validate(&self, value: &str) -> ValidationResult {
        let len = value.chars().count();
        let mut errors = Vec::new();

        if let Some(min) = self.min {
            if len < min {
                errors.push(ValidationError::Custom(format!(
                    "Length must be at least {}, got {}",
                    min, len
                )));
            }
        }

        if let Some(max) = self.max {
            if len > max {
                errors.push(ValidationError::Custom(format!(
                    "Length must be at most {}, got {}",
                    max, len
                )));
            }
        }

        if errors.is_empty() {
            ValidationResult::success()
        } else {
            ValidationResult::failure(errors)
        }
    }
}

/// 数字范围校验器
pub struct RangeValidator {
    min: Option<f64>,
    max: Option<f64>,
}

impl RangeValidator {
    /// 创建新的范围校验器
    pub fn new(min: Option<f64>, max: Option<f64>) -> Self {
        Self { min, max }
    }
}

impl Validator for RangeValidator {
    fn validate(&self, value: &str) -> ValidationResult {
        let num: f64 = match value.parse() {
            Ok(n) => n,
            Err(_) => {
                return ValidationResult::failure(vec![ValidationError::InvalidFormat]);
            }
        };

        let mut errors = Vec::new();

        if let Some(min) = self.min {
            if num < min {
                errors.push(ValidationError::Custom(format!(
                    "Value must be at least {}, got {}",
                    min, num
                )));
            }
        }

        if let Some(max) = self.max {
            if num > max {
                errors.push(ValidationError::Custom(format!(
                    "Value must be at most {}, got {}",
                    max, num
                )));
            }
        }

        if errors.is_empty() {
            ValidationResult::success()
        } else {
            ValidationResult::failure(errors)
        }
    }
}

/// 校验规则集合
pub struct ValidationRules {
    validators: Vec<Box<dyn Validator>>,
}

impl ValidationRules {
    /// 创建新的校验规则集合
    pub fn new() -> Self {
        Self {
            validators: Vec::new(),
        }
    }

    /// 添加校验器
    pub fn add(&mut self, validator: Box<dyn Validator>) {
        self.validators.push(validator);
    }

    /// 添加 Email 校验
    pub fn email(&mut self) {
        self.add(Box::new(EmailValidator::new()));
    }

    /// 添加手机号校验
    pub fn phone(&mut self) {
        self.add(Box::new(PhoneValidator::new()));
    }

    /// 添加 URL 校验
    pub fn url(&mut self) {
        self.add(Box::new(UrlValidator::new()));
    }

    /// 添加长度校验
    pub fn length(&mut self, min: Option<usize>, max: Option<usize>) {
        self.add(Box::new(LengthValidator::new(min, max)));
    }

    /// 添加必填校验
    pub fn required(&mut self) {
        self.add(Box::new(RequiredValidator));
    }

    /// 执行所有校验
    pub fn validate(&self, value: &str) -> ValidationResult {
        let mut result = ValidationResult::success();

        for validator in &self.validators {
            let sub_result = validator.validate(value);
            result.merge(sub_result);
        }

        result
    }
}

impl Default for ValidationRules {
    fn default() -> Self {
        Self::new()
    }
}

/// 必填校验器
struct RequiredValidator;

impl Validator for RequiredValidator {
    fn validate(&self, value: &str) -> ValidationResult {
        if value.trim().is_empty() {
            ValidationResult::failure(vec![ValidationError::Required])
        } else {
            ValidationResult::success()
        }
    }
}

/// 批量校验器
pub struct BatchValidator {
    field_rules: HashMap<String, ValidationRules>,
}

impl BatchValidator {
    /// 创建新的批量校验器
    pub fn new() -> Self {
        Self {
            field_rules: HashMap::new(),
        }
    }

    /// 为字段添加校验规则
    pub fn add_field_rules(&mut self, field_name: &str, rules: ValidationRules) {
        self.field_rules.insert(field_name.to_string(), rules);
    }

    /// 批量校验多个字段
    pub fn validate_fields(&self, fields: &HashMap<String, String>) -> HashMap<String, ValidationResult> {
        let mut results = HashMap::new();

        for (field_name, rules) in &self.field_rules {
            let value = fields.get(field_name).map(|s| s.as_str()).unwrap_or("");
            results.insert(field_name.clone(), rules.validate(value));
        }

        results
    }

    /// 检查所有字段是否通过校验
    pub fn all_valid(&self, fields: &HashMap<String, String>) -> bool {
        let results = self.validate_fields(fields);
        results.values().all(|r| r.is_valid)
    }
}

impl Default for BatchValidator {
    fn default() -> Self {
        Self::new()
    }
}

/// 正则表达式校验器
pub struct RegexValidator {
    regex: Regex,
    error_message: String,
}

impl RegexValidator {
    /// 创建新的正则校验器
    pub fn new(pattern: &str, error_message: &str) -> Result<Self, regex::Error> {
        let regex = Regex::new(pattern)?;
        Ok(Self {
            regex,
            error_message: error_message.to_string(),
        })
    }
}

impl Validator for RegexValidator {
    fn validate(&self, value: &str) -> ValidationResult {
        if self.regex.is_match(value) {
            ValidationResult::success()
        } else {
            ValidationResult::failure(vec![ValidationError::Custom(
                self.error_message.clone(),
            )])
        }
    }
}
