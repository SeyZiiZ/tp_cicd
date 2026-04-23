const request = require('supertest');
const { createApp } = require('../src/server');

describe('API endpoints', () => {
  const fakeDb = {
    collection: () => ({
      find: () => ({ toArray: async () => [{ _id: '1', name: 'demo' }] }),
      insertOne: async (doc) => ({ insertedId: 'abc123', ...doc }),
    }),
  };

  test('GET /health sans DB renvoie 200 et db=disconnected', async () => {
    const app = createApp(null);
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('disconnected');
  });

  test('GET /api/items renvoie une liste', async () => {
    const app = createApp(fakeDb);
    const res = await request(app).get('/api/items');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0].name).toBe('demo');
  });

  test('POST /api/items sans name renvoie 400', async () => {
    const app = createApp(fakeDb);
    const res = await request(app).post('/api/items').send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/items avec name renvoie 201', async () => {
    const app = createApp(fakeDb);
    const res = await request(app).post('/api/items').send({ name: 'x' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('x');
  });

  test('GET /metrics expose les métriques Prometheus', async () => {
    const app = createApp(null);
    await request(app).get('/health');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/http_requests_total/);
  });
});
