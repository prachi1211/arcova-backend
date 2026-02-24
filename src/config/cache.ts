import NodeCache from 'node-cache';

// Hotel search results — 15 min TTL (prices change less frequently)
export const searchCache = new NodeCache({ stdTTL: 900 });

// Flight search results — 5 min TTL (airline prices change more frequently)
export const flightCache = new NodeCache({ stdTTL: 300 });

// Car rental search results — 10 min TTL
export const carCache = new NodeCache({ stdTTL: 600 });
