use super::error::*;
use super::models::*;
use chrono::Utc;
use std::collections::HashMap;

pub fn generate_mock_packet() -> Packet {
    let protocols = vec![
        Protocol::TCP,
        Protocol::UDP,
        Protocol::HTTP,
        Protocol::DNS,
        Protocol::ICMP,
        Protocol::TLS,
    ];
    
    let protocol = protocols[rand::random::<usize>() % protocols.len()].clone();
    
    let source_ips = vec![
        "192.168.1.100",
        "192.168.1.101",
        "10.0.0.5",
        "172.16.0.10",
    ];
    
    let dest_ips = vec![
        "8.8.8.8",
        "1.1.1.1",
        "142.250.190.46",
        "151.101.1.69",
        "104.244.42.1",
    ];
    
    let source_ip = source_ips[rand::random::<usize>() % source_ips.len()].to_string();
    let dest_ip = dest_ips[rand::random::<usize>() % dest_ips.len()].to_string();
    
    let source_port: u16 = 1024 + (rand::random::<u16>() % 64511);
    let dest_port = match protocol {
        Protocol::HTTP => 80,
        Protocol::TLS => 443,
        Protocol::DNS => 53,
        Protocol::SSH => 22,
        Protocol::FTP => 21,
        Protocol::SMTP => 25,
        _ => 1 + (rand::random::<u16>() % 1023),
    };
    
    let raw_bytes: Vec<u8> = (0..(64 + (rand::random::<usize>() % 1400)))
        .map(|_| rand::random::<u8>())
        .collect();
    
    let raw_hex = hex::encode(&raw_bytes);
    
    let summary = format!(
        "{} {}:{} -> {}:{} Len: {}",
        protocol.to_string(),
        source_ip,
        source_port,
        dest_ip,
        dest_port,
        raw_bytes.len()
    );
    
    let tcp_flags = if protocol == Protocol::TCP || protocol == Protocol::HTTP {
        let flags = vec!["SYN", "ACK", "PSH", "FIN"];
        let flag = flags[rand::random::<usize>() % flags.len()];
        Some(TcpFlags {
            fin: flag == "FIN",
            syn: flag == "SYN",
            rst: false,
            psh: flag == "PSH",
            ack: true,
            urg: false,
            ece: false,
            cwr: false,
            sequence: rand::random::<u32>(),
            acknowledgement: rand::random::<u32>(),
            window: 65535,
        })
    } else {
        None
    };
    
    let http_info = if protocol == Protocol::HTTP {
        let methods = vec!["GET", "POST", "PUT", "DELETE"];
        let method = methods[rand::random::<usize>() % methods.len()];
        let urls = vec!["/", "/api/v1/users", "/index.html", "/api/data"];
        let url = urls[rand::random::<usize>() % urls.len()];
        
        let mut headers = HashMap::new();
        headers.insert("Host".to_string(), serde_json::json!("example.com"));
        headers.insert("User-Agent".to_string(), serde_json::json!("Mozilla/5.0"));
        headers.insert("Accept".to_string(), serde_json::json!("text/html"));
        
        Some(HttpInfo {
            method: Some(method.to_string()),
            url: Some(url.to_string()),
            version: Some("HTTP/1.1".to_string()),
            status_code: None,
            status_text: None,
            headers: serde_json::json!(headers),
            body: None,
            content_type: Some("text/html; charset=utf-8".to_string()),
            content_length: Some(raw_bytes.len() as u64),
        })
    } else {
        None
    };
    
    let dns_info = if protocol == Protocol::DNS {
        let domains = vec!["google.com", "github.com", "example.com", "api.github.com"];
        let domain = domains[rand::random::<usize>() % domains.len()];
        let is_query = rand::random::<bool>();
        
        let responses = if !is_query {
            let ips = vec!["8.8.8.8", "1.1.1.1", "142.250.190.46"];
            vec![DnsResponse {
                name: domain.to_string(),
                r#type: "A".to_string(),
                class: "IN".to_string(),
                ttl: 300,
                data: ips[rand::random::<usize>() % ips.len()].to_string(),
            }]
        } else {
            Vec::new()
        };
        
        Some(DnsInfo {
            is_query,
            query_name: Some(domain.to_string()),
            query_type: Some("A".to_string()),
            query_class: Some("IN".to_string()),
            responses,
            ttl: Some(300),
        })
    } else {
        None
    };
    
    Packet {
        id: None,
        timestamp: Utc::now(),
        length: raw_bytes.len() as u32,
        protocol,
        source_mac: Some(format!("{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
            rand::random::<u8>(), rand::random::<u8>(), rand::random::<u8>(),
            rand::random::<u8>(), rand::random::<u8>(), rand::random::<u8>())),
        dest_mac: Some(format!("{:02x}:{:02x}:{:02x}:{:02x}:{:02x}:{:02x}",
            rand::random::<u8>(), rand::random::<u8>(), rand::random::<u8>(),
            rand::random::<u8>(), rand::random::<u8>(), rand::random::<u8>())),
        source_ip: Some(source_ip),
        dest_ip: Some(dest_ip),
        source_port: Some(source_port),
        dest_port: Some(dest_port),
        raw_hex,
        raw_bytes,
        summary,
        details: None,
        tcp_flags,
        http_info,
        dns_info,
    }
}

pub fn get_network_interfaces() -> Result<Vec<NetworkInterface>> {
    let interfaces = vec![
        NetworkInterface {
            name: "en0".to_string(),
            description: Some("Wi-Fi".to_string()),
            ip_addresses: vec!["192.168.1.100".to_string()],
            mac_address: Some("aa:bb:cc:dd:ee:ff".to_string()),
            is_loopback: false,
            is_up: true,
            is_running: true,
            promiscuous: false,
        },
        NetworkInterface {
            name: "en1".to_string(),
            description: Some("Thunderbolt 1".to_string()),
            ip_addresses: vec![],
            mac_address: Some("11:22:33:44:55:66".to_string()),
            is_loopback: false,
            is_up: false,
            is_running: false,
            promiscuous: false,
        },
        NetworkInterface {
            name: "lo0".to_string(),
            description: Some("Loopback".to_string()),
            ip_addresses: vec!["127.0.0.1".to_string(), "::1".to_string()],
            mac_address: None,
            is_loopback: true,
            is_up: true,
            is_running: true,
            promiscuous: false,
        },
        NetworkInterface {
            name: "utun0".to_string(),
            description: Some("VPN Tunnel".to_string()),
            ip_addresses: vec!["10.8.0.2".to_string()],
            mac_address: None,
            is_loopback: false,
            is_up: true,
            is_running: true,
            promiscuous: false,
        },
    ];
    
    Ok(interfaces)
}

pub fn validate_bpf_filter(filter: &str) -> Result<()> {
    let simple_filters = vec![
        "tcp", "udp", "icmp", "http", "dns",
        "port 80", "port 443", "port 53", "port 22",
        "host 192.168.1.1", "src host 10.0.0.1", "dst host 8.8.8.8",
        "src port 1234", "dst port 80",
        "tcp port 80", "udp port 53",
        "net 192.168.0.0/16",
        "",
    ];
    
    let filter_lower = filter.to_lowercase();
    
    if simple_filters.contains(&filter_lower.as_str()) || filter.is_empty() {
        return Ok(());
    }
    
    for simple in simple_filters {
        if filter_lower.contains(simple) {
            return Ok(());
        }
    }
    
    Err(SnifferError::BpfFilter(format!("不支持的 BPF 过滤器: {}", filter)))
}
