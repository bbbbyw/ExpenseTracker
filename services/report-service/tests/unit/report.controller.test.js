const reportController = require('../../src/controllers/report.controller');
const redis = require('../../src/config/redis');
const db = require('../../src/config/database');
const axios = require('axios');

jest.mock('../../src/config/redis', () => ({
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  initialize: jest.fn(),
  pool: {},
}));

jest.mock('axios');

describe('ReportController.monthly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPENSE_SERVICE_URL = 'http://expense-service:3000';
  });

  it('fetches monthly report from expense service and returns data', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { totalAmount: 100, totalExpenses: 2 } })
      .mockResolvedValueOnce({ data: { expenses: [] } })
      .mockResolvedValueOnce({ data: { categories: [] } });
    db.query.mockResolvedValueOnce({ rows: [] });

    const req = {
      user: { id: 99 },
      query: { year: '2026', month: '1' },
      headers: { authorization: 'Bearer token' },
    };
    const res = { json: jest.fn(), set: jest.fn() };
    const next = jest.fn();

    await reportController.monthly(req, res, next);

    expect(axios.get).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        totalSpent: 100,
        expenseCount: 2,
        byCategory: expect.any(Array),
        budgetExceeded: expect.any(Array),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

