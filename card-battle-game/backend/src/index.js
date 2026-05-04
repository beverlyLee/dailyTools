const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameSocket = require('./sockets/GameSocket');

// 初始化数据库
require('./database/database');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 初始化游戏Socket
new GameSocket(io);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Card Battle Game Backend running on port ${PORT}`);
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
