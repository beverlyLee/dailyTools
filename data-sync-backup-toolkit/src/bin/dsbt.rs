use clap::{Parser, Subcommand};
use dsbt_core::*;
use std::path::{Path, PathBuf};
use tracing_subscriber;

#[derive(Parser)]
#[command(
    name = "dsbt",
    about = "数据同步与备份工具集",
    version = "0.1.0",
    author = "Your Name"
)]
struct Cli {
    #[arg(
        long = "config-dir",
        env = "DSBT_CONFIG_DIR",
        help = "配置目录路径"
    )]
    config_dir: Option<PathBuf>,
    
    #[arg(
        long = "verbose",
        short = 'v',
        help = "启用详细输出"
    )]
    verbose: bool,
    
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(about = "配置文件同步相关命令")]
    Sync {
        #[command(subcommand)]
        sync_command: SyncCommands,
    },
    
    #[command(about = "备份相关命令")]
    Backup {
        #[command(subcommand)]
        backup_command: BackupCommands,
    },
    
    #[command(about = "密钥管理相关命令")]
    Key {
        #[command(subcommand)]
        key_command: KeyCommands,
    },
    
    #[command(about = "显示系统信息")]
    Info,
}

#[derive(Subcommand)]
enum SyncCommands {
    #[command(about = "创建新的同步配置文件")]
    CreateProfile {
        #[arg(long = "name", short = 'n', help = "配置文件名称")]
        name: String,
        
        #[arg(long = "device-id", help = "设备ID（可选）")]
        device_id: Option<String>,
    },
    
    #[command(about = "列出所有同步配置文件")]
    ListProfiles,
    
    #[command(about = "删除同步配置文件")]
    DeleteProfile {
        #[arg(long = "profile-id", help = "配置文件ID")]
        profile_id: String,
    },
    
    #[command(about = "添加配置文件到同步")]
    AddConfig {
        #[arg(long = "profile-id", help = "配置文件ID")]
        profile_id: String,
        
        #[arg(long = "path", short = 'p', help = "配置文件路径")]
        path: PathBuf,
        
        #[arg(long = "name", short = 'n', help = "配置文件名称（可选）")]
        name: Option<String>,
        
        #[arg(long = "sensitive", help = "是否为敏感配置（如 .ssh/config）")]
        sensitive: bool,
        
        #[arg(long = "tag", help = "标签（可重复）")]
        tags: Vec<String>,
    },
    
    #[command(about = "从同步中移除配置文件")]
    RemoveConfig {
        #[arg(long = "profile-id", help = "配置文件ID")]
        profile_id: String,
        
        #[arg(long = "config-id", help = "配置ID")]
        config_id: String,
    },
    
    #[command(about = "列出同步配置中的文件")]
    ListConfigs {
        #[arg(long = "profile-id", help = "配置文件ID")]
        profile_id: String,
    },
    
    #[command(about = "执行同步")]
    Execute {
        #[arg(long = "profile-id", help = "配置文件ID")]
        profile_id: String,
        
        #[arg(long = "storage-type", default_value = "local", help = "存储类型：local, s3, sftp")]
        storage_type: String,
        
        #[arg(long = "storage-path", help = "存储路径（对于local是目录，对于s3是bucket名称等）")]
        storage_path: Option<PathBuf>,
    },
    
    #[command(about = "查看同步状态")]
    Status {
        #[arg(long = "profile-id", help = "配置文件ID")]
        profile_id: String,
        
        #[arg(long = "storage-type", default_value = "local", help = "存储类型")]
        storage_type: String,
        
        #[arg(long = "storage-path", help = "存储路径")]
        storage_path: Option<PathBuf>,
    },
}

#[derive(Subcommand)]
enum BackupCommands {
    #[command(about = "创建新的备份配置")]
    CreateConfig {
        #[arg(long = "name", short = 'n', help = "备份配置名称")]
        name: String,
        
        #[arg(long = "source", short = 's', help = "源路径（可重复）")]
        sources: Vec<PathBuf>,
        
        #[arg(long = "storage-type", default_value = "local", help = "存储类型")]
        storage_type: String,
    },
    
