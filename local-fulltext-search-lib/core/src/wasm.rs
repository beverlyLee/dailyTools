use super::document::Document;
use super::index::InvertedIndex;
use super::ranking::{BM25Ranker, SearchResult};
use super::tokenizer::Tokenizer;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsSearchResult {
    pub doc_id: u64,
    pub score: f64,
    pub fields: std::collections::HashMap<String, String>,
}

impl JsSearchResult {
    fn from_search_result(result: &SearchResult, index: &InvertedIndex) -> Self {
        let fields = index
            .get_document(result.doc_id)
            .map(|doc| doc.fields.clone())
            .unwrap_or_default();
        
        JsSearchResult {
            doc_id: result.doc_id,
            score: result.score,
            fields,
        }
    }
}

#[wasm_bindgen]
pub struct WasmFulltextSearch {
    index: InvertedIndex,
    ranker: BM25Ranker,
    tokenizer: Tokenizer,
}

#[wasm_bindgen]
impl WasmFulltextSearch {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        WasmFulltextSearch {
            index: InvertedIndex::new(),
            ranker: BM25Ranker::new(),
            tokenizer: Tokenizer::new(),
        }
    }

    #[wasm_bindgen(js_name = addDocument)]
    pub fn add_document(&mut self, doc_id: u64, fields_json: &str) -> bool {
        let fields: std::collections::HashMap<String, String> = match serde_json::from_str(fields_json) {
            Ok(f) => f,
            Err(e) => {
                log(&format!("Failed to parse fields: {}", e));
                return false;
            }
        };
        
        let mut doc = Document::new(doc_id);
        for (name, value) in fields {
            doc.add_field(name, value);
        }
        
        self.index.add_document(doc);
        true
    }

    #[wasm_bindgen(js_name = removeDocument)]
    pub fn remove_document(&mut self, doc_id: u64) -> bool {
        self.index.remove_document(doc_id)
    }

    #[wasm_bindgen(js_name = updateDocument)]
    pub fn update_document(&mut self, doc_id: u64, fields_json: &str) -> bool {
        let fields: std::collections::HashMap<String, String> = match serde_json::from_str(fields_json) {
            Ok(f) => f,
            Err(e) => {
                log(&format!("Failed to parse fields: {}", e));
                return false;
            }
        };
        
        let mut doc = Document::new(doc_id);
        for (name, value) in fields {
            doc.add_field(name, value);
        }
        
        self.index.update_document(doc)
    }

    #[wasm_bindgen(js_name = getDocument)]
    pub fn get_document(&self, doc_id: u64) -> Option<String> {
        self.index.get_document(doc_id).map(|doc| {
            serde_json::to_string(&doc.fields).unwrap_or_else(|_| "{}".to_string())
        })
    }

    pub fn search(&self, query: &str) -> String {
        match self.ranker.search(&self.index, query) {
            Ok(results) => {
                let js_results: Vec<JsSearchResult> = results
                    .iter()
                    .map(|r| JsSearchResult::from_search_result(r, &self.index))
                    .collect();
                
                serde_json::to_string(&js_results).unwrap_or_else(|_| "[]".to_string())
            }
            Err(e) => {
                log(&format!("Search error: {}", e));
                "[]".to_string()
            }
        }
    }

    pub fn tokenize(&self, text: &str) -> String {
        let tokens = self.tokenizer.tokenize(text);
        serde_json::to_string(&tokens).unwrap_or_else(|_| "[]".to_string())
    }

    #[wasm_bindgen(js_name = totalDocuments)]
    pub fn total_documents(&self) -> u64 {
        self.index.total_documents()
    }

    #[wasm_bindgen(js_name = setBM25Params)]
    pub fn set_bm25_params(&mut self, k1: f64, b: f64) {
        self.ranker.set_k1(k1);
        self.ranker.set_b(b);
    }

    #[wasm_bindgen(js_name = addCustomWord)]
    pub fn add_custom_word(&mut self, word: &str) {
        self.tokenizer.add_word(word);
    }

    #[wasm_bindgen(js_name = addCustomWordWithFreq)]
    pub fn add_custom_word_with_freq(&mut self, word: &str, freq: usize) {
        self.tokenizer.add_word_with_freq(word, freq);
    }

    #[wasm_bindgen(js_name = getAllTerms)]
    pub fn get_all_terms(&self) -> String {
        let terms = self.index.get_all_terms();
        let terms_vec: Vec<&String> = terms.into_iter().collect();
        serde_json::to_string(&terms_vec).unwrap_or_else(|_| "[]".to_string())
    }
}

impl Default for WasmFulltextSearch {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
