import * as tripService from '../services/tripService.js';
import { sendTripPlanEmail } from '../services/emailService.js';
import { sendSuccess } from '../utils/respond.js';

export async function create(req, res) {
  const trip = await tripService.createTrip(req.user, req.valid.body, req.accessToken);
  sendSuccess(res, { trip }, { status: 201 });
}

export async function list(req, res) {
  const items = await tripService.listTrips(req.user, req.valid.query, req.accessToken);
  sendSuccess(res, { items });
}

export async function getById(req, res) {
  const trip = await tripService.getTrip(req.user, req.valid.params.id, req.accessToken);
  sendSuccess(res, { trip });
}

export async function update(req, res) {
  const trip = await tripService.updateTrip(req.user, req.valid.params.id, req.valid.body, req.accessToken);
  sendSuccess(res, { trip });
}

export async function remove(req, res) {
  const id = await tripService.deleteTrip(req.user, req.valid.params.id, req.accessToken);
  sendSuccess(res, { id });
}

export async function duplicate(req, res) {
  const trip = await tripService.duplicateTrip(req.user, req.valid.params.id, req.accessToken);
  sendSuccess(res, { trip }, { status: 201 });
}

export async function emailTrip(req, res) {
  const trip = await tripService.getTrip(req.user, req.valid.params.id, req.accessToken);
  const targetEmail = req.body?.email || req.user.email;
  const result = await sendTripPlanEmail(targetEmail, trip, req.user.name);
  sendSuccess(res, { message: `Trip plan sent to ${targetEmail}`, ...result });
}
