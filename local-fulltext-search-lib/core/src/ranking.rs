use super::index::{InvertedIndex, TermInfo};
use super::query_parser::{Query, QueryParser};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone)]
pub struct SearchResult {
    pub doc_id: u64,
    pub score: f64,
}

impl SearchResult {
    pub fn new(doc_id: u64, score: f64) -> Self {
        SearchResult { doc_id, score }
    }
}

#[derive(Debug, Clone)]
pub struct BM25Ranker {
    k1: f64,
    b: f64,
    query_parser: QueryParser,
}

impl BM25Ranker {
    pub fn new() -> Self {
        BM25Ranker {
            k1: 1.2,
            b: 0.75,
            query_parser: QueryParser::new(),
        }
    }

    pub fn with_params(k1: f64, b: f64) -> Self {
        BM25Ranker {
            k1,
            b,
            query_parser: QueryParser::new(),
        }
    }

    pub fn search(
        &self,
        index: &InvertedIndex,
        query_str: &str,
    ) -> Result<Vec<SearchResult>, String> {
        let query = self.query_parser.parse(query_str)?;
        self.search_with_query(index, &query)
    }

    pub fn search_with_query(
        &self,
        index: &InvertedIndex,
        query: &Query,
    ) -> Result<Vec<SearchResult>, String> {
        let candidate_docs = self.evaluate_query(index, query)?;
        
        let terms = self.query_parser.get_terms(query);
        let avg_doc_length = index.average_document_length();
        let total_docs = index.total_documents();
        
        let mut results: Vec<SearchResult> = candidate_docs
            .iter()
            .map(|&doc_id| {
                let score = self.calculate_bm25_score(
                    index,
                    doc_id,
                    &terms,
                    avg_doc_length,
                    total_docs,
                );
                SearchResult::new(doc_id, score)
            })
            .collect();
        
        results.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        
        Ok(results)
    }

    fn evaluate_query(
        &self,
        index: &InvertedIndex,
        query: &Query,
    ) -> Result<HashSet<u64>, String> {
        match query {
            Query::Term(term) => self.evaluate_term(index, term),
            Query::Phrase(terms) => self.evaluate_phrase(index, terms),
            Query::And(left, right) => {
                let left_docs = self.evaluate_query(index, left)?;
                let right_docs = self.evaluate_query(index, right)?;
                Ok(left_docs.intersection(&right_docs).cloned().collect())
            }
            Query::Or(left, right) => {
                let left_docs = self.evaluate_query(index, left)?;
                let right_docs = self.evaluate_query(index, right)?;
                Ok(left_docs.union(&right_docs).cloned().collect())
            }
            Query::Not(inner) => {
                let inner_docs = self.evaluate_query(index, inner)?;
                let all_docs: HashSet<u64> = index
                    .documents
                    .keys()
                    .cloned()
                    .collect();
                Ok(all_docs.difference(&inner_docs).cloned().collect())
            }
        }
    }

    fn evaluate_term(&self, index: &InvertedIndex, term: &str) -> Result<HashSet<u64>, String> {
        if let Some(term_info) = index.get_term_info(term) {
            Ok(term_info.postings.keys().cloned().collect())
        } else {
            Ok(HashSet::new())
        }
    }

    fn evaluate_phrase(&self, index: &InvertedIndex, terms: &[String]) -> Result<HashSet<u64>, String> {
        if terms.is_empty() {
            return Ok(HashSet::new());
        }
        
        let mut result_docs = HashSet::new();
        
        let first_term = &terms[0];
        let first_term_info = match index.get_term_info(first_term) {
            Some(info) => info,
            None => return Ok(HashSet::new()),
        };
        
        for (doc_id, first_posting) in &first_term_info.postings {
            let mut matched = true;
            let mut base_positions = first_posting.positions.clone();
            
            for (i, term) in terms.iter().enumerate().skip(1) {
                let term_info = match index.get_term_info(term) {
                    Some(info) => info,
                    None => {
                        matched = false;
                        break;
                    }
                };
                
                let posting = match term_info.postings.get(doc_id) {
                    Some(p) => p,
                    None => {
                        matched = false;
                        break;
                    }
                };
                
                let expected_offset = i;
                let mut matched_positions = Vec::new();
                
                for &base_pos in &base_positions {
                    let expected_pos = base_pos + expected_offset;
                    if posting.positions.contains(&expected_pos) {
                        matched_positions.push(base_pos);
                    }
                }
                
                if matched_positions.is_empty() {
                    matched = false;
                    break;
                }
                
                base_positions = matched_positions;
            }
            
            if matched {
                result_docs.insert(*doc_id);
            }
        }
        
        Ok(result_docs)
    }

