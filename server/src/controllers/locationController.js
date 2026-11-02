import * as locationService from '../services/locationService.js';
import { sendSuccess } from '../utils/respond.js';

export async function nearest(req, res) {
  const result = await locationService.findNearestDestinations(req.valid.query);
  sendSuccess(res, result);
}
