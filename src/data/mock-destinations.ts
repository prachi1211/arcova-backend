// Destination data used by AI trip planner for context

export interface Destination {
  city: string;
  country: string;
  avgHotelPricePerNight: number;
  avgFlightPrice: number;
  bestMonths: string[];
  tags: string[];
}

export const destinations: Destination[] = [
  // Southeast Asia
  { city: 'Bangkok', country: 'Thailand', avgHotelPricePerNight: 45, avgFlightPrice: 550, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb'], tags: ['city', 'food', 'culture', 'budget', 'nightlife'] },
  { city: 'Chiang Mai', country: 'Thailand', avgHotelPricePerNight: 30, avgFlightPrice: 580, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb'], tags: ['culture', 'nature', 'budget', 'food', 'adventure'] },
  { city: 'Phuket', country: 'Thailand', avgHotelPricePerNight: 70, avgFlightPrice: 600, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'], tags: ['beach', 'nightlife', 'family', 'adventure'] },
  { city: 'Bali', country: 'Indonesia', avgHotelPricePerNight: 55, avgFlightPrice: 650, bestMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], tags: ['beach', 'culture', 'romantic', 'nature', 'adventure'] },
  { city: 'Hanoi', country: 'Vietnam', avgHotelPricePerNight: 35, avgFlightPrice: 600, bestMonths: ['Oct', 'Nov', 'Mar', 'Apr'], tags: ['culture', 'food', 'budget', 'historical'] },
  { city: 'Ho Chi Minh City', country: 'Vietnam', avgHotelPricePerNight: 40, avgFlightPrice: 620, bestMonths: ['Dec', 'Jan', 'Feb', 'Mar'], tags: ['city', 'food', 'budget', 'culture'] },
  { city: 'Singapore', country: 'Singapore', avgHotelPricePerNight: 150, avgFlightPrice: 700, bestMonths: ['Feb', 'Mar', 'Apr', 'Oct', 'Nov'], tags: ['city', 'food', 'family', 'luxury', 'culture'] },
  { city: 'Kuala Lumpur', country: 'Malaysia', avgHotelPricePerNight: 50, avgFlightPrice: 580, bestMonths: ['May', 'Jun', 'Jul', 'Sep'], tags: ['city', 'food', 'culture', 'budget'] },
  { city: 'Manila', country: 'Philippines', avgHotelPricePerNight: 45, avgFlightPrice: 550, bestMonths: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr'], tags: ['beach', 'city', 'budget', 'adventure'] },
  { city: 'Siem Reap', country: 'Cambodia', avgHotelPricePerNight: 25, avgFlightPrice: 600, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb'], tags: ['culture', 'historical', 'budget', 'adventure'] },

  // Europe
  { city: 'Paris', country: 'France', avgHotelPricePerNight: 180, avgFlightPrice: 450, bestMonths: ['Apr', 'May', 'Jun', 'Sep', 'Oct'], tags: ['city', 'culture', 'romantic', 'food', 'historical', 'luxury'] },
  { city: 'London', country: 'United Kingdom', avgHotelPricePerNight: 200, avgFlightPrice: 400, bestMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'], tags: ['city', 'culture', 'historical', 'nightlife', 'food'] },
  { city: 'Rome', country: 'Italy', avgHotelPricePerNight: 140, avgFlightPrice: 480, bestMonths: ['Apr', 'May', 'Sep', 'Oct'], tags: ['culture', 'historical', 'food', 'romantic', 'city'] },
  { city: 'Barcelona', country: 'Spain', avgHotelPricePerNight: 130, avgFlightPrice: 460, bestMonths: ['May', 'Jun', 'Sep', 'Oct'], tags: ['city', 'beach', 'culture', 'food', 'nightlife'] },
  { city: 'Amsterdam', country: 'Netherlands', avgHotelPricePerNight: 160, avgFlightPrice: 420, bestMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], tags: ['city', 'culture', 'nightlife', 'romantic'] },
  { city: 'Prague', country: 'Czech Republic', avgHotelPricePerNight: 80, avgFlightPrice: 440, bestMonths: ['Apr', 'May', 'Jun', 'Sep', 'Oct'], tags: ['city', 'culture', 'historical', 'budget', 'nightlife'] },
  { city: 'Lisbon', country: 'Portugal', avgHotelPricePerNight: 100, avgFlightPrice: 430, bestMonths: ['Mar', 'Apr', 'May', 'Sep', 'Oct'], tags: ['city', 'culture', 'food', 'beach', 'budget'] },
  { city: 'Athens', country: 'Greece', avgHotelPricePerNight: 90, avgFlightPrice: 500, bestMonths: ['Apr', 'May', 'Jun', 'Sep', 'Oct'], tags: ['culture', 'historical', 'beach', 'food'] },
  { city: 'Santorini', country: 'Greece', avgHotelPricePerNight: 200, avgFlightPrice: 550, bestMonths: ['May', 'Jun', 'Sep', 'Oct'], tags: ['romantic', 'beach', 'luxury', 'nature'] },
  { city: 'Vienna', country: 'Austria', avgHotelPricePerNight: 120, avgFlightPrice: 450, bestMonths: ['Apr', 'May', 'Jun', 'Sep', 'Oct', 'Dec'], tags: ['culture', 'historical', 'city', 'food'] },
  { city: 'Berlin', country: 'Germany', avgHotelPricePerNight: 100, avgFlightPrice: 400, bestMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'], tags: ['city', 'culture', 'nightlife', 'historical', 'budget'] },
  { city: 'Zurich', country: 'Switzerland', avgHotelPricePerNight: 250, avgFlightPrice: 500, bestMonths: ['Jun', 'Jul', 'Aug', 'Sep', 'Dec', 'Jan'], tags: ['city', 'nature', 'luxury', 'ski', 'adventure'] },
  { city: 'Dubrovnik', country: 'Croatia', avgHotelPricePerNight: 110, avgFlightPrice: 480, bestMonths: ['May', 'Jun', 'Sep', 'Oct'], tags: ['beach', 'historical', 'culture', 'romantic'] },
  { city: 'Reykjavik', country: 'Iceland', avgHotelPricePerNight: 180, avgFlightPrice: 350, bestMonths: ['Jun', 'Jul', 'Aug', 'Sep'], tags: ['nature', 'adventure', 'culture'] },
  { city: 'Edinburgh', country: 'United Kingdom', avgHotelPricePerNight: 130, avgFlightPrice: 380, bestMonths: ['May', 'Jun', 'Jul', 'Aug'], tags: ['culture', 'historical', 'city', 'nature'] },

  // Americas
  { city: 'New York', country: 'United States', avgHotelPricePerNight: 250, avgFlightPrice: 300, bestMonths: ['Apr', 'May', 'Sep', 'Oct', 'Nov', 'Dec'], tags: ['city', 'culture', 'food', 'nightlife', 'luxury'] },
  { city: 'Los Angeles', country: 'United States', avgHotelPricePerNight: 200, avgFlightPrice: 280, bestMonths: ['Mar', 'Apr', 'May', 'Sep', 'Oct', 'Nov'], tags: ['city', 'beach', 'nightlife', 'culture'] },
  { city: 'Miami', country: 'United States', avgHotelPricePerNight: 180, avgFlightPrice: 250, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'], tags: ['beach', 'nightlife', 'city', 'luxury'] },
  { city: 'Cancun', country: 'Mexico', avgHotelPricePerNight: 120, avgFlightPrice: 350, bestMonths: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr'], tags: ['beach', 'nightlife', 'family', 'adventure'] },
  { city: 'Mexico City', country: 'Mexico', avgHotelPricePerNight: 70, avgFlightPrice: 320, bestMonths: ['Mar', 'Apr', 'May', 'Oct', 'Nov'], tags: ['city', 'food', 'culture', 'historical', 'budget'] },
  { city: 'Buenos Aires', country: 'Argentina', avgHotelPricePerNight: 60, avgFlightPrice: 700, bestMonths: ['Mar', 'Apr', 'May', 'Sep', 'Oct', 'Nov'], tags: ['city', 'culture', 'food', 'nightlife', 'budget'] },
  { city: 'Rio de Janeiro', country: 'Brazil', avgHotelPricePerNight: 80, avgFlightPrice: 650, bestMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'], tags: ['beach', 'city', 'nightlife', 'culture', 'adventure'] },
  { city: 'Lima', country: 'Peru', avgHotelPricePerNight: 55, avgFlightPrice: 500, bestMonths: ['Dec', 'Jan', 'Feb', 'Mar'], tags: ['city', 'food', 'culture', 'historical', 'budget'] },
  { city: 'Cusco', country: 'Peru', avgHotelPricePerNight: 40, avgFlightPrice: 550, bestMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], tags: ['culture', 'historical', 'adventure', 'nature', 'budget'] },
  { city: 'San Francisco', country: 'United States', avgHotelPricePerNight: 220, avgFlightPrice: 300, bestMonths: ['Sep', 'Oct', 'Nov'], tags: ['city', 'culture', 'food', 'nature'] },

  // Middle East
  { city: 'Dubai', country: 'United Arab Emirates', avgHotelPricePerNight: 200, avgFlightPrice: 600, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'], tags: ['luxury', 'city', 'beach', 'family', 'nightlife'] },
  { city: 'Abu Dhabi', country: 'United Arab Emirates', avgHotelPricePerNight: 170, avgFlightPrice: 620, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'], tags: ['luxury', 'city', 'culture', 'family'] },
  { city: 'Istanbul', country: 'Turkey', avgHotelPricePerNight: 70, avgFlightPrice: 500, bestMonths: ['Apr', 'May', 'Sep', 'Oct'], tags: ['culture', 'historical', 'food', 'city', 'budget'] },
  { city: 'Doha', country: 'Qatar', avgHotelPricePerNight: 150, avgFlightPrice: 650, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'], tags: ['luxury', 'city', 'culture'] },
  { city: 'Amman', country: 'Jordan', avgHotelPricePerNight: 60, avgFlightPrice: 550, bestMonths: ['Mar', 'Apr', 'May', 'Oct', 'Nov'], tags: ['culture', 'historical', 'adventure', 'budget'] },

  // Oceania
  { city: 'Sydney', country: 'Australia', avgHotelPricePerNight: 180, avgFlightPrice: 900, bestMonths: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], tags: ['city', 'beach', 'culture', 'nature', 'food'] },
  { city: 'Melbourne', country: 'Australia', avgHotelPricePerNight: 150, avgFlightPrice: 880, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'], tags: ['city', 'culture', 'food', 'nature'] },
  { city: 'Auckland', country: 'New Zealand', avgHotelPricePerNight: 130, avgFlightPrice: 950, bestMonths: ['Dec', 'Jan', 'Feb', 'Mar'], tags: ['nature', 'adventure', 'city', 'culture'] },
  { city: 'Queenstown', country: 'New Zealand', avgHotelPricePerNight: 160, avgFlightPrice: 980, bestMonths: ['Dec', 'Jan', 'Feb', 'Jun', 'Jul', 'Aug'], tags: ['adventure', 'nature', 'ski', 'romantic'] },
  { city: 'Fiji', country: 'Fiji', avgHotelPricePerNight: 140, avgFlightPrice: 850, bestMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'], tags: ['beach', 'romantic', 'nature', 'family', 'luxury'] },

  // Africa
  { city: 'Cape Town', country: 'South Africa', avgHotelPricePerNight: 100, avgFlightPrice: 800, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'], tags: ['nature', 'city', 'adventure', 'beach', 'food'] },
  { city: 'Marrakech', country: 'Morocco', avgHotelPricePerNight: 70, avgFlightPrice: 500, bestMonths: ['Mar', 'Apr', 'May', 'Oct', 'Nov'], tags: ['culture', 'food', 'historical', 'city', 'budget'] },
  { city: 'Nairobi', country: 'Kenya', avgHotelPricePerNight: 80, avgFlightPrice: 750, bestMonths: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'], tags: ['adventure', 'nature', 'culture'] },
  { city: 'Zanzibar', country: 'Tanzania', avgHotelPricePerNight: 90, avgFlightPrice: 780, bestMonths: ['Jun', 'Jul', 'Aug', 'Sep', 'Dec', 'Jan', 'Feb'], tags: ['beach', 'culture', 'romantic', 'nature'] },
  { city: 'Cairo', country: 'Egypt', avgHotelPricePerNight: 50, avgFlightPrice: 500, bestMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], tags: ['culture', 'historical', 'city', 'budget'] },

  // Asia (East / South)
  { city: 'Tokyo', country: 'Japan', avgHotelPricePerNight: 150, avgFlightPrice: 800, bestMonths: ['Mar', 'Apr', 'May', 'Oct', 'Nov'], tags: ['city', 'culture', 'food', 'family'] },
  { city: 'Kyoto', country: 'Japan', avgHotelPricePerNight: 130, avgFlightPrice: 820, bestMonths: ['Mar', 'Apr', 'Oct', 'Nov'], tags: ['culture', 'historical', 'nature', 'romantic', 'food'] },
  { city: 'Seoul', country: 'South Korea', avgHotelPricePerNight: 100, avgFlightPrice: 750, bestMonths: ['Apr', 'May', 'Sep', 'Oct'], tags: ['city', 'culture', 'food', 'nightlife'] },
  { city: 'Hong Kong', country: 'China', avgHotelPricePerNight: 140, avgFlightPrice: 700, bestMonths: ['Oct', 'Nov', 'Dec'], tags: ['city', 'food', 'culture', 'nightlife', 'luxury'] },
  { city: 'Maldives', country: 'Maldives', avgHotelPricePerNight: 350, avgFlightPrice: 800, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'], tags: ['beach', 'luxury', 'romantic', 'nature'] },
  { city: 'Goa', country: 'India', avgHotelPricePerNight: 40, avgFlightPrice: 600, bestMonths: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar'], tags: ['beach', 'budget', 'nightlife', 'culture'] },
  { city: 'Colombo', country: 'Sri Lanka', avgHotelPricePerNight: 50, avgFlightPrice: 620, bestMonths: ['Dec', 'Jan', 'Feb', 'Mar'], tags: ['culture', 'beach', 'nature', 'budget', 'adventure'] },
];

export function findDestinations(query: string): Destination[] {
  const q = query.toLowerCase();
  return destinations.filter(
    (d) =>
      d.city.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q) ||
      d.tags.some((t) => t.includes(q)),
  );
}
