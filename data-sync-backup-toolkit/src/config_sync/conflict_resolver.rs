use super::*;
use crate::Result;
use crate::DsbtError;
use chrono::DateTime;
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum ConflictResolutionStrategy {
    LatestFirst,
    LocalFirst,
    RemoteFirst,
    KeepBoth,
    Manual,
}

impl Default for ConflictResolutionStrategy {
    fn default() -> Self {
        ConflictResolutionStrategy::LatestFirst
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    pub id: String,
    pub file_id: String,
    pub file_path: String,
    pub local_version: ConflictVersion,
    pub remote_version: ConflictVersion,
    pub detected_at: DateTime<Utc>,
    pub resolved: bool,
    pub resolved_at: Option<DateTime<Utc>>,
    pub resolution_strategy: Option<ConflictResolutionStrategy>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictVersion {
    pub version_id: String,
    pub hash: String,
    pub size: u64,
    pub modified_at: DateTime<Utc>,
    pub device_id: Option<String>,
    pub message: Option<String>,
}

pub struct ConflictResolver {
    strategy: ConflictResolutionStrategy,
}

impl ConflictResolver {
    pub fn new(strategy: ConflictResolutionStrategy) -> Self {
        Self { strategy }
    }
    
    pub fn set_strategy(&mut self, strategy: ConflictResolutionStrategy) {
        self.strategy = strategy;
    }
    
    pub fn detect_conflict(
        &self,
        local_version: &ConflictVersion,
        remote_version: &ConflictVersion,
        base_version: Option<&ConflictVersion>,
    ) -> bool {
        if local_version.hash == remote_version.hash {
            return false;
        }
        
        if let Some(base) = base_version {
            if local_version.hash == base.hash {
                return false;
            }
            if remote_version.hash == base.hash {
                return false;
            }
        }
        
        true
    }
    
    pub fn resolve_conflict(
        &self,
        conflict: &ConflictInfo,
        custom_strategy: Option<ConflictResolutionStrategy>,
    ) -> Result<ResolutionResult> {
        let strategy = custom_strategy.unwrap_or(self.strategy);
        
        match strategy {
            ConflictResolutionStrategy::LatestFirst => {
                if conflict.local_version.modified_at > conflict.remote_version.modified_at {
                    Ok(ResolutionResult::UseLocal)
                } else {
                    Ok(ResolutionResult::UseRemote)
                }
            }
            ConflictResolutionStrategy::LocalFirst => {
                Ok(ResolutionResult::UseLocal)
            }
            ConflictResolutionStrategy::RemoteFirst => {
                Ok(ResolutionResult::UseRemote)
            }
            ConflictResolutionStrategy::KeepBoth => {
                Ok(ResolutionResult::KeepBoth)
            }
            ConflictResolutionStrategy::Manual => {
                Ok(ResolutionResult::ManualRequired)
            }
        }
    }
    
    pub fn generate_conflict_report(
        &self,
        conflicts: &[ConflictInfo],
    ) -> ConflictReport {
        let total = conflicts.len();
        let resolved = conflicts.iter().filter(|c| c.resolved).count();
        let unresolved = total - resolved;
        
        let by_strategy: std::collections::HashMap<ConflictResolutionStrategy, usize> = 
            conflicts.iter()
                .filter(|c| c.resolution_strategy.is_some())
                .fold(std::collections::HashMap::new(), |mut acc, c| {
                    *acc.entry(c.resolution_strategy.unwrap()).or_insert(0) += 1;
                    acc
                });
        
        ConflictReport {
            total,
            resolved,
            unresolved,
            by_strategy,
            latest_conflicts: conflicts.iter()
                .take(10)
                .map(|c| c.file_path.clone())
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResolutionResult {
    UseLocal,
    UseRemote,
    KeepBoth,
    ManualRequired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictReport {
    pub total: usize,
    pub resolved: usize,
    pub unresolved: usize,
    pub by_strategy: std::collections::HashMap<ConflictResolutionStrategy, usize>,
    pub latest_conflicts: Vec<String>,
}
