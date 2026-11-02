import { config } from '../config/env.js';
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

export async function getPlacePhoto(req, res) {
  const { name } = req.query;
  if (!name || typeof name !== 'string' || !/^places\/[a-zA-Z0-9_-]+\/photos\/[a-zA-Z0-9_-]+$/.test(name)) {
    return res.status(400).json({ status: 'fail', message: 'Valid place photo resource name is required' });
  }
  if (!config.googleMapsApiKey) {
    return res.status(404).json({ status: 'fail', message: 'Google Places API key is not configured' });
  }

  try {
    const cdnUrl = `https://places.googleapis.com/v1/${encodeURI(name)}/media?maxHeightPx=800&maxWidthPx=800&skipHttpRedirect=true&key=${config.googleMapsApiKey}`;
    const mediaRes = await fetch(cdnUrl);
    if (mediaRes.ok) {
      const data = await mediaRes.json();
      if (data?.photoUri) {
        res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return res.redirect(302, data.photoUri);
      }
    }
  } catch {
    // Fallback to direct redirect below
  }

  const directPhotoUrl = `https://places.googleapis.com/v1/${encodeURI(name)}/media?maxHeightPx=800&maxWidthPx=800&key=${config.googleMapsApiKey}`;
  res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return res.redirect(302, directPhotoUrl);
}
