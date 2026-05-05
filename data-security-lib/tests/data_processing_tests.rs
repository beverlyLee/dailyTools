//! 数据处理模块测试

use data_security_lib::data_processing::*;
use std::collections::HashMap;

#[test]
fn test_data_value_creation() {
    let int_val = DataValue::Int(42);
    assert!(int_val.is_numeric());
    assert_eq!(int_val.as_i64(), Some(42));
    
    let float_val = DataValue::Float(3.14);
    assert!(float_val.is_numeric());
    assert!((float_val.as_f64().unwrap() - 3.14).abs() < 0.001);
    
    let string_val = DataValue::String("hello".to_string());
    assert!(!string_val.is_numeric());
    assert_eq!(string_val.as_string(), Some("hello".to_string()));
    
    let null_val = DataValue::Null;
    assert!(null_val.is_null());
}

#[test]
fn test_dataframe_operations() {
    let columns = vec![
        Column::new("id", ColumnType::Integer),
        Column::new("name", ColumnType::String),
        Column::new("age", ColumnType::Integer),
    ];
    
    let mut df = DataFrame::from_columns(columns);
    
    assert_eq!(df.column_count(), 3);
    assert_eq!(df.row_count(), 0);
    
    df.add_row(vec![
        DataValue::Int(1),
        DataValue::String("Alice".to_string()),
        DataValue::Int(25),
    ]).unwrap();
    
    df.add_row(vec![
        DataValue::Int(2),
        DataValue::String("Bob".to_string()),
        DataValue::Int(30),
    ]).unwrap();
    
    assert_eq!(df.row_count(), 2);
    assert_eq!(df.column_names(), vec!["id", "name", "age"]);
    
    // 测试获取值
    let name = df.get_value(0, "name");
    assert!(name.is_some());
    assert_eq!(name.unwrap().as_string(), Some("Alice".to_string()));
    
    // 测试设置值
    df.set_value(0, "age", DataValue::Int(26)).unwrap();
    let age = df.get_value(0, "age");
    assert_eq!(age.unwrap().as_i64(), Some(26));
}

#[test]
fn test_type_conversion() {
    let converter = TypeConverter::default();
    
    // 测试整数转换
    assert_eq!(converter.to_int("123"), Ok(123));
    assert_eq!(converter.to_int("1,234"), Ok(1234));
    assert!(converter.to_int("abc").is_err());
    
    // 测试浮点数转换
    assert!((converter.to_float("3.14").unwrap() - 3.14).abs() < 0.001);
    assert!((converter.to_float("1,234.56").unwrap() - 1234.56).abs() < 0.001);
    
    // 测试布尔值转换
    assert_eq!(converter.to_bool("true"), Ok(true));
    assert_eq!(converter.to_bool("yes"), Ok(true));
    assert_eq!(converter.to_bool("1"), Ok(true));
    assert_eq!(converter.to_bool("false"), Ok(false));
    assert_eq!(converter.to_bool("no"), Ok(false));
    assert_eq!(converter.to_bool("0"), Ok(false));
    
    // 测试日期转换
    assert!(converter.to_date("2023-12-25").is_ok());
    assert!(converter.to_date("25/12/2023").is_ok());
    
    // 测试日期时间转换
    assert!(converter.to_datetime("2023-12-25T10:30:00").is_ok());
    assert!(converter.to_datetime("2023-12-25 10:30:00").is_ok());
    
    // 测试自动推断
    let val = converter.infer_and_convert("123");
    assert!(matches!(val, DataValue::Int(123)));
    
    let val = converter.infer_and_convert("3.14");
    assert!(matches!(val, DataValue::Float(_)));
    
    let val = converter.infer_and_convert("2023-12-25");
    assert!(matches!(val, DataValue::Date(_)));
    
    let val = converter.infer_and_convert("hello");
    assert!(matches!(val, DataValue::String(_)));
}

