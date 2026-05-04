use rand::{Rng, thread_rng};
use rand::distributions::Alphanumeric;

const LOWERCASE: &str = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS: &str = "0123456789";
const SYMBOLS: &str = "!@#$%^&*()_-+=<>?/[]{}|~";

const WORD_LIST: &[&str] = &[
    "apple", "banana", "cherry", "date", "elder", "fig", "grape", "honey",
    "indigo", "jack", "kiwi", "lemon", "mango", "nectar", "orange", "peach",
    "quince", "rasp", "straw", "tanger", "ugli", "vanilla", "water", "xigua",
    "yuzu", "zucchini", "atom", "blade", "cloud", "dream", "echo", "flame",
    "glacier", "harbor", "island", "jungle", "knight", "lighthouse", "mountain",
    "nebula", "ocean", "phoenix", "quasar", "river", "sunset", "thunder",
    "universe", "valley", "whisper", "zenith", "amber", "bronze", "copper",
    "diamond", "emerald", "frost", "gold", "jade", "krypton", "lava", "magma",
    "nickel", "obsidian", "platinum", "quartz", "ruby", "silver", "topaz",
    "ultraviolet", "violet", "wolfram", "xenon", "yttrium", "zircon"
];

#[tauri::command]
pub fn generate_password(
    length: u8,
    include_uppercase: bool,
    include_lowercase: bool,
    include_numbers: bool,
    include_symbols: bool
) -> Result<String, String> {
    if length < 4 || length > 128 {
        return Err("密码长度必须在4到128之间".to_string());
    }
    
    if !include_uppercase && !include_lowercase && !include_numbers && !include_symbols {
        return Err("至少需要选择一种字符类型".to_string());
    }
    
    let mut charset = String::new();
    let mut required_chars = Vec::new();
    let mut rng = thread_rng();
    
    if include_lowercase {
        charset.push_str(LOWERCASE);
        required_chars.push(LOWERCASE.chars().nth(rng.gen_range(0..LOWERCASE.len())).unwrap());
    }
    
    if include_uppercase {
        charset.push_str(UPPERCASE);
        required_chars.push(UPPERCASE.chars().nth(rng.gen_range(0..UPPERCASE.len())).unwrap());
    }
    
    if include_numbers {
        charset.push_str(NUMBERS);
        required_chars.push(NUMBERS.chars().nth(rng.gen_range(0..NUMBERS.len())).unwrap());
    }
    
    if include_symbols {
        charset.push_str(SYMBOLS);
        required_chars.push(SYMBOLS.chars().nth(rng.gen_range(0..SYMBOLS.len())).unwrap());
    }
    
    let mut password = required_chars;
    
    let remaining_length = length as usize - password.len();
    for _ in 0..remaining_length {
        let idx = rng.gen_range(0..charset.len());
        password.push(charset.chars().nth(idx).unwrap());
    }
    
    for i in (1..password.len()).rev() {
        let j = rng.gen_range(0..=i);
        password.swap(i, j);
    }
    
    Ok(password.into_iter().collect())
}

#[tauri::command]
pub fn generate_passphrase(word_count: u8, separator: Option<String>) -> Result<String, String> {
    if word_count < 3 || word_count > 12 {
        return Err("单词数量必须在3到12之间".to_string());
    }
    
    let sep = separator.unwrap_or_else(|| "-".to_string());
    let mut rng = thread_rng();
    let mut words = Vec::new();
    
    for _ in 0..word_count {
        let idx = rng.gen_range(0..WORD_LIST.len());
        let word = WORD_LIST[idx];
        let mut chars: Vec<char> = word.chars().collect();
        if rng.gen_bool(0.5) {
            chars[0] = chars[0].to_ascii_uppercase();
        }
        words.push(chars.into_iter().collect::<String>());
    }
    
    let number: u8 = rng.gen_range(0..100);
    words.push(number.to_string());
    
    for i in (1..words.len()).rev() {
        let j = rng.gen_range(0..=i);
        words.swap(i, j);
    }
    
    Ok(words.join(&sep))
}

pub fn calculate_password_strength(password: &str) -> (u8, Vec<String>) {
    let mut score = 0;
    let mut issues = Vec::new();
    
    let len = password.len();
    if len < 8 {
        issues.push("密码长度小于8个字符".to_string());
    } else if len >= 8 && len < 12 {
        score += 1;
    } else if len >= 12 && len < 16 {
        score += 2;
    } else {
        score += 3;
    }
    
    let has_lowercase = password.chars().any(|c| c.is_ascii_lowercase());
    let has_uppercase = password.chars().any(|c| c.is_ascii_uppercase());
    let has_number = password.chars().any(|c| c.is_ascii_digit());
    let has_symbol = password.chars().any(|c| !c.is_ascii_alphanumeric());
    
    if !has_lowercase {
        issues.push("缺少小写字母".to_string());
    } else {
        score += 1;
    }
    
    if !has_uppercase {
        issues.push("缺少大写字母".to_string());
    } else {
        score += 1;
    }
    
    if !has_number {
        issues.push("缺少数字".to_string());
    } else {
        score += 1;
    }
    
    if !has_symbol {
        issues.push("缺少特殊符号".to_string());
    } else {
        score += 1;
    }
    
    let common_patterns = ["123", "abc", "qwerty", "password", "admin", "login"];
    for pattern in common_patterns {
        if password.to_lowercase().contains(pattern) {
            issues.push(format!("包含常见模式: {}", pattern));
            score = score.saturating_sub(2);
        }
    }
    
    let mut repeated = false;
    for i in 0..password.len().saturating_sub(2) {
        let c1 = password.chars().nth(i).unwrap();
        let c2 = password.chars().nth(i + 1).unwrap();
        let c3 = password.chars().nth(i + 2).unwrap();
        if c1 == c2 && c2 == c3 {
            repeated = true;
            break;
        }
    }
    if repeated {
        issues.push("包含3个或更多连续相同字符".to_string());
        score = score.saturating_sub(1);
    }
    
    score = score.clamp(0, 10);
    
    (score, issues)
}
