const bcrypt = require('bcryptjs');

const authController = require('../../src/controllers/auth.controller');
const db = require('../../src/config/database');
const redis = require('../../src/config/redis');

jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  initialize: jest.fn(),
  pool: {},
}));

jest.mock('../../src/config/redis', () => ({
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthController.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when email already registered', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const req = {
      body: { email: 'a@b.com', password: 'Password123!', firstName: 'A', lastName: 'B' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await authController.register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email already registered' });
    expect(next).not.toHaveBeenCalled();
  });

  it('creates user and returns 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] }) // no existing user
      .mockResolvedValueOnce({
        rows: [
          {
            id: 123,
            email: 'a@b.com',
            first_name: 'A',
            last_name: 'B',
            created_at: new Date().toISOString(),
          },
        ],
      });

    bcrypt.hash.mockResolvedValueOnce('hashed');

    const req = {
      body: { email: 'a@b.com', password: 'Password123!', firstName: 'A', lastName: 'B' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await authController.register(req, res, next);

    expect(bcrypt.hash).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User registered successfully',
      user: { id: 123, email: 'a@b.com', firstName: 'A', lastName: 'B' },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

