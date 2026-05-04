const express = require('express');
const cors = require('cors');
require('dotenv').config();

const dreamsRoutes = require('./routes/dreams');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/dreams', dreamsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log('Dream Journal Analyzer API server running on port ' + PORT);
  console.log('Health check: http://localhost:' + PORT + '/health');
  console.log('API endpoint: http://localhost:' + PORT + '/api/dreams');
});
