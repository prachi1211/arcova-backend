import { destinations } from '../data/mock-destinations.js';
import type { ConversationMessage, TripPlan } from '../types/index.js';

export function buildSystemPrompt(
  messages: ConversationMessage[],
  preferences: Record<string, unknown>,
): string {
  // Condense destination data for context
  const destSummary = destinations
    .map((d) => `${d.city}, ${d.country}: ~$${d.avgHotelPricePerNight}/night hotel, ~$${d.avgFlightPrice} flight, best ${d.bestMonths.join('/')}, tags: ${d.tags.join(', ')}`)
    .join('\n');

  const prefStr = Object.keys(preferences).length > 0
    ? `\nUser preferences: ${JSON.stringify(preferences)}`
    : '';

  return `You are Arcova's AI travel assistant. You help travellers plan trips by providing personalized recommendations.

You have knowledge of these destinations and their pricing:
${destSummary}

${prefStr}

Guidelines:
- Be conversational, friendly, and helpful
- Ask clarifying questions about budget, travel dates, interests, and group size when needed
- When you have enough information to create a trip plan, output it as a JSON code block

When outputting a trip plan, use exactly this format:
\`\`\`json
{
  "destination": "City, Country",
  "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "budget": { "total": 2000, "currency": "USD" },
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        { "time": "09:00", "title": "Activity Name", "description": "Details", "type": "activity", "estimatedCost": 50 }
      ]
    }
  ],
  "tips": ["Tip 1", "Tip 2"]
}
\`\`\`

Activity types: activity, meal, transport, accommodation.
Ensure the total of all estimatedCost values aligns with the stated budget.
Only output the JSON block when you have enough context to create a meaningful itinerary.`;
}

export function parseTripPlan(content: string): TripPlan | null {
  const match = content.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);

    // Validate required fields
    if (
      !parsed.destination ||
      !parsed.dates?.start ||
      !parsed.dates?.end ||
      !parsed.budget?.total ||
      !Array.isArray(parsed.itinerary)
    ) {
      return null;
    }

    return parsed as TripPlan;
  } catch {
    return null;
  }
}

export function extractPreferences(messages: ConversationMessage[]): Record<string, unknown> {
  const prefs: Record<string, unknown> = {};
  const userMessages = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.toLowerCase())
    .join(' ');

  // Budget tier
  if (userMessages.includes('luxury') || userMessages.includes('high-end') || userMessages.includes('5 star')) {
    prefs.budgetTier = 'luxury';
  } else if (userMessages.includes('budget') || userMessages.includes('cheap') || userMessages.includes('affordable')) {
    prefs.budgetTier = 'budget';
  } else if (userMessages.includes('mid-range') || userMessages.includes('moderate')) {
    prefs.budgetTier = 'mid-range';
  }

  // Travel style
  const styles = ['adventure', 'relaxation', 'cultural', 'romantic', 'family', 'nightlife', 'food', 'beach'];
  const matchedStyles = styles.filter((s) => userMessages.includes(s));
  if (matchedStyles.length > 0) prefs.travelStyle = matchedStyles;

  // Group size keywords
  const soloMatch = userMessages.match(/\b(solo|alone|by myself)\b/);
  const coupleMatch = userMessages.match(/\b(couple|two of us|my partner|my wife|my husband)\b/);
  const familyMatch = userMessages.match(/\b(family|kids|children)\b/);
  const groupMatch = userMessages.match(/\b(\d+)\s*(people|persons|friends|of us)\b/);

  if (groupMatch) prefs.groupSize = Number(groupMatch[1]);
  else if (familyMatch) prefs.groupSize = 4;
  else if (coupleMatch) prefs.groupSize = 2;
  else if (soloMatch) prefs.groupSize = 1;

  return prefs;
}
