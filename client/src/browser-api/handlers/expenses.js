import { ApiError } from '@server/utils/ApiError.js'
import { calculateSettlements } from '@server/utils/settlementCalculator.js'
import { randomId } from '../ids'
import { expenses, trips } from '../store'
import { validateExpense } from '../validate'
import { requireUser } from './auth'

function ownedTrip(userId, id) {
  const trip = trips.all().find((candidate) => candidate.id === id && candidate.user === userId)
  if (!trip) throw ApiError.notFound('Trip not found')
  return trip
}

function ownedExpense(userId, tripId, id) {
  const expense = expenses.all().find((candidate) => candidate.id === id && candidate.trip === tripId && candidate.user === userId)
  if (!expense) throw ApiError.notFound('Expense not found')
  return expense
}

export function list({ token, params }) {
  const user = requireUser(token)
  ownedTrip(user.id, params.id)
  return { data: { items: expenses.all().filter((item) => item.user === user.id && item.trip === params.id).sort((a, b) => b.spentOn.localeCompare(a.spentOn) || b.createdAt.localeCompare(a.createdAt)) } }
}

export function summary({ token, params }) {
  const user = requireUser(token)
  const trip = ownedTrip(user.id, params.id)
  const items = expenses.all().filter((item) => item.user === user.id && item.trip === params.id)
  const members = trip.members && trip.members.length > 0 ? trip.members : ['Me']
  return { data: { ...calculateSettlements(members, items), count: items.length } }
}

export function create({ token, params, body }) {
  const user = requireUser(token)
  ownedTrip(user.id, params.id)
  const now = new Date().toISOString()
  const expense = { id: randomId(), user: user.id, trip: params.id, ...validateExpense(body), notes: body.notes ? String(body.notes).trim() : '', createdAt: now, updatedAt: now }
  expenses.insert(expense)
  return { status: 201, data: { expense } }
}

export function update({ token, params, body }) {
  const user = requireUser(token)
  const current = ownedExpense(user.id, params.id, params.expenseId)
  const updated = { ...current, ...validateExpense(body, { partial: true }), updatedAt: new Date().toISOString() }
  expenses.replace(expenses.all().map((item) => (item.id === updated.id ? updated : item)))
  return { data: { expense: updated } }
}

export function remove({ token, params }) {
  const user = requireUser(token)
  ownedExpense(user.id, params.id, params.expenseId)
  expenses.replace(expenses.all().filter((item) => item.id !== params.expenseId))
  return { data: { id: params.expenseId } }
}
