const expenseController = require('../../src/controllers/expense.controller');
const db = require('../../src/config/database');
const mq = require('../../src/config/messageQueue');

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  initialize: jest.fn(),
  pool: {},
}));

jest.mock('../../src/config/messageQueue', () => ({
  connect: jest.fn(),
  publishExpenseCreated: jest.fn(),
  publishExpenseUpdated: jest.fn(),
  publishExpenseDeleted: jest.fn(),
}));

describe('ExpenseController.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts expense and publishes expense.created event', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          user_id: 99,
          category_id: 10,
          amount: '12.50',
          description: 'Coffee',
          expense_date: '2026-01-01',
          receipt_url: null,
        },
      ],
    });

    const req = {
      user: { id: 99 },
      body: { categoryId: 10, amount: 12.5, description: 'Coffee', expenseDate: '2026-01-01' },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await expenseController.create(req, res, next);

    expect(db.query).toHaveBeenCalled();
    expect(mq.publishExpenseCreated).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1, category_id: 10 }));
    expect(next).not.toHaveBeenCalled();
  });
});

