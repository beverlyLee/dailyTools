import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from './database.js';
import { recordHeartbeat, checkDeadMansSwitchTriggers } from './database.js';

const router = Router();

let currentUser = null;

function requireAuth(req, res, next) {
  if (!db.isAuthenticated() || !currentUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await db.createUser(username, password);
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (error) {
    if (error.message === 'User already exists') {
      res.status(409).json({ error: 'User already exists' });
    } else {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await db.verifyUser(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    currentUser = user;
    
    recordHeartbeat(user.id);
    checkDeadMansSwitchTriggers();

    res.json({ 
      success: true, 
      user: { id: user.id, username: user.username } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  currentUser = null;
  db.logout();
  res.json({ success: true });
});

router.get('/auth/status', (req, res) => {
  res.json({ 
    authenticated: db.isAuthenticated() && currentUser !== null,
    user: currentUser
  });
});

router.post('/heartbeat', requireAuth, (req, res) => {
  recordHeartbeat(currentUser.id);
  res.json({ success: true, timestamp: new Date().toISOString() });
});

router.get('/dead-mans-switch', requireAuth, (req, res) => {
  const config = db.getDeadMansSwitch(currentUser.id);
  if (!config) {
    return res.status(404).json({ error: 'Dead man\'s switch not configured' });
  }
  res.json({
    isEnabled: config.is_enabled === 1,
    heartbeatIntervalDays: config.heartbeat_interval_days,
    coolOffPeriodDays: config.cool_off_period_days,
    lastHeartbeat: config.last_heartbeat,
    triggerDate: config.trigger_date,
    isTriggered: config.is_triggered === 1
  });
});

router.put('/dead-mans-switch', requireAuth, (req, res) => {
  const { isEnabled, heartbeatIntervalDays, coolOffPeriodDays } = req.body;
  
  db.updateDeadMansSwitch(currentUser.id, {
    isEnabled,
    heartbeatIntervalDays,
    coolOffPeriodDays
  });
  
  res.json({ success: true });
});

router.get('/assets', requireAuth, async (req, res) => {
  try {
    const assets = await db.listAssets(currentUser.id);
    res.json(assets);
  } catch (error) {
    console.error('List assets error:', error);
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

router.get('/assets/:id', requireAuth, async (req, res) => {
  try {
    const asset = await db.getAsset(currentUser.id, req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(asset);
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ error: 'Failed to get asset' });
  }
});

router.post('/assets', requireAuth, async (req, res) => {
  try {
    const { type, title, data } = req.body;
    
    if (!type || !title || !data) {
      return res.status(400).json({ error: 'Type, title, and data are required' });
    }

    const asset = await db.createAsset(currentUser.id, {
      id: uuidv4(),
      type,
      title,
      data
    });

    res.json(asset);
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

router.put('/assets/:id', requireAuth, async (req, res) => {
  try {
    const { title, data } = req.body;
    
    await db.updateAsset(currentUser.id, req.params.id, { title, data });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

router.delete('/assets/:id', requireAuth, (req, res) => {
  try {
    const deleted = db.deleteAsset(currentUser.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;
