import { z } from 'zod';
import { validateEmailSecurity } from '../utils/emailValidator.js';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((val, ctx) => {
    const res = validateEmailSecurity(val);
    if (!res.valid) {
      ctx.addIssue({ code: 'custom', message: res.message });
    }
  });

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters'),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .refine((val) => val.trim().length >= 8, {
      message: 'Password cannot consist only of whitespace',
    }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const sendOtpSchema = z.object({
  email,
});

export const verifyOtpSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .refine((val) => val.trim().length >= 8, {
      message: 'Password cannot consist only of whitespace',
    }),
});
