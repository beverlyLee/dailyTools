use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use jieba_rs::Jieba;

#[macro_use]
extern crate serde;

#[cfg(feature = "console_error_panic_hook")]
pub use console_error_panic_hook::set_once as set_panic_hook;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: u32,
    pub title: String,
    pub content: String,
    pub fields: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub doc_id: u32,
    pub score: f32,
    pub snippet: String,
}

pub struct InvertedIndex {
    index: HashMap<String, HashSet<u32>>,
    term_frequency: HashMap<u32, HashMap<String, u32>>,
    doc_length: HashMap<u32, usize>,
    avg_doc_length: f32,
    total_docs: u32,
}

impl InvertedIndex {
    pub fn new() -> Self {
        InvertedIndex {
            index: HashMap::new(),
            term_frequency: HashMap::new(),
            doc_length: HashMap::new(),
            avg_doc_length: 0.0,
            total_docs: 0,
        }
    }

    pub fn add_document(&mut self, doc_id: u32, terms: Vec<String>) {
        let doc_len = terms.len();
        
        let mut tf_map = HashMap::new();
        for term in &terms {
            *tf_map.entry(term.clone()).or_insert(0) += 1;
            
            self.index
                .entry(term.clone())
                .or_insert_with(HashSet::new)
                .insert(doc_id);
        }

        self.term_frequency.insert(doc_id, tf_map);
        self.doc_length.insert(doc_id, doc_len);
        self.total_docs += 1;
        self.recalculate_avg_length();
    }

    fn recalculate_avg_length(&mut self) {
        let total_len: usize = self.doc_length.values().sum();
        if self.total_docs > 0 {
            self.avg_doc_length = total_len as f32 / self.total_docs as f32;
        }
    }

    pub fn remove_document(&mut self, doc_id: u32) {
        if let Some(tf_map) = self.term_frequency.remove(&doc_id) {
            for term in tf_map.keys() {
                if let Some(docs) = self.index.get_mut(term) {
                    docs.remove(&doc_id);
                    if docs.is_empty() {
                        self.index.remove(term);
                    }
                }
            }
            self.doc_length.remove(&doc_id);
            self.total_docs -= 1;
            self.recalculate_avg_length();
        }
    }

    pub fn get_docs_for_term(&self, term: &str) -> HashSet<u32> {
        self.index.get(term).cloned().unwrap_or_default()
    }

    pub fn get_term_frequency(&self, doc_id: u32, term: &str) -> u32 {
        self.term_frequency
            .get(&doc_id)
            .and_then(|tf| tf.get(term).copied())
            .unwrap_or(0)
    }

    pub fn get_doc_length(&self, doc_id: u32) -> usize {
        self.doc_length.get(&doc_id).copied().unwrap_or(0)
    }

    pub fn get_doc_count_for_term(&self, term: &str) -> u32 {
        self.index
            .get(term)
            .map(|docs| docs.len() as u32)
            .unwrap_or(0)
    }

    pub fn total_docs(&self) -> u32 {
        self.total_docs
    }

    pub fn avg_doc_length(&self) -> f32 {
        self.avg_doc_length
    }
}

pub struct SearchEngine {
    documents: HashMap<u32, Document>,
    index: InvertedIndex,
    jieba: Jieba,
    next_doc_id: u32,
}

impl SearchEngine {
    pub fn new() -> Self {
        SearchEngine {
            documents: HashMap::new(),
            index: InvertedIndex::new(),
            jieba: Jieba::new(),
            next_doc_id: 1,
        }
    }

    pub fn tokenize(&self, text: &str) -> Vec<String> {
        let tokens = self.jieba.cut(text, true);
        tokens
            .into_iter()
            .filter(|t| !t.trim().is_empty())
            .map(|t| t.to_lowercase())
            .collect()
    }

    pub fn add_document(&mut self, doc: Document) -> u32 {
        let doc_id = self.next_doc_id;
        let mut doc = doc;
        doc.id = doc_id;

        let full_text = format!("{} {}", doc.title, doc.content);
        let terms = self.tokenize(&full_text);

        self.documents.insert(doc_id, doc);
        self.index.add_document(doc_id, terms);
        self.next_doc_id += 1;

        doc_id
    }

    pub fn get_document(&self, doc_id: u32) -> Option<&Document> {
        self.documents.get(&doc_id)
    }

