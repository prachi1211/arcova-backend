import Stripe from 'stripe';
import { env } from './env.js';

// Stripe client — null if no secret key configured (graceful degradation)
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-01-28.clover' })
  : null;
