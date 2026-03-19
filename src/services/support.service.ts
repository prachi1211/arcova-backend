import { supabaseAdmin } from '../config/supabase.js';
import { Errors } from '../utils/errors.js';
import type {
  SupportTicket,
  SupportTicketStatus,
  CreateSupportTicketInput,
  PaginatedResponse,
} from '../types/index.js';

export async function createTicket(
  input: CreateSupportTicketInput,
  userId: string,
  userRole: 'traveller' | 'host',
): Promise<SupportTicket> {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      user_id: userId,
      user_role: userRole,
      subject: input.subject,
      message: input.message,
      priority: input.priority ?? 'medium',
      status: 'open',
    })
    .select()
    .single();

  if (error || !data) throw Errors.internal(error?.message ?? 'Failed to create support ticket');
  return data as SupportTicket;
}

export async function getMyTickets(
  userId: string,
  params: { page: number; limit: number },
): Promise<PaginatedResponse<SupportTicket>> {
  const { data, count, error } = await supabaseAdmin
    .from('support_tickets')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  if (error) throw Errors.internal(error.message);

  return {
    results: (data ?? []) as SupportTicket[],
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function getAllTickets(params: {
  status?: SupportTicketStatus;
  page: number;
  limit: number;
}): Promise<PaginatedResponse<SupportTicket>> {
  let query = supabaseAdmin
    .from('support_tickets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (params.status) {
    query = query.eq('status', params.status);
  }

  query = query.range(params.page * params.limit, (params.page + 1) * params.limit - 1);

  const { data, count, error } = await query;
  if (error) throw Errors.internal(error.message);

  return {
    results: (data ?? []) as SupportTicket[],
    totalCount: count ?? 0,
    page: params.page,
    pageSize: params.limit,
    hasNextPage: (params.page + 1) * params.limit < (count ?? 0),
  };
}

export async function updateTicket(
  ticketId: string,
  updates: { status?: SupportTicketStatus; admin_notes?: string; priority?: string },
): Promise<SupportTicket> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) {
    patch.status = updates.status;
    if (updates.status === 'resolved' || updates.status === 'closed') {
      patch.resolved_at = new Date().toISOString();
    }
  }
  if (updates.admin_notes !== undefined) patch.admin_notes = updates.admin_notes;
  if (updates.priority !== undefined) patch.priority = updates.priority;

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .update(patch)
    .eq('id', ticketId)
    .select()
    .single();

  if (error || !data) throw Errors.internal(error?.message ?? 'Failed to update ticket');
  return data as SupportTicket;
}
