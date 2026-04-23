const express = require('express');
const { connect, ping, close } = require('./db');
const { register, metricsMiddleware } = require('./metrics');

const PORT = process.env.PORT || 3000;

function createApp(dbRef) {
  const app = express();
  app.use(express.json());
  app.use(metricsMiddleware);

  app.get('/health', async (req, res) => {
    const dbOk = dbRef ? await ping() : false;
    res.status(200).json({
      status: 'ok',
      db: dbOk ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    });
  });

  app.get('/api/items', async (req, res) => {
    if (!dbRef) return res.json({ items: [] });
    const items = await dbRef.collection('items').find().toArray();
    res.json({ items });
  });

  app.post('/api/items', async (req, res) => {
    if (!dbRef) return res.status(503).json({ error: 'db unavailable' });
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = await dbRef.collection('items').insertOne({ name, createdAt: new Date() });
    res.status(201).json({ id: result.insertedId, name });
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  return app;
}

async function start() {
  let db = null;
  try {
    db = await connect();
    console.log('MongoDB connecté');
  } catch (err) {
    console.error('MongoDB indisponible au démarrage:', err.message);
  }
  const app = createApp(db);
  const server = app.listen(PORT, () => {
    console.log(`API à l'écoute sur :${PORT}`);
  });

  const shutdown = async () => {
    console.log('Arrêt en cours...');
    server.close(async () => {
      await close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  start();
}

module.exports = { createApp };
