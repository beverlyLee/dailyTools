use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: u64,
    pub fields: HashMap<String, String>,
}

impl Document {
    pub fn new(id: u64) -> Self {
        Document {
            id,
            fields: HashMap::new(),
        }
    }

    pub fn add_field(&mut self, name: String, value: String) {
        self.fields.insert(name, value);
    }

    pub fn get_field(&self, name: &str) -> Option<&String> {
        self.fields.get(name)
    }

    pub fn remove_field(&mut self, name: &str) -> Option<String> {
        self.fields.remove(name)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub doc_id: u64,
    pub field_lengths: HashMap<String, usize>,
    pub total_length: usize,
}

impl DocumentMetadata {
    pub fn new(doc_id: u64) -> Self {
        DocumentMetadata {
            doc_id,
            field_lengths: HashMap::new(),
            total_length: 0,
        }
    }

    pub fn add_field_length(&mut self, field_name: String, length: usize) {
        self.total_length += length;
        self.field_lengths.insert(field_name, length);
    }
}
