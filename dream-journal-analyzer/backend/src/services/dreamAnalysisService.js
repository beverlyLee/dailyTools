const NLPService = require('./nlpService');
const TextRankService = require('./textRankService');
const DreamAnalysis = require('../models/dreamAnalysis');

const DreamAnalysisService = {
  analyzeDream: function(dreamContent, dreamId) {
    return new Promise((resolve, reject) => {
      try {
        const nlpAnalysis = NLPService.analyze(dreamContent);
        const keyPhrases = TextRankService.extractKeyPhrases(dreamContent, 5);
        
        const themes = this.generateThemes(nlpAnalysis, keyPhrases);
        const analysisText = this.generateAnalysisText(nlpAnalysis, keyPhrases);
        
        const analysisResult = {
          dream_id: dreamId,
          themes: themes,
          entities: nlpAnalysis.entities,
          emotions: nlpAnalysis.emotions,
          keywords: nlpAnalysis.keywords,
          analysis: analysisText
        };
        
        resolve(analysisResult);
      } catch (error) {
        reject(error);
      }
    });
  },

  generateThemes: function(nlpAnalysis, keyPhrases) {
    const themes = [];
    
    keyPhrases.forEach((kp, index) => {
      themes.push({
        id: index + 1,
        name: kp.phrase,
        score: kp.score,
        type: 'keyphrase'
      });
    });
    
    nlpAnalysis.entities.forEach((entity, index) => {
      themes.push({
        id: keyPhrases.length + index + 1,
        name: entity.text,
        type: entity.type
      });
    });
    
    if (nlpAnalysis.emotions.dominantEmotion !== 'neutral') {
      themes.push({
        id: themes.length + 1,
        name: nlpAnalysis.emotions.dominantEmotion,
        type: 'emotion'
      });
    }
    
    return themes;
  },

  generateAnalysisText: function(nlpAnalysis, keyPhrases) {
    let analysis = '梦境分析报告：\n\n';
    
    analysis += '1. 情感分析：\n';
    const emotionText = {
      positive: '积极的',
      negative: '消极的',
      neutral: '中性的'
    };
    analysis += `   整体情感倾向为${emotionText[nlpAnalysis.emotions.dominantEmotion]}。\n`;
    analysis += `   积极词汇：${nlpAnalysis.emotions.positive}个\n`;
    analysis += `   消极词汇：${nlpAnalysis.emotions.negative}个\n\n`;
    
    if (keyPhrases.length > 0) {
      analysis += '2. 主要主题：\n';
      keyPhrases.forEach((kp, index) => {
        analysis += `   ${index + 1}. ${kp.phrase}\n`;
      });
      analysis += '\n';
    }
    
    if (nlpAnalysis.entities.length > 0) {
      analysis += '3. 识别到的实体：\n';
      const entityTypeText = {
        person: '人物',
        place: '地点',
        date: '日期',
        value: '数值'
      };
      nlpAnalysis.entities.forEach((entity, index) => {
        analysis += `   ${index + 1}. ${entity.text} (${entityTypeText[entity.type] || entity.type})\n`;
      });
      analysis += '\n';
    }
    
    if (nlpAnalysis.keywords.length > 0) {
      analysis += '4. 高频关键词：\n';
      nlpAnalysis.keywords.forEach((kw, index) => {
        analysis += `   ${index + 1}. ${kw.word} (出现${kw.count}次)\n`;
      });
    }
    
    return analysis;
  },

  saveAnalysis: function(analysisResult) {
    return new Promise((resolve, reject) => {
      DreamAnalysis.findByDreamId(analysisResult.dream_id, (err, existingAnalysis) => {
        if (err) {
          return reject(err);
        }
        
        if (existingAnalysis) {
          DreamAnalysis.update(analysisResult.dream_id, analysisResult, (err, result) => {
            if (err) return reject(err);
            resolve({ ...analysisResult, updated: true });
          });
        } else {
          DreamAnalysis.create(analysisResult, (err, result) => {
            if (err) return reject(err);
            resolve({ ...analysisResult, id: result.id, created: true });
          });
        }
      });
    });
  }
};

module.exports = DreamAnalysisService;