#[test]
fn test_missing_values() {
    let columns = vec![
        Column::new("id", ColumnType::Integer),
        Column::new("value", ColumnType::Float),
        Column::new("name", ColumnType::String),
    ];
    
    let mut df = DataFrame::from_columns(columns);
    
    df.add_row(vec![
        DataValue::Int(1),
        DataValue::Float(10.0),
        DataValue::String("A".to_string()),
    ]).unwrap();
    
    df.add_row(vec![
        DataValue::Int(2),
        DataValue::Null,
        DataValue::String("B".to_string()),
    ]).unwrap();
    
    df.add_row(vec![
        DataValue::Int(3),
        DataValue::Float(30.0),
        DataValue::Null,
    ]).unwrap();
    
    // 测试检查缺失值
    assert!(MissingValueHandler::has_missing(&df));
    
    // 测试统计缺失值
    let counts = MissingValueHandler::count_missing_by_column(&df);
    assert_eq!(counts.get("value"), Some(&1));
    assert_eq!(counts.get("name"), Some(&1));
    assert_eq!(counts.get("id"), Some(&0));
    
    let row_counts = MissingValueHandler::count_missing_by_row(&df);
    assert_eq!(row_counts, vec![0, 1, 1]);
    
    // 测试填充缺失值 - 使用指定值
    let result = MissingValueHandler::fill_missing(
        &mut df,
        "value",
        FillStrategy::Value(DataValue::Float(0.0)),
    ).unwrap();
    assert_eq!(result.stats.filled_missing, 1);
    
    // 验证填充结果
    let val = df.get_value(1, "value");
    assert_eq!(val.unwrap().as_f64(), Some(0.0));
}

#[test]
fn test_outlier_detection() {
    // 测试 IQR 方法
    let values = vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 100.0];
    let (outliers, stats) = OutlierDetector::detect_iqr(&values, 1.5);
    
    assert!(!outliers.is_empty());
    assert!(outliers.contains(&9)); // 100 是异常值
    assert!(stats.iqr.is_some());
    assert!(stats.lower_bound.is_some());
    assert!(stats.upper_bound.is_some());
    
    // 测试 Z-score 方法
    let values = vec![10.0, 12.0, 11.0, 13.0, 12.5, 11.5, 50.0];
    let (outliers, _) = OutlierDetector::detect_zscore(&values, 2.0);
    assert!(outliers.contains(&6)); // 50 是异常值
    
    // 测试修正 Z-score 方法
    let values = vec![1.0, 2.0, 3.0, 4.0, 5.0, 100.0];
    let (outliers, _) = OutlierDetector::detect_modified_zscore(&values, 3.5);
    assert!(outliers.contains(&5)); // 100 是异常值
}

#[test]
fn test_email_validation() {
    assert!(EmailValidator::is_valid_email("user@example.com"));
    assert!(EmailValidator::is_valid_email("user.name+tag@domain.co.uk"));
    assert!(EmailValidator::is_valid_email("12345@test.org"));
    
    // 无效的 Email
    assert!(!EmailValidator::is_valid_email("invalid"));
    assert!(!EmailValidator::is_valid_email("user@"));
    assert!(!EmailValidator::is_valid_email("@domain.com"));
    assert!(!EmailValidator::is_valid_email("user@domain")); // 没有 TLD
    assert!(!EmailValidator::is_valid_email(""));
    
    // 使用 Validator trait
    let validator = EmailValidator::new();
    let result = validator.validate("user@example.com");
    assert!(result.is_valid);
    
    let result = validator.validate("invalid");
    assert!(!result.is_valid);
    assert!(!result.errors.is_empty());
}

#[test]
fn test_phone_validation() {
    // 中国手机号
    assert!(PhoneValidator::is_valid_chinese_phone("13800138000"));
    assert!(PhoneValidator::is_valid_chinese_phone("+86 138-0013-8001"));
    assert!(PhoneValidator::is_valid_chinese_phone("8613800138002"));
    assert!(PhoneValidator::is_valid_chinese_phone("15912345678"));
    assert!(PhoneValidator::is_valid_chinese_phone("18612345678"));
    
    // 无效的中国手机号
    assert!(!PhoneValidator::is_valid_chinese_phone("12345678901")); // 以 12 开头
    assert!(!PhoneValidator::is_valid_chinese_phone("1380013800")); // 只有 10 位
    assert!(!PhoneValidator::is_valid_chinese_phone("138001380001")); // 12 位
    assert!(!PhoneValidator::is_valid_chinese_phone("abc"));
    
    // 国际手机号
    assert!(PhoneValidator::is_valid_international_phone("+1 202-555-0123"));
    assert!(PhoneValidator::is_valid_international_phone("+44 20 7123 4567"));
}

#[test]
fn test_url_validation() {
    // 有效的 URL
    assert!(UrlValidator::is_valid_url("https://www.example.com"));
    assert!(UrlValidator::is_valid_url("http://localhost:8080"));
    assert!(UrlValidator::is_valid_url("ftp://files.example.com/path"));
    assert!(UrlValidator::is_valid_url("https://api.example.com/v1/users?id=123&name=test"));
    assert!(UrlValidator::is_valid_url("www.example.com")); // 没有协议也能通过
    
    // 无效的 URL
    assert!(!UrlValidator::is_valid_url("not-a-url"));
    assert!(!UrlValidator::is_valid_url(""));
    
    // HTTP/HTTPS 检查
    assert!(UrlValidator::is_http_url("https://example.com"));
    assert!(UrlValidator::is_http_url("http://example.com"));
    assert!(!UrlValidator::is_http_url("ftp://example.com"));
}