    #[command(about = "列出所有备份配置")]
    ListConfigs,
    
    #[command(about = "删除备份配置")]
    DeleteConfig {
        #[arg(long = "config-id", help = "备份配置ID")]
        config_id: String,
    },
    
    #[command(about = "添加排除模式")]
    AddExclude {
        #[arg(long = "config-id", help = "备份配置ID")]
        config_id: String,
        
        #[arg(long = "pattern", help = "排除模式（glob模式）")]
        pattern: String,
    },
    
    #[command(about = "移除排除模式")]
    RemoveExclude {
        #[arg(long = "config-id", help = "备份配置ID")]
        config_id: String,
        
        #[arg(long = "pattern", help = "排除模式")]
        pattern: String,
    },
    
    #[command(about = "执行备份")]
    Execute {
        #[arg(long = "config-id", help = "备份配置ID")]
        config_id: String,
        
        #[arg(long = "type", short = 't', help = "备份类型：full, incremental, differential")]
        backup_type: Option<String>,
        
        #[arg(long = "storage-path", help = "存储路径")]
        storage_path: Option<PathBuf>,
    },
    
    #[command(about = "执行恢复")]
    Restore {
        #[arg(long = "config-id", help = "备份配置ID")]
        config_id: String,
        
        #[arg(long = "snapshot-id", help = "快照ID（可选，不指定则使用最新）")]
        snapshot_id: Option<String>,
        
        #[arg(long = "target", short = 't', help = "目标路径")]
        target: PathBuf,
        
        #[arg(long = "include", help = "包含模式（glob模式，可重复）")]
        includes: Vec<String>,
        
        #[arg(long = "exclude", help = "排除模式（glob模式，可重复）")]
        excludes: Vec<String>,
    },
    
    #[command(about = "列出备份快照")]
    ListSnapshots {
        #[arg(long = "config-id", help = "备份配置ID")]
        config_id: String,
    },
    
    #[command(about = "查看备份配置详情")]
    ShowConfig {
        #[arg(long = "config-id", help = "备份配置ID")]
        config_id: String,
    },
}

#[derive(Subcommand)]
enum KeyCommands {
    #[command(about = "生成新密钥")]
    Generate {
        #[arg(long = "id", help = "密钥ID")]
        id: String,
        
        #[arg(long = "hint", help = "密钥提示信息")]
        hint: Option<String>,
    },
    
    #[command(about = "从密码派生密钥")]
    Derive {
        #[arg(long = "id", help = "密钥ID")]
        id: String,
        
        #[arg(long = "password", help = "密码（将提示输入或从环境变量读取）")]
        password: Option<String>,
        
        #[arg(long = "hint", help = "密钥提示信息")]
        hint: Option<String>,
    },
    
    #[command(about = "列出所有密钥")]
    List,
    
    #[command(about = "删除密钥")]
    Delete {
        #[arg(long = "id", help = "密钥ID")]
        id: String,
    },
}

fn get_config_dir(cli: &Cli) -> PathBuf {
    if let Some(ref dir) = cli.config_dir {
        dir.clone()
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".dsbt")
    }
}

fn get_keys_dir(config_dir: &Path) -> PathBuf {
    config_dir.join("keys")
}

fn main() {
    let cli = Cli::parse();
    
    if cli.verbose {
        tracing_subscriber::fmt()
            .with_max_level(tracing::Level::DEBUG)
            .init();
    } else {
        tracing_subscriber::fmt()
            .with_max_level(tracing::Level::INFO)
            .init();
    }
    
    let config_dir = get_config_dir(&cli);
    
    match &cli.command {
        Commands::Sync { sync_command } => handle_sync_commands(sync_command, &config_dir),
        Commands::Backup { backup_command } => handle_backup_commands(backup_command, &config_dir),
        Commands::Key { key_command } => handle_key_commands(key_command, &config_dir),
        Commands::Info => handle_info_command(&config_dir),
    }
}

