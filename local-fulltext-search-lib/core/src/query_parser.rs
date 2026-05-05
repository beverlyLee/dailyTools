use super::tokenizer::Tokenizer;
use std::collections::{HashSet, VecDeque};

#[derive(Debug, Clone, PartialEq)]
pub enum Query {
    Term(String),
    Phrase(Vec<String>),
    And(Box<Query>, Box<Query>),
    Or(Box<Query>, Box<Query>),
    Not(Box<Query>),
}

#[derive(Debug, Clone, PartialEq)]
pub enum Token {
    Word(String),
    Phrase(Vec<String>),
    And,
    Or,
    Not,
    LParen,
    RParen,
}

pub struct QueryParser {
    tokenizer: Tokenizer,
}

impl QueryParser {
    pub fn new() -> Self {
        QueryParser {
            tokenizer: Tokenizer::new(),
        }
    }

    pub fn parse(&self, query_str: &str) -> Result<Query, String> {
        let tokens = self.tokenize_query(query_str)?;
        let mut token_queue = VecDeque::from(tokens);
        self.parse_expression(&mut token_queue)
    }

    fn tokenize_query(&self, query_str: &str) -> Result<Vec<Token>, String> {
        let mut tokens = Vec::new();
        let mut chars = query_str.chars().peekable();
        let mut current_word = String::new();
        let mut in_phrase = false;

        while let Some(c) = chars.next() {
            match c {
                '"' => {
                    if in_phrase {
                        let phrase_tokens = self.tokenizer.tokenize(&current_word);
                        if !phrase_tokens.is_empty() {
                            tokens.push(Token::Phrase(phrase_tokens));
                        }
                        current_word.clear();
                        in_phrase = false;
                    } else {
                        if !current_word.is_empty() {
                            self.push_word_token(&mut tokens, &current_word);
                            current_word.clear();
                        }
                        in_phrase = true;
                    }
                }
                '(' => {
                    if in_phrase {
                        current_word.push(c);
                    } else {
                        if !current_word.is_empty() {
                            self.push_word_token(&mut tokens, &current_word);
                            current_word.clear();
                        }
                        tokens.push(Token::LParen);
                    }
                }
                ')' => {
                    if in_phrase {
                        current_word.push(c);
                    } else {
                        if !current_word.is_empty() {
                            self.push_word_token(&mut tokens, &current_word);
                            current_word.clear();
                        }
                        tokens.push(Token::RParen);
                    }
                }
                ' ' | '\t' | '\n' | '\r' => {
                    if in_phrase {
                        current_word.push(c);
                    } else if !current_word.is_empty() {
                        self.push_word_token(&mut tokens, &current_word);
                        current_word.clear();
                    }
                }
                _ => {
                    current_word.push(c);
                }
            }
        }

        if !current_word.is_empty() {
            if in_phrase {
                return Err("Unclosed phrase quote".to_string());
            }
            self.push_word_token(&mut tokens, &current_word);
        }

        Ok(tokens)
    }

    fn push_word_token(&self, tokens: &mut Vec<Token>, word: &str) {
        let word_lower = word.to_lowercase();
        match word_lower.as_str() {
            "and" | "&&" => tokens.push(Token::And),
            "or" | "||" => tokens.push(Token::Or),
            "not" | "!" => tokens.push(Token::Not),
            _ => {
                let term_tokens = self.tokenizer.tokenize(word);
                for token in term_tokens {
                    tokens.push(Token::Word(token));
                }
            }
        }
    }

    fn parse_expression(&self, tokens: &mut VecDeque<Token>) -> Result<Query, String> {
        self.parse_or_expression(tokens)
    }

    fn parse_or_expression(&self, tokens: &mut VecDeque<Token>) -> Result<Query, String> {
        let mut left = self.parse_and_expression(tokens)?;

        while let Some(token) = tokens.front() {
            if token == &Token::Or {
                tokens.pop_front();
                let right = self.parse_and_expression(tokens)?;
                left = Query::Or(Box::new(left), Box::new(right));
            } else {
                break;
            }
        }

        Ok(left)
    }

    fn parse_and_expression(&self, tokens: &mut VecDeque<Token>) -> Result<Query, String> {
        let mut left = self.parse_not_expression(tokens)?;

        while let Some(token) = tokens.front() {
            if token == &Token::And {
                tokens.pop_front();
                let right = self.parse_not_expression(tokens)?;
                left = Query::And(Box::new(left), Box::new(right));
            } else if let Some(Token::Word(_)) | Some(Token::Phrase(_)) | Some(Token::LParen) = tokens.front() {
                let right = self.parse_not_expression(tokens)?;
                left = Query::And(Box::new(left), Box::new(right));
            } else {
                break;
            }
        }

        Ok(left)
    }

