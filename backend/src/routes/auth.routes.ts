import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import {
  currentUser,
  login,
  logout,
  preview,
  register,
  requireAuth,
} from '../modules/auth.js';

export const authRouter = Router();

authRouter.get('/preview', asyncHandler(preview));
authRouter.get('/me', asyncHandler(requireAuth), asyncHandler(currentUser));
authRouter.post('/register', asyncHandler(register));
authRouter.post('/login', asyncHandler(login));
authRouter.post('/logout', asyncHandler(logout));
