const express = require('express');
const router = express.Router();
const Dream = require('../models/dream');
const DreamAnalysis = require('../models/dreamAnalysis');
const DreamAnalysisService = require('../services/dreamAnalysisService');

router.get('/', (req, res) => {
  Dream.findAll((err, dreams) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(dreams);
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  Dream.findById(id, (err, dream) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!dream) {
      return res.status(404).json({ error: 'Dream not found' });
    }
    
    DreamAnalysis.findByDreamId(id, (err, analysis) => {
      if (err) {
        console.error('Error fetching analysis:', err);
      }
      res.json({
        dream,
        analysis: analysis || null
      });
    });
  });
});

router.post('/', (req, res) => {
  const { title, content, date, emotion, clarity } = req.body;
  
  if (!title || !content || !date) {
    return res.status(400).json({ error: 'Title, content, and date are required' });
  }
  
  const dream = {
    title,
    content,
    date,
    emotion: emotion || null,
    clarity: clarity || 5
  };
  
  Dream.create(dream, async (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    try {
      const analysisResult = await DreamAnalysisService.analyzeDream(content, result.id);
      await DreamAnalysisService.saveAnalysis(analysisResult);
      
      res.status(201).json({
        id: result.id,
        dream,
        analysis: analysisResult
      });
    } catch (analysisErr) {
      console.error('Analysis error:', analysisErr);
      res.status(201).json({
        id: result.id,
        dream,
        analysis: null,
        analysisError: analysisErr.message
      });
    }
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, date, emotion, clarity } = req.body;
  
  if (!title || !content || !date) {
    return res.status(400).json({ error: 'Title, content, and date are required' });
  }
  
  const dream = {
    title,
    content,
    date,
    emotion: emotion || null,
    clarity: clarity || 5
  };
  
  Dream.update(id, dream, async (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dream not found' });
    }
    
    try {
      const analysisResult = await DreamAnalysisService.analyzeDream(content, parseInt(id));
      await DreamAnalysisService.saveAnalysis(analysisResult);
      
      res.json({
        id,
        dream,
        analysis: analysisResult
      });
    } catch (analysisErr) {
      console.error('Analysis error:', analysisErr);
      res.json({
        id,
        dream,
        analysis: null,
        analysisError: analysisErr.message
      });
    }
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  DreamAnalysis.deleteByDreamId(id, (err) => {
    if (err) {
      console.error('Error deleting analysis:', err);
    }
    
    Dream.delete(id, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Dream not found' });
      }
      
      res.json({ message: 'Dream deleted successfully' });
    });
  });
});

router.post('/:id/analyze', (req, res) => {
  const { id } = req.params;
  
  Dream.findById(id, async (err, dream) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!dream) {
      return res.status(404).json({ error: 'Dream not found' });
    }
    
    try {
      const analysisResult = await DreamAnalysisService.analyzeDream(dream.content, dream.id);
      await DreamAnalysisService.saveAnalysis(analysisResult);
      
      res.json(analysisResult);
    } catch (analysisErr) {
      console.error('Analysis error:', analysisErr);
      res.status(500).json({ error: analysisErr.message });
    }
  });
});

module.exports = router;