    pub fn update_document(&mut self, doc_id: u32, new_doc: Document) -> bool {
        if !self.documents.contains_key(&doc_id) {
            return false;
        }

        self.index.remove_document(doc_id);

        let mut new_doc = new_doc;
        new_doc.id = doc_id;

        let full_text = format!("{} {}", new_doc.title, new_doc.content);
        let terms = self.tokenize(&full_text);

        self.documents.insert(doc_id, new_doc);
        self.index.add_document(doc_id, terms);

        true
    }

    pub fn delete_document(&mut self, doc_id: u32) -> bool {
        if self.documents.remove(&doc_id).is_some() {
            self.index.remove_document(doc_id);
            true
        } else {
            false
        }
    }

    pub fn search(&self, query: &str, use_bm25: bool) -> Vec<SearchResult> {
        let parsed_query = self.parse_query(query);
        let docs = self.execute_query(&parsed_query);

        let query_terms = self.tokenize(query);
        
        let mut results: Vec<SearchResult> = docs
            .into_iter()
            .filter_map(|doc_id| {
                let score = if use_bm25 {
                    self.score_bm25(doc_id, &query_terms)
                } else {
                    self.score_tfidf(doc_id, &query_terms)
                };

                if score > 0.0 {
                    let snippet = self.generate_snippet(doc_id, &query_terms);
                    Some(SearchResult {
                        doc_id,
                        score,
                        snippet,
                    })
                } else {
                    None
                }
            })
            .collect();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results
    }

    fn parse_query(&self, query: &str) -> ParsedQuery {
        let mut must_terms = Vec::new();
        let mut should_terms = Vec::new();
        let mut must_not_terms = Vec::new();

        let tokens: Vec<&str> = query.split_whitespace().collect();
        let mut i = 0;

        while i < tokens.len() {
            let token = tokens[i].to_uppercase();

            match token.as_str() {
                "AND" => {
                    if i + 1 < tokens.len() {
                        let next_token = tokens[i + 1];
                        if !next_token.to_uppercase().eq("AND") 
                            && !next_token.to_uppercase().eq("OR") 
                            && !next_token.to_uppercase().eq("NOT") {
                            let sub_terms = self.tokenize(next_token);
                            must_terms.extend(sub_terms);
                            i += 2;
                            continue;
                        }
                    }
                    i += 1;
                }
                "OR" => {
                    if i + 1 < tokens.len() {
                        let next_token = tokens[i + 1];
                        if !next_token.to_uppercase().eq("AND") 
                            && !next_token.to_uppercase().eq("OR") 
                            && !next_token.to_uppercase().eq("NOT") {
                            let sub_terms = self.tokenize(next_token);
                            should_terms.extend(sub_terms);
                            i += 2;
                            continue;
                        }
                    }
                    i += 1;
                }
                "NOT" => {
                    if i + 1 < tokens.len() {
                        let next_token = tokens[i + 1];
                        if !next_token.to_uppercase().eq("AND") 
                            && !next_token.to_uppercase().eq("OR") 
                            && !next_token.to_uppercase().eq("NOT") {
                            let sub_terms = self.tokenize(next_token);
                            must_not_terms.extend(sub_terms);
                            i += 2;
                            continue;
                        }
                    }
                    i += 1;
                }
                _ => {
                    let sub_terms = self.tokenize(tokens[i]);
                    if must_terms.is_empty() && should_terms.is_empty() {
                        must_terms.extend(sub_terms);
                    } else {
                        should_terms.extend(sub_terms);
                    }
                    i += 1;
                }
            }
        }

        ParsedQuery {
            must_terms,
            should_terms,
            must_not_terms,
        }
    }

    fn execute_query(&self, parsed: &ParsedQuery) -> HashSet<u32> {
        let all_docs: HashSet<u32> = (1..self.next_doc_id)
            .filter(|id| self.documents.contains_key(id))
            .collect();

        if parsed.must_terms.is_empty() && parsed.should_terms.is_empty() {
            return all_docs;
        }

        let mut result: HashSet<u32> = if !parsed.must_terms.is_empty() {
            let mut must_result = all_docs.clone();
            for term in &parsed.must_terms {
                let docs_for_term = self.index.get_docs_for_term(term);
                must_result = must_result.intersection(&docs_for_term).cloned().collect();
            }
            must_result
        } else {
            HashSet::new()
        };

        if !parsed.should_terms.is_empty() {
            let mut should_result = HashSet::new();
            for term in &parsed.should_terms {
                let docs_for_term = self.index.get_docs_for_term(term);
                should_result = should_result.union(&docs_for_term).cloned().collect();
            }
            
            if result.is_empty() {
                result = should_result;
            } else {
                result = result.union(&should_result).cloned().collect();
            }
        }

        if !parsed.must_not_terms.is_empty() {
            for term in &parsed.must_not_terms {
                let docs_for_term = self.index.get_docs_for_term(term);
                result = result.difference(&docs_for_term).cloned().collect();
            }
        }

        result
    }