fn handle_sync_commands(command: &SyncCommands, config_dir: &Path) {
    match command {
        SyncCommands::CreateProfile { name, device_id } => {
            let mut config_manager = ConfigManager::new(config_dir)
                .expect("无法创建配置管理器");
            
            let profile = config_manager.create_profile(name, device_id.as_deref())
                .expect("无法创建同步配置文件");
            
            println!("同步配置文件创建成功！");
            println!("  ID: {}", profile.id);
            println!("  名称: {}", profile.name);
            println!("  设备ID: {}", profile.device_id);
        }
        
        SyncCommands::ListProfiles => {
            let config_manager = ConfigManager::new(config_dir)
                .expect("无法创建配置管理器");
            
            let profiles = config_manager.list_profiles();
            
            if profiles.is_empty() {
                println!("没有找到同步配置文件");
            } else {
                println!("同步配置文件列表：");
                for profile in profiles {
                    println!("  - ID: {}", profile.id);
                    println!("    名称: {}", profile.name);
                    println!("    设备ID: {}", profile.device_id);
                    println!("    配置文件数: {}", profile.config_files.len());
                    println!();
                }
            }
        }
        
        SyncCommands::DeleteProfile { profile_id } => {
            let mut config_manager = ConfigManager::new(config_dir)
                .expect("无法创建配置管理器");
            
            config_manager.delete_profile(profile_id)
                .expect("无法删除同步配置文件");
            
            println!("同步配置文件已删除: {}", profile_id);
        }
        
        SyncCommands::AddConfig { 
            profile_id, 
            path, 
            name, 
            sensitive, 
            tags 
        } => {
            let mut config_manager = ConfigManager::new(config_dir)
                .expect("无法创建配置管理器");
            
            let tags_ref: Vec<&str> = tags.iter().map(|s| s.as_str()).collect();
            
            let config_file = config_manager.add_config_file(
                profile_id,
                path,
                name.as_deref(),
                *sensitive,
                tags_ref,
            ).expect("无法添加配置文件");
            
            println!("配置文件添加成功！");
            println!("  ID: {}", config_file.id);
            println!("  名称: {}", config_file.name);
            println!("  路径: {:?}", config_file.source_path);
            println!("  敏感: {}", config_file.is_sensitive);
            if !config_file.tags.is_empty() {
                println!("  标签: {}", config_file.tags.join(", "));
            }
        }
        
        SyncCommands::RemoveConfig { profile_id, config_id } => {
            let mut config_manager = ConfigManager::new(config_dir)
                .expect("无法创建配置管理器");
            
            config_manager.remove_config_file(profile_id, config_id)
                .expect("无法移除配置文件");
            
            println!("配置文件已移除: {}", config_id);
        }
        
        SyncCommands::ListConfigs { profile_id } => {
            let config_manager = ConfigManager::new(config_dir)
                .expect("无法创建配置管理器");
            
            let configs = config_manager.list_config_files(profile_id)
                .expect("无法列出配置文件");
            
            if configs.is_empty() {
                println!("该配置文件中没有配置文件");
            } else {
                println!("配置文件列表：");
                for config in configs {
                    println!("  - ID: {}", config.id);
                    println!("    名称: {}", config.name);
                    println!("    路径: {:?}", config.source_path);
                    println!("    敏感: {}", config.is_sensitive);
                    if !config.tags.is_empty() {
                        println!("    标签: {}", config.tags.join(", "));
                    }
                    println!();
                }
            }
        }
        
        SyncCommands::Execute { 
            profile_id, 
            storage_type,
            storage_path,
        } => {
            let config_manager = ConfigManager::new(config_dir)
                .expect("无法创建配置管理器");
            
            let profile = config_manager.get_profile(profile_id)
                .expect("无法获取同步配置文件")
                .clone();
            
            let storage_backend = match storage_type.as_str() {
                "local" => {
                    let path = storage_path.as_ref()
                        .unwrap_or(&config_dir.join("sync_storage"));
                    StorageFactory::create_local_backend(path)
                        .expect("无法创建本地存储后端")
                }
                _ => panic!("不支持的存储类型：{}", storage_type),
            };
            
            let conflict_resolver = ConflictResolver::new(profile.conflict_resolution);
            
            let keys_dir = get_keys_dir(config_dir);
            let mut sync_engine = SyncEngine::new(
                config_manager,
                storage_backend,
                conflict_resolver,
            );
            
            if profile.encryption_enabled {
                sync_engine = sync_engine.with_encryption(
                    EncryptionAlgorithm::Aes256Gcm,
                    &keys_dir,
                ).expect("无法设置加密");
            }
            
            let result = sync_engine.sync_profile(profile_id)
                .expect("同步失败");
            
            println!("同步完成！");
            println!("  配置文件ID: {}", result.profile_id);
            println!("  开始时间: {:?}", result.start_time);
            println!("  结束时间: {:?}", result.end_time);
            println!("  已同步文件: {}", result.synced_files.len());
            println!("  冲突: {}", result.conflicts.len());
            println!("  错误: {}", result.errors.len());
            
            if !result.conflicts.is_empty() {
                println!("\n检测到的冲突：");
                for conflict in &result.conflicts {
                    println!("  - 文件: {}", conflict.file_path);
                    println!("    本地版本: {} (修改时间: {:?})", 
                        conflict.local_version.hash, 
                        conflict.local_version.modified_at);
                    println!("    远程版本: {} (修改时间: {:?})", 
                        conflict.remote_version.hash, 
                        conflict.remote_version.modified_at);
                }
            }
            
            if !result.errors.is_empty() {
                println!("\n错误：");
                for error in &result.errors {
                    println!("  - 文件: {} ({})", error.file_path, error.error);
                }
            }
        }
        
        SyncCommands::Status { 
            profile_id, 
            storage_type,
            storage_path,
        } => {
            let config_manager = ConfigManager::new(config_dir)
                .expect("无法创建配置管理器");
            
            let storage_backend = match storage_type.as_str() {
                "local" => {
                    let path = storage_path.as_ref()
                        .unwrap_or(&config_dir.join("sync_storage"));
                    StorageFactory::create_local_backend(path)
                        .expect("无法创建本地存储后端")
                }
                _ => panic!("不支持的存储类型：{}", storage_type),
            };
            
            let conflict_resolver = ConflictResolver::new(ConflictResolutionStrategy::LatestFirst);
            
            let sync_engine = SyncEngine::new(
                config_manager,
                storage_backend,
                conflict_resolver,
            );
            
            let status = sync_engine.get_sync_status(profile_id)
                .expect("无法获取同步状态");
            
            println!("同步状态：");
            println!("  配置文件ID: {}", status.profile_id);
            println!("  已同步文件: {}", status.synced_files);
            println!("  待同步文件: {}", status.pending_files);
            println!("  冲突: {}", status.conflicts);
            println!("  正在同步: {}", status.is_syncing);
            if let Some(time) = status.last_sync_time {
                println!("  上次同步时间: {:?}", time);
            }
        }
    }
}

