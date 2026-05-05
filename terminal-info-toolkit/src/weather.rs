use chrono::{DateTime, Utc};
use dirs::cache_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;

const CACHE_DURATION_SECONDS: i64 = 300;
const CACHE_FILE_NAME: &str = "weather_cache.json";

#[derive(Debug, Serialize, Deserialize)]
struct WeatherCache {
    location: String,
    timestamp: i64,
    data: WeatherData,
}

#[derive(Debug, Serialize, Deserialize)]
struct WeatherData {
    city: String,
    country: String,
    temperature: f32,
    description: String,
    main: String,
    humidity: u32,
    wind_speed: f32,
}

pub fn get_weather(location: &str, mode: &str, icon_style: &str, no_cache: bool) -> Result<(), String> {
    let actual_location = if location == "auto" {
        get_location_by_ip()?
    } else {
        location.to_string()
    };
    
    let weather_data = if !no_cache {
        if let Some(cached) = get_cached_weather(&actual_location) {
            cached
        } else {
            let data = fetch_weather(&actual_location)?;
            cache_weather(&actual_location, &data)?;
            data
        }
    } else {
        let data = fetch_weather(&actual_location)?;
        cache_weather(&actual_location, &data)?;
        data
    };
    
    print_weather(&weather_data, mode, icon_style);
    
    Ok(())
}

fn get_location_by_ip() -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    #[derive(Deserialize)]
    struct IpApiResponse {
        city: String,
        country: String,
    }
    
    let response: IpApiResponse = client
        .get("http://ip-api.com/json/?fields=status,city,country")
        .send()
        .map_err(|e| format!("Failed to get location: {}", e))?
        .json()
        .map_err(|e| format!("Failed to parse location response: {}", e))?;
    
    Ok(format!("{},{}", response.city, response.country))
}

fn fetch_weather(location: &str) -> Result<WeatherData, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let parts: Vec<&str> = location.split(',').collect();
    let city = parts[0].trim();
    
    #[derive(Deserialize)]
    struct OpenMeteoResponse {
        current: CurrentWeather,
    }
    
    #[derive(Deserialize)]
    struct CurrentWeather {
        temperature_2m: f32,
        relative_humidity_2m: u32,
        wind_speed_10m: f32,
        weather_code: u32,
    }
    
    let (lat, lon, country) = get_coordinates(&client, city)?;
    
    let url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
        lat, lon
    );
    
    let response: OpenMeteoResponse = client
        .get(&url)
        .send()
        .map_err(|e| format!("Failed to fetch weather: {}", e))?
        .json()
        .map_err(|e| format!("Failed to parse weather response: {}", e))?;
    
    let (description, main) = weather_code_to_description(response.current.weather_code);
    
    Ok(WeatherData {
        city: city.to_string(),
        country,
        temperature: response.current.temperature_2m,
        description,
        main,
        humidity: response.current.relative_humidity_2m,
        wind_speed: response.current.wind_speed_10m,
    })
}

fn get_coordinates(client: &reqwest::blocking::Client, city: &str) -> Result<(f32, f32, String), String> {
    #[derive(Deserialize)]
    struct GeoResponse {
        features: Vec<GeoFeature>,
    }
    
    #[derive(Deserialize)]
    struct GeoFeature {
        geometry: GeoGeometry,
        properties: GeoProperties,
    }
    
    #[derive(Deserialize)]
    struct GeoGeometry {
        coordinates: Vec<f64>,
    }
    
    #[derive(Deserialize)]
    struct GeoProperties {
        country: Option<String>,
    }
    
    let url = format!(
        "https://geocoding-api.open-meteo.com/v1/search?name={}&count=1&language=en&format=json",
        city
    );
    
    let response: GeoResponse = client
        .get(&url)
        .send()
        .map_err(|e| format!("Failed to fetch coordinates: {}", e))?
        .json()
        .map_err(|e| format!("Failed to parse coordinates response: {}", e))?;
    
    if response.features.is_empty() {
        return Err(format!("City '{}' not found", city));
    }
    
    let feature = &response.features[0];
    let lon = feature.geometry.coordinates[0] as f32;
    let lat = feature.geometry.coordinates[1] as f32;
    let country = feature.properties.country.clone().unwrap_or_else(|| "Unknown".to_string());
    
    Ok((lat, lon, country))
}