#[test]
fn test_length_validation() {
    // 最小长度
    let validator = LengthValidator::min(5);
    assert!(validator.validate("hello").is_valid);
    assert!(!validator.validate("hi").is_valid);
    
    // 最大长度
    let validator = LengthValidator::max(10);
    assert!(validator.validate("hello").is_valid);
    assert!(!validator.validate("this is a very long string").is_valid);
    
    // 范围
    let validator = LengthValidator::range(3, 8);
    assert!(validator.validate("test").is_valid);
    assert!(!validator.validate("ab").is_valid);
    assert!(!validator.validate("this is too long").is_valid);
}

#[test]
fn test_range_validation() {
    let validator = RangeValidator::new(Some(0.0), Some(100.0));
    
    assert!(validator.validate("50").is_valid);
    assert!(validator.validate("0").is_valid);
    assert!(validator.validate("100").is_valid);
    assert!(!validator.validate("-1").is_valid);
    assert!(!validator.validate("101").is_valid);
    assert!(!validator.validate("abc").is_valid);
    
    // 只有下限
    let validator = RangeValidator::new(Some(18.0), None);
    assert!(validator.validate("18").is_valid);
    assert!(validator.validate("100").is_valid);
    assert!(!validator.validate("17").is_valid);
    
    // 只有上限
    let validator = RangeValidator::new(None, Some(100.0));
    assert!(validator.validate("0").is_valid);
    assert!(validator.validate("100").is_valid);
    assert!(!validator.validate("101").is_valid);
}

#[test]
fn test_validation_rules() {
    let mut rules = ValidationRules::new();
    rules.required();
    rules.email();
    rules.length(Some(5), Some(50));
    
    // 有效的 Email
    let result = rules.validate("user@example.com");
    assert!(result.is_valid);
    assert!(result.errors.is_empty());
    
    // 空值
    let result = rules.validate("");
    assert!(!result.is_valid);
    assert!(result.errors.iter().any(|e| matches!(e, ValidationError::Required)));
    
    // 无效的 Email 格式
    let result = rules.validate("invalid");
    assert!(!result.is_valid);
    assert!(result.errors.iter().any(|e| matches!(e, ValidationError::InvalidFormat)));
    
    // 太短
    let result = rules.validate("a@b.c");
    assert!(!result.is_valid);
}

#[test]
fn test_batch_validation() {
    let mut batch = BatchValidator::new();
    
    // Email 规则
    let mut email_rules = ValidationRules::new();
    email_rules.required();
    email_rules.email();
    batch.add_field_rules("email", email_rules);
    
    // 年龄规则
    let mut age_rules = ValidationRules::new();
    age_rules.required();
    age_rules.add(Box::new(RangeValidator::new(Some(18.0), Some(100.0))));
    batch.add_field_rules("age", age_rules);
    
    // 有效数据
    let mut valid_fields = HashMap::new();
    valid_fields.insert("email".to_string(), "user@example.com".to_string());
    valid_fields.insert("age".to_string(), "25".to_string());
    
    let results = batch.validate_fields(&valid_fields);
    assert!(results["email"].is_valid);
    assert!(results["age"].is_valid);
    assert!(batch.all_valid(&valid_fields));
    
    // 无效数据
    let mut invalid_fields = HashMap::new();
    invalid_fields.insert("email".to_string(), "invalid".to_string());
    invalid_fields.insert("age".to_string(), "15".to_string());
    
    let results = batch.validate_fields(&invalid_fields);
    assert!(!results["email"].is_valid);
    assert!(!results["age"].is_valid);
    assert!(!batch.all_valid(&invalid_fields));
}

#[test]
fn test_regex_validation() {
    let validator = RegexValidator::new(
        r"^[A-Z]{2}\d{4}$",
        "格式应为: 2个大写字母 + 4个数字",
    ).unwrap();
    
    assert!(validator.validate("AB1234").is_valid);
    assert!(validator.validate("XY9999").is_valid);
    assert!(!validator.validate("ab1234").is_valid); // 小写
    assert!(!validator.validate("ABC123").is_valid); // 3个字母
    assert!(!validator.validate("AB123").is_valid); // 3个数字
}