    fn parse_not_expression(&self, tokens: &mut VecDeque<Token>) -> Result<Query, String> {
        if let Some(token) = tokens.front() {
            if token == &Token::Not {
                tokens.pop_front();
                let inner = self.parse_primary_expression(tokens)?;
                return Ok(Query::Not(Box::new(inner)));
            }
        }
        self.parse_primary_expression(tokens)
    }

    fn parse_primary_expression(&self, tokens: &mut VecDeque<Token>) -> Result<Query, String> {
        match tokens.pop_front() {
            Some(Token::LParen) => {
                let expr = self.parse_expression(tokens)?;
                match tokens.pop_front() {
                    Some(Token::RParen) => Ok(expr),
                    _ => Err("Mismatched parentheses".to_string()),
                }
            }
            Some(Token::Word(word)) => Ok(Query::Term(word)),
            Some(Token::Phrase(terms)) => {
                if terms.is_empty() {
                    Err("Empty phrase".to_string())
                } else {
                    Ok(Query::Phrase(terms))
                }
            }
            _ => Err("Unexpected token in expression".to_string()),
        }
    }

    pub fn get_terms(&self, query: &Query) -> HashSet<String> {
        let mut terms = HashSet::new();
        self.collect_terms(query, &mut terms);
        terms
    }

    fn collect_terms(&self, query: &Query, terms: &mut HashSet<String>) {
        match query {
            Query::Term(term) => {
                terms.insert(term.clone());
            }
            Query::Phrase(phrase_terms) => {
                for term in phrase_terms {
                    terms.insert(term.clone());
                }
            }
            Query::And(left, right) | Query::Or(left, right) => {
                self.collect_terms(left, terms);
                self.collect_terms(right, terms);
            }
            Query::Not(inner) => {
                self.collect_terms(inner, terms);
            }
        }
    }
}

impl Default for QueryParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_term_query() {
        let parser = QueryParser::new();
        let query = parser.parse("机器学习").unwrap();
        
        assert!(matches!(query, Query::Term(term) if term == "机器学习"));
    }

    #[test]
    fn test_and_query() {
        let parser = QueryParser::new();
        let query = parser.parse("机器学习 AND 深度学习").unwrap();
        
        assert!(matches!(query, Query::And(_, _)));
    }

    #[test]
    fn test_or_query() {
        let parser = QueryParser::new();
        let query = parser.parse("机器学习 OR 深度学习").unwrap();
        
        assert!(matches!(query, Query::Or(_, _)));
    }

    #[test]
    fn test_not_query() {
        let parser = QueryParser::new();
        let query = parser.parse("NOT 深度学习").unwrap();
        
        assert!(matches!(query, Query::Not(_)));
    }

    #[test]
    fn test_phrase_query() {
        let parser = QueryParser::new();
        let query = parser.parse("\"机器学习 算法\"").unwrap();
        
        assert!(matches!(query, Query::Phrase(_)));
    }

    #[test]
    fn test_complex_query() {
        let parser = QueryParser::new();
        let query = parser.parse("(机器学习 OR 深度学习) AND 算法 NOT \"计算机视觉\"").unwrap();
        
        assert!(matches!(query, Query::And(_, _)));
    }

    #[test]
    fn test_implicit_and() {
        let parser = QueryParser::new();
        let query = parser.parse("机器学习 深度学习").unwrap();
        
        assert!(matches!(query, Query::And(_, _)));
    }

    #[test]
    fn test_symbolic_operators() {
        let parser = QueryParser::new();
        
        let query1 = parser.parse("a && b").unwrap();
        assert!(matches!(query1, Query::And(_, _)));
        
        let query2 = parser.parse("a || b").unwrap();
        assert!(matches!(query2, Query::Or(_, _)));
        
        let query3 = parser.parse("!a").unwrap();
        assert!(matches!(query3, Query::Not(_)));
    }

    #[test]
    fn test_get_terms() {
        let parser = QueryParser::new();
        let query = parser.parse("(机器学习 OR 深度学习) AND 算法").unwrap();
        
        let terms = parser.get_terms(&query);
        
        assert!(terms.contains("机器学习"));
        assert!(terms.contains("深度学习"));
        assert!(terms.contains("算法"));
        assert_eq!(terms.len(), 3);
    }
}
