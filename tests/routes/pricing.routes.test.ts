import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, attachErrorHandler } from '../helpers/test-app.js';
import { testUsers, mockAuthMiddleware } from '../helpers/auth-mock.js';

vi.mock('../../src/middleware/auth.js', () => ({
  authMiddleware: mockAuthMiddleware(testUsers.host),
}));

vi.mock('../../src/services/pricing.service.js', () => ({
  listRules: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  deleteRule: vi.fn(),
  previewRates: vi.fn(),
}));

const pricingService = await import('../../src/services/pricing.service.js');
const pricingRoutes = (await import('../../src/routes/pricing.routes.js')).default;

const app = createTestApp();
app.use('/api/pricing', pricingRoutes);
attachErrorHandler(app);

beforeEach(() => vi.clearAllMocks());

const fakeRule = { id: 'rule-1', room_type_id: 'rt-1', name: 'Weekend', rule_type: 'weekend', adjustment_type: 'percentage', adjustment_value: 20 };

describe('GET /api/pricing/rules', () => {
  it('should return rules for a room type', async () => {
    (pricingService.listRules as ReturnType<typeof vi.fn>).mockResolvedValue([fakeRule]);

    const res = await request(app).get('/api/pricing/rules?roomTypeId=550e8400-e29b-41d4-a716-446655440000');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/pricing/rules', () => {
  it('should create a pricing rule', async () => {
    (pricingService.createRule as ReturnType<typeof vi.fn>).mockResolvedValue(fakeRule);

    const res = await request(app)
      .post('/api/pricing/rules')
      .send({
        room_type_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Weekend',
        rule_type: 'weekend',
        adjustment_type: 'percentage',
        adjustment_value: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Weekend');
  });
});

describe('PUT /api/pricing/rules/:id', () => {
  it('should update a pricing rule', async () => {
    (pricingService.updateRule as ReturnType<typeof vi.fn>).mockResolvedValue({ ...fakeRule, adjustment_value: 25 });

    const res = await request(app)
      .put('/api/pricing/rules/rule-1')
      .send({ adjustment_value: 25 });

    expect(res.status).toBe(200);
    expect(res.body.adjustment_value).toBe(25);
  });
});

describe('DELETE /api/pricing/rules/:id', () => {
  it('should delete a pricing rule', async () => {
    (pricingService.deleteRule as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app).delete('/api/pricing/rules/rule-1');
    expect(res.status).toBe(204);
  });
});

describe('POST /api/pricing/preview', () => {
  it('should return rate preview for date range', async () => {
    const preview = [{ date: '2026-03-15', basePrice: 10000, effectivePrice: 12000, appliedRules: [] }];
    (pricingService.previewRates as ReturnType<typeof vi.fn>).mockResolvedValue(preview);

    const res = await request(app)
      .post('/api/pricing/preview')
      .send({
        room_type_id: '550e8400-e29b-41d4-a716-446655440000',
        start_date: '2026-03-15',
        end_date: '2026-03-17',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
