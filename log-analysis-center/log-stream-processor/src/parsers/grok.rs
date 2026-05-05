use crate::types::{LogEntry, LogLevel, LogSource};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

lazy_static::lazy_static! {
    static ref GROK_PATTERNS: HashMap<&'static str, &'static str> = {
        let mut m = HashMap::new();
        m.insert("USERNAME", "[a-zA-Z0-9._-]+");
        m.insert("USER", "%{USERNAME}");
        m.insert("INT", "(?:[+-]?(?:[0-9]+))");
        m.insert("BASE10NUM", "(?<![0-9.+-])(?>[+-]?(?:(?:[0-9]+(?:\\.[0-9]+)?)|(?:\\.[0-9]+)))");
        m.insert("NUMBER", "(?:%{BASE10NUM})");
        m.insert("BASE16NUM", "(?<![0-9A-Fa-f])(?:[+-]?(?:0x)?(?:[0-9A-Fa-f]+))");
        m.insert("BASE16FLOAT", "\\b(?<![0-9A-Fa-f.])(?:[+-]?(?:0x)?(?:(?:[0-9A-Fa-f]+(?:\\.[0-9A-Fa-f]*)?)|(?:\\.[0-9A-Fa-f]+)))(?:[+-][0-9A-Fa-f]+)?\\b");
        m.insert("POSINT", "\\b(?:[1-9][0-9]*)\\b");
        m.insert("NONNEGINT", "\\b(?:[0-9]+)\\b");
        m.insert("WORD", "\\b\\w+\\b");
        m.insert("NOTSPACE", "\\S+");
        m.insert("SPACE", "\\s*");
        m.insert("DATA", ".*?");
        m.insert("GREEDYDATA", ".*");
        m.insert("QUOTEDSTRING", "(?<!\\\\)(?>(?:'(?:\\\\.|[^\\\\']+)*'|\"(?:\\\\.|[^\\\\\"]+)*\"|`(?:\\\\.|[^\\\\`]+)*`))");
        m.insert("UUID", "[A-Fa-f0-9]{8}-(?:[A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}");
        m.insert("MAC", "(?:%{CISCOMAC}|%{WINDOWSMAC}|%{COMMONMAC})");
        m.insert("CISCOMAC", "(?:(?:[A-Fa-f0-9]{4}\\.){2}[A-Fa-f0-9]{4})");
        m.insert("WINDOWSMAC", "(?:(?:[A-Fa-f0-9]{2}-){5}[A-Fa-f0-9]{2})");
        m.insert("COMMONMAC", "(?:(?:[A-Fa-f0-9]{2}:){5}[A-Fa-f0-9]{2})");
        m.insert("IP", "(?:%{IPV6}|%{IPV4})");
        m.insert("IPV4", "(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)");
        m.insert("IPV6", "((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:)))(%.+)?");
        m.insert("HOSTNAME", "\\b(?:[0-9A-Za-z][0-9A-Za-z-]{0,62})(?:\\.(?:[0-9A-Za-z][0-9A-Za-z-]{0,62}))*(\\.?|\\b)");
        m.insert("IPORHOST", "(?:%{IP:client}|%{HOSTNAME:client})");
        m.insert("PATH", "(?:%{UNIXPATH}|%{WINPATH})");
        m.insert("UNIXPATH", "(?>/(?>[\\w_%!$@:.,+~-]+|\\\\.)*)+");
        m.insert("TTY", "(?:/dev/(pts|tty([pq])?)(\\w+)?/?(\\d+))");
        m.insert("WINPATH", "(?>[A-Za-z]+:|\\\\)(?>\\\\[^\\\\?*<>:|]+)+");
        m.insert("SYSLOGTIMESTAMP", "%{MONTH} +%{MONTHDAY} %{TIME}");
        m.insert("SYSLOGPROG", "%{PROG}(?:\\[%{POSINT:pid}\\])?");
        m.insert("PROG", "[\\x21-\\x5a\\x5e-\\x7e]+");
        m.insert("SYSLOGHOST", "%{IPORHOST:sysloghost}");
        m.insert("SYSLOGFACILITY", "<%{NONNEGINT:facility}.%{NONNEGINT:priority}>");
        m.insert("HTTPDATE", "%{MONTHDAY}/%{MONTH}/%{YEAR}:%{TIME} %{INT}");
        m.insert("MONTH", "\\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\b");
        m.insert("MONTHDAY", "(?:(?:0[1-9])|(?:[12][0-9])|(?:3[01])|[1-9])");
        m.insert("DAY", "(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)");
        m.insert("YEAR", "(?>\\d\\d){1,2}");
        m.insert("TIMESTAMP", "%{TIME:time}");
        m.insert("TIME", "%{HOUR}:%{MINUTE}(?::%{SECOND})?");
        m.insert("TIME_US", "%{HOUR}:%{MINUTE}:%{SECOND}(,%{INT})?");
        m.insert("DATE", "%{DATE_US}|%{DATE_EU}");
        m.insert("DATE_US", "%{MONTHNUM}[/-]%{MONTHDAY}[/-]%{YEAR}");
        m.insert("DATE_EU", "%{MONTHDAY}[./-]%{MONTHNUM}[./-]%{YEAR}");
        m.insert("ISO8601_TIMEZONE", "(?:Z|[+-]%{HOUR}(?::?%{MINUTE})?)");
        m.insert("ISO8601_SECOND", "(?:%{SECOND}|60)");
        m.insert("TIMESTAMP_ISO8601", "%{YEAR}-%{MONTHNUM}-%{MONTHDAY}[T ]%{HOUR}:%{MINUTE}(?::%{SECOND})?%{ISO8601_TIMEZONE}?");
        m.insert("LOGLEVEL", "([Dd]ebug|DEBUG|[Nn]otice|NOTICE|[Ii]nfo|INFO|[Ww]arn?(?:ing)?|WARN?(?:ING)?|[Ee]rr?(?:or)?|ERR?(?:OR)?|[Cc]rit(?:ical)?|CRIT(?:ICAL)?|[Ff]atal|FATAL|[Ss]evere|SEVERE|[Ee]merg(?:ency)?|EMERG(?:ENCY)?)");
        m.insert("MONTHNUM", "(?:0?[1-9]|1[0-2])");
        m.insert("MONTHNUM2", "(?:0[1-9]|1[0-2])");
        m.insert("HOUR", "(?:2[0123]|[01]?[0-9])");
        m.insert("MINUTE", "(?:[0-5][0-9])");
        m.insert("SECOND", "(?:(?:[0-5]?[0-9]|60)(?:[:.,][0-9]+)?)");
        m.insert("NSQ_TIMESTAMP", "%{YEAR}-%{MONTHNUM2}-%{MONTHDAY} %{HOUR}:%{MINUTE}:%{SECOND}");
        m.insert("COMBINEDAPACHELOG", "%{IPORHOST:clientip} %{USER:ident} %{USER:auth} \\[%{HTTPDATE:timestamp}\\] \"(?:%{WORD:verb} %{NOTSPACE:request}(?: HTTP/%{NUMBER:httpversion})?|%{DATA:rawrequest})\" %{NUMBER:response} (?:%{NUMBER:bytes}|-) \"(?:%{URI:referrer}|-)\" \"%{QS:agent}\"");
        m.insert("COMMONAPACHELOG", "%{IPORHOST:clientip} %{USER:ident} %{USER:auth} \\[%{HTTPDATE:timestamp}\\] \"(?:%{WORD:verb} %{NOTSPACE:request}(?: HTTP/%{NUMBER:httpversion})?|%{DATA:rawrequest})\" %{NUMBER:response} (?:%{NUMBER:bytes}|-)");
        m.insert("QS", "(?:\"(?>\\\\.|[^\\\\\"]+)*\"|'(?>\\\\.|[^\\\\']+)*')");
        m.insert("EMAILADDRESS", "(?:%{USERNAME}@%{HOSTNAME})");
        m
    };
}

