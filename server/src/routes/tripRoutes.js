import { Router } from 'express';
import * as tripController from '../controllers/tripController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParamSchema } from '../validators/common.js';
import {
  createTripSchema,
  listTripsQuerySchema,
  updateTripSchema,
} from '../validators/tripValidators.js';

const router = Router();

router.use(requireAuth);

router
  .route('/')
  .post(validate({ body: createTripSchema }), asyncHandler(tripController.create))
  .get(validate({ query: listTripsQuerySchema }), asyncHandler(tripController.list));

router
  .route('/:id')
  .get(validate({ params: idParamSchema }), asyncHandler(tripController.getById))
  .patch(
    validate({ params: idParamSchema, body: updateTripSchema }),
    asyncHandler(tripController.update),
  )
  .delete(validate({ params: idParamSchema }), asyncHandler(tripController.remove));

export default router;
