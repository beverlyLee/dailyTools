use super::error::*;
use super::models::*;
use super::protocols::*;
use chrono::Utc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;

pub struct PacketSniffer {
    is_running: Arc<AtomicBool>,
    packet_sender: Option<mpsc::UnboundedSender<Packet>>,
    stats: SnifferStats,
    selected_interface: Option<String>,
    bpf_filter: String,
    promiscuous: bool,
}

impl PacketSniffer {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            packet_sender: None,
            stats: SnifferStats::default(),
            selected_interface: None,
            bpf_filter: String::new(),
            promiscuous: false,
        }
    }
    
    pub fn get_interfaces() -> Result<Vec<NetworkInterface>> {
        get_network_interfaces()
    }
    
    pub fn select_interface(&mut self, interface_name: &str) -> Result<()> {
        let interfaces = Self::get_interfaces()?;
        
        if !interfaces.iter().any(|i| i.name == interface_name) {
            return Err(SnifferError::Interface(format!(
                "接口 '{}' 不存在",
                interface_name
            )));
        }
        
        self.selected_interface = Some(interface_name.to_string());
        Ok(())
    }
    
    pub fn set_bpf_filter(&mut self, filter: &str) -> Result<()> {
        validate_bpf_filter(filter)?;
        self.bpf_filter = filter.to_string();
        Ok(())
    }
    
    pub fn set_promiscuous(&mut self, enabled: bool) -> Result<()> {
        self.promiscuous = enabled;
        Ok(())
    }
    
    pub fn start(&mut self) -> Result<mpsc::UnboundedReceiver<Packet>> {
        if self.is_running.load(Ordering::SeqCst) {
            return Err(SnifferError::SnifferAlreadyRunning);
        }
        
        if self.selected_interface.is_none() {
            return Err(SnifferError::Interface("未选择网络接口".to_string()));
        }
        
        let (sender, receiver) = mpsc::unbounded_channel();
        self.packet_sender = Some(sender.clone());
        
        self.is_running.store(true, Ordering::SeqCst);
        self.stats = SnifferStats {
            start_time: Some(Utc::now()),
            ..Default::default()
        };
        
        let is_running = self.is_running.clone();
        let interface = self.selected_interface.clone().unwrap();
        let filter = self.bpf_filter.clone();
        let _promiscuous = self.promiscuous;
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(500));
            
            while is_running.load(Ordering::SeqCst) {
                interval.tick().await;
                
                for _ in 0..(1 + rand::random::<usize>() % 3) {
                    let mut packet = generate_mock_packet();
                    
                    if !filter.is_empty() {
                        let filter_lower = filter.to_lowercase();
                        let protocol_str = packet.protocol.to_string().to_lowercase();
                        
                        let should_keep = match filter_lower.as_str() {
                            "tcp" => packet.protocol == Protocol::TCP || packet.protocol == Protocol::HTTP,
                            "udp" => packet.protocol == Protocol::UDP || packet.protocol == Protocol::DNS,
                            "icmp" => packet.protocol == Protocol::ICMP,
                            "http" => packet.protocol == Protocol::HTTP,
                            "dns" => packet.protocol == Protocol::DNS,
                            _ => {
                                if filter_lower.contains("port 80") {
                                    packet.dest_port == Some(80) || packet.source_port == Some(80)
                                } else if filter_lower.contains("port 443") {
                                    packet.dest_port == Some(443) || packet.source_port == Some(443)
                                } else if filter_lower.contains("port 53") {
                                    packet.dest_port == Some(53) || packet.source_port == Some(53)
                                } else {
                                    true
                                }
                            }
                        };
                        
                        if !should_keep {
                            continue;
                        }
                    }
                    
                    let _ = sender.send(packet);
                }
            }
            
            log::info!("嗅探器已停止: {}", interface);
        });
        
        log::info!(
            "嗅探器已启动: 接口={}, BPF过滤={}, 混杂模式={}",
            self.selected_interface.as_ref().unwrap(),
            self.bpf_filter,
            self.promiscuous
        );
        
        Ok(receiver)
    }
    
    pub fn stop(&mut self) -> Result<()> {
        if !self.is_running.load(Ordering::SeqCst) {
            return Err(SnifferError::SnifferNotStarted);
        }
        
        self.is_running.store(false, Ordering::SeqCst);
        self.packet_sender = None;
        
        if let Some(start_time) = self.stats.start_time {
            let elapsed = Utc::now() - start_time;
            self.stats.elapsed_seconds = elapsed.num_seconds() as f64;
        }
        
        log::info!("嗅探器已停止");
        Ok(())
    }
    
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }
    
    pub fn update_stats(&mut self, packet: &Packet) {
        self.stats.total_packets += 1;
        self.stats.total_bytes += packet.length as u64;
        
        match packet.protocol {
            Protocol::TCP => self.stats.tcp_packets += 1,
            Protocol::UDP => self.stats.udp_packets += 1,
            Protocol::HTTP => self.stats.http_packets += 1,
            Protocol::DNS => self.stats.dns_packets += 1,
            Protocol::ICMP => self.stats.icmp_packets += 1,
            _ => self.stats.other_packets += 1,
        }
        
        if let Some(start_time) = self.stats.start_time {
            let elapsed = Utc::now() - start_time;
            let elapsed_secs = elapsed.num_seconds() as f64;
            
            if elapsed_secs > 0.0 {
                self.stats.packets_per_second = self.stats.total_packets as f64 / elapsed_secs;
                self.stats.bytes_per_second = self.stats.total_bytes as f64 / elapsed_secs;
            }
        }
    }
    
    pub fn get_stats(&self) -> SnifferStats {
        let mut stats = self.stats.clone();
        
        if let Some(start_time) = stats.start_time {
            let elapsed = Utc::now() - start_time;
            stats.elapsed_seconds = elapsed.num_seconds() as f64;
        }
        
        stats
    }
    
    pub fn get_selected_interface(&self) -> Option<&String> {
        self.selected_interface.as_ref()
    }
    
    pub fn get_bpf_filter(&self) -> &str {
        &self.bpf_filter
    }
    
    pub fn is_promiscuous(&self) -> bool {
        self.promiscuous
    }
}

impl Default for PacketSniffer {
    fn default() -> Self {
        Self::new()
    }
}
