const request = require('supertest');
const { app } = require('../../src/index');

describe('expense-service /health', () => {
  it('returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'healthy', service: 'expense-service' });
  });
});

