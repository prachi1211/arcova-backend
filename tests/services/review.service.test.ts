import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('../../src/config/supabase.js', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const { createReview, getPropertyReviews, getReview, updateReview, deleteReview, addHostResponse } = await import(
  '../../src/services/review.service.js'
);

beforeEach(() => vi.clearAllMocks());

function chain(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const obj: Record<string, any> = {};
  ['select', 'eq', 'insert', 'update', 'delete', 'order', 'range', 'single'].forEach((m) => {
    obj[m] = vi.fn().mockReturnValue(obj);
  });
  obj.single = vi.fn().mockResolvedValue({ data: result.data, error: result.error ?? null });
  obj.then = (resolve: Function) => resolve({ data: result.data, error: result.error ?? null, count: result.count ?? null });
  return obj;
}

const fakeReview = { id: 'rev-1', booking_id: 'b-1', traveller_id: 'trav-1', property_id: 'p-1', rating: 5, comment: 'Great!', host_response: null };

describe('createReview', () => {
  it('should create a review for a completed booking', async () => {
    let reviewCallIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bookings') return chain({ data: { id: 'b-1', traveller_id: 'trav-1', property_id: 'p-1', status: 'completed' } });
      if (table === 'reviews') {
        reviewCallIdx++;
        if (reviewCallIdx === 1) {
          // Check for existing review — not found
          return chain({ data: null, error: { code: 'PGRST116' } });
        }
        // Insert new review
        return chain({ data: fakeReview });
      }
      return chain({ data: null });
    });

    const result = await createReview({ booking_id: 'b-1', rating: 5, comment: 'Great!' }, 'trav-1');
    expect(result.rating).toBe(5);
  });

  it('should throw when booking not found', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'not found' } }));
    await expect(createReview({ booking_id: 'b-x', rating: 5 }, 'trav-1')).rejects.toThrow('Booking not found');
  });

  it('should throw when booking is not completed', async () => {
    mockFrom.mockReturnValue(chain({ data: { id: 'b-1', traveller_id: 'trav-1', property_id: 'p-1', status: 'confirmed' } }));
    await expect(createReview({ booking_id: 'b-1', rating: 5 }, 'trav-1')).rejects.toThrow('Only completed bookings can be reviewed');
  });

  it('should throw forbidden when traveller does not own booking', async () => {
    mockFrom.mockReturnValue(chain({ data: { id: 'b-1', traveller_id: 'other-trav', property_id: 'p-1', status: 'completed' } }));
    await expect(createReview({ booking_id: 'b-1', rating: 5 }, 'trav-1')).rejects.toThrow('Insufficient permissions');
  });

  it('should throw conflict when review already exists', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      callIdx++;
      if (table === 'bookings') return chain({ data: { id: 'b-1', traveller_id: 'trav-1', property_id: 'p-1', status: 'completed' } });
      return chain({ data: { id: 'existing-review' } }); // existing review found
    });

    await expect(createReview({ booking_id: 'b-1', rating: 5 }, 'trav-1')).rejects.toThrow('A review already exists');
  });
});

describe('getPropertyReviews', () => {
  it('should return paginated reviews', async () => {
    mockFrom.mockReturnValue(chain({ data: [fakeReview], count: 1 }));
    const result = await getPropertyReviews('p-1', { page: 0, limit: 20 });
    expect(result.results).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });
});

describe('getReview', () => {
  it('should return a single review', async () => {
    mockFrom.mockReturnValue(chain({ data: fakeReview }));
    const result = await getReview('rev-1');
    expect(result.rating).toBe(5);
  });

  it('should throw not found', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'not found' } }));
    await expect(getReview('rev-x')).rejects.toThrow('Review not found');
  });
});

describe('updateReview', () => {
  it('should update review owned by traveller', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { ...fakeReview, traveller_id: 'trav-1' } }); // fetch
      return chain({ data: { ...fakeReview, rating: 4 } }); // update
    });

    const result = await updateReview('rev-1', 'trav-1', { rating: 4 });
    expect(result.rating).toBe(4);
  });

  it('should throw forbidden when not owner', async () => {
    mockFrom.mockReturnValue(chain({ data: { ...fakeReview, traveller_id: 'other' } }));
    await expect(updateReview('rev-1', 'trav-1', { rating: 4 })).rejects.toThrow('Insufficient permissions');
  });
});

describe('deleteReview', () => {
  it('should delete review owned by traveller', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { id: 'rev-1', traveller_id: 'trav-1' } }); // fetch
      const c = chain({ data: null });
      c.then = (resolve: Function) => resolve({ error: null });
      return c;
    });

    await expect(deleteReview('rev-1', 'trav-1')).resolves.toBeUndefined();
  });

  it('should throw when review not found', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'not found' } }));
    await expect(deleteReview('rev-x', 'trav-1')).rejects.toThrow('Review not found');
  });
});

describe('addHostResponse', () => {
  it('should add host response to review', async () => {
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ data: { ...fakeReview, properties: { host_id: 'host-1' } } }); // fetch with join
      return chain({ data: { ...fakeReview, host_response: 'Thank you!' } }); // update
    });

    const result = await addHostResponse('rev-1', 'host-1', 'Thank you!');
    expect(result.host_response).toBe('Thank you!');
  });

  it('should throw forbidden when host does not own property', async () => {
    mockFrom.mockReturnValue(chain({ data: { ...fakeReview, properties: { host_id: 'other-host' } } }));
    await expect(addHostResponse('rev-1', 'host-1', 'Thanks')).rejects.toThrow('Insufficient permissions');
  });
});
