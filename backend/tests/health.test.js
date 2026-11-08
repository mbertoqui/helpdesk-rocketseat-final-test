const request = require('supertest');
const app = require('../src/server');

describe('Health endpoint', () => {
  it('should return status OK when the API is available', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('environment');
  });
});
