use jieba_rs::Jieba;
use std::sync::OnceLock;

static JIEBA_INSTANCE: OnceLock<Jieba> = OnceLock::new();

fn get_jieba() -> &'static Jieba {
    JIEBA_INSTANCE.get_or_init(Jieba::new)
}

#[derive(Debug, Clone)]
pub struct Tokenizer {
    hmm: bool,
}

impl Tokenizer {
    pub fn new() -> Self {
        Tokenizer { hmm: true }
    }

    pub fn with_hmm(hmm: bool) -> Self {
        Tokenizer { hmm }
    }

    pub fn tokenize(&self, text: &str) -> Vec<String> {
        let jieba = get_jieba();
        jieba
            .cut(text, self.hmm)
            .iter()
            .filter(|token| !self.is_stop_word(token))
            .map(|token| token.to_lowercase())
            .collect()
    }

    pub fn tokenize_for_search(&self, text: &str) -> Vec<String> {
        let jieba = get_jieba();
        jieba
            .cut_for_search(text, self.hmm)
            .iter()
            .filter(|token| !self.is_stop_word(token))
            .map(|token| token.to_lowercase())
            .collect()
    }

    pub fn add_word(&self, word: &str) {
        let jieba = get_jieba();
        jieba.add_word(word, None, None);
    }

    pub fn add_word_with_freq(&self, word: &str, freq: usize) {
        let jieba = get_jieba();
        jieba.add_word(word, Some(freq), None);
    }

    fn is_stop_word(&self, token: &str) -> bool {
        let stop_words = [
            "的", "是", "在", "了", "和", "与", "或", "者", "不", "也",
            "都", "就", "而", "及", "等", "这", "那", "有", "为", "以",
            "于", "上", "下", "中", "到", "从", "把", "被", "让", "给",
            "向", "对", "跟", "同", "比", "较", "很", "太", "更", "最",
            "还", "又", "再", "已", "曾", "将", "要", "会", "能", "可",
            "该", "应", "须", "必", "着", "过", "地", "得", "啊", "吗",
            "呢", "吧", "呀", "哦", "嗯", "哈", "哎", "唉", "喔", "啦",
            "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
            "for", "of", "with", "by", "from", "as", "is", "are", "was",
            "were", "be", "been", "being", "have", "has", "had", "do",
            "does", "did", "will", "would", "shall", "should", "can",
            "could", "may", "might", "must", "ought", "i", "me", "my",
            "we", "our", "you", "your", "he", "him", "his", "she", "her",
            "it", "its", "they", "them", "their", "this", "that", "these",
            "those", "what", "which", "who", "whom", "whose", "where",
            "when", "why", "how", "all", "each", "every", "both", "few",
            "more", "most", "other", "some", "such", "no", "nor", "not",
            "only", "own", "same", "so", "than", "too", "very", "just",
            "also", "now", "here", "there", "then", "once", "if", "because",
            "as", "until", "while", "of", "at", "by", "for", "with",
            "about", "against", "between", "into", "through", "during",
            "before", "after", "above", "below", "to", "from", "up", "down",
            "in", "out", "on", "off", "over", "under", "again", "further",
            "then", "once", "am", "is", "are", "was", "were", "be", "been",
            "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "shall", "should", "can", "could", "may", "might",
            "must", "need", "dare", "ought", "used", "better",
        ];
        
        let token_lower = token.to_lowercase();
        stop_words.contains(&token_lower.as_str()) || token.trim().is_empty()
    }
}

impl Default for Tokenizer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chinese_tokenization() {
        let tokenizer = Tokenizer::new();
        let text = "我喜欢学习机器学习和自然语言处理";
        let tokens = tokenizer.tokenize(text);
        
        assert!(!tokens.is_empty());
        assert!(tokens.contains(&"学习".to_string()));
        assert!(tokens.contains(&"机器学习".to_string()));
    }

    #[test]
    fn test_english_tokenization() {
        let tokenizer = Tokenizer::new();
        let text = "I love learning machine learning and natural language processing";
        let tokens = tokenizer.tokenize(text);
        
        assert!(!tokens.is_empty());
        assert!(tokens.contains(&"learning".to_string()));
        assert!(tokens.contains(&"machine".to_string()));
    }

    #[test]
    fn test_stop_words_removal() {
        let tokenizer = Tokenizer::new();
        let text = "这是一个测试句子，的和与或都应该被过滤掉";
        let tokens = tokenizer.tokenize(text);
        
        assert!(!tokens.contains(&"的".to_string()));
        assert!(!tokens.contains(&"是".to_string()));
        assert!(!tokens.contains(&"和".to_string()));
    }

    #[test]
    fn test_mixed_language_tokenization() {
        let tokenizer = Tokenizer::new();
        let text = "我喜欢使用Python进行machine learning开发";
        let tokens = tokenizer.tokenize(text);
        
        assert!(tokens.contains(&"python".to_string()));
        assert!(tokens.contains(&"machine".to_string()));
        assert!(tokens.contains(&"learning".to_string()));
    }
}
