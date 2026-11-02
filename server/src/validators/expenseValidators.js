import { z } from 'zod';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../models/constants.js';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');

export const expenseSplitInputSchema = z.object({
  member: z.string().trim().min(1).max(50),
  amount: z.number().min(0),
  settled: z.boolean().default(false),
});

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(80, 'Title can be at most 80 characters'),
  amount: z.number().int().min(1, 'Amount must be at least ₹1').max(10_000_000),
  category: z.enum(EXPENSE_CATEGORIES),
  spentOn: dateOnly,
  paymentMethod: z.enum(PAYMENT_METHODS).optional().default('cash'),
  paidBy: z.string().trim().min(1).max(50).optional().default('Me'),
  splitType: z.enum(['equal', 'custom', 'none']).optional().default('equal'),
  splits: z.array(expenseSplitInputSchema).optional().default([]),
  currency: z.string().trim().min(1).max(10).optional().default('INR'),
  exchangeRate: z.number().positive().optional().default(1),
  notes: z.string().trim().max(300, 'Notes can be at most 300 characters').optional().default(''),
});

export const updateExpenseSchema = createExpenseSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one expense field',
  });
