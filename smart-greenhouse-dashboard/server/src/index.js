import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import EnvironmentSimulator from './simulator.js';
import { DEVICE_CONFIG } from './config.js';

const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

const app = express();
app.use(cors());
app.use(express.json());

const simulator = new EnvironmentSimulator();

app.get('/api/state', (req, res) => {
  res.json({
    state: simulator.getState(),
    devices: simulator.getDevices(),
  });
});

app.get('/api/history', (req, res) => {
  const history = simulator.get24HourHistory();
  res.json({ history });
});

app.get('/api/alarms', (req, res) => {
  const { date } = req.query;
  const alarms = simulator.getAlarmLogs(date);
  res.json({ alarms });
});

app.post('/api/devices', (req, res) => {
  res.json({ devices: simulator.getDevices() });
});

app.post('/api/device/:key/toggle', (req, res) => {
  const { key } = req.params;
  const result = simulator.toggleDevice(key);
  res.json(result);
});

app.get('/api/config', (req, res) => {
  res.json({
    devices: Object.entries(DEVICE_CONFIG).map(([key, config]) => ({
      key,
      name: config.name,
      effect: config.effect,
    })),
  });
});

app.post('/api/test/temperature', (req, res) => {
  const { value } = req.body;
  if (typeof value === 'number') {
    const newValue = simulator.setTemperature(value);
    res.json({ success: true, temperature: newValue });
  } else {
    res.status(400).json({ success: false, error: '无效的温度值' });
  }
});

app.get('/api/alarms/export', (req, res) => {
  const { date } = req.query;
  const alarms = simulator.getAlarmLogs(date);
  
  const csvHeader = '日期,时间,类型,级别,消息,数值,阈值\n';
  const csvRows = alarms.map(alarm => 
    `${alarm.date},${alarm.time},${alarm.type},${alarm.level},${alarm.message},${alarm.value?.toFixed?.(1) || ''},${alarm.threshold || ''}`
  ).join('\n');
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="alarm_logs_${date || 'all'}.csv"`);
  res.send('\uFEFF' + csvHeader + csvRows);
});

const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
  console.log('WebSocket 客户端已连接');
  
  ws.send(JSON.stringify({
    type: 'init',
    state: simulator.getState(),
    devices: simulator.getDevices(),
  }));
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'toggle_device') {
        const result = simulator.toggleDevice(message.deviceKey);
        ws.send(JSON.stringify({
          type: 'device_update',
          ...result,
        }));
      }
      
      if (message.type === 'set_temperature') {
        const value = simulator.setTemperature(message.value);
        ws.send(JSON.stringify({
          type: 'state_update',
          state: simulator.getState(),
        }));
      }
      
      if (message.type === 'get_history') {
        ws.send(JSON.stringify({
          type: 'history',
          history: simulator.get24HourHistory(),
        }));
      }
      
    } catch (e) {
      console.error('WebSocket 消息解析错误:', e);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket 客户端已断开');
  });
});

setInterval(() => {
  const state = simulator.tick();
  const devices = simulator.getDevices();
  const alarms = simulator.checkAlarms();
  
  const broadcastData = JSON.stringify({
    type: 'state_update',
    state,
    devices,
    newAlarms: alarms,
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(broadcastData);
    }
  });
}, 3000);

setInterval(() => {
  const alarmBroadcastData = JSON.stringify({
    type: 'alarm_update',
    alarms: simulator.getAlarmLogs(),
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(alarmBroadcastData);
    }
  });
}, 10000);

app.listen(PORT, () => {
  console.log(`HTTP 服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 服务器运行在 ws://localhost:${WS_PORT}`);
});

export { app, wss, simulator };
