/**
 * Example usage of the Rust HTTP client library
 * 
 * This example demonstrates:
 * - Basic HTTP requests (GET, POST)
 * - Using interceptors
 * - Request building
 */

use http_client::{
    HttpClient, ClientConfig, Request, 
    interceptor::{LoggingInterceptor, AuthInterceptor, TimeoutInterceptor},
    header::constants,
    Method,
};
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Rust HTTP Client Library Example ===");
    println!();

    // Example 1: Creating a client with default configuration
    println!("1. Creating HTTP client...");
    let mut client = HttpClient::new()?;
    println!("   Client created successfully!");
    println!();

    // Example 2: Creating a client with custom configuration
    println!("2. Creating client with custom configuration...");
    let config = ClientConfig::new()
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(30))
        .max_connections(50)
        .user_agent("MyApp/1.0");
    
    let custom_client = HttpClient::with_config(config)?;
    println!("   Custom client created!");
    println!();

    // Example 3: Adding interceptors
    println!("3. Adding interceptors...");
    
    // Logging interceptor
    client.add_interceptor(LoggingInterceptor::new().with_body(false));
    
    // Auth interceptor (Bearer token)
    client.add_interceptor(AuthInterceptor::bearer("your_api_token_here"));
    
    // Timeout interceptor
    client.add_interceptor(TimeoutInterceptor::new(Duration::from_secs(60)));
    
    println!("   Interceptors added: Logging, Auth, Timeout");
    println!();

    // Example 4: Building and sending a GET request
    println!("4. Building a GET request...");
    
    let get_request = Request::get()
        .url("https://api.example.com/users")?
        .header("Accept", "application/json")?
        .build()?;
    
    println!("   Request: GET https://api.example.com/users");
    println!("   Headers: Accept: application/json");
    println!();

    // Example 5: Building a POST request with JSON body
    println!("5. Building a POST request with JSON...");
    
    #[derive(serde::Serialize)]
    struct NewUser {
        name: String,
        email: String,
        age: u32,
    }
    
    let new_user = NewUser {
        name: "John Doe".to_string(),
        email: "john@example.com".to_string(),
        age: 30,
    };
    
    let post_request = Request::post()
        .url("https://api.example.com/users")?
        .json(&new_user)?
        .build()?;
    
    println!("   Request: POST https://api.example.com/users");
    println!("   Body: {:?}", serde_json::to_string_pretty(&new_user)?);
    println!();

    // Example 6: Using query builder methods
    println!("6. Using convenient methods...");
    
    // Using get_text (convenience method)
    // let text = client.get_text("https://api.example.com/health").await?;
    // println!("   GET text response: {}", text);
    
    // Using get_json (convenience method)
    // #[derive(serde::Deserialize, Debug)]
    // struct HealthCheck {
    //     status: String,
    // }
    // let health: HealthCheck = client.get_json("https://api.example.com/health").await?;
    // println!("   GET JSON response: {:?}", health);
    
    println!("   Available convenience methods:");
    println!("   - client.get_text(url) - GET and return text");
    println!("   - client.get_json(url) - GET and deserialize JSON");
    println!("   - client.post_json(url, body) - POST with JSON body");
    println!();

    // Example 7: Query building with where conditions (conceptual)
    println!("7. Request building patterns...");
    
    // Building a request with query parameters
    let mut url = url::Url::parse("https://api.example.com/users")?;
    url.query_pairs_mut()
        .append_pair("page", "1")
        .append_pair("limit", "10")
        .append_pair("sort", "name");
    
    let paginated_request = Request::get()
        .url(url.as_str())?
        .header("Authorization", "Bearer token")?
        .build()?;
    
    println!("   Paginated request URL: {}", paginated_request.url());
    println!();

    // Example 8: Error handling
    println!("8. Error handling...");
    
    // Invalid URL
    match Request::get().url("not a valid url") {
        Ok(_) => println!("   URL parsed successfully"),
        Err(e) => println!("   URL parse error: {}", e),
    }
    
    // Invalid header name
    let mut request_builder = Request::get();
    if let Ok(mut rb) = request_builder.url("https://example.com") {
        match rb.header("Invalid@Header", "value") {
            Ok(_) => println!("   Header added"),
            Err(e) => println!("   Header error: {}", e),
        }
    }
    println!();

    println!("=== Example Complete ===");
    println!();
    println!("Key features demonstrated:");
    println!("1. Memory-safe URL and Header handling");
    println!("2. Async/await support with Tokio runtime");
    println!("3. Connection pooling (via reqwest)");
    println!("4. Interceptor chain for request/response modification");
    println!("5. Type-safe request building");
    println!("6. C FFI interface for cross-language integration");
    
    Ok(())
}