    fn score_tfidf(&self, doc_id: u32, terms: &[String]) -> f32 {
        let mut score = 0.0;
        let total_docs = self.index.total_docs();

        for term in terms {
            let tf = self.index.get_term_frequency(doc_id, term);
            let df = self.index.get_doc_count_for_term(term);

            if tf > 0 && df > 0 {
                let idf = ((total_docs as f32 + 1.0) / (df as f32 + 1.0)).ln();
                score += tf as f32 * idf;
            }
        }

        score
    }

    fn score_bm25(&self, doc_id: u32, terms: &[String]) -> f32 {
        let k1 = 1.2;
        let b = 0.75;
        let total_docs = self.index.total_docs();
        let avg_len = self.index.avg_doc_length();
        let doc_len = self.index.get_doc_length(doc_id);

        let mut score = 0.0;

        for term in terms {
            let df = self.index.get_doc_count_for_term(term);
            if df == 0 {
                continue;
            }

            let tf = self.index.get_term_frequency(doc_id, term);
            if tf == 0 {
                continue;
            }

            let idf = ((total_docs as f32 - df as f32 + 0.5) / (df as f32 + 0.5) + 1.0).ln();
            
            let norm = k1 * ((1.0 - b) + b * (doc_len as f32 / avg_len));
            let tf_part = ((k1 + 1.0) * tf as f32) / (norm + tf as f32);

            score += idf * tf_part;
        }

        score
    }

    fn generate_snippet(&self, doc_id: u32, terms: &[String]) -> String {
        let doc = match self.documents.get(&doc_id) {
            Some(d) => d,
            None => return String::new(),
        };

        let text = format!("{} {}", doc.title, doc.content);
        let terms_set: HashSet<&str> = terms.iter().map(|t| t.as_str()).collect();

        let tokens = self.jieba.cut(&text, true);
        let mut snippet_parts = Vec::new();
        let mut found_match = false;

        for token in tokens {
            if terms_set.contains(&token.to_lowercase()) {
                snippet_parts.push(format!("[{}]", token));
                found_match = true;
            } else {
                snippet_parts.push(token.to_string());
            }
        }

        let snippet = snippet_parts.join("");
        if snippet.len() > 200 {
            format!("{}...", &snippet[..200])
        } else {
            snippet
        }
    }
}

#[derive(Default)]
struct ParsedQuery {
    must_terms: Vec<String>,
    should_terms: Vec<String>,
    must_not_terms: Vec<String>,
}

#[wasm_bindgen]
pub struct WasmSearchEngine {
    inner: SearchEngine,
}

#[wasm_bindgen]
impl WasmSearchEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        #[cfg(feature = "console_error_panic_hook")]
        set_panic_hook();

        WasmSearchEngine {
            inner: SearchEngine::new(),
        }
    }

    pub fn add_document(&mut self, doc_json: &str) -> u32 {
        let doc: Document = match serde_json::from_str(doc_json) {
            Ok(d) => d,
            Err(_) => return 0,
        };
        self.inner.add_document(doc)
    }

    pub fn get_document(&self, doc_id: u32) -> String {
        match self.inner.get_document(doc_id) {
            Some(doc) => serde_json::to_string(doc).unwrap_or_default(),
            None => String::new(),
        }
    }

    pub fn update_document(&mut self, doc_id: u32, doc_json: &str) -> bool {
        let doc: Document = match serde_json::from_str(doc_json) {
            Ok(d) => d,
            Err(_) => return false,
        };
        self.inner.update_document(doc_id, doc)
    }

    pub fn delete_document(&mut self, doc_id: u32) -> bool {
        self.inner.delete_document(doc_id)
    }

    pub fn search(&self, query: &str, use_bm25: bool) -> String {
        let results = self.inner.search(query, use_bm25);
        serde_json::to_string(&results).unwrap_or_default()
    }

    pub fn tokenize(&self, text: &str) -> String {
        let tokens = self.inner.tokenize(text);
        serde_json::to_string(&tokens).unwrap_or_default()
    }
}

impl Default for WasmSearchEngine {
    fn default() -> Self {
        Self::new()
    }
}
