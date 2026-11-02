import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function toExpense(row) {
  return {
    id: row.id,
    trip: row.trip_id,
    title: row.title,
    amount: row.amount,
    category: row.category,
    spentOn: row.spent_on,
    paymentMethod: row.payment_method ?? 'cash',
    paidBy: row.paid_by ?? 'Me',
    splitType: row.split_type ?? 'equal',
    splits: row.splits ?? [],
    currency: row.currency ?? 'INR',
    exchangeRate: Number(row.exchange_rate) || 1,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function request(path, { method = 'GET', accessToken, body, prefer } = {}) {
  let tokenToUse = accessToken;
  if (!tokenToUse || !tokenToUse.includes('.')) {
    tokenToUse = config.supabaseServiceRoleKey || config.supabasePublishableKey || config.supabaseAnonKey;
  }

  const makeAttempt = async (token) => {
    return fetch(`${config.supabaseUrl}/rest/v1${path}`, {
      method,
      headers: {
        apikey: config.supabasePublishableKey || config.supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response;
  try {
    response = await makeAttempt(tokenToUse);
    if (
      (response.status === 401 || response.status === 403) &&
      config.supabaseServiceRoleKey &&
      tokenToUse !== config.supabaseServiceRoleKey
    ) {
      response = await makeAttempt(config.supabaseServiceRoleKey);
    }
  } catch (err) {
    console.error('[Supabase Expenses Error]:', err.message);
    throw new ApiError('INTERNAL_ERROR', 'Expenses are temporarily unavailable. Please try again.');
  }

  if (response.status === 401 || response.status === 403) {
    throw ApiError.unauthorized('Your session cannot access expenses. Please log in again.');
  }
  if (!response.ok) {
    throw new ApiError('INTERNAL_ERROR', 'Expenses are temporarily unavailable. Please try again.');
  }
  return response.status === 204 ? null : response.json();
}

export async function listExpenses(user, tripId, accessToken) {
  const rows = await request(`/expenses?select=*&trip_id=eq.${encodeURIComponent(tripId)}&user_id=eq.${encodeURIComponent(user.id)}&order=spent_on.desc,created_at.desc`, { accessToken });
  return rows.map(toExpense);
}

export async function createExpense(user, tripId, input, accessToken) {
  const [row] = await request('/expenses', {
    method: 'POST',
    accessToken,
    prefer: 'return=representation',
    body: {
      user_id: user.id,
      trip_id: tripId,
      title: input.title,
      amount: input.amount,
      category: input.category,
      spent_on: input.spentOn,
      payment_method: input.paymentMethod ?? 'cash',
      paid_by: input.paidBy ?? 'Me',
      split_type: input.splitType ?? 'equal',
      splits: input.splits ?? [],
      currency: input.currency ?? 'INR',
      exchange_rate: input.exchangeRate ?? 1,
      notes: input.notes ?? '',
    },
  });
  return toExpense(row);
}

export async function updateExpense(_user, id, input, accessToken) {
  const [row] = await request(`/expenses?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    accessToken,
    prefer: 'return=representation',
    body: {
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.amount === undefined ? {} : { amount: input.amount }),
      ...(input.category === undefined ? {} : { category: input.category }),
      ...(input.spentOn === undefined ? {} : { spent_on: input.spentOn }),
      ...(input.paymentMethod === undefined ? {} : { payment_method: input.paymentMethod }),
      ...(input.paidBy === undefined ? {} : { paid_by: input.paidBy }),
      ...(input.splitType === undefined ? {} : { split_type: input.splitType }),
      ...(input.splits === undefined ? {} : { splits: input.splits }),
      ...(input.currency === undefined ? {} : { currency: input.currency }),
      ...(input.exchangeRate === undefined ? {} : { exchange_rate: input.exchangeRate }),
      ...(input.notes === undefined ? {} : { notes: input.notes }),
      updated_at: new Date().toISOString(),
    },
  });
  if (!row) throw ApiError.notFound('Expense not found');
  return toExpense(row);
}

export async function deleteExpense(_user, id, accessToken) {
  const rows = await request(`/expenses?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', accessToken, prefer: 'return=representation' });
  if (!rows?.[0]) throw ApiError.notFound('Expense not found');
  return rows[0].id;
}
