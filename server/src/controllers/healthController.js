import { isDbConnected } from '../config/db.js';
import { providerName } from '../providers/index.js';
import { sendSuccess } from '../utils/respond.js';

export function getHealth(_req, res) {
  sendSuccess(res, {
    status: 'ok',
    db: isDbConnected() ? 'connected' : 'disconnected',
    provider: providerName,
  });
}
