import type { FlightSearchResult } from '../types/index.js';

interface RouteTemplate {
  origin: string;
  destination: string;
  airlines: { name: string; code: string }[];
  basePriceEconomy: number;
  basePriceBusiness: number;
  durationMinutes: number;
  stops: number;
}

const routeTemplates: RouteTemplate[] = [
  { origin: 'JFK', destination: 'LHR', airlines: [{ name: 'British Airways', code: 'BA' }, { name: 'Delta', code: 'DL' }], basePriceEconomy: 450, basePriceBusiness: 2800, durationMinutes: 420, stops: 0 },
  { origin: 'JFK', destination: 'CDG', airlines: [{ name: 'Air France', code: 'AF' }, { name: 'Delta', code: 'DL' }], basePriceEconomy: 480, basePriceBusiness: 3000, durationMinutes: 450, stops: 0 },
  { origin: 'LAX', destination: 'NRT', airlines: [{ name: 'Japan Airlines', code: 'JL' }, { name: 'United', code: 'UA' }], basePriceEconomy: 650, basePriceBusiness: 3500, durationMinutes: 660, stops: 0 },
  { origin: 'LAX', destination: 'SYD', airlines: [{ name: 'Qantas', code: 'QF' }, { name: 'United', code: 'UA' }], basePriceEconomy: 900, basePriceBusiness: 5000, durationMinutes: 900, stops: 1 },
  { origin: 'SFO', destination: 'CDG', airlines: [{ name: 'Air France', code: 'AF' }, { name: 'United', code: 'UA' }], basePriceEconomy: 520, basePriceBusiness: 3200, durationMinutes: 630, stops: 0 },
  { origin: 'SFO', destination: 'HKG', airlines: [{ name: 'Cathay Pacific', code: 'CX' }, { name: 'United', code: 'UA' }], basePriceEconomy: 600, basePriceBusiness: 3400, durationMinutes: 750, stops: 0 },
  { origin: 'LHR', destination: 'DXB', airlines: [{ name: 'Emirates', code: 'EK' }, { name: 'British Airways', code: 'BA' }], basePriceEconomy: 380, basePriceBusiness: 2200, durationMinutes: 420, stops: 0 },
  { origin: 'LHR', destination: 'BKK', airlines: [{ name: 'Thai Airways', code: 'TG' }, { name: 'British Airways', code: 'BA' }], basePriceEconomy: 500, basePriceBusiness: 3000, durationMinutes: 660, stops: 0 },
  { origin: 'LHR', destination: 'SIN', airlines: [{ name: 'Singapore Airlines', code: 'SQ' }, { name: 'British Airways', code: 'BA' }], basePriceEconomy: 550, basePriceBusiness: 3500, durationMinutes: 720, stops: 0 },
  { origin: 'DXB', destination: 'BKK', airlines: [{ name: 'Emirates', code: 'EK' }, { name: 'Thai Airways', code: 'TG' }], basePriceEconomy: 350, basePriceBusiness: 2000, durationMinutes: 390, stops: 0 },
  { origin: 'DXB', destination: 'DPS', airlines: [{ name: 'Emirates', code: 'EK' }], basePriceEconomy: 420, basePriceBusiness: 2400, durationMinutes: 510, stops: 0 },
  { origin: 'JFK', destination: 'BCN', airlines: [{ name: 'Delta', code: 'DL' }, { name: 'Iberia', code: 'IB' }], basePriceEconomy: 440, basePriceBusiness: 2700, durationMinutes: 480, stops: 0 },
  { origin: 'JFK', destination: 'FCO', airlines: [{ name: 'Alitalia', code: 'AZ' }, { name: 'Delta', code: 'DL' }], basePriceEconomy: 460, basePriceBusiness: 2900, durationMinutes: 540, stops: 0 },
  { origin: 'LAX', destination: 'LHR', airlines: [{ name: 'British Airways', code: 'BA' }, { name: 'Virgin Atlantic', code: 'VS' }], basePriceEconomy: 500, basePriceBusiness: 3200, durationMinutes: 600, stops: 0 },
  { origin: 'CDG', destination: 'NRT', airlines: [{ name: 'Air France', code: 'AF' }, { name: 'Japan Airlines', code: 'JL' }], basePriceEconomy: 580, basePriceBusiness: 3300, durationMinutes: 720, stops: 0 },
  { origin: 'SIN', destination: 'SYD', airlines: [{ name: 'Singapore Airlines', code: 'SQ' }, { name: 'Qantas', code: 'QF' }], basePriceEconomy: 350, basePriceBusiness: 1800, durationMinutes: 480, stops: 0 },
  { origin: 'JFK', destination: 'CUN', airlines: [{ name: 'JetBlue', code: 'B6' }, { name: 'Delta', code: 'DL' }], basePriceEconomy: 280, basePriceBusiness: 1400, durationMinutes: 240, stops: 0 },
  { origin: 'LAX', destination: 'HNL', airlines: [{ name: 'Hawaiian Airlines', code: 'HA' }, { name: 'United', code: 'UA' }], basePriceEconomy: 250, basePriceBusiness: 1200, durationMinutes: 330, stops: 0 },
  { origin: 'LHR', destination: 'CPT', airlines: [{ name: 'British Airways', code: 'BA' }, { name: 'South African Airways', code: 'SA' }], basePriceEconomy: 600, basePriceBusiness: 3000, durationMinutes: 690, stops: 0 },
  { origin: 'SFO', destination: 'ICN', airlines: [{ name: 'Korean Air', code: 'KE' }, { name: 'United', code: 'UA' }], basePriceEconomy: 580, basePriceBusiness: 3200, durationMinutes: 690, stops: 0 },
  { origin: 'JFK', destination: 'DXB', airlines: [{ name: 'Emirates', code: 'EK' }], basePriceEconomy: 550, basePriceBusiness: 3500, durationMinutes: 780, stops: 0 },
  { origin: 'MIA', destination: 'GRU', airlines: [{ name: 'LATAM', code: 'LA' }, { name: 'American Airlines', code: 'AA' }], basePriceEconomy: 500, basePriceBusiness: 2800, durationMinutes: 540, stops: 0 },
];

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

