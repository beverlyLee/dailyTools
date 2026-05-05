use super::document::{Document, DocumentMetadata};
use super::tokenizer::Tokenizer;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TermInfo {
    pub doc_frequency: u32,
    pub postings: HashMap<u64, DocPosting>,
}

impl TermInfo {
    pub fn new() -> Self {
        TermInfo {
            doc_frequency: 0,
            postings: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocPosting {
    pub term_frequency: u32,
    pub positions: Vec<usize>,
}

impl DocPosting {
    pub fn new() -> Self {
        DocPosting {
            term_frequency: 0,
            positions: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvertedIndex {
    #[serde(skip)]
    tokenizer: Tokenizer,
    inverted_index: HashMap<String, TermInfo>,
    documents: HashMap<u64, Document>,
    doc_metadata: HashMap<u64, DocumentMetadata>,
    total_docs: u64,
    avg_doc_length: f64,
}

impl InvertedIndex {
    pub fn new() -> Self {
        InvertedIndex {
            tokenizer: Tokenizer::new(),
            inverted_index: HashMap::new(),
            documents: HashMap::new(),
            doc_metadata: HashMap::new(),
            total_docs: 0,
            avg_doc_length: 0.0,
        }
    }

    pub fn add_document(&mut self, doc: Document) {
        let doc_id = doc.id;
        
        if self.documents.contains_key(&doc_id) {
            self.remove_document(doc_id);
        }

        let mut metadata = DocumentMetadata::new(doc_id);
        
        for (field_name, field_value) in &doc.fields {
            let tokens = self.tokenizer.tokenize(field_value);
            let token_count = tokens.len();
            
            metadata.add_field_length(field_name.clone(), token_count);
            
            let mut term_positions: HashMap<String, Vec<usize>> = HashMap::new();
            
            for (pos, token) in tokens.iter().enumerate() {
                term_positions
                    .entry(token.to_string())
                    .or_default()
                    .push(pos);
            }
            
            for (term, positions) in term_positions {
                let term_info = self.inverted_index.entry(term).or_insert_with(TermInfo::new);
                
                if !term_info.postings.contains_key(&doc_id) {
                    term_info.doc_frequency += 1;
                }
                
                let posting = term_info.postings.entry(doc_id).or_insert_with(DocPosting::new);
                posting.term_frequency += positions.len() as u32;
                posting.positions.extend(positions);
            }
        }

        self.documents.insert(doc_id, doc);
        self.doc_metadata.insert(doc_id, metadata);
        self.total_docs += 1;
        self.update_avg_doc_length();
    }

    pub fn remove_document(&mut self, doc_id: u64) -> bool {
        if !self.documents.contains_key(&doc_id) {
            return false;
        }

        let doc = self.documents.remove(&doc_id).unwrap();
        self.doc_metadata.remove(&doc_id);
        self.total_docs -= 1;

        for (_, field_value) in &doc.fields {
            let tokens = self.tokenizer.tokenize(field_value);
            let unique_tokens: HashSet<_> = tokens.into_iter().collect();
            
            for token in unique_tokens {
                if let Some(term_info) = self.inverted_index.get_mut(&token) {
                    term_info.postings.remove(&doc_id);
                    term_info.doc_frequency -= 1;
                    
                    if term_info.doc_frequency == 0 {
                        self.inverted_index.remove(&token);
                    }
                }
            }
        }

        self.update_avg_doc_length();
        true
    }

    pub fn update_document(&mut self, doc: Document) -> bool {
        if !self.documents.contains_key(&doc.id) {
            return false;
        }
        
        self.remove_document(doc.id);
        self.add_document(doc);
        true
    }

    pub fn get_document(&self, doc_id: u64) -> Option<&Document> {
        self.documents.get(&doc_id)
    }

    pub fn get_term_info(&self, term: &str) -> Option<&TermInfo> {
        self.inverted_index.get(term)
    }

    pub fn get_doc_metadata(&self, doc_id: u64) -> Option<&DocumentMetadata> {
        self.doc_metadata.get(&doc_id)
    }

    pub fn total_documents(&self) -> u64 {
        self.total_docs
    }

    pub fn average_document_length(&self) -> f64 {
        self.avg_doc_length
    }

    pub fn get_all_terms(&self) -> Vec<&String> {
        self.inverted_index.keys().collect()
    }

    fn update_avg_doc_length(&mut self) {
        if self.total_docs == 0 {
            self.avg_doc_length = 0.0;
            return;
        }
        
        let total_length: usize = self.doc_metadata.values().map(|m| m.total_length).sum();
        self.avg_doc_length = total_length as f64 / self.total_docs as f64;
    }
}

impl Default for InvertedIndex {
    fn default() -> Self {
        Self::new()
    }
}
