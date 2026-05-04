const natural = require('natural')

class NLPAnalyzer {
  constructor() {
    this.tokenizer = new natural.WordTokenizer()
    this.stopwords = new Set(natural.stopwords)
  }

  /**
   * 分析阅读笔记的关键词
   * @param {string} text - 笔记文本
   * @param {number} topN - 返回前N个关键词
   * @returns {Array} - 关键词数组
   */
  extractKeywords(text, topN = 10) {
    if (!text || typeof text !== 'string') {
      return []
    }
    
    const tokens = this.tokenizer.tokenize(text.toLowerCase())
    const wordFreq = {}
    
    tokens.forEach(token => {
      if (token.length > 2 && !this.stopwords.has(token)) {
        wordFreq[token] = (wordFreq[token] || 0) + 1
      }
    })
    
    const sortedWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word, freq]) => ({ word, frequency: freq }))
    
    return sortedWords
  }

  /**
   * 分析文本的情感倾向
   * @param {string} text - 待分析文本
   * @returns {Object} - 情感分析结果
   */
  analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
      return { score: 0, comparative: 0, positive: [], negative: [] }
    }
    
    const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn')
    const tokenizer = new natural.WordTokenizer()
    const tokens = tokenizer.tokenize(text.toLowerCase())
    
    // 过滤停用词
    const filteredTokens = tokens.filter(token => !this.stopwords.has(token))
    
    const score = analyzer.getSentiment(filteredTokens)
    
    // 找出正面和负面词汇
    const positive = []
    const negative = []
    
    filteredTokens.forEach(token => {
      const sentiment = analyzer.getSentiment([token])
      if (sentiment > 0) {
        positive.push(token)
      } else if (sentiment < 0) {
        negative.push(token)
      }
    })
    
    return {
      score,
      comparative: filteredTokens.length > 0 ? score / filteredTokens.length : 0,
      positive,
      negative
    }
  }

  /**
   * 计算文本相似度
   * @param {string} text1 - 第一个文本
   * @param {string} text2 - 第二个文本
   * @returns {number} - 相似度分数 (0-1)
   */
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2 || typeof text1 !== 'string' || typeof text2 !== 'string') {
      return 0
    }
    
    const tokens1 = this.tokenizer.tokenize(text1.toLowerCase())
    const tokens2 = this.tokenizer.tokenize(text2.toLowerCase())
    
    const set1 = new Set(tokens1)
    const set2 = new Set(tokens2)
    
    // 计算Jaccard相似度
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  /**
   * 分析所有阅读笔记的主题
   * @param {Array} notes - 阅读笔记数组
   * @param {number} topTopics - 返回前N个主题
   * @returns {Array} - 主题数组
   */
  analyzeReadingThemes(notes, topTopics = 5) {
    if (!notes || notes.length === 0) {
      return []
    }
    
    const allText = notes.map(note => note.content).join(' ')
    const keywords = this.extractKeywords(allText, topTopics * 3)
    
    // 简单的主题聚类（基于关键词共现）
    const themes = []
    const usedWords = new Set()
    
    for (let i = 0; i < keywords.length && themes.length < topTopics; i++) {
      const keyword = keywords[i]
      if (usedWords.has(keyword.word)) continue
      
      // 找出相关的关键词
      const relatedKeywords = [keyword.word]
      usedWords.add(keyword.word)
      
      // 检查其他关键词是否与当前主题相关（简单的共现检查）
      for (let j = i + 1; j < keywords.length; j++) {
        const otherKeyword = keywords[j]
        if (usedWords.has(otherKeyword.word)) continue
        
        // 检查两个关键词是否在同一笔记中共同出现
        let cooccur = false
        for (const note of notes) {
          if (note.content.toLowerCase().includes(keyword.word) && 
              note.content.toLowerCase().includes(otherKeyword.word)) {
            cooccur = true
            break
          }
        }
        
        if (cooccur) {
          relatedKeywords.push(otherKeyword.word)
          usedWords.add(otherKeyword.word)
        }
      }
      
      themes.push({
        theme: relatedKeywords[0],
        keywords: relatedKeywords,
        strength: keyword.frequency
      })
    }
    
    return themes.sort((a, b) => b.strength - a.strength)
  }

  /**
   * 分析阅读习惯模式
   * @param {Array} sessions - 阅读会话数组
   * @param {Array} notes - 阅读笔记数组
   * @returns {Object} - 阅读模式分析结果
   */
  analyzeReadingPatterns(sessions, notes) {
    const patterns = {
      averageSessionLength: 0,
      preferredReadingTime: null,
      noteTakingFrequency: 0,
      keywords: [],
      themes: [],
      sentiment: {
        overall: 0,
        positiveNotes: 0,
        negativeNotes: 0,
        neutralNotes: 0
      }
    }
    
    if (sessions && sessions.length > 0) {
      let totalLength = 0
      let validSessions = 0
      
      sessions.forEach(session => {
        if (session.start_time && session.end_time) {
          const start = new Date(session.start_time)
          const end = new Date(session.end_time)
          const minutes = (end - start) / (1000 * 60)
          
          if (minutes > 0) {
            totalLength += minutes
            validSessions++
          }
        }
      })
      
      patterns.averageSessionLength = validSessions > 0 ? totalLength / validSessions : 0
      
      // 找出偏好阅读时间
      const AnalyticsEngine = require('./analyticsEngine')
      const engine = new AnalyticsEngine()
      const heatmapData = engine.generateReadingHeatmap(sessions)
      
      let maxCount = 0
      let preferredTime = null
      
      heatmapData.forEach(([day, hour, count]) => {
        if (count > maxCount) {
          maxCount = count
          preferredTime = { day, hour }
        }
      })
      
      if (preferredTime) {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        patterns.preferredReadingTime = {
          day: days[preferredTime.day],
          hour: preferredTime.hour,
          formatted: `${days[preferredTime.day]} ${preferredTime.hour}:00`
        }
      }
    }
    
    if (notes && notes.length > 0) {
      // 计算记笔记频率
      const totalSessions = sessions ? sessions.length : 0
      patterns.noteTakingFrequency = totalSessions > 0 ? notes.length / totalSessions : 0
      
      // 提取所有笔记的关键词
      const allNotesText = notes.map(note => note.content).join(' ')
      patterns.keywords = this.extractKeywords(allNotesText, 20)
      
      // 分析主题
      patterns.themes = this.analyzeReadingThemes(notes, 5)
      
      // 情感分析
      let totalSentiment = 0
      let positiveCount = 0
      let negativeCount = 0
      let neutralCount = 0
      
      notes.forEach(note => {
        const sentiment = this.analyzeSentiment(note.content)
        totalSentiment += sentiment.score
        
        if (sentiment.score > 0.1) {
          positiveCount++
        } else if (sentiment.score < -0.1) {
          negativeCount++
        } else {
          neutralCount++
        }
      })
      
      patterns.sentiment = {
        overall: notes.length > 0 ? totalSentiment / notes.length : 0,
        positiveNotes: positiveCount,
        negativeNotes: negativeCount,
        neutralNotes: neutralCount
      }
    }
    
    return patterns
  }
}

module.exports = NLPAnalyzer
