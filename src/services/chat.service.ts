import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import { Errors } from '../utils/errors.js';
import { buildSystemPrompt, parseTripPlan, extractPreferences } from './tripPlanner.service.js';
import type { Response } from 'express';
import type { Conversation, ConversationMessage, TripPlan } from '../types/index.js';

const geminiClient = env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(env.GEMINI_API_KEY)
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

  // All previous messages from DB
  const previousMessages: ConversationMessage[] = conversation.messages as ConversationMessage[];

  // Full message list including the new user message (used for preference extraction + saving)
  const allMessages: ConversationMessage[] = [
    ...previousMessages,
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
  ];

  // Graceful degradation — no API key configured
  if (!geminiClient) {
    const fallback = "I'm Arcova's travel assistant, but AI features aren't enabled yet. Please contact the administrator to configure the Gemini API key.";
    sendSSE(res, 'token', { content: fallback });

    const updatedMessages: ConversationMessage[] = [
      ...allMessages,
      { role: 'assistant', content: fallback, timestamp: new Date().toISOString() },
    ];
    await supabaseAdmin
      .from('conversations')
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq('id', conversation.id);

    sendSSE(res, 'done', {});
    res.end();
    return;
  }

  // Extract user preferences from conversation history
  const preferences = extractPreferences(allMessages);

  // Build system prompt with hotel context
  const systemPrompt = buildSystemPrompt(allMessages, preferences);

  try {
    const model = geminiClient.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: systemPrompt,
    });

    // Convert previous messages to Gemini history format.
    // Gemini uses 'user' and 'model' roles (not 'assistant').
    // The history excludes the current user message — that is sent via sendMessageStream.
    const history = previousMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(userMessage);

    let fullResponse = '';

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        sendSSE(res, 'token', { content: text });
      }
    }

    // Parse the full response for a structured trip plan JSON block
    const tripPlan: TripPlan | null = parseTripPlan(fullResponse);

    // Persist conversation + detected trip plan
    const updatedMessages: ConversationMessage[] = [
      ...allMessages,
      { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() },
    ];

    await supabaseAdmin
      .from('conversations')
      .update({
        messages: updatedMessages,
        preferences,
        ...(tripPlan ? { trip_plan: tripPlan } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);

    // Send trip plan as a separate SSE event so the frontend can render it
    if (tripPlan) {
      sendSSE(res, 'trip_plan', { plan: tripPlan });
    }

    sendSSE(res, 'done', {});
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      throw err;
    }
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
