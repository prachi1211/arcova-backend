import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as authService from '../services/auth.service.js';

const router = Router();

// POST /api/auth/signup
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum(['traveller', 'host']).default('traveller'),
});

router.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { email, password, full_name, role } = req.body;
    const result = await authService.signUp(email, password, full_name, role);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.signIn(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
const resetPasswordSchema = z.object({
  access_token: z.string().min(1),
  new_password: z.string().min(6),
  confirm_password: z.string().min(6),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body.access_token, req.body.new_password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const profile = await authService.getProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/profile
const updateProfileSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional(),
  company_name: z.string().optional(),
});

router.put('/profile', authMiddleware, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const profile = await authService.updateProfile(req.user!.id, req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
