import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import type { Profile } from '../types/index.js';

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: 'traveller' | 'host',
) {
  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });

  if (error) throw Errors.badRequest(error.message);
  if (!data.user) throw Errors.internal('User creation failed');

  // Fetch the auto-created profile (trigger creates it on auth.users insert)
  const profile = await getProfile(data.user.id);

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      role: profile.role,
    },
    session: data.session,
    profile,
  };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) throw Errors.badRequest(error.message);
  if (!data.session) throw Errors.internal('Session creation failed');

  const profile = await getProfile(data.user.id);

  return {
    user: {
      id: data.user.id,
      email: data.user.email!,
      role: profile.role,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
    profile,
  };
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) throw Errors.notFound('Profile');
  return data as Profile;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  // Always return success to prevent email enumeration
  await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.CORS_ORIGIN ?? 'http://localhost:5173'}/auth/reset-password`,
  });
  return { message: 'If an account with that email exists, a password reset link has been sent.' };
}

export async function resetPassword(
  accessToken: string,
  newPassword: string,
): Promise<{ message: string }> {
  // Verify the token is valid
  const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(accessToken);
  if (verifyError || !user) throw Errors.badRequest('Invalid or expired reset token');

  // Update the password
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updateError) throw Errors.internal('Failed to update password');

  return { message: 'Password has been reset successfully.' };
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url' | 'company_name'>>,
): Promise<Profile> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error || !data) throw Errors.internal('Failed to update profile');
  return data as Profile;
}
