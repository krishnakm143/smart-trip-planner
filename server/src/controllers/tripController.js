import * as tripService from '../services/tripService.js';
import { sendSuccess } from '../utils/respond.js';

export async function create(req, res) {
  const trip = await tripService.createTrip(req.user.id, req.valid.body);
  sendSuccess(res, { trip }, { status: 201 });
}

export async function list(req, res) {
  const items = await tripService.listTrips(req.user.id, req.valid.query);
  sendSuccess(res, { items });
}

export async function getById(req, res) {
  const trip = await tripService.getTrip(req.user.id, req.valid.params.id);
  sendSuccess(res, { trip });
}

export async function update(req, res) {
  const trip = await tripService.updateTrip(req.user.id, req.valid.params.id, req.valid.body);
  sendSuccess(res, { trip });
}

export async function remove(req, res) {
  const id = await tripService.deleteTrip(req.user.id, req.valid.params.id);
  sendSuccess(res, { id });
}