fn handle_backup_commands(command: &BackupCommands, config_dir: &Path) {
    match command {
        BackupCommands::CreateConfig { name, sources, storage_type } => {
            let mut backup_manager = BackupManager::new(config_dir)
                .expect("无法创建备份管理器");
            
            let storage_backend_type = match storage_type.as_str() {
                "local" => StorageBackendType::Local,
                "s3" => StorageBackendType::S3,
                "sftp" => StorageBackendType::SFTP,
                _ => panic!("不支持的存储类型：{}", storage_type),
            };
            
            let config = backup_manager.create_backup_config(
                name,
                sources.clone(),
                storage_backend_type,
            ).expect("无法创建备份配置");
            
            println!("备份配置创建成功！");
            println!("  ID: {}", config.id);
            println!("  名称: {}", config.name);
            println!("  源路径:");
            for source in &config.source_paths {
                println!("    - {:?}", source);
            }
            println!("  存储类型: {:?}", config.storage_backend);
            println!("  备份类型: {:?}", config.backup_type);
            println!("  压缩: {:?}", config.compression);
            println!("  加密: {}", config.encryption_enabled);
        }
        
        BackupCommands::ListConfigs => {
            let backup_manager = BackupManager::new(config_dir)
                .expect("无法创建备份管理器");
            
            let configs = backup_manager.list_backup_configs();
            
            if configs.is_empty() {
                println!("没有找到备份配置");
            } else {
                println!("备份配置列表：");
                for config in configs {
                    println!("  - ID: {}", config.id);
                    println!("    名称: {}", config.name);
                    println!("    源路径数: {}", config.source_paths.len());
                    println!("    存储类型: {:?}", config.storage_backend);
                    println!("    备份类型: {:?}", config.backup_type);
                    println!();
                }
            }
        }
        
        BackupCommands::DeleteConfig { config_id } => {
            let mut backup_manager = BackupManager::new(config_dir)
                .expect("无法创建备份管理器");
            
            backup_manager.delete_backup_config(config_id)
                .expect("无法删除备份配置");
            
            println!("备份配置已删除: {}", config_id);
        }
        
        BackupCommands::AddExclude { config_id, pattern } => {
            let mut backup_manager = BackupManager::new(config_dir)
                .expect("无法创建备份管理器");
            
            backup_manager.add_exclude_pattern(config_id, pattern)
                .expect("无法添加排除模式");
            
            println!("排除模式已添加: {}", pattern);
        }
        
        BackupCommands::RemoveExclude { config_id, pattern } => {
            let mut backup_manager = BackupManager::new(config_dir)
                .expect("无法创建备份管理器");
            
            backup_manager.remove_exclude_pattern(config_id, pattern)
                .expect("无法移除排除模式");
            
            println!("排除模式已移除: {}", pattern);
        }
        
        BackupCommands::Execute { 
            config_id, 
            backup_type, 
            storage_path,
        } => {
            let backup_manager = BackupManager::new(config_dir)
                .expect("无法创建备份管理器");
            
            let config = backup_manager.get_backup_config(config_id)
                .expect("无法获取备份配置")
                .clone();
            
            let storage_backend = match config.storage_backend {
                StorageBackendType::Local => {
                    let path = storage_path.as_ref()
                        .unwrap_or(&config_dir.join("backup_storage"));
                    StorageFactory::create_local_backend(path)
                        .expect("无法创建本地存储后端")
                }
                _ => panic!("不支持的存储类型"),
            };
            
            let mut backup_engine = backup_manager.create_backup_engine(
                config_id,
                storage_backend,
            ).expect("无法创建备份引擎");
            
            let keys_dir = get_keys_dir(config_dir);
            if config.encryption_enabled {
                backup_engine = backup_engine.with_encryption(
                    EncryptionAlgorithm::Aes256Gcm,
                    &keys_dir,
                ).expect("无法设置加密");
            }
            
            backup_engine.set_progress_callback(|progress| {
                let percent = if progress.total_bytes > 0 {
                    (progress.processed_bytes as f64 / progress.total_bytes as f64) * 100.0
                } else {
                    0.0
                };
                
                print!("\r进度: {:.1}% ({}/{} 文件, {}/{} 字节)", 
                    percent,
                    progress.processed_files,
                    progress.total_files,
                    progress.processed_bytes,
                    progress.total_bytes
                );
                
                if let Some(ref file) = progress.current_file {
                    print!(" - 正在处理: {}", file);
                }
                
                use std::io::{self, Write};
                io::stdout().flush().ok();
            });
            
            let backup_type_enum = match backup_type.as_deref() {
                Some("full") => BackupType::Full,
                Some("incremental") => BackupType::Incremental,
                Some("differential") => BackupType::Differential,
                None => config.backup_type,
                Some(t) => panic!("不支持的备份类型：{}", t),
            };
            
            println!("开始执行备份...");
            println!("  类型: {:?}", backup_type_enum);
            
            let result = backup_engine.execute_backup(Some(backup_type_enum))
                .expect("备份失败");
            
            println!();
            println!("备份完成！");
            println!("  快照ID: {}", result.backup_id);
            println!("  成功: {}", result.success);
            println!("  开始时间: {:?}", result.start_time);
            println!("  结束时间: {:?}", result.end_time);
            println!("  总文件数: {}", result.total_files);
            println!("  总字节数: {}", result.total_bytes);
            if let Some(compressed) = result.compressed_bytes {
                println!("  压缩后字节数: {}", compressed);
                let ratio = (1.0 - (compressed as f64 / result.total_bytes as f64)) * 100.0;
                println!("  压缩率: {:.1}%", ratio);
            }
            println!("  警告: {}", result.warnings.len());
            println!("  错误: {}", result.errors.len());
            
            if !result.warnings.is_empty() {
                println!("\n警告：");
                for warning in &result.warnings {
                    println!("  - {}", warning);
                }
            }
            
            if !result.errors.is_empty() {
                println!("\n错误：");
                for error in &result.errors {
                    println!("  - {}", error);
                }
            }
        }
        
        BackupCommands::Restore { 
            config_id, 
            snapshot_id, 
            target, 
            includes, 
            excludes,
        } => {
            let backup_manager = BackupManager::new(config_dir)
                .expect("无法创建备份管理器");
            
            let config = backup_manager.get_backup_config(config_id)
                .expect("无法获取备份配置")
                .clone();
            
            let storage_backend = match config.storage_backend {
                StorageBackendType::Local => {
                    let path = config_dir.join("backup_storage");
                    StorageFactory::create_local_backend(&path)
                        .expect("无法创建本地存储后端")
                }
                _ => panic!("不支持的存储类型"),
            };
            
            let mut restore_engine = backup_manager.create_restore_engine(
                config_id,
                storage_backend,
            ).expect("无法创建恢复引擎");
            
            let keys_dir = get_keys_dir(config_dir);
            if config.encryption_enabled {
                restore_engine = restore_engine.with_encryption(
                    EncryptionAlgorithm::Aes256Gcm,
                    &keys_dir,
                ).expect("无法设置加密");
            }
            
            restore_engine.set_progress_callback(|progress| {
                let percent = if progress.total_bytes > 0 {
                    (progress.restored_bytes as f64 / progress.total_bytes as f64) * 100.0
                } else {
                    0.0
                };
                
                print!("\r恢复进度: {:.1}% ({}/{} 文件, {}/{} 字节)", 
                    percent,
                    progress.restored_files,
                    progress.total_files,
                    progress.restored_bytes,
                    progress.total_bytes
                );
                
                use std::io::{self, Write};
                io::stdout().flush().ok();
            });
            
            let snapshot_id_to_use = match snapshot_id {
                Some(id) => id.clone(),
                None => {
                    let latest = restore_engine.get_latest_snapshot()
                        .expect("无法获取最新快照");
                    latest.as_ref().expect("没有可用的快照").id.clone()
                }
            };
            
            println!("开始执行恢复...");
            println!("  快照ID: {}", snapshot_id_to_use);
            println!("  目标路径: {:?}", target);
            
            let includes_ref: Vec<&str> = includes.iter().map(|s| s.as_str()).collect();
            let excludes_ref: Vec<&str> = excludes.iter().map(|s| s.as_str()).collect();
            
            let result = restore_engine.execute_restore(
                &snapshot_id_to_use,
                target,
                if includes.is_empty() { None } else { Some(&includes_ref) },
                if excludes.is_empty() { None } else { Some(&excludes_ref) },
            ).expect("恢复失败");
            
            println!();
            println!("恢复完成！");
            println!("  快照ID: {}", result.backup_id);
            println!("  成功: {}", result.success);
            println!("  开始时间: {:?}", result.start_time);
            println!("  结束时间: {:?}", result.end_time);
            println!("  恢复文件数: {}", result.total_files);
            println!("  恢复字节数: {}", result.total_bytes);
            println!("  警告: {}", result.warnings.len());
            println!("  错误: {}", result.errors.len());
            
            if !result.warnings.is_empty() {
                println!("\n警告：");
                for warning in &result.warnings {
                    println!("  - {}", warning);
                }
            }
            
            if !result.errors.is_empty() {
                println!("\n错误：");
                for error in &result.errors {
                    println!("  - {}", error);
                }
            }
        }
        
        BackupCommands::ListSnapshots { config_id } => {
            let backup_manager = BackupManager::new(config_dir)
                .expect("无法创建备份管理器");
            
            let snapshots = backup_manager.list_snapshots(config_id)
                .expect("无法列出快照");
            
            if snapshots.is_empty() {
                println!("没有找到快照");
            } else {
                println!("快照列表：");
                for snapshot in snapshots {
                    println!("  - ID: {}", snapshot.id);
                    println!("    类型: {:?}", snapshot.backup_type);
                    println!("    创建时间: {:?}", snapshot.created_at);
                    println!("    完成时间: {:?}", snapshot.completed_at);
                    println!("    文件数: {}", snapshot.total_files);
                    println!("    大小: {} 字节", snapshot.total_bytes);
                    if let Some(compressed) = snapshot.compressed_bytes {
                        println!("    压缩后大小: {} 字节", compressed);
                    }
                    println!("    加密: {}", snapshot.is_encrypted);
                    println!("    有效: {}", snapshot.is_valid);
                    if !snapshot.errors.is_empty() {
                        println!("    错误数: {}", snapshot.errors.len());
                    }
                    println!();
                }
            }
        }
        
        BackupCommands::ShowConfig { config_id } => {
            let backup_manager = BackupManager::new(config_dir)
                .expect("无法创建备份管理器");
            
            let config = backup_manager.get_backup_config(config_id)
                .expect("无法获取备份配置");
            
            println!("备份配置详情：");
            println!("  ID: {}", config.id);
            println!("  名称: {}", config.name);
            println!();
            println!("  源路径：");
            for source in &config.source_paths {
                println!("    - {:?}", source);
            }
            println!();
            println!("  排除模式：");
            if config.exclude_patterns.is_empty() {
                println!("    （无）");
            } else {
                for pattern in &config.exclude_patterns {
                    println!("    - {}", pattern);
                }
            }
            println!();
            println!("  存储类型: {:?}", config.storage_backend);
            println!("  备份类型: {:?}", config.backup_type);
            println!("  压缩: {:?}", config.compression);
            println!("  加密: {}", config.encryption_enabled);
            if config.encryption_enabled {
                println!("  加密密钥ID: {:?}", config.encryption_key_id);
            }
            println!();
            println!("  保留策略：");
            if let Some(max) = config.retention_policy.max_backups {
                println!("    最大备份数: {}", max);
            }
            if let Some(days) = config.retention_policy.max_age_days {
                println!("    最大保留天数: {}", days);
            }
            if let Some(daily) = config.retention_policy.keep_daily {
                println!("    保留每日备份数: {}", daily);
            }
            if let Some(weekly) = config.retention_policy.keep_weekly {
                println!("    保留每周备份数: {}", weekly);
            }
            if let Some(monthly) = config.retention_policy.keep_monthly {
                println!("    保留每月备份数: {}", monthly);
            }
        }
    }
}

