/**
 * Turns the API's `details: [{ path, message }]` into `{ [field]: message }`.
 * Paths may arrive as "body.email" or "email"; only the last segment matters.
 */
export function fieldErrorsFrom(error, fallbackField) {
  const errors = {}
  for (const detail of error.details ?? []) {
    const field = String(detail.path).split('.').pop()
    if (!errors[field]) errors[field] = detail.message
  }
  if (Object.keys(errors).length === 0 && fallbackField) {
    errors[fallbackField] = error.message
  }
  return errors
}
