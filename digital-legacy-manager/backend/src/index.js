import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import routes from './routes.js';
import { initDatabase, closeDatabase, checkDeadMansSwitchTriggers } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const app = express();

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({
  limit: '10mb'
}));

app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

let server = null;
let dmsCheckInterval = null;

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized successfully');

    checkDeadMansSwitchTriggers();
    dmsCheckInterval = setInterval(() => {
      checkDeadMansSwitchTriggers();
    }, 60 * 60 * 1000);

    server = app.listen(PORT, () => {
      console.log(`Digital Legacy Manager backend running on port ${PORT}`);
      console.log(`API endpoint: http://localhost:${PORT}/api`);
    });

    const gracefulShutdown = (signal) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      
      if (dmsCheckInterval) {
        clearInterval(dmsCheckInterval);
      }
      
      closeDatabase();
      
      if (server) {
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app };
