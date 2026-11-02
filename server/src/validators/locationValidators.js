import { z } from 'zod';

const latitude = z.coerce.number().finite().min(-90).max(90);
const longitude = z.coerce.number().finite().min(-180).max(180);

export const nearestDestinationsQuerySchema = z.object({
  lat: latitude,
  lng: longitude,
  limit: z.coerce.number().int().min(1).max(12).default(6),
});
