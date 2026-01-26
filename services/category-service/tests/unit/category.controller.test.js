const categoryController = require('../../src/controllers/category.controller');
const db = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  initialize: jest.fn(),
  pool: {},
}));

describe('CategoryController.getAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns categories for user + defaults', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 1, user_id: null, name: 'Food', is_default: true },
        { id: 2, user_id: 99, name: 'MyCat', is_default: false },
      ],
    });

    const req = { user: { id: 99 } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await categoryController.getAll(req, res, next);

    expect(db.query).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      categories: expect.arrayContaining([
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ id: 2 }),
      ]),
    });
    expect(next).not.toHaveBeenCalled();
  });
});

