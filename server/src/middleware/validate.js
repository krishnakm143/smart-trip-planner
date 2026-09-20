import { ApiError } from '../utils/ApiError.js';

export const toDetails = (issues) =>
  issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));

/**
 * Validates the given request parts and exposes the parsed values on `req.valid`.
 * Usage: validate({ body: schema, query: schema, params: schema })
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const valid = {};
    const details = [];

    for (const [part, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        valid[part] = result.data;
      } else {
        details.push(...toDetails(result.error.issues));
      }
    }

    if (details.length > 0) {
      next(ApiError.validation('Request validation failed', details));
      return;
    }

    req.valid = valid;
    next();
  };
}
