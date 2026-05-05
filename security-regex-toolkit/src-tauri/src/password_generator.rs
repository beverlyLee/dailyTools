use rand::Rng;
use rand::seq::SliceRandom;

const UPPERCASE: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE: &str = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS: &str = "0123456789";
const SYMBOLS: &str = "!@#$%^&*()_+-=[]{}|;:,.<>?";

const WORD_LIST: &[&str] = &[
    "apple", "banana", "cherry", "dragon", "elephant",
    "forest", "garden", "harbor", "island", "jungle",
    "kingdom", "library", "mountain", "ocean", "pacific",
    "quantum", "river", "sunset", "thunder", "universe",
    "valley", "waterfall", "xylophone", "yacht", "zenith",
    "amber", "blue", "crimson", "diamond", "emerald",
    "flame", "golden", "hunter", "iceberg", "jade",
    "krypton", "lunar", "meteor", "nebula", "obsidian",
    "phoenix", "quasar", "ruby", "sapphire", "topaz",
    "ultraviolet", "violet", "wolf", "xenon", "yellow",
    "zircon", "anchor", "bridge", "castle", "door",
    "engine", "factory", "gate", "highway", "inn",
    "junction", "keep", "lighthouse", "monument", "needle",
    "obelisk", "palace", "quarter", "road", "spire",
    "tower", "underpass", "viaduct", "warehouse", "xerox",
    "yard", "zoo", "atom", "bolt", "circuit", "diode",
    "electron", "flux", "gear", "hinge", "input",
    "joint", "knob", "lever", "magnet", "nut",
    "octagon", "piston", "quartz", "rotor", "screw",
    "turbine", "valve", "wedge", "xray", "yoke",
    "zeppelin", "breeze", "cloud", "dawn", "eclipse",
    "fog", "gale", "hail", "ice", "jetstream",
    "lightning", "mist", "night", "overcast", "rain",
    "snow", "storm", "thunder", "updraft", "vortex",
    "wind", "zenith"
];

#[tauri::command]
pub fn generate_password(
    length: u32,
    include_uppercase: bool,
    include_lowercase: bool,
    include_numbers: bool,
    include_symbols: bool,
) -> String {
    let mut rng = rand::thread_rng();
    let mut charset = String::new();
    let mut required_chars = Vec::new();
    
    if include_uppercase {
        charset.push_str(UPPERCASE);
        required_chars.push(UPPERCASE.chars().nth(rng.gen_range(0..UPPERCASE.len())).unwrap());
    }
    
    if include_lowercase {
        charset.push_str(LOWERCASE);
        required_chars.push(LOWERCASE.chars().nth(rng.gen_range(0..LOWERCASE.len())).unwrap());
    }
    
    if include_numbers {
        charset.push_str(NUMBERS);
        required_chars.push(NUMBERS.chars().nth(rng.gen_range(0..NUMBERS.len())).unwrap());
    }
    
    if include_symbols {
        charset.push_str(SYMBOLS);
        required_chars.push(SYMBOLS.chars().nth(rng.gen_range(0..SYMBOLS.len())).unwrap());
    }
    
    if charset.is_empty() {
        charset.push_str(LOWERCASE);
    }
    
    let mut password = String::with_capacity(length as usize);
    
    for &c in &required_chars {
        password.push(c);
    }
    
    let remaining = length.saturating_sub(required_chars.len() as u32);
    for _ in 0..remaining {
        let idx = rng.gen_range(0..charset.len());
        password.push(charset.chars().nth(idx).unwrap());
    }
    
    let mut password_chars: Vec<char> = password.chars().collect();
    password_chars.shuffle(&mut rng);
    password_chars.into_iter().collect()
}

#[tauri::command]
pub fn generate_passphrase(
    word_count: u32,
    separator: String,
) -> String {
    let mut rng = rand::thread_rng();
    let mut words = Vec::with_capacity(word_count as usize);
    
    for _ in 0..word_count {
        let word = WORD_LIST.choose(&mut rng).unwrap();
        let capitalized: String = word
            .chars()
            .enumerate()
            .map(|(i, c)| if i == 0 { c.to_ascii_uppercase() } else { c })
            .collect();
        words.push(capitalized);
    }
    
    words.join(&separator)
}