fn weather_code_to_description(code: u32) -> (String, String) {
    match code {
        0 => ("Clear sky".to_string(), "Clear".to_string()),
        1..=3 => ("Partly cloudy".to_string(), "Clouds".to_string()),
        45 | 48 => ("Foggy".to_string(), "Clouds".to_string()),
        51..=57 => ("Drizzle".to_string(), "Rain".to_string()),
        61..=67 | 80..=82 => ("Rain".to_string(), "Rain".to_string()),
        71..=77 | 85..=86 => ("Snow".to_string(), "Snow".to_string()),
        95..=99 => ("Thunderstorm".to_string(), "Rain".to_string()),
        _ => ("Unknown".to_string(), "Unknown".to_string()),
    }
}

fn get_cache_path() -> Option<PathBuf> {
    cache_dir().map(|mut path| {
        path.push("terminal-info-toolkit");
        path.push(CACHE_FILE_NAME);
        path
    })
}

fn get_cached_weather(location: &str) -> Option<WeatherData> {
    let cache_path = get_cache_path()?;
    
    if !cache_path.exists() {
        return None;
    }
    
    let contents = fs::read_to_string(&cache_path).ok()?;
    let mut caches: Vec<WeatherCache> = serde_json::from_str(&contents).ok()?;
    
    let now = Utc::now().timestamp();
    
    caches.retain(|cache| now - cache.timestamp < CACHE_DURATION_SECONDS);
    
    for cache in &caches {
        if cache.location == location {
            return Some(cache.data.clone());
        }
    }
    
    None
}

fn cache_weather(location: &str, data: &WeatherData) -> Result<(), String> {
    let cache_path = match get_cache_path() {
        Some(path) => path,
        None => return Ok(()),
    };
    
    let parent_dir = cache_path.parent().ok_or("Invalid cache path")?;
    fs::create_dir_all(parent_dir)
        .map_err(|e| format!("Failed to create cache directory: {}", e))?;
    
    let mut caches: Vec<WeatherCache> = if cache_path.exists() {
        let contents = fs::read_to_string(&cache_path)
            .map_err(|e| format!("Failed to read cache file: {}", e))?;
        serde_json::from_str(&contents).unwrap_or_default()
    } else {
        Vec::new()
    };
    
    let now = Utc::now().timestamp();
    caches.retain(|cache| now - cache.timestamp < CACHE_DURATION_SECONDS);
    caches.retain(|cache| cache.location != location);
    
    caches.push(WeatherCache {
        location: location.to_string(),
        timestamp: now,
        data: data.clone(),
    });
    
    let json = serde_json::to_string_pretty(&caches)
        .map_err(|e| format!("Failed to serialize cache: {}", e))?;
    
    fs::write(&cache_path, json)
        .map_err(|e| format!("Failed to write cache file: {}", e))?;
    
    Ok(())
}

fn print_weather(data: &WeatherData, mode: &str, icon_style: &str) {
    let icon = get_weather_icon(&data.main, icon_style);
    
    if mode == "simple" {
        println!(
            "{} {}: {:.1}°C, {} (Humidity: {}%, Wind: {:.1} m/s)",
            icon,
            data.city,
            data.temperature,
            data.description,
            data.humidity,
            data.wind_speed
        );
    } else {
        println!("╔═══════════════════════════════════════╗");
        println!("║           Weather Information          ║");
        println!("╠═══════════════════════════════════════╣");
        println!("║  Location: {:<28}║", format!("{}, {}", data.city, data.country));
        println!("║  {:<1} {:<33}║", icon, data.description);
        println!("║  Temperature: {:<23.1}°C ║", data.temperature);
        println!("║  Humidity: {:<26}% ║", data.humidity);
        println!("║  Wind Speed: {:<22.1} m/s ║", data.wind_speed);
        println!("╚═══════════════════════════════════════╝");
    }
}

fn get_weather_icon(main: &str, style: &str) -> String {
    if style == "emoji" {
        match main {
            "Clear" => "☀️".to_string(),
            "Clouds" => "☁️".to_string(),
            "Rain" => "🌧️".to_string(),
            "Snow" => "❄️".to_string(),
            _ => "❓".to_string(),
        }
    } else {
        match main {
            "Clear" => r"  \|/  ".to_string() + "\n" + r" --O-- " + "\n" + r"  /|\  ",
            "Clouds" => r"   .--. ".to_string() + "\n" + r"  (    ).".to_string() + "\n" + r"   `--'  ",
            "Rain" => r"   .--. ".to_string() + "\n" + r"  (    ).".to_string() + "\n" + r"   `--'  ".to_string() + "\n" + r"  ↓ ↓ ↓  ",
            "Snow" => r"   .--. ".to_string() + "\n" + r"  (    ).".to_string() + "\n" + r"   `--'  ".to_string() + "\n" + r"  * * *  ",
            _ => r"  ???  ".to_string(),
        }
    }
}
