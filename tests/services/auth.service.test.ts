import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '../helpers/supabase-mock.js';

const { supabaseAdmin } = createSupabaseMock();

vi.mock('../../src/config/supabase.js', () => ({ supabaseAdmin }));

const { signUp, signIn, getProfile, forgotPassword, resetPassword, updateProfile } = await import(
  '../../src/services/auth.service.js'
);

beforeEach(() => vi.clearAllMocks());

const fakeProfile = {
  id: 'user-1',
  email: 'test@test.com',
  full_name: 'Test User',
  role: 'traveller',
  phone: null,
  avatar_url: null,
  company_name: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('signUp', () => {
  it('should sign up and return user + profile', async () => {
    supabaseAdmin.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com' }, session: { access_token: 'tok' } },
      error: null,
    });
    supabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: fakeProfile, error: null }),
    });

    const result = await signUp('test@test.com', 'password123', 'Test User', 'traveller');
    expect(result.user.id).toBe('user-1');
    expect(result.profile.role).toBe('traveller');
  });

  it('should throw on signup error', async () => {
    supabaseAdmin.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email taken' },
    });
    await expect(signUp('test@test.com', 'p', 'N', 'traveller')).rejects.toThrow('Email taken');
  });
});

describe('signIn', () => {
  it('should sign in and return session + profile', async () => {
    supabaseAdmin.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'test@test.com' },
        session: { access_token: 'tok', refresh_token: 'ref', expires_at: 9999 },
      },
      error: null,
    });
    supabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: fakeProfile, error: null }),
    });

    const result = await signIn('test@test.com', 'password123');
    expect(result.session.access_token).toBe('tok');
    expect(result.profile.role).toBe('traveller');
  });

  it('should throw on invalid credentials', async () => {
    supabaseAdmin.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    });
    await expect(signIn('a@b.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

describe('getProfile', () => {
  it('should return profile for valid user', async () => {
    supabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: fakeProfile, error: null }),
    });
    const result = await getProfile('user-1');
    expect(result.email).toBe('test@test.com');
  });

  it('should throw when profile not found', async () => {
    supabaseAdmin.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });
    await expect(getProfile('missing')).rejects.toThrow('Profile not found');
  });
});

describe('forgotPassword', () => {
  it('should always return a success message', async () => {
    supabaseAdmin.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    const result = await forgotPassword('test@test.com');
    expect(result.message).toContain('password reset link');
  });
});

describe('resetPassword', () => {
  it('should reset password with valid token', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    supabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ data: {}, error: null });

    const result = await resetPassword('valid-token', 'newPass123');
    expect(result.message).toContain('successfully');
  });

  it('should throw on invalid token', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'expired' },
    });
    await expect(resetPassword('bad', 'p')).rejects.toThrow('Invalid or expired reset token');
  });
});

describe('updateProfile', () => {
  it('should update and return profile', async () => {
    const updated = { ...fakeProfile, full_name: 'Updated' };
    supabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    });
    const result = await updateProfile('user-1', { full_name: 'Updated' });
    expect(result.full_name).toBe('Updated');
  });

  it('should throw on update failure', async () => {
    supabaseAdmin.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
    });
    await expect(updateProfile('user-1', {})).rejects.toThrow('Failed to update profile');
  });
});
