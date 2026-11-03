import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { defaultTitle } from '../utils/tripTitle.js';
import { buildPlan } from './plannerService.js';

const destinationSnapshot = (destination) => ({
  id: destination.id,
  name: destination.name,
  slug: destination.slug,
  state: destination.state,
  heroImage: destination.heroImage,
  location: destination.location,
});

function toTrip(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    origin: row.origin ?? '',
    tripMode: row.trip_mode ?? 'solo',
    members: row.members ?? ['Me'],
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    travelers: row.travelers,
    budgetTier: row.budget_tier,
    interests: row.interests,
    pace: row.pace,
    itinerary: row.itinerary,
    budget: row.budget,
    packingList: row.packing_list ?? [],
    reservations: row.reservations ?? [],
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSummary(row) {
  const trip = toTrip(row);
  return {
    id: trip.id,
    title: trip.title,
    origin: trip.origin,
    tripMode: trip.tripMode,
    destination: {
      id: trip.destination.id,
      name: trip.destination.name,
      slug: trip.destination.slug,
      state: trip.destination.state,
      heroImage: trip.destination.heroImage,
    },
    startDate: trip.startDate,
    endDate: trip.endDate,
    days: trip.days,
    travelers: trip.travelers,
    budgetTier: trip.budgetTier,
    status: trip.status,
    budget: { total: trip.budget.total, perPerson: trip.budget.perPerson },
  };
}

function isLocalToken(token) {
  if (!token) return false;
  try {
    jwt.verify(token, config.jwtSecret);
    return true;
  } catch {
    return false;
  }
}

async function request(path, { method = 'GET', accessToken, body, prefer } = {}) {
  let tokenToUse = accessToken;
  if (!tokenToUse || isLocalToken(tokenToUse)) {
    tokenToUse = config.supabaseServiceRoleKey || config.supabasePublishableKey;
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
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'Saved trips are temporarily unavailable. Please try again.');
  }

  if (response.status === 401 || response.status === 403) {
    throw ApiError.unauthorized('Your session cannot access saved trips. Please log in again.');
  }
  if (!response.ok) {
    throw new ApiError('INTERNAL_ERROR', 'Saved trips are temporarily unavailable. Please try again.');
  }
  if (response.status === 204) return null;
  return response.json();
}

const withId = (id) => `?id=eq.${encodeURIComponent(id)}`;

export async function createTrip(user, { title, origin, tripMode, members, packingList, reservations, ...planInput }, accessToken) {
  const plan = await buildPlan(planInput);
  const [row] = await request('/trips', {
    method: 'POST',
    accessToken,
    prefer: 'return=representation',
    body: {
      user_id: user.id,
      destination: destinationSnapshot(plan.destination),
      title: title ?? defaultTitle(plan.days, plan.destination.name),
      origin: origin ?? '',
      trip_mode: tripMode ?? 'solo',
      members: members && members.length > 0 ? members : ['Me'],
      start_date: plan.startDate,
      end_date: plan.endDate,
      days: plan.days,
      travelers: planInput.travelers,
      budget_tier: planInput.budgetTier,
      interests: planInput.interests,
      pace: planInput.pace,
      itinerary: plan.itinerary,
      budget: plan.budget,
      packing_list: packingList ?? [],
      reservations: reservations ?? [],
    },
  });
  return toTrip(row);
}

export async function listTrips(user, { status }, accessToken) {
  const query = new URLSearchParams({ select: '*' });
  query.set('order', 'created_at.desc');
  if (status) query.set('status', `eq.${status}`);
  if (user?.id) query.set('user_id', `eq.${user.id}`);
  const rows = await request(`/trips?${query}`, { accessToken });
  return rows.map(toSummary);
}

export async function getTrip(user, id, accessToken) {
  let path = `/trips${withId(id)}`;
  if (user?.id) path += `&user_id=eq.${encodeURIComponent(user.id)}`;
  const [row] = await request(path, { accessToken });
  if (!row) throw ApiError.notFound('Trip not found');
  return toTrip(row);
}

export async function updateTrip(user, id, changes, accessToken) {
  let path = `/trips${withId(id)}`;
  if (user?.id) path += `&user_id=eq.${encodeURIComponent(user.id)}`;
  const [row] = await request(path, {
    method: 'PATCH',
    accessToken,
    prefer: 'return=representation',
    body: {
      ...(changes.title === undefined ? {} : { title: changes.title }),
      ...(changes.notes === undefined ? {} : { notes: changes.notes }),
      ...(changes.status === undefined ? {} : { status: changes.status }),
      ...(changes.origin === undefined ? {} : { origin: changes.origin }),
      ...(changes.tripMode === undefined ? {} : { trip_mode: changes.tripMode }),
      ...(changes.members === undefined ? {} : { members: changes.members }),
      ...(changes.itinerary === undefined ? {} : { itinerary: changes.itinerary }),
      ...(changes.budget === undefined ? {} : { budget: changes.budget }),
      ...(changes.packingList === undefined ? {} : { packing_list: changes.packingList }),
      ...(changes.reservations === undefined ? {} : { reservations: changes.reservations }),
      updated_at: new Date().toISOString(),
    },
  });
  if (!row) throw ApiError.notFound('Trip not found');
  return toTrip(row);
}

export async function duplicateTrip(user, id, accessToken) {
  const original = await getTrip(user, id, accessToken);
  const [row] = await request('/trips', {
    method: 'POST',
    accessToken,
    prefer: 'return=representation',
    body: {
      user_id: user.id,
      destination: destinationSnapshot(original.destination),
      title: `Copy of ${original.title}`.slice(0, 80),
      origin: original.origin,
      trip_mode: original.tripMode,
      members: original.members,
      start_date: original.startDate,
      end_date: original.endDate,
      days: original.days,
      travelers: original.travelers,
      budget_tier: original.budgetTier,
      interests: original.interests,
      pace: original.pace,
      itinerary: original.itinerary,
      budget: original.budget,
      packing_list: original.packingList,
      reservations: original.reservations,
      status: 'planned',
      notes: original.notes,
    },
  });
  return toTrip(row);
}

export async function deleteTrip(user, id, accessToken) {
  let path = `/trips${withId(id)}`;
  if (user?.id) path += `&user_id=eq.${encodeURIComponent(user.id)}`;
  const rows = await request(path, {
    method: 'DELETE',
    accessToken,
    prefer: 'return=representation',
  });
  if (!rows?.[0]) throw ApiError.notFound('Trip not found');
  return rows[0].id;
}

export async function createInvitation() {
  throw ApiError.badRequest('Trip invitations are not supported in Supabase storage mode');
}

export async function listInvitations() {
  return [];
}

export async function acceptInvitation() {
  throw ApiError.badRequest('Trip invitations are not supported in Supabase storage mode');
}