#[derive(Debug, Clone)]
pub struct GrokParser {
    pub patterns: HashMap<String, GrokPattern>,
}

#[derive(Debug, Clone)]
pub struct GrokPattern {
    pub name: String,
    pub pattern: String,
    pub compiled_regex: Option<Regex>,
}

impl GrokParser {
    pub fn new() -> Self {
        let mut patterns = HashMap::new();

        patterns.insert("nginx_access".to_string(), GrokPattern {
            name: "nginx_access".to_string(),
            pattern: r#"%{IPORHOST:clientip} - %{USER:remote_user} \[%{HTTPDATE:time_local}\] "%{WORD:method} %{URIPATHPARAM:request} HTTP/%{NUMBER:http_version}" %{NUMBER:status} %{NUMBER:body_bytes_sent} "%{DATA:http_referer}" "%{DATA:http_user_agent}""#.to_string(),
            compiled_regex: None,
        });

        patterns.insert("syslog_standard".to_string(), GrokPattern {
            name: "syslog_standard".to_string(),
            pattern: r#"%{SYSLOGTIMESTAMP:timestamp} %{SYSLOGHOST:hostname} %{SYSLOGPROG:program}: %{GREEDYDATA:message}"#.to_string(),
            compiled_regex: None,
        });

        patterns.insert("log_level".to_string(), GrokPattern {
            name: "log_level".to_string(),
            pattern: r#"^%{LOGLEVEL:level}\s*%{GREEDYDATA:message}$"#.to_string(),
            compiled_regex: None,
        });

        GrokParser { patterns }
    }

