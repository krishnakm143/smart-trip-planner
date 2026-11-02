import { isDbConnected } from '../config/db.js';
import { config } from '../config/env.js';
import { providerName } from '../providers/index.js';
import { sendSuccess } from '../utils/respond.js';

export function getHealth(_req, res) {
  sendSuccess(res, {
    status: 'ok',
    db: isDbConnected() || config.tripStorage === 'supabase' ? 'connected' : 'disconnected',
    provider: providerName,
  });
}
