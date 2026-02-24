import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';
import { testUsers, mockAuthMiddleware } from '../helpers/auth-mock.js';

// Mock auth middleware
vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: mockAuthMiddleware(testUsers.traveller),
}));

// Mock service layer
vi.mock('../../src/services/auth.service.js', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  getProfile: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  updateProfile: vi.fn(),
}));

const authService = await import('../../src/services/auth.service.js');
const authRoutes = (await import('../../src/routes/auth.routes.js')).default;

const app = createTestApp();
app.use('/api/auth', authRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

describe('POST /api/auth/signup', () => {
  it('should return 201 with user and profile', async () => {
    const mockResult = { user: { id: 'u-1', email: 'test@test.com', role: 'traveller' }, session: {}, profile: {} };
    (authService.signUp as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com', password: 'pass123', full_name: 'Test User', role: 'traveller' });

    expect(res.status).toBe(201);
    expect(res.body.user.id).toBe('u-1');
  });

  it('should return 400 for missing email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ password: 'pass123', full_name: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for short password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com', password: 'ab', full_name: 'Test' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('should return 200 with session', async () => {
    const mockResult = { user: { id: 'u-1' }, session: { access_token: 'tok' }, profile: {} };
    (authService.signIn as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'pass123' });

    expect(res.status).toBe(200);
    expect(res.body.session.access_token).toBe('tok');
  });

  it('should return 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'pass123' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('should return profile for authenticated user', async () => {
    (authService.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'trav-001', email: 'test@test.com', role: 'traveller' });

    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('trav-001');
  });
});

describe('PUT /api/auth/profile', () => {
  it('should update and return profile', async () => {
    (authService.updateProfile as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'trav-001', full_name: 'Updated' });

    const res = await request(app)
      .put('/api/auth/profile')
      .send({ full_name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe('Updated');
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('should return success message', async () => {
    (authService.forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValue({ message: 'Link sent' });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });
});

describe('POST /api/auth/reset-password', () => {
  it('should return 200 on valid reset', async () => {
    (authService.resetPassword as ReturnType<typeof vi.fn>).mockResolvedValue({ message: 'Success' });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ access_token: 'tok', new_password: 'newpass123', confirm_password: 'newpass123' });

    expect(res.status).toBe(200);
  });

  it('should return 400 when passwords do not match', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ access_token: 'tok', new_password: 'newpass123', confirm_password: 'mismatch' });

    expect(res.status).toBe(400);
  });
});