    fn calculate_bm25_score(
        &self,
        index: &InvertedIndex,
        doc_id: u64,
        terms: &HashSet<String>,
        avg_doc_length: f64,
        total_docs: u64,
    ) -> f64 {
        let doc_metadata = match index.get_doc_metadata(doc_id) {
            Some(metadata) => metadata,
            None => return 0.0,
        };
        
        let doc_length = doc_metadata.total_length as f64;
        
        let mut score = 0.0;
        
        for term in terms {
            if let Some(term_info) = index.get_term_info(term) {
                let posting = match term_info.postings.get(&doc_id) {
                    Some(p) => p,
                    None => continue,
                };
                
                let term_freq = posting.term_frequency as f64;
                let doc_freq = term_info.doc_frequency as f64;
                
                let idf = ((total_docs as f64 - doc_freq + 0.5) / (doc_freq + 0.5) + 1.0).ln();
                
                let numerator = term_freq * (self.k1 + 1.0);
                let denominator = term_freq + self.k1 * (1.0 - self.b + self.b * (doc_length / avg_doc_length));
                
                score += idf * (numerator / denominator);
            }
        }
        
        score
    }

    pub fn set_k1(&mut self, k1: f64) {
        self.k1 = k1;
    }

    pub fn set_b(&mut self, b: f64) {
        self.b = b;
    }

    pub fn k1(&self) -> f64 {
        self.k1
    }

    pub fn b(&self) -> f64 {
        self.b
    }
}

impl Default for BM25Ranker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::document::Document;

    fn create_test_index() -> InvertedIndex {
        let mut index = InvertedIndex::new();
        
        let mut doc1 = Document::new(1);
        doc1.add_field("content".to_string(), "机器学习是人工智能的一个重要分支".to_string());
        
        let mut doc2 = Document::new(2);
        doc2.add_field("content".to_string(), "深度学习是机器学习的一种方法".to_string());
        
        let mut doc3 = Document::new(3);
        doc3.add_field("content".to_string(), "计算机视觉是人工智能的应用领域".to_string());
        
        index.add_document(doc1);
        index.add_document(doc2);
        index.add_document(doc3);
        
        index
    }

    #[test]
    fn test_bm25_basic_search() {
        let index = create_test_index();
        let ranker = BM25Ranker::new();
        
        let results = ranker.search(&index, "机器学习").unwrap();
        
        assert!(!results.is_empty());
        
        let doc_ids: Vec<u64> = results.iter().map(|r| r.doc_id).collect();
        assert!(doc_ids.contains(&1));
        assert!(doc_ids.contains(&2));
    }

    #[test]
    fn test_bm25_scoring() {
        let index = create_test_index();
        let ranker = BM25Ranker::new();
        
        let results = ranker.search(&index, "机器学习").unwrap();
        
        assert!(results[0].score > results[results.len() - 1].score);
    }

    #[test]
    fn test_phrase_search() {
        let index = create_test_index();
        let ranker = BM25Ranker::new();
        
        let results = ranker.search(&index, "\"机器学习 人工智能\"").unwrap();
        
        let doc_ids: Vec<u64> = results.iter().map(|r| r.doc_id).collect();
        assert!(doc_ids.contains(&1));
    }

    #[test]
    fn test_boolean_query() {
        let index = create_test_index();
        let ranker = BM25Ranker::new();
        
        let results = ranker.search(&index, "机器学习 AND 人工智能").unwrap();
        
        let doc_ids: Vec<u64> = results.iter().map(|r| r.doc_id).collect();
        assert!(doc_ids.contains(&1));
        assert!(!doc_ids.contains(&2));
    }

    #[test]
    fn test_not_query() {
        let index = create_test_index();
        let ranker = BM25Ranker::new();
        
        let results = ranker.search(&index, "人工智能 NOT 计算机视觉").unwrap();
        
        let doc_ids: Vec<u64> = results.iter().map(|r| r.doc_id).collect();
        assert!(doc_ids.contains(&1));
        assert!(!doc_ids.contains(&3));
    }

    #[test]
    fn test_custom_params() {
        let ranker = BM25Ranker::with_params(1.5, 0.8);
        
        assert!((ranker.k1() - 1.5).abs() < f64::EPSILON);
        assert!((ranker.b() - 0.8).abs() < f64::EPSILON);
    }
}
