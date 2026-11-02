import { Expense } from '../models/Expense.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { parseDateOnly } from '../utils/time.js';
import * as tripService from './tripService.js';
import * as supabaseExpenses from './supabaseExpenseService.js';

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

export function calculateSettlements(members = ['Me'], expenses = []) {
  const memberList = members.length > 0 ? members : ['Me'];
  const balances = {};
  memberList.forEach((m) => {
    balances[m] = 0;
  });

  const byCategory = {};
  const byPaymentMethod = {};
  let totalSpent = 0;

  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    totalSpent += amt;

    const cat = exp.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + amt;

    const pm = exp.paymentMethod || 'cash';
    byPaymentMethod[pm] = (byPaymentMethod[pm] || 0) + amt;

    const payer = exp.paidBy || memberList[0] || 'Me';
    if (balances[payer] === undefined) balances[payer] = 0;
    balances[payer] += amt;

    if (Array.isArray(exp.splits) && exp.splits.length > 0) {
      for (const split of exp.splits) {
        const m = split.member;
        const splitAmt = Number(split.amount) || 0;
        if (balances[m] === undefined) balances[m] = 0;
        balances[m] -= splitAmt;
      }
    } else {
      const share = amt / memberList.length;
      for (const m of memberList) {
        balances[m] -= share;
      }
    }
  }

  const creditors = [];
  const debtors = [];

  for (const [member, balance] of Object.entries(balances)) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ member, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ member, amount: -rounded });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];
    const settleAmt = Math.min(creditor.amount, debtor.amount);
    const roundedSettle = Math.round(settleAmt);

    if (roundedSettle > 0) {
      settlements.push({
        from: debtor.member,
        to: creditor.member,
        amount: roundedSettle,
      });
    }

    creditor.amount -= settleAmt;
    debtor.amount -= settleAmt;

    if (creditor.amount < 0.01) cIdx++;
    if (debtor.amount < 0.01) dIdx++;
  }

  return {
    totalSpent,
    byCategory,
    byPaymentMethod,
    balances,
    settlements,
  };
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
