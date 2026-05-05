//! 数据处理使用示例
//! 
//! 演示如何使用通用数据校验与清洗库

use data_security_lib::data_processing::*;
use std::collections::HashMap;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== 数据处理示例 ===\n");

    // 1. 创建 DataFrame
    println!("1. 创建 DataFrame");
    
    let columns = vec![
        Column::new("id", ColumnType::Integer).nullable(false),
        Column::new("name", ColumnType::String),
        Column::new("email", ColumnType::String),
        Column::new("phone", ColumnType::String),
        Column::new("age", ColumnType::Integer),
        Column::new("salary", ColumnType::Float),
        Column::new("join_date", ColumnType::Date),
    ];
    
    let mut df = DataFrame::from_columns(columns);
    
    // 添加数据行
    df.add_row(vec![
        DataValue::Int(1),
        DataValue::String("张三".to_string()),
        DataValue::String("zhangsan@example.com".to_string()),
        DataValue::String("13800138001".to_string()),
        DataValue::Int(25),
        DataValue::Float(15000.0),
        DataValue::String("2023-01-15".to_string()),
    ])?;
    
    df.add_row(vec![
        DataValue::Int(2),
        DataValue::String("李四".to_string()),
        DataValue::String("lisi@example.com".to_string()),
        DataValue::String("+86 138-0013-8002".to_string()),
        DataValue::Int(30),
        DataValue::Float(20000.0),
        DataValue::String("2022/06/20".to_string()),
    ])?;
    
    df.add_row(vec![
        DataValue::Int(3),
        DataValue::String("王五".to_string()),
        DataValue::Null,
        DataValue::String("invalid-phone".to_string()),
        DataValue::Null,
        DataValue::Float(999999.0),
        DataValue::String("2024-03-10".to_string()),
    ])?;
    
    println!("   ✓ DataFrame 创建成功");
    println!("   行数: {}, 列数: {}", df.row_count(), df.column_count());
    println!("   列名: {:?}\n", df.column_names());

    // 2. 类型转换
    println!("2. 类型转换");
    
    let converter = TypeConverter::default();
    
    // 转换单个值
    let test_values = vec![
        "123",
        "3.14",
        "2023-12-25",
        "true",
        "hello",
    ];
    
    for value in test_values {
        let converted = converter.infer_and_convert(value);
        println!("   '{}' -> {:?}", value, converted);
    }
    
    // 转换 DataFrame 列
    let result = converter.convert_column(&mut df, "join_date", ColumnType::Date)?;
    println!("\n   转换 'join_date' 列:");
    println!("   修改行数: {}", result.stats.modified_rows);
    if !result.warnings.is_empty() {
        println!("   警告: {:?}", result.warnings);
    }
    println!();

    // 3. 缺失值处理
    println!("3. 缺失值处理");
    
    // 检查是否有缺失值
    println!("   是否有缺失值: {}", MissingValueHandler::has_missing(&df));
    
    // 统计各列缺失值
    let missing_counts = MissingValueHandler::count_missing_by_column(&df);
    println!("   各列缺失值: {:?}", missing_counts);
    
    // 统计每行缺失值
    let missing_by_row = MissingValueHandler::count_missing_by_row(&df);
    println!("   每行缺失值: {:?}", missing_by_row);
    
    // 填充缺失值
    println!("\n   填充 'age' 列的缺失值（使用平均值）:");
    let fill_result = MissingValueHandler::fill_missing(
        &mut df,
        "age",
        FillStrategy::Mean,
    )?;
    println!("   填充数量: {}", fill_result.stats.filled_missing);
    
    // 填充 email 列的缺失值
    println!("\n   填充 'email' 列的缺失值（使用默认值）:");
    let fill_result = MissingValueHandler::fill_missing(
        &mut df,
        "email",
        FillStrategy::Value(DataValue::String("unknown@example.com".to_string())),
    )?;
    println!("   填充数量: {}", fill_result.stats.filled_missing);
    
    // 删除包含缺失值的行（示例）
    // let drop_result = MissingValueHandler::drop_rows_with_missing(&mut df);
    // println!("   删除行数: {}", drop_result.stats.deleted_rows);
    println!();

    // 4. 异常值检测
    println!("4. 异常值检测");
    
    // 使用 IQR 方法
    let config_iqr = OutlierConfig {
        method: OutlierMethod::Iqr,
        iqr_multiplier: 1.5,
        ..Default::default()
    };
    
    let result_iqr = OutlierDetector::detect_outliers(&df, "salary", &config_iqr)?;
    println!("   IQR 方法检测 'salary' 列:");
    println!("   异常值行索引: {:?}", result_iqr.outlier_indices);
    println!("   统计信息:");
    println!("     平均值: {:?}", result_iqr.stats.mean);
    println!("     中位数: {:?}", result_iqr.stats.median);
    println!("     标准差: {:?}", result_iqr.stats.std_dev);
    println!("     IQR: {:?}", result_iqr.stats.iqr);
    println!("     范围: [{:?}, {:?}]", result_iqr.stats.lower_bound, result_iqr.stats.upper_bound);
    
    // 使用 Z-score 方法
    let config_zscore = OutlierConfig {
        method: OutlierMethod::ZScore,
        zscore_threshold: 2.0,
        ..Default::default()
    };
    
    let result_zscore = OutlierDetector::detect_outliers(&df, "salary", &config_zscore)?;
    println!("\n   Z-score 方法检测 'salary' 列:");
    println!("   异常值行索引: {:?}", result_zscore.outlier_indices);
    println!();

    // 5. 数据校验
    println!("5. 数据校验");
    
    // Email 校验
    let test_emails = vec![
        "valid@example.com",
        "invalid-email",
        "user.name+tag@domain.co.uk",
        "",
    ];
    
    println!("   Email 校验:");
    for email in test_emails {
        let result = EmailValidator::is_valid_email(email);
        println!("     '{}' -> {}", email, if result { "✓ 有效" } else { "✗ 无效" });
    }
    
    // 手机号校验
    let test_phones = vec![
        "13800138000",
        "+86 138-0013-8001",
        "(010) 1234-5678",
        "invalid",
        "+1 202-555-0123",
    ];
    
    println!("\n   手机号校验:");
    for phone in test_phones {
        let is_chinese = PhoneValidator::is_valid_chinese_phone(phone);
        let is_international = PhoneValidator::is_valid_international_phone(phone);
        println!(
            "     '{}' -> 中国: {}, 国际: {}",
            phone,
            if is_chinese { "✓" } else { "✗" },
            if is_international { "✓" } else { "✗" }
        );
    }
    
    // URL 校验
    let test_urls = vec![
        "https://www.example.com",
        "http://localhost:8080/api",
        "ftp://files.example.com",
        "invalid-url",
        "www.example.com",
    ];
    
    println!("\n   URL 校验:");
    for url in test_urls {
        let is_valid = UrlValidator::is_valid_url(url);
        let is_http = UrlValidator::is_http_url(url);
        println!(
            "     '{}' -> 有效: {}, HTTP: {}",
            url,
            if is_valid { "✓" } else { "✗" },
            if is_http { "✓" } else { "✗" }
        );
    }
    
    // 使用校验规则集合
    println!("\n   校验规则集合示例:");
    let mut rules = ValidationRules::new();
    rules.required();
    rules.email();
    rules.length(Some(5), Some(100));
    
    let test_cases = vec![
        "user@example.com",
        "invalid",
        "",
        "a@b.c",
    ];
    
    for test in test_cases {
        let result = rules.validate(test);
        println!(
            "     '{}' -> 有效: {}, 错误: {:?}",
            test,
            result.is_valid,
            result.errors
        );
    }
    
    // 批量校验
    println!("\n   批量校验示例:");
    let mut batch_validator = BatchValidator::new();
    
    let mut email_rules = ValidationRules::new();
    email_rules.required();
    email_rules.email();
    batch_validator.add_field_rules("email", email_rules);
    
    let mut phone_rules = ValidationRules::new();
    phone_rules.required();
    phone_rules.phone();
    batch_validator.add_field_rules("phone", phone_rules);
    
    let mut fields = HashMap::new();
    fields.insert("email".to_string(), "user@example.com".to_string());
    fields.insert("phone".to_string(), "13800138000".to_string());
    
    let results = batch_validator.validate_fields(&fields);
    for (field, result) in results {
        println!(
            "     {}: 有效 = {}, 错误数 = {}",
            field,
            result.is_valid,
            result.errors.len()
        );
    }
    println!();

    println!("=== 示例完成 ===");
    
    Ok(())
}
