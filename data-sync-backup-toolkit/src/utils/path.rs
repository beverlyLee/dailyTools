use std::path::{Path, PathBuf, Component};
use crate::Result;
use crate::DsbtError;

pub fn normalize_path(path: &Path) -> PathBuf {
    let mut components = Vec::new();
    
    for component in path.components() {
        match component {
            Component::Normal(c) => components.push(c),
            Component::CurDir => {}
            Component::ParentDir => {
                components.pop();
            }
            _ => components.push(component.as_os_str()),
        }
    }
    
    components.iter().collect()
}

pub fn expand_tilde(path: &str) -> Result<PathBuf> {
    if let Some(stripped) = path.strip_prefix("~/") {
        let home = dirs::home_dir()
            .ok_or_else(|| DsbtError::Config("无法获取主目录".to_string()))?;
        Ok(home.join(stripped))
    } else if path == "~" {
        dirs::home_dir().ok_or_else(|| DsbtError::Config("无法获取主目录".to_string()))
    } else {
        Ok(PathBuf::from(path))
    }
}

pub fn is_absolute_path(path: &str) -> bool {
    Path::new(path).is_absolute()
}

pub fn get_relative_path(base: &Path, target: &Path) -> Result<PathBuf> {
    target.strip_prefix(base)
        .map(|p| p.to_path_buf())
        .map_err(|_| DsbtError::Other(format!("无法从 {:?} 获取相对于 {:?} 的路径", target, base)))
}

pub fn ensure_directory_exists(path: &Path) -> Result<()> {
    if !path.exists() {
        std::fs::create_dir_all(path)?;
    } else if !path.is_dir() {
        return Err(DsbtError::Other(format!("{:?} 不是目录", path)));
    }
    Ok(())
}