// Seeded random for deterministic price variation by date
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildFlights(
  templates: RouteTemplate[],
  dateStr: string,
  cabin: string | undefined,
  idOffset: number,
  idPrefix: string,
): FlightSearchResult[] {
  const dateSeed = dateStr.split('-').reduce((acc, v) => acc + Number(v), 0);
  const flights: FlightSearchResult[] = [];
  let idCounter = idOffset;

  for (const route of templates) {
    for (const airline of route.airlines) {
      const cabins = cabin ? [cabin] : ['economy', 'business'];

      for (const c of cabins) {
        const basePrice = c === 'business' ? route.basePriceBusiness : route.basePriceEconomy;
        const variation = 1 + (seededRandom(dateSeed + idCounter) - 0.5) * 0.4;
        const price = Math.round(basePrice * variation);

        const durationVariation = 1 + (seededRandom(dateSeed + idCounter + 100) - 0.5) * 0.2;
        const duration = Math.round(route.durationMinutes * durationVariation);

        const depHour = 6 + Math.floor(seededRandom(dateSeed + idCounter + 200) * 16);
        const depMin = Math.floor(seededRandom(dateSeed + idCounter + 300) * 4) * 15;
        const departure = `${dateStr}T${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}:00`;

        const arrivalMs = new Date(departure).getTime() + duration * 60 * 1000;
        const arrival = new Date(arrivalMs).toISOString().replace('.000Z', '');

        const flightNum = `${airline.code}${100 + Math.floor(seededRandom(dateSeed + idCounter + 400) * 900)}`;
        const seats = 2 + Math.floor(seededRandom(dateSeed + idCounter + 500) * 30);

        flights.push({
          id: `${idPrefix}-${idCounter}`,
          airline: airline.name,
          flightNumber: flightNum,
          origin: route.origin,
          destination: route.destination,
          departureTime: departure,
          arrivalTime: arrival,
          duration: formatDuration(duration),
          stops: route.stops,
          price: { amount: price, currency: 'USD' },
          cabinClass: c,
          seatsAvailable: seats,
        });

        idCounter++;
      }
    }
  }

  return flights;
}

export function generateMockFlights(params?: {
  origin?: string;
  dest?: string;
  date?: string;
  returnDate?: string;
  pax?: number;
  cabin?: string;
}): FlightSearchResult[] {
  const dateStr = params?.date ?? new Date(Date.now() + 86400000).toISOString().split('T')[0];

  let outboundTemplates = [...routeTemplates];
  if (params?.origin) {
    const o = params.origin.toUpperCase();
    outboundTemplates = outboundTemplates.filter((t) => t.origin === o);
  }
  if (params?.dest) {
    const d = params.dest.toUpperCase();
    outboundTemplates = outboundTemplates.filter((t) => t.destination === d);
  }

  let flights = buildFlights(outboundTemplates, dateStr, params?.cabin, 1, 'mock-fl');

  // If round-trip, append return legs (reversed origin/destination)
  if (params?.returnDate) {
    const returnTemplates = outboundTemplates.map((t) => ({
      ...t,
      origin: t.destination,
      destination: t.origin,
    }));
    const returnFlights = buildFlights(returnTemplates, params.returnDate, params?.cabin, 1000, 'mock-ret');
    flights = [...flights, ...returnFlights];
  }

  // Filter by passenger count (must have enough seats)
  if (params?.pax) {
    flights = flights.filter((f) => f.seatsAvailable >= params.pax!);
  }

  return flights;
}
