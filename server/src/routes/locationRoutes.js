import { Router } from 'express';
import * as locationController from '../controllers/locationController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { nearestDestinationsQuerySchema } from '../validators/locationValidators.js';

const router = Router();

router.get('/nearest', validate({ query: nearestDestinationsQuerySchema }), asyncHandler(locationController.nearest));

export default router;
