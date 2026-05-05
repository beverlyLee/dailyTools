#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Job {
    id: String,
    name: String,
    description: String,
    template: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Stage {
    id: String,
    name: String,
    #[serde(rename = "type")]
    stage_type: String,
    jobs: Vec<Job>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Pipeline {
    stages: Vec<Stage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ValidationResult {
    valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    errors: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    warnings: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Artifact {
    id: String,
    name: String,
    size: u64,
    #[serde(rename = "type")]
    artifact_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Build {
    id: String,
    pipeline_name: String,
    branch: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    tag: Option<String>,
    commit: String,
    status: String,
    start_time: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration: Option<i32>,
    artifacts: Vec<Artifact>,
    creator: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SlackConfig {
    enabled: bool,
    webhook_url: String,
    default_channel: String,
    username: String,
    icon_emoji: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmailConfig {
    enabled: bool,
    smtp_host: String,
    smtp_port: u16,
    username: String,
    password: String,
    from_address: String,
    to_addresses: Vec<String>,
    use_tls: bool,
}

struct AppState {
    builds: Mutex<HashMap<String, Build>>,
    slack_config: Mutex<Option<SlackConfig>>,
    email_config: Mutex<Option<EmailConfig>>,
}

impl Default for AppState {
    fn default() -> Self {
        let mut builds = HashMap::new();
        
        builds.insert(
            "build-001".to_string(),
            Build {
                id: "build-001".to_string(),
                pipeline_name: "前端构建流水线".to_string(),
                branch: "main".to_string(),
                tag: Some("v1.0.0".to_string()),
                commit: "abc123def456".to_string(),
                status: "success".to_string(),
                start_time: "2024-01-15T08:30:00Z".to_string(),
                duration: Some(185),
                artifacts: vec![
                    Artifact {
                        id: "art-1".to_string(),
                        name: "dist.zip".to_string(),
                        size: 25600000,
                        artifact_type: "zip".to_string(),
                    },
                    Artifact {
                        id: "art-2".to_string(),
                        name: "build.log".to_string(),
                        size: 102400,
                        artifact_type: "log".to_string(),
                    },
                ],
                creator: "张三".to_string(),
            },
        );

        builds.insert(
            "build-002".to_string(),
            Build {
                id: "build-002".to_string(),
                pipeline_name: "后端构建流水线".to_string(),
                branch: "develop".to_string(),
                tag: None,
                commit: "def789ghi012".to_string(),
                status: "running".to_string(),
                start_time: "2024-01-15T09:15:00Z".to_string(),
                duration: None,
                artifacts: vec![],
                creator: "李四".to_string(),
            },
        );

        builds.insert(
            "build-003".to_string(),
            Build {
                id: "build-003".to_string(),
                pipeline_name: "前端构建流水线".to_string(),
                branch: "feature/login".to_string(),
                tag: None,
                commit: "ghi345jkl678".to_string(),
                status: "failed".to_string(),
                start_time: "2024-01-14T16:45:00Z".to_string(),
                duration: Some(120),
                artifacts: vec![Artifact {
                    id: "art-3".to_string(),
                    name: "error.log".to_string(),
                    size: 51200,
                    artifact_type: "log".to_string(),
                }],
                creator: "王五".to_string(),
            },
        );

        Self {
            builds: Mutex::new(builds),
            slack_config: Mutex::new(None),
            email_config: Mutex::new(None),
        }
    }
}

#[tauri::command]
fn validate_pipeline(pipeline: Pipeline) -> ValidationResult {
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    let valid_stage_types: HashMap<&str, bool> = [
        ("build", true),
        ("test", true),
        ("deploy", true),
        ("notify", true),
    ]
    .iter()
    .cloned()
    .collect();

    let valid_job_templates: HashMap<&str, bool> = [
        ("npm-install", true),
        ("npm-build", true),
        ("docker-build", true),
        ("unit-test", true),
        ("integration-test", true),
        ("lint", true),
        ("deploy-dev", true),
        ("deploy-prod", true),
        ("rollback", true),
        ("slack-notify", true),
        ("email-notify", true),
    ]
    .iter()
    .cloned()
    .collect();

    if pipeline.stages.is_empty() {
        errors.push("流水线至少需要包含一个阶段".to_string());
        return ValidationResult {
            valid: false,
            errors: Some(errors),
            warnings: None,
        };
    }

    let mut stage_ids = HashMap::new();
    for (i, stage) in pipeline.stages.iter().enumerate() {
        if stage.id.is_empty() {
            errors.push(format!("阶段[{}]: 缺少阶段ID", i));
        } else if stage_ids.contains_key(&stage.id) {
            errors.push(format!("阶段[{}]: 阶段ID '{}' 重复", i, stage.id));
        } else {
            stage_ids.insert(stage.id.clone(), true);
        }

        if stage.name.is_empty() {
            errors.push(format!("阶段[{}]: 阶段名称不能为空", i));
        } else if stage.name.len() > 100 {
            errors.push(format!("阶段[{}]: 阶段名称不能超过100个字符", i));
        }

        if stage.stage_type.is_empty() {
            errors.push(format!("阶段[{}]: 阶段类型不能为空", i));
        } else if !valid_stage_types.contains_key(stage.stage_type.as_str()) {
            errors.push(format!(
                "阶段[{}]: 无效的阶段类型 '{}'",
                i, stage.stage_type
            ));
        }

        if stage.jobs.is_empty() {
            warnings.push(format!(
                "阶段[{}] '{}': 该阶段没有包含任何任务",
                i, stage.name
            ));
        }

        let mut job_ids = HashMap::new();
        for (j, job) in stage.jobs.iter().enumerate() {
            if job.id.is_empty() {
                errors.push(format!("阶段[{}] 任务[{}]: 缺少任务ID", i, j));
            } else if job_ids.contains_key(&job.id) {
                errors.push(format!(
                    "阶段[{}] 任务[{}]: 任务ID '{}' 重复",
                    i, j, job.id
                ));
            } else {
                job_ids.insert(job.id.clone(), true);
            }

            if job.name.is_empty() {
                errors.push(format!("阶段[{}] 任务[{}]: 任务名称不能为空", i, j));
            } else if job.name.len() > 200 {
                errors.push(format!(
                    "阶段[{}] 任务[{}]: 任务名称不能超过200个字符",
                    i, j
                ));
            }

            if !job.template.is_empty() && !valid_job_templates.contains_key(job.template.as_str()) {
                warnings.push(format!(
                    "阶段[{}] 任务[{}]: 未知的任务模板 '{}'",
                    i, j, job.template
                ));
            }
        }
    }

    ValidationResult {
        valid: errors.is_empty(),
        errors: if errors.is_empty() { None } else { Some(errors) },
        warnings: if warnings.is_empty() { None } else { Some(warnings) },
    }
}

#[tauri::command]
fn list_builds(state: State<'_, AppState>) -> Vec<Build> {
    let builds = state.builds.lock().unwrap();
    builds.values().cloned().collect()
}

#[tauri::command]
fn get_build(state: State<'_, AppState>, build_id: String) -> Option<Build> {
    let builds = state.builds.lock().unwrap();
    builds.get(&build_id).cloned()
}

#[tauri::command]
fn get_build_logs(state: State<'_, AppState>, build_id: String) -> String {
    let builds = state.builds.lock().unwrap();
    let build = builds.get(&build_id);
    
    match build {
        Some(b) => {
            let status_msg = match b.status.as_str() {
                "success" => "[SUCCESS] Build completed successfully!",
                "failed" => "[FAILURE] Build failed!",
                "running" => "[INFO] Build is still running...",
                _ => "[INFO] Build status unknown",
            };

            format!(
                "[INFO] ============================================\n\
                 [INFO] CI/CD Workbench Build Log\n\
                 [INFO] Build ID: {}\n\
                 [INFO] Pipeline: {}\n\
                 [INFO] Branch: {}\n\
                 [INFO] Commit: {}\n\
                 [INFO] Status: {}\n\
                 [INFO] ============================================\n\
                 \n\
                 [INFO] Starting build process...\n\
                 [INFO] Cloning repository from git...\n\
                 [INFO] Repository cloned successfully\n\
                 \n\
                 [STEP] Setting up environment\n\
                 [INFO] Checking Node.js version...\n\
                 [INFO] Node.js v18.17.0\n\
                 \n\
                 [STEP] Installing dependencies\n\
                 [INFO] Running: npm ci\n\
                 [INFO] added 1250 packages in 45s\n\
                 [INFO] Dependencies installed successfully\n\
                 \n\
                 [STEP] Running lint check\n\
                 [INFO] ✔ No ESLint warnings or errors\n\
                 [INFO] Lint check passed\n\
                 \n\
                 [STEP] Running tests\n\
                 [INFO] Test Suites: 3 passed, 3 total\n\
                 [INFO] Tests:       15 passed, 15 total\n\
                 [INFO] All tests passed!\n\
                 \n\
                 [STEP] Building application\n\
                 [INFO] Creating an optimized production build...\n\
                 [INFO] Compiled successfully.\n\
                 \n\
                 {}\n\
                 [INFO] ============================================",
                b.id, b.pipeline_name, b.branch, b.commit, b.status, status_msg
            )
        }
        None => "Build not found".to_string(),
    }
}

#[tauri::command]
fn delete_build(state: State<'_, AppState>, build_id: String) -> bool {
    let mut builds = state.builds.lock().unwrap();
    builds.remove(&build_id).is_some()
}

#[tauri::command]
fn download_artifact(
    state: State<'_, AppState>,
    build_id: String,
    artifact_id: String,
) -> Option<String> {
    let builds = state.builds.lock().unwrap();
    let build = builds.get(&build_id);
    
    if let Some(b) = build {
        for artifact in &b.artifacts {
            if artifact.id == artifact_id {
                let content = format!("Mock content for artifact: {}", artifact.name);
                return Some(base64::encode(content.as_bytes()));
            }
        }
    }
    None
}

#[tauri::command]
fn save_slack_config(state: State<'_, AppState>, config: SlackConfig) -> bool {
    let mut slack_config = state.slack_config.lock().unwrap();
    *slack_config = Some(config);
    true
}

#[tauri::command]
fn save_email_config(state: State<'_, AppState>, config: EmailConfig) -> bool {
    let mut email_config = state.email_config.lock().unwrap();
    *email_config = Some(config);
    true
}

#[tauri::command]
fn test_slack_connection(state: State<'_, AppState>) -> Result<(), String> {
    let _slack_config = state.slack_config.lock().unwrap();
    
    if let Some(_config) = &*_slack_config {
        if !_config.enabled {
            return Err("Slack 通知未启用".to_string());
        }
        if _config.webhook_url.is_empty() {
            return Err("Slack Webhook URL 未配置".to_string());
        }
        
        Ok(())
    } else {
        Err("Slack 配置未找到".to_string())
    }
}

#[tauri::command]
fn test_email_connection(state: State<'_, AppState>) -> Result<(), String> {
    let _email_config = state.email_config.lock().unwrap();
    
    if let Some(_config) = &*_email_config {
        if !_config.enabled {
            return Err("邮件通知未启用".to_string());
        }
        if _config.smtp_host.is_empty() {
            return Err("SMTP 主机未配置".to_string());
        }
        
        Ok(())
    } else {
        Err("邮件配置未找到".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            validate_pipeline,
            list_builds,
            get_build,
            get_build_logs,
            delete_build,
            download_artifact,
            save_slack_config,
            save_email_config,
            test_slack_connection,
            test_email_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
