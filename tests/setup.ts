// Set mock env vars BEFORE any src/ imports (prevents Zod crash in config/env.ts)
process.env.PORT = '3001';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.CORS_ORIGIN = 'http://localhost:5173';