    pub fn expand_grok_pattern(&self, pattern: &str) -> anyhow::Result<String> {
        let grok_re = Regex::new(r"%\{([^:}]+)(?::([^}]+))?\}")?;
        let mut expanded = pattern.to_string();
        let mut expanded_once = true;
        
        while expanded_once {
            expanded_once = false;
            let captures: Vec<_> = grok_re.captures_iter(&expanded).collect();
            
            for cap in captures.into_iter().rev() {
                let full_match = cap.get(0).unwrap();
                let pattern_name = cap.get(1).unwrap().as_str();
                
                if let Some(replacement) = GROK_PATTERNS.get(pattern_name) {
                    let replacement = if let Some(field_name) = cap.get(2) {
                        format!("(?P<{}>{})", field_name.as_str(), replacement)
                    } else {
                        format!("({})", replacement)
                    };
                    
                    expanded.replace_range(
                        full_match.start()..full_match.end(),
                        &replacement
                    );
                    expanded_once = true;
                }
            }
        }
        
        Ok(expanded)
    }

    pub fn parse(&self, pattern_name: &str, raw: &str) -> anyhow::Result<LogEntry> {
        let pattern = self.patterns
            .get(pattern_name)
            .ok_or_else(|| anyhow::anyhow!("Grok pattern not found: {}", pattern_name))?;

        let regex = if let Some(re) = &pattern.compiled_regex {
            re
        } else {
            let expanded = self.expand_grok_pattern(&pattern.pattern)?;
            &Regex::new(&expanded)?
        };

        if let Some(captures) = regex.captures(raw) {
            let mut fields = serde_json::Map::new();
            let mut message = raw.to_string();
            let mut level = LogLevel::Info;

            for name in regex.capture_names() {
                if let Some(name) = name {
                    if let Some(value) = captures.name(name) {
                        let value_str = value.as_str().to_string();
                        
                        if name == "message" {
                            message = value_str.clone();
                        }
                        if name == "level" {
                            if let Ok(parsed_level) = value_str.parse::<LogLevel>() {
                                level = parsed_level;
                            }
                        }

                        fields.insert(name.to_string(), serde_json::Value::String(value_str));
                    }
                }
            }

            let mut entry = LogEntry::new(message, level, LogSource::Http);
            entry.fields = serde_json::Value::Object(fields);

            Ok(entry)
        } else {
            Ok(LogEntry::new(raw.to_string(), LogLevel::Info, LogSource::Http))
        }
    }

    pub fn auto_parse(&self, raw: &str) -> anyhow::Result<LogEntry> {
        for (pattern_name, _) in &self.patterns {
            if let Ok(entry) = self.parse(pattern_name, raw) {
                if entry.fields.as_object().map_or(false, |m| !m.is_empty()) {
                    return Ok(entry);
                }
            }
        }

        Ok(LogEntry::new(raw.to_string(), LogLevel::Info, LogSource::Http))
    }
}
