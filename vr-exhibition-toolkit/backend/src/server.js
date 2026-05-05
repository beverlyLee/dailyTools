require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config/config');
const assetRoutes = require('./routes/assetRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const exhibitionRoutes = require('./routes/exhibitionRoutes');
const { errorHandler } = require('./middlewares/errorHandler');
const { logger } = require('./middlewares/logger');
const { setupSocketIO } = require('./utils/socketManager');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(logger);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: '请求过于频繁，请稍后再试'
});
app.use('/api/', apiLimiter);

app.use('/api/assets', assetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/exhibitions', exhibitionRoutes);

app.use(express.static('public'));
app.use('/uploads', express.static(config.uploadPath));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use(errorHandler);

setupSocketIO(io);

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`VR展厅后端服务已启动，端口: ${PORT}`);
  console.log(`环境: ${config.nodeEnv}`);
  console.log(`API文档: http://localhost:${PORT}/api/health`);
});

module.exports = { app, server, io };
