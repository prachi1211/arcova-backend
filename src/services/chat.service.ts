import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Errors } from '../utils/errors.js';
import { buildSystemPrompt, parseTripPlan, extractPreferences } from './tripPlanner.service.js';
import type { Response } from 'express';
import type { Conversation, ConversationMessage, TripPlan } from '../types/index.js';

const anthropicClient = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

function sendSSE(res: Response, type: string, data: unknown) {
  res.write(`data: ${JSON.stringify({ type, ...((typeof data === 'object' && data !== null) ? data : { content: data }) })}\n\n`);
}

export async function createConversation(
  travellerId: string,
): Promise<{ sessionId: string; conversationId: string }> {
  const sessionId = uuidv4();

  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      session_id: sessionId,
      traveller_id: travellerId,
      messages: [],
      preferences: {},
      trip_plan: null,
      suggested_flights: [],
      suggested_hotels: [],
      suggested_places: [],
    })
    .select('id')
    .single();

  if (error || !data) throw Errors.internal(error?.message ?? 'Failed to create conversation');

  return { sessionId, conversationId: data.id };
}

export async function sendMessage(
  sessionId: string,
  userMessage: string,
  travellerId: string,
  res: Response,
): Promise<void> {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Fetch conversation
  const { data: conversation, error: convError } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('traveller_id', travellerId)
    .single();

  if (convError || !conversation) {
    sendSSE(res, 'error', { content: 'Conversation not found' });
    sendSSE(res, 'done', {});
    res.end();
    return;
  }

  // Append user message
  const messages: ConversationMessage[] = [
    ...(conversation.messages as ConversationMessage[]),
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
  ];

  // Graceful degradation if no API key
  if (!anthropicClient) {
    const fallback = "I'm Arcova's travel assistant. AI features require an Anthropic API key to be configured. Please contact the administrator to enable AI-powered trip planning.";
    sendSSE(res, 'token', { content: fallback });

    const updatedMessages: ConversationMessage[] = [
      ...messages,
      { role: 'assistant', content: fallback, timestamp: new Date().toISOString() },
    ];
    const { error: saveError } = await supabaseAdmin
      .from('conversations')
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq('id', conversation.id);

    if (saveError) console.error('Failed to save conversation:', saveError.message);

    sendSSE(res, 'done', {});
    res.end();
    return;
  }

  // Extract preferences from conversation history
  const preferences = extractPreferences(messages);

  // Build system prompt
  const systemPrompt = buildSystemPrompt(messages, preferences);

  // Build Claude messages (only user/assistant, not system)
  const claudeMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  try {
    // Stream response from Claude
    let fullResponse = '';

    const stream = anthropicClient.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: claudeMessages,
    });

    stream.on('text', (text) => {
      fullResponse += text;
      sendSSE(res, 'token', { content: text });
    });

    await stream.finalMessage();

    // Parse for trip plan
    const tripPlan: TripPlan | null = parseTripPlan(fullResponse);

    // Save conversation + trip plan
    const updatedMessages: ConversationMessage[] = [
      ...messages,
      { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
    ];

    const { error: updateError } = await supabaseAdmin
      .from('conversations')
      .update({
        messages: updatedMessages,
        preferences,
        ...(tripPlan ? { trip_plan: tripPlan } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);

    if (updateError) console.error('Failed to save conversation:', updateError.message);

    // Send trip plan event if found
    if (tripPlan) {
      sendSSE(res, 'trip_plan', { plan: tripPlan });
    }

    sendSSE(res, 'done', {});
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      throw err;
    }
    // Headers already sent — send error via SSE
    const message = err instanceof Error ? err.message : 'Stream error';
    sendSSE(res, 'error', { content: message });
    sendSSE(res, 'done', {});
    res.end();
  }
}

export async function getHistory(
  sessionId: string,
  travellerId: string,
): Promise<Conversation> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .eq('traveller_id', travellerId)
    .single();

  if (error || !data) throw Errors.notFound('Conversation');
  return data as Conversation;
}

export async function getTripPlan(
  sessionId: string,
  travellerId: string,
): Promise<TripPlan | null> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('trip_plan')
    .eq('session_id', sessionId)
    .eq('traveller_id', travellerId)
    .single();

  if (error || !data) throw Errors.notFound('Conversation');
  return (data.trip_plan as TripPlan) ?? null;
}
