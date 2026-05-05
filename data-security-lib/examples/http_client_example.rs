//! HTTP 客户端使用示例
//! 
//! 演示如何使用内存安全的异步 HTTP 客户端库

use data_security_lib::http_client::*;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    println!("=== HTTP 客户端示例 ===\n");

    // 1. 创建基本的 HTTP 客户端
    println!("1. 创建 HTTP 客户端");
    let config = ClientConfig {
        connect_timeout_ms: 5000,
        request_timeout_ms: 10000,
        max_connections: 50,
        ..Default::default()
    };
    
    let mut client = HttpClient::new(config)?;
    println!("   ✓ 客户端创建成功\n");

    // 2. 类型安全的 URL
    println!("2. 类型安全的 URL");
    let url = SafeUrl::parse("https://api.example.com/users")?;
    println!("   URL: {}", url);
    
    // 添加查询参数
    let url_with_params = url.with_query_params(&[("page", "1"), ("limit", "10")]);
    println!("   带参数 URL: {}", url_with_params);
    
    // 拼接路径
    let user_url = url.join("123")?;
    println!("   用户详情 URL: {}\n", user_url);

    // 3. 类型安全的 Header
    println!("3. 类型安全的 Header");
    let headers = SafeHeaders::new()
        .content_type("application/json")
        .bearer_token("your-access-token-here")
        .add("X-Request-Id", "req-123456");
    
    println!("   Headers: {:?}\n", headers);

    // 4. 添加拦截器
    println!("4. 添加拦截器");
    
    // 添加日志拦截器
    client.add_request_interceptor(Arc::new(LoggingRequestInterceptor));
    client.add_response_interceptor(Arc::new(LoggingResponseInterceptor));
    
    // 添加超时拦截器
    client.add_request_interceptor(Arc::new(TimeoutInterceptor::new(30000)));
    
    // 添加认证拦截器
    client.add_request_interceptor(Arc::new(AuthInterceptor::bearer("your-token")));
    
    println!("   ✓ 拦截器添加成功\n");

    // 5. 构建请求体
    println!("5. 构建请求体");
    
    // JSON 请求体
    #[derive(serde::Serialize)]
    struct User {
        name: String,
        email: String,
    }
    
    let user = User {
        name: "张三".to_string(),
        email: "zhangsan@example.com".to_string(),
    };
    
    let json_body = RequestBody::json(&user)?;
    println!("   JSON 请求体: {:?}", json_body);
    
    // 表单请求体
    let form_body = RequestBody::form(&[
        ("username", "zhangsan"),
        ("password", "secret"),
    ]);
    println!("   表单请求体: {:?}\n", form_body);

    // 6. 发送请求示例（注释掉，因为没有实际的 API）
    println!("6. 发送请求（示例）");
    println!("   // 发送 GET 请求");
    println!("   // let response = client.get(url_with_params, Some(headers)).await?;");
    println!("   // println!(\"状态码: {}\", response.status());");
    println!("   // let data: serde_json::Value = response.json()?;");
    println!();
    
    println!("   // 发送 POST 请求");
    println!("   // let response = client.post(url, Some(headers), Some(json_body)).await?;");
    println!();

    // 7. 自定义拦截器示例
    println!("7. 自定义拦截器示例");
    
    struct CustomRequestInterceptor;
    
    impl RequestInterceptor for CustomRequestInterceptor {
        fn intercept(
            &self,
            context: &mut InterceptorContext,
        ) -> Result<Option<HttpResponse>, Box<dyn std::error::Error + Send + Sync>> {
            // 在请求发送前添加时间戳
            context.insert_extension("request_timestamp", chrono::Utc::now().timestamp());
            println!("   [自定义拦截器] 请求时间戳已添加");
            Ok(None)
        }
    }
    
    client.add_request_interceptor(Arc::new(CustomRequestInterceptor));
    println!("   ✓ 自定义拦截器添加成功\n");

    println!("=== 示例完成 ===");
    
    Ok(())
}
