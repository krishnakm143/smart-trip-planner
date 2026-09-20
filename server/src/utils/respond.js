export function sendSuccess(res, data, { status = 200, meta } = {}) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details?.length) error.details = details;
  return res.status(status).json({ success: false, error });
}