fn handle_key_commands(command: &KeyCommands, config_dir: &Path) {
    let keys_dir = get_keys_dir(config_dir);
    let key_store = KeyStore::new(&keys_dir);
    key_store.init().expect("无法初始化密钥存储");
    
    match command {
        KeyCommands::Generate { id, hint } => {
            let key = generate_secure_key();
            key_store.save_key(id, &key, hint.as_deref())
                .expect("无法保存密钥");
            
            println!("密钥生成成功！");
            println!("  ID: {}", id);
            if let Some(h) = hint {
                println!("  提示: {}", h);
            }
        }
        
        KeyCommands::Derive { id, password, hint } => {
            let password = password.as_ref()
                .map(|s| s.as_str())
                .unwrap_or_else(|| {
                    println!("请输入密码：");
                    let mut input = String::new();
                    std::io::stdin().read_line(&mut input).ok();
                    input.trim().to_string()
                });
            
            let salt = generate_salt();
            let key = derive_key_from_password(password, &salt);
            
            let mut full_key = Vec::with_capacity(16 + 32);
            full_key.extend_from_slice(&salt);
            full_key.extend_from_slice(&key);
            
            key_store.save_key(id, &full_key, hint.as_deref())
                .expect("无法保存密钥");
            
            println!("密钥派生成功！");
            println!("  ID: {}", id);
            if let Some(h) = hint {
                println!("  提示: {}", h);
            }
        }
        
        KeyCommands::List => {
            let keys = key_store.list_keys().expect("无法列出密钥");
            
            if keys.is_empty() {
                println!("没有找到密钥");
            } else {
                println!("密钥列表：");
                for key_info in keys {
                    println!("  - ID: {}", key_info.key_id);
                    println!("    创建时间: {:?}", key_info.created_at);
                    println!("    算法: {:?}", key_info.algorithm);
                    if let Some(hint) = &key_info.hint {
                        println!("    提示: {}", hint);
                    }
                    println!();
                }
            }
        }
        
        KeyCommands::Delete { id } => {
            key_store.delete_key(id).expect("无法删除密钥");
            println!("密钥已删除: {}", id);
        }
    }
}

