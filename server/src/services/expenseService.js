import { Expense } from '../models/Expense.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { parseDateOnly } from '../utils/time.js';
import { calculateSettlements } from '../utils/settlementCalculator.js';
import * as tripService from './tripService.js';
import * as supabaseExpenses from './supabaseExpenseService.js';

export { calculateSettlements };

async function ownedTrip(user, tripId, accessToken) {
  await tripService.getTrip(user, tripId, accessToken);
}

export async function listExpenses(user, tripId, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseExpenses.listExpenses(user, tripId, accessToken);
  await ownedTrip(user, tripId, accessToken);
  return Expense.find({ user: user.id, trip: tripId }).sort({ spentOn: -1, createdAt: -1 });
}

export async function createExpense(user, tripId, input, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseExpenses.createExpense(user, tripId, input, accessToken);
  await ownedTrip(user, tripId, accessToken);
  return Expense.create({ ...input, spentOn: parseDateOnly(input.spentOn), user: user.id, trip: tripId });
}

async function findOwnedExpense(userId, id) {
  const expense = await Expense.findOne({ _id: id, user: userId });
  if (!expense) throw ApiError.notFound('Expense not found');
  return expense;
}

export async function updateExpense(user, id, input, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseExpenses.updateExpense(user, id, input, accessToken);
  const expense = await findOwnedExpense(user.id, id);
  expense.set({ ...input, ...(input.spentOn ? { spentOn: parseDateOnly(input.spentOn) } : {}) });
  await expense.save();
  return expense;
}

export async function getExpenseSummary(user, tripId, accessToken) {
  const trip = await tripService.getTrip(user, tripId, accessToken);
  const items = await listExpenses(user, tripId, accessToken);
  const members = trip.members && trip.members.length > 0 ? trip.members : ['Me'];
  return {
    ...calculateSettlements(members, items),
    count: items.length,
  };
}

export async function deleteExpense(user, id, accessToken) {
  if (config.tripStorage === 'supabase') return supabaseExpenses.deleteExpense(user, id, accessToken);
  const expense = await Expense.findOneAndDelete({ _id: id, user: user.id });
  if (!expense) throw ApiError.notFound('Expense not found');
  return expense.id;
}
