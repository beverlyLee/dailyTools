use std::fs;
use std::path::Path;
use walkdir::WalkDir;

pub fn generate_tree(
    dir: &str, 
    exclude_patterns: &[String], 
    max_depth: Option<usize>, 
    markdown: bool
) -> Result<(), String> {
    let base_path = Path::new(dir);
    
    if !base_path.exists() {
        return Err(format!("Directory '{}' does not exist", dir));
    }
    
    if !base_path.is_dir() {
        return Err(format!("'{}' is not a directory", dir));
    }
    
    let mut entries = Vec::new();
    
    let walkdir = match max_depth {
        Some(depth) => WalkDir::new(base_path).max_depth(depth),
        None => WalkDir::new(base_path),
    };
    
    for entry in walkdir.into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        
        if should_exclude(path, exclude_patterns) {
            continue;
        }
        
        entries.push((entry.depth(), entry.file_name().to_string_lossy().to_string(), path.is_dir()));
    }
    
    entries.sort_by(|a, b| {
        if a.0 == b.0 {
            if a.2 && !b.2 {
                std::cmp::Ordering::Less
            } else if !a.2 && b.2 {
                std::cmp::Ordering::Greater
            } else {
                a.1.cmp(&b.1)
            }
        } else {
            a.0.cmp(&b.0)
        }
    });
    
    if markdown {
        println!("```text");
    }
    
    let base_name = base_path.file_name()
        .unwrap_or_else(|| base_path.as_os_str())
        .to_string_lossy();
    
    println!("{}", base_name);
    
    for i in 1..entries.len() {
        let (depth, name, is_dir) = &entries[i];
        
        let mut prefix = String::new();
        for j in 1..*depth {
            if has_sibling_after(&entries, i, j) {
                prefix.push_str("│   ");
            } else {
                prefix.push_str("    ");
            }
        }
        
        let is_last = is_last_at_depth(&entries, i, *depth);
        if is_last {
            prefix.push_str("└── ");
        } else {
            prefix.push_str("├── ");
        }
        
        if *is_dir {
            println!("{}{}/", prefix, name);
        } else {
            println!("{}{}", prefix, name);
        }
    }
    
    if markdown {
        println!("```");
    }
    
    Ok(())
}

fn should_exclude(path: &Path, exclude_patterns: &[String]) -> bool {
    for pattern in exclude_patterns {
        if path.components().any(|comp| {
            comp.as_os_str().to_string_lossy() == *pattern
        }) {
            return true;
        }
    }
    false
}

fn has_sibling_after(entries: &[(usize, String, bool)], current_idx: usize, check_depth: usize) -> bool {
    let (current_depth, _, _) = entries[current_idx];
    
    for i in (current_idx + 1)..entries.len() {
        let (depth, _, _) = entries[i];
        if depth < check_depth {
            return false;
        }
        if depth == check_depth {
            return true;
        }
    }
    false
}

fn is_last_at_depth(entries: &[(usize, String, bool)], current_idx: usize, depth: usize) -> bool {
    for i in (current_idx + 1)..entries.len() {
        let (d, _, _) = entries[i];
        if d == depth {
            return false;
        }
        if d < depth {
            break;
        }
    }
    true
}