fn handle_info_command(config_dir: &Path) {
    println!("数据同步与备份工具集 (DSBT)");
    println!("版本: 0.1.0");
    println!();
    println!("配置目录: {:?}", config_dir);
    println!();
    
    let config_dir_exists = config_dir.exists();
    println!("配置目录状态: {}", if config_dir_exists { "已创建" } else { "未创建" });
    
    if config_dir_exists {
        let profiles_dir = config_dir.join("profiles");
        let backup_configs_dir = config_dir.join("backup_configs");
        let keys_dir = get_keys_dir(config_dir);
        
        println!();
        println!("同步配置文件数: {}", count_toml_files(&profiles_dir));
        println!("备份配置数: {}", count_toml_files(&backup_configs_dir));
        println!("密钥数: {}", count_key_files(&keys_dir));
    }
    
    println!();
    println!("可用功能：");
    println!("  - 配置文件同步");
    println!("  - 系统备份与恢复");
    println!("  - 加密支持 (AES-256-GCM, ChaCha20-Poly1305)");
    println!("  - 版本控制");
    println!("  - 冲突解决");
    println!();
    println!("存储后端：");
    println!("  - 本地存储 (默认)");
    #[cfg(feature = "s3")]
    println!("  - S3 (已启用)");
    #[cfg(not(feature = "s3"))]
    println!("  - S3 (未启用，使用 --features s3 编译)");
    #[cfg(feature = "sftp")]
    println!("  - SFTP (已启用)");
    #[cfg(not(feature = "sftp"))]
    println!("  - SFTP (未启用，使用 --features sftp 编译)");
}

fn count_toml_files(dir: &Path) -> usize {
    if !dir.exists() {
        return 0;
    }
    
    std::fs::read_dir(dir)
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .extension()
                        .map(|ext| ext == "toml")
                        .unwrap_or(false)
                })
                .count()
        })
        .unwrap_or(0)
}

fn count_key_files(dir: &Path) -> usize {
    if !dir.exists() {
        return 0;
    }
    
    std::fs::read_dir(dir)
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .extension()
                        .map(|ext| ext == "key")
                        .unwrap_or(false)
                })
                .count()
        })
        .unwrap_or(0)
}
