import { generateMockHotels } from '../data/mock-hotels.js';
import { destinations } from '../data/mock-destinations.js';
import type { ConversationMessage, TripPlan } from '../types/index.js';

export function buildSystemPrompt(
  messages: ConversationMessage[],
  preferences: Record<string, unknown>,
): string {
  // Group platform hotels by city for readable context injection
  const hotels = generateMockHotels();
  const hotelsByCity: Record<string, typeof hotels> = {};
  for (const h of hotels) {
    const key = `${h.city}, ${h.country}`;
    if (!hotelsByCity[key]) hotelsByCity[key] = [];
    hotelsByCity[key].push(h);
  }

  const hotelContext = Object.entries(hotelsByCity)
    .map(([city, cityHotels]) => {
      const list = cityHotels
        .map(
          (h) =>
            `  • [ID:${h.id}] ${h.name} — ${h.starRating}★ — $${h.pricePerNight.amount}/night` +
            ` | ${h.amenities.slice(0, 5).join(', ')} | Cancellation: ${h.cancellationPolicy}`,
        )
        .join('\n');
      return `${city}:\n${list}`;
    })
    .join('\n\n');

  // Top destination pricing reference (capped for prompt size)
  const destContext = destinations
    .slice(0, 25)
    .map(
      (d) =>
        `${d.city}, ${d.country}: ~$${d.avgHotelPricePerNight}/night hotel | flights ~$${d.avgFlightPrice} | best months: ${d.bestMonths.join(', ')} | vibe: ${d.tags.join(', ')}`,
    )
    .join('\n');

  const prefStr =
    Object.keys(preferences).length > 0
      ? `\nDetected preferences so far: ${JSON.stringify(preferences)}`
      : '';

  return `You are Arcova's AI travel concierge — warm, knowledgeable, and specific. You help travellers plan dream trips and book directly on the Arcova platform.

## Bookable Hotels on Arcova
Always recommend from this list when the destination matches. Use the exact hotel ID in the trip plan JSON.

${hotelContext}

## Destination Reference (pricing & best times)
${destContext}
${prefStr}

## How to Behave
- **Gather first, plan second.** If you don't know the destination, dates, budget, or group size, ask — but only 1–2 questions at a time. Never fire a list of 5 questions.
- **Be specific.** Name real neighbourhoods, local dishes, transit options, real prices. Avoid vague phrases like "there are many great options".
- **Recommend Arcova hotels by name.** When the destination matches a hotel in the list above, mention it naturally: "For Paris, Arcova has Le Grand Paris Hotel (5★, $320/night) — it has a spa and is centrally located."
- **Markdown formatting.** Use **bold** for day headers, bullet points for lists. Keep responses focused — no walls of text.
- **Tone.** Friendly and confident, like a well-travelled friend giving honest advice.

## When to Output a Trip Plan
Only generate the JSON block when you have ALL of:
1. Clear destination
2. Travel dates or trip duration
3. Budget range or tier (budget / mid-range / luxury)

Output the plan as a fenced JSON block with this exact structure:
\`\`\`json
{
  "destination": "City, Country",
  "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "budget": { "total": 2000, "currency": "USD" },
  "suggestedHotelId": "mock-X",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity Name",
          "description": "Brief detail",
          "type": "activity",
          "estimatedCost": 50
        }
      ]
    }
  ],
  "tips": ["Practical tip 1", "Practical tip 2", "Practical tip 3"]
}
\`\`\`

Activity types: activity | meal | transport | accommodation
The sum of all estimatedCost values must fit within the stated total budget.
Only output the JSON block once. Do not repeat it in subsequent messages.`;
}

export function parseTripPlan(content: string): TripPlan | null {
  const match = content.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);

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
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.toLowerCase())
    .join(' ');

  // Budget tier
  if (userText.match(/\b(luxury|high.end|5.?star|splurge)\b/)) {
    prefs.budgetTier = 'luxury';
  } else if (userText.match(/\b(budget|cheap|affordable|backpack|hostel)\b/)) {
    prefs.budgetTier = 'budget';
  } else if (userText.match(/\b(mid.range|moderate|comfortable)\b/)) {
    prefs.budgetTier = 'mid-range';
  }

  // Travel style
  const styles = ['adventure', 'relaxation', 'cultural', 'romantic', 'family', 'nightlife', 'food', 'beach', 'ski', 'nature'];
  const matched = styles.filter((s) => userText.includes(s));
  if (matched.length > 0) prefs.travelStyle = matched;

  // Group size
  const groupMatch = userText.match(/\b(\d+)\s*(people|persons|friends|of us|adults)\b/);
  const soloMatch = userText.match(/\b(solo|alone|by myself|just me)\b/);
  const coupleMatch = userText.match(/\b(couple|two of us|my partner|my wife|my husband|honeymoon)\b/);
  const familyMatch = userText.match(/\b(family|kids|children)\b/);

  if (groupMatch) prefs.groupSize = Number(groupMatch[1]);
  else if (familyMatch) prefs.groupSize = 4;
  else if (coupleMatch) prefs.groupSize = 2;
  else if (soloMatch) prefs.groupSize = 1;

  // Budget amount extraction
  const budgetMatch = userText.match(/\$\s?(\d[\d,]*)\s*(k\b)?/);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1].replace(',', ''), 10) * (budgetMatch[2] ? 1000 : 1);
    prefs.budgetUSD = amount;
  }

  return prefs;
}
