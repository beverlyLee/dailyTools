import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { ColdChainThermodynamicModel } from './thermodynamicModel.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const model = new ColdChainThermodynamicModel({
  initialTemp: -2,
  ambientTemp: 30,
  refrigerationPower: 800,
  threshold: 0,
  simulationSpeed: 60
});

const PRODUCT_THRESHOLDS = {
  litchi: { name: '荔枝', threshold: 0, minTemp: -2 },
  strawberry: { name: '草莓', threshold: 2, minTemp: 0 },
  seafood: { name: '海鲜', threshold: -1, minTemp: -5 },
  meat: { name: '冷鲜肉', threshold: 4, minTemp: 0 },
  vegetable: { name: '叶菜', threshold: 8, minTemp: 2 },
  milk: { name: '乳制品', threshold: 6, minTemp: 2 }
};

app.get('/api/products', (req, res) => {
  res.json(PRODUCT_THRESHOLDS);
});

app.get('/api/status', (req, res) => {
  res.json({
    currentTemp: model.currentTemp,
    doorOpen: model.doorOpen,
    refrigerationPower: model.refrigerationPower,
    ambientTemp: model.ambientTemp,
    threshold: model.threshold,
    time: model.time,
    isAlert: model.currentTemp > model.threshold,
    totalAlertDuration: model.getTotalAlertDuration()
  });
});

app.get('/api/report', (req, res) => {
  res.json(model.getReport());
});

app.post('/api/control/door', (req, res) => {
  const { open } = req.body;
  model.setDoorOpen(open === true);
  broadcastState();
  res.json({ success: true, doorOpen: model.doorOpen });
});

app.post('/api/control/power', (req, res) => {
  const { power } = req.body;
  model.setRefrigerationPower(power);
  broadcastState();
  res.json({ success: true, refrigerationPower: model.refrigerationPower });
});

app.post('/api/control/ambient', (req, res) => {
  const { temp } = req.body;
  model.setAmbientTemp(temp);
  broadcastState();
  res.json({ success: true, ambientTemp: model.ambientTemp });
});

app.post('/api/control/product', (req, res) => {
  const { productKey } = req.body;
  const product = PRODUCT_THRESHOLDS[productKey];
  if (!product) {
    return res.status(400).json({ success: false, error: '未知产品类型' });
  }
  model.setThreshold(product.threshold);
  broadcastState();
  res.json({ success: true, threshold: product.threshold, productName: product.name });
});

app.post('/api/control/reset', (req, res) => {
  const { productKey } = req.body || {};
  let resetOptions = {};
  if (productKey && PRODUCT_THRESHOLDS[productKey]) {
    const product = PRODUCT_THRESHOLDS[productKey];
    resetOptions = {
      threshold: product.threshold,
      initialTemp: product.minTemp
    };
  }
  model.reset(resetOptions);
  broadcastState();
  res.json({ success: true, ...model.getReport() });
});

app.post('/api/handoff/sign', (req, res) => {
  const { signature, receiverName, notes } = req.body;
  const report = model.getReport();
  const handoffDoc = {
    id: 'HC-' + Date.now(),
    timestamp: new Date().toISOString(),
    receiverName: receiverName || '未命名',
    signature: signature || '',
    notes: notes || '',
    report,
    hash: generateHash(report, signature, receiverName)
  };
  res.json({ success: true, handoffDoc });
});

function generateHash(report, signature, receiverName) {
  const data = JSON.stringify({ report, signature, receiverName, ts: Date.now() });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
}

function broadcastState() {
  const state = {
    type: 'state',
    currentTemp: model.currentTemp,
    doorOpen: model.doorOpen,
    refrigerationPower: model.refrigerationPower,
    ambientTemp: model.ambientTemp,
    threshold: model.threshold,
    time: model.time,
    isAlert: model.currentTemp > model.threshold,
    totalAlertDuration: model.getTotalAlertDuration(),
    alertHistory: model.alertHistory.map(a => ({ ...a }))
  };
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(state));
    }
  });
}

function broadcastTick(record) {
  const data = {
    type: 'tick',
    record
  };
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.send(JSON.stringify({
    type: 'init',
    history: model.temperatureHistory,
    state: {
      currentTemp: model.currentTemp,
      doorOpen: model.doorOpen,
      refrigerationPower: model.refrigerationPower,
      ambientTemp: model.ambientTemp,
      threshold: model.threshold,
      time: model.time,
      isAlert: model.currentTemp > model.threshold,
      totalAlertDuration: model.getTotalAlertDuration()
    },
    products: PRODUCT_THRESHOLDS
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      switch (data.action) {
        case 'door':
          model.setDoorOpen(data.open === true);
          broadcastState();
          break;
        case 'power':
          model.setRefrigerationPower(data.power);
          broadcastState();
          break;
        case 'product':
          if (PRODUCT_THRESHOLDS[data.productKey]) {
            model.setThreshold(PRODUCT_THRESHOLDS[data.productKey].threshold);
            broadcastState();
          }
          break;
        case 'reset':
          model.reset();
          broadcastState();
          break;
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

const TICK_INTERVAL = 1000;
const SIMULATION_DT = 60;

setInterval(() => {
  const record = model.step(SIMULATION_DT);
  broadcastTick(record);
  if (record.isAlert) {
    broadcastState();
  }
}, TICK_INTERVAL);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`冷链温度监测服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 服务器就绪`);
});
