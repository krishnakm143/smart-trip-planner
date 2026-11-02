import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from './constants.js';
import { toJSONPlugin } from './plugins/toJSON.js';

const expenseSplitSchema = new mongoose.Schema(
  {
    member: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    settled: { type: Boolean, default: false },
  },
  { _id: false },
);

const expenseSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 1 },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    spentOn: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    paidBy: { type: String, trim: true, default: 'Me' },
    splitType: { type: String, enum: ['equal', 'custom', 'none'], default: 'equal' },
    splits: [expenseSplitSchema],
    currency: { type: String, default: 'INR', trim: true },
    exchangeRate: { type: Number, default: 1, min: 0.000001 },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
  },
  { timestamps: true },
);

expenseSchema.index({ trip: 1, spentOn: -1, createdAt: -1 });
expenseSchema.plugin(toJSONPlugin);

export const Expense = mongoose.model('Expense', expenseSchema);
