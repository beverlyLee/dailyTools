use clap::{Parser, Subcommand};

mod tree;
mod weather;

#[derive(Parser)]
#[command(
    name = "terminal-info-toolkit",
    version = "0.1.0",
    about = "A collection of terminal information query tools",
    long_about = None
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate directory structure in tree format
    Tree {
        /// Directory to scan (default: current directory)
        #[arg(value_name = "DIR")]
        dir: Option<String>,
        
        /// Exclude directories or files (comma-separated, e.g. node_modules,.git)
        #[arg(short, long, value_name = "PATTERNS")]
        exclude: Option<String>,
        
        /// Limit recursion depth
        #[arg(short = 'L', long, value_name = "DEPTH")]
        depth: Option<usize>,
        
        /// Output as Markdown code block
        #[arg(short = 'm', long)]
        markdown: bool,
    },
    /// Get weather information
    Weather {
        /// Location (city name or 'auto' for IP-based location)
        #[arg(value_name = "LOCATION")]
        location: Option<String>,
        
        /// Output mode: 'simple' for single line, 'detailed' for multi-line
        #[arg(short, long, value_name = "MODE", default_value = "simple")]
        mode: String,
        
        /// Icon style: 'emoji' or 'ascii'
        #[arg(short, long, value_name = "STYLE", default_value = "emoji")]
        icon: String,
        
        /// Disable cache and force fresh data
        #[arg(short, long)]
        no_cache: bool,
    },
}

fn main() {
    let cli = Cli::parse();
    
    match &cli.command {
        Commands::Tree { dir, exclude, depth, markdown } => {
            let dir_path = dir.as_deref().unwrap_or(".");
            let exclude_patterns: Vec<String> = exclude
                .as_deref()
                .map(|s| s.split(',').map(|p| p.trim().to_string()).collect())
                .unwrap_or_default();
            
            if let Err(e) = tree::generate_tree(dir_path, &exclude_patterns, *depth, *markdown) {
                eprintln!("Error: {}", e);
                std::process::exit(1);
            }
        }
        Commands::Weather { location, mode, icon, no_cache } => {
            let loc = location.as_deref().unwrap_or("auto");
            
            if let Err(e) = weather::get_weather(loc, mode, icon, *no_cache) {
                eprintln!("Error: {}", e);
                std::process::exit(1);
            }
        }
    }
}
