import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  loginSchema,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authValidators.js';

const router = Router();

// Only credential endpoints are throttled; /me runs on every page load.
router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);
router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);
router.post(
  '/otp/send',
  authRateLimiter,
  validate({ body: sendOtpSchema }),
  asyncHandler(authController.sendOtp),
);
router.post(
  '/otp/verify',
  authRateLimiter,
  validate({ body: verifyOtpSchema }),
  asyncHandler(authController.verifyOtp),
);
router.post(
  '/password/reset-otp',
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.sendPasswordResetOtp),
);
router.post(
  '/password/reset',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);
router.get('/me', requireAuth, authController.me);

export default router;
