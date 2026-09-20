import * as destinationService from '../services/destinationService.js';
import { sendSuccess } from '../utils/respond.js';

export async function list(req, res) {
  const result = await destinationService.listDestinations(req.valid.query);
  sendSuccess(res, result);
}

export async function getBySlug(req, res) {
  const details = await destinationService.getDestinationDetails(req.valid.params.slug);
  sendSuccess(res, details);
}

export async function discover(req, res) {
  const { items, provider } = await destinationService.discoverPlaces(
    req.valid.params.slug,
    req.valid.query.type,
  );
  sendSuccess(res, { items }, { meta: { provider } });
}
